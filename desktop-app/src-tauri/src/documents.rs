use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;
use lopdf::Document;
use tauri::{Manager, Emitter};
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcessedDocument {
    pub id: String,
    pub original_path: String,
    pub filename: String,
    pub collection_id: String,
    pub chunk_count: usize,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct IndexingProgress {
    pub doc_id: String,
    pub filename: String,
    pub stage: String,       // "extracting" | "chunking" | "embedding" | "storing" | "done" | "error"
    pub chunks_done: usize,
    pub chunks_total: usize,
    pub error: Option<String>,
}

pub fn get_app_data_doc_path(app: &tauri::AppHandle, filename: &str) -> PathBuf {
    let mut path = app.path().app_data_dir().expect("Failed to get app data dir");
    path.push("documents");
    fs::create_dir_all(&path).ok();
    path.push(filename);
    path
}

async fn store_document(app: &tauri::AppHandle, source_path: &str) -> Result<PathBuf, String> {
    let source = Path::new(source_path);
    let filename = source.file_name()
        .ok_or("Invalid filename")?
        .to_str()
        .ok_or("Invalid filename encoding")?;

    let unique_name = format!("{}_{}", Uuid::new_v4(), filename);
    let dest_path = get_app_data_doc_path(app, &unique_name);

    fs::copy(source, &dest_path).map_err(|e| e.to_string())?;
    Ok(dest_path)
}

fn extract_text(path: &PathBuf) -> Result<String, String> {
    let ext = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "txt" | "md" | "csv" => {
            fs::read_to_string(path).map_err(|e| e.to_string())
        },
        "pdf" => {
            let doc = Document::load(path).map_err(|e| format!("lopdf error: {}", e))?;
            let pages = doc.get_pages();
            let mut text = String::new();

            for (i, _) in pages.iter().enumerate() {
                let page_number = (i + 1) as u32;
                if let Ok(page_text) = doc.extract_text(&[page_number]) {
                    text.push_str(&page_text);
                    text.push('\n');
                }
            }
            Ok(text)
        },
        _ => Err(format!("Unsupported file extension: {}", ext))
    }
}

fn chunk_text(text: &str, chunk_size: usize, overlap: usize) -> Vec<String> {
    let words: Vec<&str> = text.split_whitespace().collect();
    let mut chunks = Vec::new();
    let mut i = 0;

    while i < words.len() {
        let end = std::cmp::min(i + chunk_size, words.len());
        let chunk = words[i..end].join(" ");
        chunks.push(chunk);
        if end == words.len() { break; }
        i += chunk_size - overlap;
    }

    if chunks.is_empty() && !text.is_empty() {
        chunks.push(text.to_string());
    }
    chunks
}

async fn embed_text_via_ollama(text: &str, model: &str) -> Result<Vec<f32>, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "prompt": text
    });

    let resp = client.post("http://localhost:11434/api/embeddings")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Ollama embed request failed: {}", e))?;

    let json: Value = resp.json()
        .await
        .map_err(|e| format!("Ollama embed parse failed: {}", e))?;

    let embedding = json["embedding"]
        .as_array()
        .ok_or("No embedding in response")?
        .iter()
        .filter_map(|v| v.as_f64().map(|f| f as f32))
        .collect();

    Ok(embedding)
}

