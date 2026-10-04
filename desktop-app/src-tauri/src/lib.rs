use tauri::{menu::{Menu, MenuItem}, tray::{TrayIconBuilder, TrayIconEvent}, Manager};

pub mod hardware;
pub mod ollama;
pub mod documents;
pub mod management;

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
        .setup(|app| {
            // Setup local crash reporter
            let app_data_dir = app.path().app_data_dir().unwrap_or_default();
            std::fs::create_dir_all(&app_data_dir).unwrap_or_default();
            
            std::panic::set_hook(Box::new(move |panic_info| {
                let log_path = app_data_dir.join("crash.log");
                let mut file = std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(log_path)
                    .unwrap();
                    
                let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
                let message = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
                    *s
                } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
                    &s[..]
                } else {
                    "Unknown panic"
                };
                
                let location = panic_info.location().map(|l| format!("at {}:{}", l.file(), l.line())).unwrap_or_default();
                let _ = std::io::Write::write_all(&mut file, format!("[{}] CRASH: {} {}\n", timestamp, message, location).as_bytes());
            }));

            let quit_i = MenuItem::with_id(app, "quit", "Quit LocalMind", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i])?;
            
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show().unwrap_or(());
                            let _ = window.set_focus().unwrap_or(());
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
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
            ollama::delete_model,
            ollama::generate_text,
            ollama::generate_text_sync,
            ollama::embed_text,
            ollama::run_benchmark,
            ollama::switch_model,
            ollama::get_network_activity_log,
            ollama::log_network_activity,
            documents::process_document,
            documents::process_and_index_document,
            documents::query_collection,
            documents::prepare_rag_context,
            management::delete_all_data,
            management::export_data_archive
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
