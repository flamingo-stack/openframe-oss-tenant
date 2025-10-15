use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime, WindowEvent,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Create the system tray
            let _ = create_tray(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Handle window close event
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    // Prevent the window from closing
                    api.prevent_close();
                    // Hide the window instead
                    let _ = window.hide();
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn create_tray<R: Runtime>(app: &tauri::App<R>) -> Result<(), Box<dyn std::error::Error>> {
    let tray_menu = tauri::menu::MenuBuilder::new(app)
        .item(
            &tauri::menu::MenuItemBuilder::with_id("show", "Show")
                .build(app)?,
        )
        .separator()
        .item(
            &tauri::menu::MenuItemBuilder::with_id("quit", "Quit")
                .build(app)?,
        )
        .build()?;

    // Get the path to the icon relative to the resources directory
    let icon_path = app.path().resource_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from(""))
        .join("icons")
        .join("32x32.png");
    
    let icon = if icon_path.exists() {
        tauri::image::Image::from_path(&icon_path)?
    } else {
        // Fallback to embedded icon
        tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png"))?
    };

    let _tray = TrayIconBuilder::new()
        .menu(&tray_menu)
        .icon(icon)
        .tooltip("Fae Chat")
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            match event {
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } => {
                    // Show window on left click
                    if let Some(window) = tray.app_handle().get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}