/// Full pipeline: store file → extract → chunk → embed → save to LanceDB
#[tauri::command]
pub async fn process_and_index_document(
    app: tauri::AppHandle,
    collection_id: String,
    file_path: String,
    embedding_model: Option<String>,
) -> Result<ProcessedDocument, String> {
    let model = embedding_model.unwrap_or_else(|| "nomic-embed-text".to_string());
    let doc_id = Uuid::new_v4().to_string();
    let filename = Path::new(&file_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let emit_progress = |stage: &str, chunks_done: usize, chunks_total: usize, error: Option<String>| {
        let _ = app.emit("indexing-progress", IndexingProgress {
            doc_id: doc_id.clone(),
            filename: filename.clone(),
            stage: stage.to_string(),
            chunks_done,
            chunks_total,
            error,
        });
    };

    // Stage 1: Store
    emit_progress("storing", 0, 0, None);
    let stored_path = store_document(&app, &file_path).await?;

    // Stage 2: Extract
    emit_progress("extracting", 0, 0, None);
    let raw_text = extract_text(&stored_path)?;

    // Stage 3: Chunk
    emit_progress("chunking", 0, 0, None);
    let chunks = chunk_text(&raw_text, 512, 64);
    let total = chunks.len();
    emit_progress("chunking", 0, total, None);

    // Stage 4: Embed + store vectors in LanceDB
    // We store embedding results as a simple JSON file per collection in app data
    // for the MVP. A production implementation would use the lancedb Rust crate.
    let mut embedded_chunks: Vec<Value> = Vec::new();

    for (i, chunk) in chunks.iter().enumerate() {
        emit_progress("embedding", i, total, None);

        match embed_text_via_ollama(chunk, &model).await {
            Ok(vector) => {
                embedded_chunks.push(serde_json::json!({
                    "chunk_id": Uuid::new_v4().to_string(),
                    "doc_id": doc_id,
                    "collection_id": collection_id,
                    "text": chunk,
                    "vector": vector,
                    "chunk_index": i,
                }));
            }
            Err(e) => {
                // If Ollama isn't running, continue without vector — store text-only
                eprintln!("Embedding failed for chunk {}: {}", i, e);
                embedded_chunks.push(serde_json::json!({
                    "chunk_id": Uuid::new_v4().to_string(),
                    "doc_id": doc_id,
                    "collection_id": collection_id,
                    "text": chunk,
                    "vector": null,
                    "chunk_index": i,
                }));
            }
        }
    }

    // Persist to a JSON store in AppData (LanceDB full integration is a follow-up)
    let mut index_dir = app.path().app_data_dir().expect("app data dir");
    index_dir.push("collections");
    index_dir.push(&collection_id);
    fs::create_dir_all(&index_dir).map_err(|e| e.to_string())?;
    index_dir.push(format!("{}.json", doc_id));

    let json_str = serde_json::to_string_pretty(&embedded_chunks)
        .map_err(|e| e.to_string())?;
    fs::write(&index_dir, json_str).map_err(|e| e.to_string())?;

    emit_progress("done", total, total, None);

    Ok(ProcessedDocument {
        id: doc_id,
        original_path: file_path,
        filename,
        collection_id,
        chunk_count: total,
    })
}

#[tauri::command]
pub async fn query_collection(
    app: tauri::AppHandle,
    collection_id: String,
    query: String,
    embedding_model: Option<String>,
    top_k: Option<u64>,
) -> Result<Vec<Value>, String> {
    let model = embedding_model.unwrap_or_else(|| "nomic-embed-text".to_string());
    let k = top_k.unwrap_or(5);

    // 1. Embed query
    let query_vector = embed_text_via_ollama(&query, &model).await?;

    // 2. Load all chunks in collection
    let mut index_dir = app.path().app_data_dir().expect("app data dir");
    index_dir.push("collections");
    index_dir.push(&collection_id);

    if !index_dir.exists() {
        return Ok(vec![]);
    }

    let mut all_chunks: Vec<Value> = Vec::new();
    let entries = fs::read_dir(index_dir).map_err(|e| e.to_string())?;

    for entry in entries {
        if let Ok(file) = entry {
            if file.path().is_file() && file.path().extension().and_then(|e| e.to_str()) == Some("json") {
                let content = fs::read_to_string(file.path()).map_err(|e| e.to_string())?;
                let mut doc_chunks: Vec<Value> = serde_json::from_str(&content)
                    .map_err(|e| e.to_string())?;
                all_chunks.append(&mut doc_chunks);
            }
        }
    }

    // 3. Compute cosine similarity and sort
    let mut search_results: Vec<(f32, Value)> = Vec::new();

    for mut chunk in all_chunks {
        if let Some(chunk_vector_val) = chunk["vector"].as_array() {
            let chunk_vector: Vec<f32> = chunk_vector_val.iter()
                .filter_map(|v| v.as_f64().map(|f| f as f32))
                .collect();

            if chunk_vector.len() == query_vector.len() {
                let score = cosine_similarity(&query_vector, &chunk_vector);
                
                // Keep track of which score belongs to what
                if let Some(obj) = chunk.as_object_mut() {
                    obj.insert("score".to_string(), serde_json::json!(score));
                }
                search_results.push((score, chunk));
            }
        }
    }

    search_results.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

    // 4. Return top K
    let results: Vec<Value> = search_results.into_iter()
        .take(k as usize)
        .map(|(_, chunk)| chunk)
        .collect();

    Ok(results)
}

fn cosine_similarity(v1: &[f32], v2: &[f32]) -> f32 {
    let dot_product: f32 = v1.iter().zip(v2.iter()).map(|(a, b)| a * b).sum();
    let norm1: f32 = v1.iter().map(|a| a * a).sum::<f32>().sqrt();
    let norm2: f32 = v2.iter().map(|a| a * a).sum::<f32>().sqrt();

    if norm1 > 0.0 && norm2 > 0.0 {
        dot_product / (norm1 * norm2)
    } else {
        0.0
    }
}

// 4.3 Not-found threshold handling + 4.1 Pipeline
#[tauri::command]
pub async fn prepare_rag_context(
    app: tauri::AppHandle,
    collection_id: String,
    query: String,
) -> Result<Value, String> {
    // top_k needs to be u64 for tauri invoke (sometimes)
    let results = query_collection(app, collection_id, query, None, Some(5)).await?;
    
    // Threshold 0.35 as per requirements
    let threshold = 0.35;
    let filtered_results: Vec<&Value> = results.iter()
        .filter(|r| r["score"].as_f64().unwrap_or(0.0) >= threshold)
        .collect();

    if filtered_results.is_empty() {
        return Ok(serde_json::json!({
            "context": "",
            "found": false,
            "confidence": "none",
            "citations": []
        }));
    }

    let mut context_text = String::new();
    let mut citations = Vec::new();
    let mut total_score = 0.0;

    for (i, result) in filtered_results.iter().enumerate() {
        let text = result["text"].as_str().unwrap_or("");
        let doc_id = result["doc_id"].as_str().unwrap_or("");
        let chunk_index = result["chunk_index"].as_u64().unwrap_or(0);
        let score = result["score"].as_f64().unwrap_or(0.0);
        total_score += score;

        context_text.push_str(&format!("[Source {}] {}\n\n", i + 1, text));
        citations.push(serde_json::json!({
            "id": i + 1,
            "doc_id": doc_id,
            "chunk_index": chunk_index,
            "score": score
        }));
    }

    // Map confidence
    let avg_score = total_score / filtered_results.len() as f64;
    let confidence = if avg_score > 0.8 { "high" } else if avg_score > 0.6 { "medium" } else { "low" };

    Ok(serde_json::json!({
        "context": context_text,
        "found": true,
        "confidence": confidence,
        "citations": citations
    }))
}

/// Legacy simpler command kept for compatibility
#[tauri::command]
pub async fn process_document(
    app: tauri::AppHandle,
    collection_id: String,
    file_path: String
) -> Result<ProcessedDocument, String> {
    process_and_index_document(app, collection_id, file_path, None).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;
    use tempfile::tempdir;

    #[test]
    fn test_chunk_text() {
        let text = "This is a simple test sentence. We want to chunk this string into smaller parts. Let's see how well our overlap works in practice.";
        // 22 words total.
        
        let chunks = chunk_text(text, 10, 2);
        
        assert_eq!(chunks.len(), 3);
        assert!(chunks[0].contains("This is a simple test sentence. We want to chunk"));
        // Overlap of 2 means the last two words "to chunk" should be at the start of next.
        assert!(chunks[1].starts_with("to chunk this string into smaller parts. Let's see how"));
        assert!(chunks[2].starts_with("see how well our overlap works in practice."));
    }

    #[test]
    fn test_extract_text_txt() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        let content = "Hello world!";
        fs::write(&file_path, content).unwrap();

        let extracted = extract_text(&file_path).unwrap();
        assert_eq!(extracted, content);
    }

    #[test]
    fn test_extract_text_unsupported() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.xyz");
        fs::write(&file_path, "Unsupported content").unwrap();

        let extracted = extract_text(&file_path);
        assert!(extracted.is_err());
        assert!(extracted.err().unwrap().contains("Unsupported file extension"));
    }
}
