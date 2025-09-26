// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
    WindowBuilder, WindowUrl
};
use tracing::{info, error};

fn main() {
    // Initialize logging
    init_simple_logging().expect("Failed to initialize logging");
    
    info!("🚀 OpenFrame Tray - Working with embedded React-like components");

    // Create system tray menu
    let quit = CustomMenuItem::new("quit".to_string(), "Quit OpenFrame");
    let show = CustomMenuItem::new("show".to_string(), "Open Chat");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide Chat");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    // Create system tray
    let system_tray = SystemTray::new()
        .with_menu(tray_menu)
        .with_tooltip("OpenFrame - Click to open React-like chat");

    // Build the Tauri app
    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| {
            match event {
                SystemTrayEvent::LeftClick { .. } => {
                    info!("🖱️ System tray clicked!");
                    show_chat_window(app);
                }
                SystemTrayEvent::MenuItemClick { id, .. } => {
                    match id.as_str() {
                        "quit" => {
                            info!("⛔ Quit selected");
                            std::process::exit(0);
                        }
                        "show" => {
                            info!("👁️ Show selected");
                            show_chat_window(app);
                        }
                        "hide" => {
                            info!("🙈 Hide selected");
                            hide_chat_window(app);
                        }
                        _ => {}
                    }
                }
                _ => {}
            }
        })
        .setup(|_app| {
            info!("✅ Tauri app setup complete");
            info!("👆 System tray icon should be visible");
            info!("🖱️ Click the tray icon to open chat window");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn show_chat_window(app: &tauri::AppHandle) {
    // Check if window already exists
    if let Some(window) = app.get_window("chat") {
        info!("🪟 Chat window already exists, showing it");
        window.show().unwrap();
        window.set_focus().unwrap();
        return;
    }

    info!("🏗️ Creating new chat window with REAL React components from dist/");
    
    // Create new window that loads the actual React build from dist/
    let window_result = WindowBuilder::new(
        app,
        "chat",
        WindowUrl::App("index.html".into()) // This will load dist/index.html
    )
    .title("OpenFrame Chat")
    .inner_size(800.0, 600.0)
    .resizable(true)
    .center()
    .visible(true)
    .build();

    match window_result {
        Ok(window) => {
            info!("✅ Chat window created successfully");
            info!("📁 Loading React components from src/components/");
            
            // Add debugging for development
            #[cfg(debug_assertions)]
            {
                window.open_devtools();
                info!("🔧 Developer tools opened for debugging");
            }
            
            // Let Tauri load the actual React app automatically
            info!("⚛️ React app should load from dist/index.html");
        }
        Err(e) => {
            error!("❌ Failed to create chat window: {}", e);
        }
    }
}

fn hide_chat_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_window("chat") {
        info!("🙈 Hiding chat window");
        window.hide().unwrap();
    }
}

// Удаляем встроенный HTML - теперь используем настоящие React компоненты!

fn init_simple_logging() -> Result<(), Box<dyn std::error::Error>> {
    use tracing_subscriber::{fmt, EnvFilter};
    
    let subscriber = fmt::Subscriber::builder()
        .with_env_filter(EnvFilter::from_default_env().add_directive("openframe_tray=info".parse()?))
        .with_target(false)
        .with_thread_ids(false)
        .with_file(false)
        .with_line_number(false)
        .finish();
    
    tracing::subscriber::set_global_default(subscriber)?;
    Ok(())
}