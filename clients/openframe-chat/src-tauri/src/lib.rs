use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, RunEvent, WindowEvent,
};

mod config_reader;
mod token_watcher;
mod token_decryption_service;
use token_watcher::{TokenWatcher, TokenState};
use tauri::State;
use std::sync::{Arc, Mutex};

pub struct ServerUrlState {
    pub url: Arc<Mutex<Option<String>>>,
}

pub struct DebugModeState {
    pub enabled: Arc<Mutex<bool>>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_token(token_state: State<TokenState>) -> Option<String> {
    let token = token_state.current_token.lock().unwrap();
    if token.is_some() {
        println!("[INFO] Token requested from frontend");
    } else {
        println!("[ERROR] Token requested but not available");
    }
    token.clone()
}

#[tauri::command]
fn get_server_url(server_url_state: State<ServerUrlState>) -> Option<String> {
    let url = server_url_state.url.lock().unwrap();
    if url.is_some() {
        println!("[INFO] Server URL requested from frontend");
    } else {
        println!("[WARN] Server URL requested but not available");
    }
    url.clone()
}

#[tauri::command]
fn get_debug_mode(debug_mode_state: State<DebugModeState>) -> bool {
    let enabled = debug_mode_state.enabled.lock().unwrap();
    println!("[INFO] Debug mode requested from frontend: {}", *enabled);
    *enabled
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("[INFO] OpenFrame Chat starting...");

    // Read configuration from CFPreferences (written by openframe-client daemon)
    let config = config_reader::AppConfig::from_preferences();

    if config.is_valid() {
        println!("[INFO] Configuration loaded from preferences");
    } else {
        eprintln!("[WARN] Configuration incomplete - please ensure OpenFrame Agent is running");
    }

    // --background is the only CLI argument (indicates launch mode from daemon)
    let background_mode = std::env::args().any(|arg| arg == "--background");

    // Extract config values
    let token_path = config.token_path;
    let secret = config.secret;
    let server_url = config.server_url;
    let debug_mode = config.debug_mode;
    
    let mut builder = tauri::Builder::default();
    
    // Prepare token watcher parameters if both are available
    let token_params = match (token_path, secret) {
        (Some(path), Some(secret_key)) => Some((path, secret_key)),
        _ => None,
    };
    
    let server_url_clone = server_url.clone();
    let debug_mode_clone = debug_mode;
    let background_mode_clone = background_mode;

    builder = builder.setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            
            // Manage server URL state
            let url_state = ServerUrlState {
                url: Arc::new(Mutex::new(server_url_clone.clone()))
            };
            app.manage(url_state);

            if let Some(url) = &server_url_clone {
                println!("[INFO] Server URL configured: {}", url);
            } else {
                println!("[WARN] No server URL provided");
            }

            // Manage debug mode state
            let debug_state = DebugModeState {
                enabled: Arc::new(Mutex::new(debug_mode_clone))
            };
            app.manage(debug_state);
            println!("[INFO] Debug mode: {}", debug_mode_clone);

            // Start token watcher with app handle if parameters were provided
            if let Some((token_path, secret_key)) = token_params {
                let state = TokenWatcher::start(token_path, secret_key, app.handle().clone());
                app.manage(state);
                println!("[INFO] Token watcher initialized");
            } else {
                // Still create and manage empty state so commands don't fail
                let empty_state = TokenState {
                    current_token: Arc::new(Mutex::new(None))
                };
                app.manage(empty_state);
            }
            
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;
            
            // Get the path to the icon relative to the resources directory
            let icon_path = app.path().resource_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from(""))
                .join("icons")
                .join("32x32.png");
            
            let tray_icon = if icon_path.exists() {
                Image::from_path(&icon_path)?
            } else {
                // Fallback to embedded icon
                Image::from_bytes(include_bytes!("../icons/32x32.png"))?
            };

            let _tray = TrayIconBuilder::new()
                .icon(tray_icon)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("OpenFrame Chat")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            // Force quit using std::process::exit to bypass ExitRequested event
                            // This ensures the tray menu Quit button actually closes the app
                            std::process::exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Show window on startup unless --background flag is passed
            if !background_mode_clone {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    println!("[INFO] Main window shown on startup");
                }
            } else {
                println!("[INFO] Starting in background mode (tray only)");
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    // Prevent the default close behavior
                    api.prevent_close();
                    
                    // Hide the window instead
                    let _ = window.hide();
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![greet, get_token, get_server_url, get_debug_mode]);
    
    builder.build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                RunEvent::Ready => {
                    println!("[INFO] Application ready");
                }
                #[cfg(target_os = "macos")]
                RunEvent::Reopen { .. } => {
                    // User clicked the app icon in Dock or launched from Spotlight
                    // while the app is already running (hidden in tray)
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                    println!("[INFO] App reopen requested - showing main window");
                }
                RunEvent::ExitRequested { api, .. } => {
                    // Prevent the app from exiting via system shortcuts
                    api.prevent_exit();
                    
                    // Hide all windows instead of closing
                    for (_, window) in app_handle.webview_windows() {
                        let _ = window.hide();
                    }
                }
                _ => {}
            }
        });
}

