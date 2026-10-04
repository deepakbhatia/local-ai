use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::Emitter; // Ensure Emitter is in scope for emitting events
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
    
    // Use bundled sidecar binary — no system Ollama required
    let sidecar = app.shell()
        .sidecar("ollama")
        .map_err(|e| format!("Failed to find ollama sidecar: {}", e))?
        .args(["serve"]);

    let (mut rx, _child) = sidecar.spawn().map_err(|e| e.to_string())?;

    let is_running_clone = state.is_running.clone();
    
    tauri::async_runtime::spawn(async move {
        is_running_clone.store(true, Ordering::Relaxed);
        
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Terminated(payload) => {
                    println!("Ollama terminated with code {:?}", payload.code);
                    is_running_clone.store(false, Ordering::Relaxed);
                    break;
                }
                CommandEvent::Stderr(line) => {
                    // Log Ollama's own output for debugging
                    eprintln!("[ollama] {}", String::from_utf8_lossy(&line));
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
    digest: String,
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
                            let digest = json.get("digest").and_then(|d| d.as_str()).unwrap_or("").to_string();
                            let completed = json.get("completed").and_then(|c| c.as_u64()).unwrap_or(0);
                            let total = json.get("total").and_then(|t| t.as_u64()).unwrap_or(0);
                            
                            let payload = ProgressPayload {
                                status,
                                digest,
                                completed,
                                total,
                            };
                            
                            // Emit event to frontend
                            let safe_model_name = model_name.replace(|c: char| !c.is_ascii_alphanumeric() && c != '-', "-");
                            let _ = app.emit(&format!("download-progress-{}", safe_model_name), payload);
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
pub async fn delete_model(model_name: String) -> Result<bool, String> {
    let client = reqwest::Client::new();
    
    let req_body = serde_json::json!({
        "name": model_name
    });

    let res = client.delete("http://localhost:11434/api/delete")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to delete model. Status: {}", res.status()))
    }
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
                        if let Ok(json) = serde_json::from_str::<Value>(line) {
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
pub async fn generate_text_sync(_app: tauri::AppHandle, model_name: String, prompt: String, context: Option<Vec<u64>>) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    let mut req_body = serde_json::json!({
        "model": model_name,
        "prompt": prompt,
        "stream": false
    });

    if let Some(ctx) = context {
        req_body.as_object_mut().unwrap().insert("context".to_string(), serde_json::json!(ctx));
    }

    let res = client.post("http://localhost:11434/api/generate")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: Value = res.json().await.map_err(|e| e.to_string())?;
    
    if let Some(resp) = json.get("response").and_then(|r| r.as_str()) {
        Ok(resp.to_string())
    } else {
        Err("No response found in API reply".to_string())
    }
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

// 1.11 Benchmark runner
#[derive(Serialize)]
pub struct BenchmarkResult {
    pub model: String,
    pub tokens_per_second: f64,
}

#[tauri::command]
pub async fn run_benchmark(model_name: String) -> Result<BenchmarkResult, String> {
    let client = reqwest::Client::new();
    
    // 5 fixed test prompts for benchmarking
    let prompts = vec![
        "Explain the importance of privacy in AI.",
        "Write a short python script to reverse a string.",
        "Summarize the plot of Romeo and Juliet in three sentences.",
        "What are the main differences between TCP and UDP?",
        "Compose a professional email declining a job offer."
    ];
    
    let mut total_eval_duration = 0.0;
    let mut total_eval_count = 0.0;
    
    for prompt in prompts {
        let req_body = serde_json::json!({
            "model": model_name,
            "prompt": prompt,
            "stream": false
        });

        let res = client.post("http://localhost:11434/api/generate")
            .json(&req_body)
            .send()
            .await
            .map_err(|e| format!("Benchmark failed: {}", e))?;
            
        let json: Value = res.json().await.map_err(|e| format!("Parsing failed: {}", e))?;
        
        let eval_duration: f64 = json.get("eval_duration").and_then(|v| v.as_f64()).unwrap_or(0.0) / 1_000_000_000.0; // Nano to Sec
        let eval_count: f64 = json.get("eval_count").and_then(|v| v.as_f64()).unwrap_or(0.0);
        
        total_eval_duration += eval_duration;
        total_eval_count += eval_count;
    }
    
    let tokens_per_second = if total_eval_duration > 0.0 {
        total_eval_count / total_eval_duration
    } else {
        0.0
    };
    
    Ok(BenchmarkResult {
        model: model_name,
        tokens_per_second,
    })
}

// 1.12 Model Switch
#[tauri::command]
pub async fn switch_model(app: tauri::AppHandle, state: tauri::State<'_, OllamaState>, model_name: String) -> Result<bool, String> {
    // Switching model in Ollama is effectively handled by querying it or pulling it if missing.
    // The UI handles downloading. We can ensure Ollama is alive.
    let _ = start_ollama(app, state).await?;
    
    // Send a warm-up prompt to load the model into memory
    let client = reqwest::Client::new();
    let req_body = serde_json::json!({
        "model": model_name,
        "prompt": "", // Empty prompt often forces load without generating
        "stream": false
    });

    let _res = client.post("http://localhost:11434/api/generate")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| format!("Model warm-up failed: {}", e))?;
        
    Ok(true)
}

// 1.13 Variable to hold Network Log internally for now
use std::sync::Mutex;
pub struct NetworkLog(pub Mutex<Vec<String>>);

#[tauri::command]
pub fn get_network_activity_log(state: tauri::State<'_, NetworkLog>) -> Result<Vec<String>, String> {
    let log = state.0.lock().map_err(|_| "Failed to acquire log lock")?;
    Ok(log.clone())
}

#[tauri::command]
pub fn log_network_activity(state: tauri::State<'_, NetworkLog>, activity: String) -> Result<(), String> {
    // Append to internal log
    let mut log = state.0.lock().map_err(|_| "Failed to acquire log lock")?;
    log.push(format!("{} - {}", chrono::Utc::now().to_rfc3339(), activity));
    Ok(())
}
