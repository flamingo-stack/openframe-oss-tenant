use tauri::{
    image::Image,
    menu::MenuItem,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, RunEvent, WindowEvent,
};

#[cfg(target_os = "macos")]
use tauri::menu::{Menu, PredefinedMenuItem, Submenu};

#[cfg(not(target_os = "macos"))]
use tauri::menu::Menu;

#[cfg(target_os = "macos")]
use tauri::ActivationPolicy;

#[cfg(target_os = "macos")]
static DOCK_QUIT_ACTION: std::sync::OnceLock<Box<dyn Fn() + Send + Sync>> =
    std::sync::OnceLock::new();

#[cfg(target_os = "macos")]
unsafe extern "C" fn on_application_should_terminate(
    _this: *mut objc2::runtime::AnyObject,
    _sel: objc2::runtime::Sel,
    _sender: *mut objc2::runtime::AnyObject,
) -> usize {
    if let Some(action) = DOCK_QUIT_ACTION.get() {
        action();
    }
    0 // NSTerminateCancel
}

#[cfg(target_os = "macos")]
fn restore_dock_icon() {
    use objc2::AnyThread;
    use objc2_app_kit::{NSApplication, NSImage};
    use objc2_foundation::{MainThreadMarker, NSData};
    if let Some(mtm) = MainThreadMarker::new() {
        let bytes = include_bytes!("../icons/icon.icns");
        let data = unsafe {
            NSData::initWithBytes_length(
                NSData::alloc(),
                bytes.as_ptr().cast(),
                bytes.len(),
            )
        };
        unsafe {
            if let Some(image) = NSImage::initWithData(NSImage::alloc(), &data) {
                NSApplication::sharedApplication(mtm)
                    .setApplicationIconImage(Some(&image));
            }
        }
    }
}

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
        log::info!("get_token: returning token to frontend");
    } else {
        log::warn!("get_token: token not yet available");
    }
    token.clone()
}

#[tauri::command]
fn get_server_url(server_url_state: State<ServerUrlState>) -> Option<String> {
    let url = server_url_state.url.lock().unwrap();
    if url.is_some() {
        log::debug!("get_server_url: requested");
    } else {
        log::warn!("get_server_url: not yet available");
    }
    url.clone()
}

#[tauri::command]
fn get_debug_mode(debug_mode_state: State<DebugModeState>) -> bool {
    let enabled = debug_mode_state.enabled.lock().unwrap();
    log::debug!("get_debug_mode: {}", *enabled);
    *enabled
}

