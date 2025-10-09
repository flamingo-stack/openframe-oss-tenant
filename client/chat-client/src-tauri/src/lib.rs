use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, RunEvent, WindowEvent,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            println!("🚀 [SETUP] Chat application starting...");
            println!("🪟 [SETUP] Available windows: {:?}", app.webview_windows().keys().collect::<Vec<_>>());
            
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;
            
            println!("📋 [SETUP] Tray menu created with Show and Quit items");
            
            // Load the tray icon bytes at compile time
            let tray_icon_bytes = include_bytes!("../icons/tray/icon.png");
            let tray_icon = Image::from_bytes(tray_icon_bytes)
                .expect("failed to load tray icon");

            let _tray = TrayIconBuilder::new()
                .icon(tray_icon)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("OpenFrame Chat")
                .on_tray_icon_event(|tray, event| {
                    println!("🖱️  [TRAY EVENT] Received tray icon event: {:?}", event);
                    
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        println!("👆 [TRAY CLICK] Left click detected, showing main window");
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            println!("✅ [TRAY CLICK] Main window found, showing it");
                            let _ = window.show();
                            let _ = window.set_focus();
                        } else {
                            println!("❌ [TRAY CLICK] Main window not found!");
                        }
                    }
                })
                .on_menu_event(move |app, event| {
                    println!("📋 [MENU EVENT] Tray menu item clicked: {}", event.id.as_ref());
                    
                    match event.id.as_ref() {
                        "show" => {
                            println!("👁️  [MENU SHOW] Show menu item clicked");
                            if let Some(window) = app.get_webview_window("main") {
                                println!("✅ [MENU SHOW] Main window found, showing it");
                                let _ = window.show();
                                let _ = window.set_focus();
                            } else {
                                println!("❌ [MENU SHOW] Main window not found!");
                            }
                        }
                        "quit" => {
                            println!("🛑 [MENU QUIT] Quit menu item clicked - forcing exit with std::process::exit(0)");
                            // Force quit using std::process::exit to bypass ExitRequested event
                            // This ensures the tray menu Quit button actually closes the app
                            std::process::exit(0);
                        }
                        other => {
                            println!("❓ [MENU UNKNOWN] Unknown menu item: {}", other);
                        }
                    }
                })
                .build(app)?;
            
            println!("✅ [SETUP] Tray icon created successfully");
            println!("✅ [SETUP] Chat application setup complete");
            
            Ok(())
        })
        .on_window_event(|window, event| {
            let window_label = window.label();
            
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    println!("❌ [WINDOW CLOSE] Close requested for window: {}", window_label);
                    println!("🛡️  [WINDOW CLOSE] Preventing default close behavior");
                    
                    // Prevent the default close behavior
                    api.prevent_close();
                    
                    // Hide the window instead
                    let _ = window.hide();
                    
                    println!("👻 [WINDOW CLOSE] Window hidden instead of closed: {}", window_label);
                }
                WindowEvent::Focused(focused) => {
                    println!("🔍 [WINDOW FOCUS] Window {} focus changed: {}", window_label, focused);
                }
                WindowEvent::Destroyed => {
                    println!("💥 [WINDOW DESTROY] Window destroyed: {}", window_label);
                }
                _ => {
                    // Other events are too noisy, skip them
                }
            }
        })
        .invoke_handler(tauri::generate_handler![greet])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                RunEvent::ExitRequested { api, .. } => {
                    println!("🚪 [EXIT REQUESTED] System requested app exit (Cmd+Q, Dock Quit, etc.)");
                    println!("🛡️  [EXIT REQUESTED] Preventing exit to keep tray icon alive");
                    
                    // Prevent the app from exiting via system shortcuts
                    api.prevent_exit();
                    
                    // Hide all windows instead of closing
                    let windows: Vec<_> = app_handle.webview_windows().keys().cloned().collect();
                    println!("👻 [EXIT REQUESTED] Hiding {} windows: {:?}", windows.len(), windows);
                    
                    for (label, window) in app_handle.webview_windows() {
                        println!("   - Hiding window: {}", label);
                        let _ = window.hide();
                    }
                    
                    println!("✅ [EXIT REQUESTED] All windows hidden, app stays in tray");
                }
                RunEvent::Ready => {
                    println!("✨ [APP READY] Application is ready and running");
                }
                RunEvent::Reopen { .. } => {
                    println!("🔄 [APP REOPEN] Application reopened (macOS dock icon clicked)");
                }
                _ => {
                    // Other events - don't log to avoid noise
                }
            }
        });
}