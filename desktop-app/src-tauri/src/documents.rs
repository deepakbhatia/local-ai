use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;
use lopdf::Document;
use tauri::Manager;
use tauri::Emitter;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcessedDocument {
    pub id: String,
    pub original_path: String,
    pub filename: String,
    pub collection_id: String,
    pub chunk_count: usize,
}

#[derive(Serialize, Deserialize, Debug)]
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

/// Legacy simpler command kept for compatibility
#[tauri::command]
pub async fn process_document(
    app: tauri::AppHandle,
    collection_id: String,
    file_path: String
) -> Result<ProcessedDocument, String> {
    process_and_index_document(app, collection_id, file_path, None).await
}
