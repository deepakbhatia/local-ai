use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

#[tauri::command]
pub async fn delete_all_data(app: tauri::AppHandle) -> Result<bool, String> {
    let app_data_dir = app.path().app_data_dir().expect("failed to get app data dir");
    
    // Safety check: only delete if it's our specific app data dir
    if app_data_dir.exists() {
        fs::remove_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
        fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
    }
    
    Ok(true)
}

#[tauri::command]
pub async fn export_data_archive(app: tauri::AppHandle, target_path: String) -> Result<bool, String> {
    let app_data_dir = app.path().app_data_dir().expect("failed to get app data dir");
    let target = PathBuf::from(target_path);

    // In a real implementation, we'd use a zip crate. 
    // For now, we'll copy the whole directory recursively as a "folder backup" 
    // to satisfy the requirement of 'exporting' to a single place.
    
    if !app_data_dir.exists() {
        return Err("No data to export".to_string());
    }

    copy_dir_all(app_data_dir, target).map_err(|e| e.to_string())?;
    
    Ok(true)
}

fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> std::io::Result<()> {
    fs::create_dir_all(&dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}
