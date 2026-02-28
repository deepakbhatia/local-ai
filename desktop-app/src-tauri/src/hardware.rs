use serde::{Deserialize, Serialize};
use sysinfo::System;

#[derive(Serialize, Deserialize, Debug)]
pub struct HardwareInfo {
    pub total_ram_gb: f64,
    pub is_apple_silicon: bool,
    pub recommended_tier: u8,
}

#[tauri::command]
pub fn detect_hardware() -> HardwareInfo {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    // Convert RAM from bytes to GB
    let total_ram_gb = sys.total_memory() as f64 / 1_073_741_824.0;
    
    // Check if Apple Silicon
    let is_apple_silicon = std::env::consts::ARCH == "aarch64" && std::env::consts::OS == "macos";
    
    // Simplified assigned tier mapping logic based on specs
    let recommended_tier = if total_ram_gb >= 30.0 {
        3 // Professional
    } else if total_ram_gb >= 15.0 {
        2 // Enhanced
    } else if total_ram_gb >= 7.0 {
        1 // Standard
    } else {
        0 // Minimum
    };
    
    HardwareInfo {
        total_ram_gb,
        is_apple_silicon,
        recommended_tier,
    }
}
