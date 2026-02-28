use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{Emitter, Emitter as _}; // Ensure Emitter is in scope for emitting events
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use futures_util::StreamExt;

pub struct OllamaState {
    pub is_running: Arc<AtomicBool>,
}

impl Default for OllamaState {
    fn default() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaStatus {
    pub is_running: bool,
    pub host: String,
}

#[tauri::command]
pub async fn start_ollama(app: tauri::AppHandle, state: tauri::State<'_, OllamaState>) -> Result<bool, String> {
    if state.is_running.load(Ordering::Relaxed) {
        return Ok(true);
    }
    
    let shell = app.shell();
    let command = shell.command("ollama")
        .args(["serve"]);

    let (mut rx, _child) = command.spawn().map_err(|e| e.to_string())?;

    let is_running_clone = state.is_running.clone();
    
    tauri::async_runtime::spawn(async move {
        is_running_clone.store(true, Ordering::Relaxed);
        
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Terminated(payload) => {
                    println!("Ollama Terminated with code {:?}", payload.code);
                    is_running_clone.store(false, Ordering::Relaxed);
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(true)
}

#[tauri::command]
pub async fn check_ollama_status() -> OllamaStatus {
    let client = reqwest::Client::new();
    let res = client.get("http://localhost:11434/api/tags").send().await;
    
    OllamaStatus {
        is_running: res.is_ok(),
        host: "http://localhost:11434".to_string(),
    }
}

#[tauri::command]
pub async fn list_installed_models() -> Result<Vec<Value>, String> {
    let client = reqwest::Client::new();
    let res = client.get("http://localhost:11434/api/tags").send().await.map_err(|e| e.to_string())?;
    let json: Value = res.json().await.map_err(|e| e.to_string())?;
    
    if let Some(models) = json.get("models").and_then(|m| m.as_array()) {
        Ok(models.clone())
    } else {
        Ok(vec![])
    }
}

#[derive(Serialize, Clone)]
struct ProgressPayload {
    status: String,
    completed: u64,
    total: u64,
}

#[tauri::command]
pub async fn download_model(app: tauri::AppHandle, model_name: String) -> Result<bool, String> {
    let client = reqwest::Client::new();
    
    let req_body = serde_json::json!({
        "name": model_name,
        "stream": true
    });

    let res = client.post("http://localhost:11434/api/pull")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let mut stream = res.bytes_stream();

    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(bytes) => {
                if let Ok(text) = String::from_utf8(bytes.to_vec()) {
                    // Responses can be multiple json objects separated by newline
                    for line in text.lines() {
                        if line.trim().is_empty() { continue; }
                        if let Ok(json) = serde_json::from_str::<Value>(line) {
                            let status = json.get("status").and_then(|s| s.as_str()).unwrap_or("").to_string();
                            let completed = json.get("completed").and_then(|c| c.as_u64()).unwrap_or(0);
                            let total = json.get("total").and_then(|t| t.as_u64()).unwrap_or(0);
                            
                            let payload = ProgressPayload {
                                status,
                                completed,
                                total,
                            };
                            
                            // Emit event to frontend
                            let _ = app.emit(&format!("download-progress-{}", model_name), payload);
                        }
                    }
                }
            }
            Err(e) => return Err(e.to_string()),
        }
    }

    Ok(true)
}

#[derive(Serialize, Clone)]
struct GenerationPayload {
    model: String,
    response: String,
    done: bool,
}

#[tauri::command]
pub async fn generate_text(app: tauri::AppHandle, model_name: String, prompt: String, context: Option<Vec<u64>>) -> Result<bool, String> {
    let client = reqwest::Client::new();
    
    let mut req_body = serde_json::json!({
        "model": model_name,
        "prompt": prompt,
        "stream": true
    });

    if let Some(ctx) = context {
        req_body.as_object_mut().unwrap().insert("context".to_string(), serde_json::json!(ctx));
    }

    let res = client.post("http://localhost:11434/api/generate")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let mut stream = res.bytes_stream();

    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(bytes) => {
                if let Ok(text) = String::from_utf8(bytes.to_vec()) {
                    for line in text.lines() {
                        if line.trim().is_empty() { continue; }
                        if let Ok(mut json) = serde_json::from_str::<Value>(line) {
                            let response_text = json.get("response").and_then(|s| s.as_str()).unwrap_or("").to_string();
                            let done = json.get("done").and_then(|d| d.as_bool()).unwrap_or(false);
                            
                            let payload = GenerationPayload {
                                model: model_name.clone(),
                                response: response_text,
                                done,
                            };
                            
                            let _ = app.emit("generation-progress", payload);
                        }
                    }
                }
            }
            Err(e) => return Err(e.to_string()),
        }
    }

    Ok(true)
}

#[tauri::command]
pub async fn embed_text(model_name: String, prompt: String) -> Result<Vec<f64>, String> {
    let client = reqwest::Client::new();
    
    let req_body = serde_json::json!({
        "model": model_name,
        "prompt": prompt
    });

    let res = client.post("http://localhost:11434/api/embeddings")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
        
    let json: Value = res.json().await.map_err(|e| e.to_string())?;
    
    if let Some(embedding) = json.get("embedding").and_then(|e| e.as_array()) {
        let vec: Vec<f64> = embedding.iter().filter_map(|v| v.as_f64()).collect();
        Ok(vec)
    } else {
        Err("Failed to parse embedding".to_string())
    }
}
