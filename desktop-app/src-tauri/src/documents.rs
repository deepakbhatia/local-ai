use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use lopdf::Document;
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcessedDocument {
    pub id: String,
    pub original_path: String,
    pub filename: String,
    pub collection_id: String,
    pub text_chunks: Vec<String>,
}

pub fn get_app_data_doc_path(app: &tauri::AppHandle, filename: &str) -> PathBuf {
    let mut path = app.path().app_data_dir().expect("Failed to get app data dir");
    path.push("documents");
    fs::create_dir_all(&path).ok();
    path.push(filename);
    path
}

pub async fn store_document(app: &tauri::AppHandle, source_path: &str) -> Result<PathBuf, String> {
    let source = Path::new(source_path);
    let filename = source.file_name()
        .ok_or("Invalid filename")?
        .to_str()
        .ok_or("Invalid filename encoding")?;
        
    // Generate unique name to prevent collisions
    let unique_name = format!("{}_{}", Uuid::new_v4(), filename);
    let dest_path = get_app_data_doc_path(app, &unique_name);
    
    fs::copy(source, &dest_path).map_err(|e| e.to_string())?;
    
    Ok(dest_path)
}

pub fn extract_text(path: &PathBuf) -> Result<String, String> {
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
                // lopdf pages are 1-indexed
                let page_number = (i + 1) as u32;
                if let Ok(page_text) = doc.extract_text(&[page_number]) {
                    text.push_str(&page_text);
                    text.push('\n');
                }
            }
            Ok(text)
        },
        // DOCX is handled in Javascript via Mammoth before reaching Rust, or we can use dotx crate.
        // For this MVP, we will only handle TXT, MD, PDF natively in Rust.
        _ => Err(format!("Unsupported file extension: {}", ext))
    }
}

pub fn chunk_text(text: &str, chunk_size: usize, overlap: usize) -> Vec<String> {
    // Simple word-based chunking for MVP
    let words: Vec<&str> = text.split_whitespace().collect();
    let mut chunks = Vec::new();
    let mut i = 0;
    
    while i < words.len() {
        let end = std::cmp::min(i + chunk_size, words.len());
        let chunk = words[i..end].join(" ");
        chunks.push(chunk);
        
        if end == words.len() {
            break;
        }
        i += chunk_size - overlap;
    }
    
    if chunks.is_empty() && !text.is_empty() {
        chunks.push(text.to_string());
    }
    
    chunks
}

#[tauri::command]
pub async fn process_document(
    app: tauri::AppHandle, 
    collection_id: String, 
    file_path: String
) -> Result<ProcessedDocument, String> {
    println!("Processing document: {}", file_path);
    // 1. Store File
    let stored_path = store_document(&app, &file_path).await?;
    
    // 2. Extract Text
    let raw_text = extract_text(&stored_path)?;
    println!("Extracted text length: {}", raw_text.len());
    
    // 3. Chunk Text (approx 512 words, 64 overlap)
    let chunks = chunk_text(&raw_text, 512, 64);
    println!("Generated {} chunks", chunks.len());

    let filename = Path::new(&file_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let doc_id = Uuid::new_v4().to_string();
        
    // 4. (Future) Embedding & LanceDB Insertion
    // For MVP, we pass the chunks back to the frontend, or handle LanceDB writes here.
    // In a full implementation, we would call the `ollama::embed_text` handler internally here,
    // and write the `(uuid, chunk_text, vector, document_id)` tuples into a LanceDB table corresponding to `collection_id`.
    
    println!("Successfully processed {}", filename);
    
    Ok(ProcessedDocument {
        id: doc_id,
        original_path: file_path,
        filename,
        collection_id,
        text_chunks: chunks,
    })
}