#[tauri::command]
fn log_from_js(level: String, scope: String, message: String) {
    let line = format!("[js:{}] {}", scope, message);
    match level.as_str() {
        "error" => log::error!("{}", line),
        "warn"  => log::warn!("{}", line),
        "debug" => log::debug!("{}", line),
        _       => log::info!("{}", line),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("[startup] openframe-chat starting (version {})", env!("CARGO_PKG_VERSION"));

    // Read configuration from CFPreferences (written by openframe-client daemon)
    let config = config_reader::AppConfig::from_preferences();

    if config.is_valid() {
        println!("[startup] config loaded from CFPreferences");
    } else {
        eprintln!("[startup] config incomplete — openframe-client agent may not be running");
    }

    // --background is the only CLI argument (indicates launch mode from daemon)
    let background_mode = std::env::args().any(|arg| arg == "--background");

    // Extract config values
    let token_path = config.token_path;
    let secret = config.secret;
    let server_url = config.server_url;
    let debug_mode = config.debug_mode;
    
    // When launched from the SYSTEM service via CreateProcessAsUserW, the process
    // inherits SYSTEM's USERPROFILE env var (C:\WINDOWS\system32\config\systemprofile)
    // even though it has the actual user's token. The Windows shell dialog reads
    // USERPROFILE to resolve the Desktop folder, causing "Location is not available".
    // Fix: detect this and override USERPROFILE with the real user's profile path.
    #[cfg(target_os = "windows")]
    {
        if let Ok(current) = std::env::var("USERPROFILE") {
            if current.to_lowercase().contains("systemprofile") {
                if let Some(real_home) = dirs::home_dir() {
                    let real_str = real_home.to_string_lossy();
                    if !real_str.to_lowercase().contains("systemprofile") {
                        println!("[startup] USERPROFILE corrected: {} -> {}", current, real_str);
                        unsafe { std::env::set_var("USERPROFILE", real_home.as_os_str()) };
                    }
                }
            }
        }
    }

    let mut builder = tauri::Builder::default();
    
    // Prepare token watcher parameters if both are available
    let token_params = match (token_path, secret) {
        (Some(path), Some(secret_key)) => Some((path, secret_key)),
        _ => None,
    };
    
    let server_url_clone = server_url.clone();
    let debug_mode_clone = debug_mode;
    let background_mode_clone = background_mode;

    builder = builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(move |app| {
            if std::env::var("OPENFRAME_DISABLE_LOG").is_err() {
                use tauri_plugin_log::{
                    Builder as LogBuilder, RotationStrategy, Target, TargetKind, TimezoneStrategy,
                };

                let log_plugin = LogBuilder::new()
                    .clear_targets()
                    .targets([
                        Target::new(TargetKind::Stdout),
                        Target::new(TargetKind::LogDir {
                            file_name: Some("openframe-chat".into()),
                        }),
                    ])
                    .level(if cfg!(debug_assertions) {
                        log::LevelFilter::Debug
                    } else {
                        log::LevelFilter::Info
                    })
                    .max_file_size(5_000_000)
                    .rotation_strategy(RotationStrategy::KeepSome(5))
                    .timezone_strategy(TimezoneStrategy::UseLocal)
                    .build();

                if let Err(e) = app.handle().plugin(log_plugin) {
                    eprintln!(
                        "[startup] tauri-plugin-log init failed, continuing without file logging: {}",
                        e
                    );
                }
            }

            // Manage server URL state
            let url_state = ServerUrlState {
                url: Arc::new(Mutex::new(server_url_clone.clone()))
            };
            app.manage(url_state);

            if let Some(url) = &server_url_clone {
                log::info!("server URL configured: {}", url);
            } else {
                log::warn!("no server URL provided at startup");
            }

            // Manage debug mode state
            let debug_state = DebugModeState {
                enabled: Arc::new(Mutex::new(debug_mode_clone))
            };
            app.manage(debug_state);
            log::info!("debug mode: {}", debug_mode_clone);

            // Start token watcher with app handle if parameters were provided
            if let Some((token_path, secret_key)) = token_params {
                let state = TokenWatcher::start(token_path, secret_key, app.handle().clone());
                app.manage(state);
                log::info!("token watcher initialized");
            } else {
                // Still create and manage empty state so commands don't fail
                let empty_state = TokenState {
                    current_token: Arc::new(Mutex::new(None))
                };
                app.manage(empty_state);
            }
            
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;

            #[cfg(target_os = "macos")]
            let menu = Menu::with_items(app, &[&show_i])?;

            #[cfg(not(target_os = "macos"))]
            let menu = {
                let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
                Menu::with_items(app, &[&show_i, &quit_i])?
            };
            
            let icons_dir = app.path().resource_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from(""))
                .join("icons");

            #[cfg(target_os = "macos")]
            let primary_tray_path = icons_dir.join("tray-macos44x44.png");
            #[cfg(target_os = "macos")]
            let secondary_tray_path = icons_dir.join("tray-macos22x22.png");

            #[cfg(not(target_os = "macos"))]
            let primary_tray_path = icons_dir.join("tray-windows32x32.png");
            #[cfg(not(target_os = "macos"))]
            let secondary_tray_path = icons_dir.join("tray-windows16x16.png");

            let tray_icon = if primary_tray_path.exists() {
                Image::from_path(&primary_tray_path)?
            } else if secondary_tray_path.exists() {
                Image::from_path(&secondary_tray_path)?
            } else {
                Image::from_bytes(include_bytes!("../icons/32x32.png"))?
            };

            let _tray = TrayIconBuilder::new()
                .icon(tray_icon)
                .icon_as_template(cfg!(target_os = "macos"))
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
                        let app = tray.app_handle().clone();
                        let inner = app.clone();
                        let _ = app.run_on_main_thread(move || {
                            #[cfg(target_os = "macos")]
                            let _ = inner.set_activation_policy(ActivationPolicy::Regular);
                            #[cfg(target_os = "macos")]
                            restore_dock_icon();
                            if let Some(window) = inner.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        });
                    }
                })
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            let handle = app.clone();
                            let inner = app.clone();
                            let _ = handle.run_on_main_thread(move || {
                                #[cfg(target_os = "macos")]
                                let _ = inner.set_activation_policy(ActivationPolicy::Regular);
                                #[cfg(target_os = "macos")]
                                restore_dock_icon();
                                if let Some(window) = inner.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            });
                        }
                        "quit" => {
                            // std::process::exit bypasses ExitRequested; app.exit() would loop back.
                            std::process::exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Cmd+Q calls NSApp.terminate: directly, bypassing RunEvent::ExitRequested — intercept it.
            #[cfg(target_os = "macos")]
            {
                let quit_to_tray_i = MenuItem::with_id(
                    app,
                    "macos_quit_to_tray",
                    "Quit to Tray",
                    true,
                    Some("CmdOrCtrl+Q"),
                )?;
                let app_submenu = Submenu::with_items(app, "Fae Chat", true, &[
                    &PredefinedMenuItem::about(app, None, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &quit_to_tray_i,
                ])?;
                let app_menu = Menu::with_items(app, &[&app_submenu])?;
                app.set_menu(app_menu)?;

                app.on_menu_event(|app, event| {
                    if event.id().as_ref() == "macos_quit_to_tray" {
                        for (_, window) in app.webview_windows() {
                            let _ = window.hide();
                        }
                        let handle = app.clone();
                        let _ = app.run_on_main_thread(move || {
                            let _ = handle.set_activation_policy(ActivationPolicy::Accessory);
                        });
                    }
                });

                let h1 = app.handle().clone();
                let h2 = app.handle().clone();
                let _ = DOCK_QUIT_ACTION.set(Box::new(move || {
                    for (_, window) in h1.webview_windows() {
                        let _ = window.hide();
                    }
                    let h = h2.clone();
                    let _ = h1.run_on_main_thread(move || {
                        let _ = h.set_activation_policy(ActivationPolicy::Accessory);
                    });
                }));

                let mtm = objc2_foundation::MainThreadMarker::new().unwrap();
                unsafe {
                    use std::ffi::c_char;
                    use objc2::runtime::{AnyClass, AnyObject, Sel};
                    use objc2::{msg_send, sel};
                    use objc2_app_kit::NSApplication;

                    extern "C" {
                        fn class_replaceMethod(
                            cls: *const AnyClass,
                            name: Sel,
                            imp: Option<unsafe extern "C" fn()>,
                            types: *const c_char,
                        ) -> Option<unsafe extern "C" fn()>;
                    }

                    let ns_app = NSApplication::sharedApplication(mtm);
                    let delegate: *mut AnyObject = msg_send![&*ns_app, delegate];
                    if !delegate.is_null() {
                        let class: *const AnyClass = msg_send![delegate, class];
                        class_replaceMethod(
                            class,
                            sel!(applicationShouldTerminate:),
                            Some(std::mem::transmute(
                                on_application_should_terminate
                                    as unsafe extern "C" fn(
                                        *mut AnyObject,
                                        Sel,
                                        *mut AnyObject,
                                    ) -> usize,
                            )),
                            c"Q@:@".as_ptr(),
                        );
                    }
                }
            }

            // Show window on startup unless --background flag is passed
            if !background_mode_clone {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    log::info!("main window shown");
                }
            } else {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
                // Accessory: no Dock icon on --background launch.
                #[cfg(target_os = "macos")]
                let _ = app.handle().set_activation_policy(ActivationPolicy::Accessory);
                log::info!("starting in background mode (tray only)");
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    let _ = window.hide();
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![greet, get_token, get_server_url, get_debug_mode, log_from_js]);
    
    builder.build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                RunEvent::Ready => {
                    log::info!("application ready");
                }
                #[cfg(target_os = "macos")]
                RunEvent::Reopen { .. } => {
                    log::info!("app reopen requested");
                    let handle = app_handle.clone();
                    let _ = app_handle.run_on_main_thread(move || {
                        let _ = handle.set_activation_policy(ActivationPolicy::Regular);
                        restore_dock_icon();
                        if let Some(window) = handle.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    });
                }
                RunEvent::ExitRequested { api, .. } => {
                    api.prevent_exit();
                    for (_, window) in app_handle.webview_windows() {
                        let _ = window.hide();
                    }
                    // Deferred: calling set_activation_policy from within a RunEvent handler deadlocks the event loop queue.
                    #[cfg(target_os = "macos")]
                    {
                        let handle = app_handle.clone();
                        let _ = app_handle.run_on_main_thread(move || {
                            let _ = handle.set_activation_policy(ActivationPolicy::Accessory);
                        });
                    }
                }
                _ => {}
            }
        });
}

