// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

pub mod hardware;
pub mod ollama;
pub mod documents;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn stub_create_collection(name: &str) -> String {
    format!("Created collection {}", name)
}

#[tauri::command]
fn stub_delete_collection(id: &str) -> String {
    format!("Deleted collection {}", id)
}

#[tauri::command]
fn stub_add_document(collection_id: &str, file_path: &str) -> String {
    format!("Added document {} to collection {}", file_path, collection_id)
}

#[tauri::command]
fn stub_query_document(query: &str, collection_id: &str) -> String {
    format!("Queried {} in collection {}", query, collection_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .manage(ollama::OllamaState::default())
        .manage(ollama::NetworkLog(std::sync::Mutex::new(Vec::new())))
        .invoke_handler(tauri::generate_handler![
            greet, 
            stub_create_collection,
            stub_delete_collection,
            stub_add_document,
            stub_query_document,
            hardware::detect_hardware,
            ollama::start_ollama,
            ollama::check_ollama_status,
            ollama::list_installed_models,
            ollama::download_model,
            ollama::generate_text,
            ollama::embed_text,
            ollama::run_benchmark,
            ollama::switch_model,
            ollama::get_network_activity_log,
            ollama::log_network_activity,
            documents::process_document,
            documents::process_and_index_document,
            documents::query_collection,
            documents::prepare_rag_context
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
