use serde::{Deserialize, Serialize};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

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
    
    // In a real scenario you would bundle the binary or ensure it's in PATH
    let shell = app.shell();
    let command = shell.command("ollama")
        .args(["serve"]);

    let (mut rx, child) = command.spawn().map_err(|e| e.to_string())?;

    let is_running_clone = state.is_running.clone();
    
    // Listen for stdout/stderr to know it's alive or if it crashed
    tauri::async_runtime::spawn(async move {
        is_running_clone.store(true, Ordering::Relaxed);
        
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    println!("Ollama STDOUT: {:?}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Stderr(line) => {
                    println!("Ollama STDERR: {:?}", String::from_utf8_lossy(&line));
                }
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
    // A simple HTTP check against default host
    let client = reqwest::Client::new();
    let res = client.get("http://localhost:11434/api/tags").send().await;
    
    OllamaStatus {
        is_running: res.is_ok(),
        host: "http://localhost:11434".to_string(),
    }
}
