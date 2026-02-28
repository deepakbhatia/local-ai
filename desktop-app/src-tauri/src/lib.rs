// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
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
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            stub_create_collection,
            stub_delete_collection,
            stub_add_document,
            stub_query_document
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
