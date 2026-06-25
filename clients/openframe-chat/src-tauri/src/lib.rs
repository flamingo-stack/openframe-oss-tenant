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

pub(crate) fn activate_main_window(app: &tauri::AppHandle) {
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        #[cfg(target_os = "macos")]
        {
            let _ = handle.set_activation_policy(ActivationPolicy::Regular);
            restore_dock_icon();
        }
        if let Some(window) = handle.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    });
}

mod config_reader;
mod nats_bridge;
mod token_watcher;
mod token_decryption_service;
use nats_bridge::{NatsBridge, NatsEvent, NatsStatus};
use token_decryption_service::TokenDecryptionService;
use token_watcher::{TokenSource, TokenWatcher};
use tauri::State;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
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
fn get_token(token_source: State<TokenSource>) -> Option<String> {
    let token = token_source.read_fresh();

    if token.is_some() {
        // JS logs the (masked) result itself — keep the Rust side at debug.
        log::debug!("get_token: returning fresh token to frontend");
    } else {
        log::warn!("get_token: token not yet available");
    }
    token
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

fn apply_config(app: &tauri::AppHandle, cfg: config_reader::AppConfig) {
    if let Some(url) = cfg.server_url {
        if let Some(state) = app.try_state::<ServerUrlState>() {
            *state.url.lock().unwrap() = Some(url.clone());
            log::info!("server URL configured: {}", url);
        }
    }
    if let Some(state) = app.try_state::<DebugModeState>() {
        *state.enabled.lock().unwrap() = cfg.debug_mode;
    }
    if let (Some(path), Some(secret)) = (cfg.token_path, cfg.secret) {
        if let Some(source) = app.try_state::<TokenSource>() {
            match TokenDecryptionService::new(secret) {
                // `enable` is the once-guard: it returns true only the first
                // time, so the watcher starts a single time across repeated
                // apply_config calls (startup, recovery, single-instance relaunch).
                Ok(decryptor) => {
                    if source.enable(path, decryptor) {
                        TokenWatcher::start(source.inner().clone(), app.clone());
                        log::info!("token watcher initialized");
                    }
                }
                Err(e) => log::error!("token watcher: failed to create decryption service: {}", e),
            }
        }
    }
}

#[cfg(target_os = "windows")]
fn register_app_id() {
    use winreg::{enums::*, RegKey};

    extern "system" {
        fn SetCurrentProcessExplicitAppUserModelID(app_id: *const u16) -> i32;
    }
    let aumid: Vec<u16> = "com.openframe.chat\0".encode_utf16().collect();
    unsafe { SetCurrentProcessExplicitAppUserModelID(aumid.as_ptr()); }

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok((key, _)) =
        hkcu.create_subkey(r"Software\Classes\AppUserModelId\com.openframe.chat")
    {
        let _ = key.set_value("DisplayName", &"OpenFrame Chat");
        // IconUri is written later from setup() once resource_dir() resolves to
        // a real PNG (see register_notification_icon). The exe path that used to
        // go here doesn't render as a toast logo.
    }
}

#[cfg(target_os = "windows")]
fn register_start_menu_shortcut() {
    use mslnk::ShellLink;

    extern "system" {
        fn SHChangeNotify(event_id: i32, flags: u32, item1: *const std::ffi::c_void, item2: *const std::ffi::c_void);
    }

    let Some(programs) = dirs::data_dir().map(|d| {
        d.join("Microsoft").join("Windows").join("Start Menu").join("Programs")
    }) else {
        return;
    };
    let lnk = programs.join("OpenFrame Chat.lnk");
    if lnk.exists() {
        return;
    }

    let exe = match std::env::current_exe() {
        Ok(p) => p,
        Err(e) => {
            log::warn!("start menu shortcut: cannot resolve exe path ({e})");
            return;
        }
    };

    let mut sl = match ShellLink::new(&exe) {
        Ok(sl) => sl,
        Err(e) => {
            log::warn!("start menu shortcut: ShellLink::new failed ({e:?})");
            return;
        }
    };
    sl.set_name(Some("OpenFrame Chat".to_string()));
    sl.set_icon_location(Some(exe.to_string_lossy().into_owned()));
    if let Some(dir) = exe.parent() {
        sl.set_working_dir(Some(dir.to_string_lossy().into_owned()));
    }
    if let Err(e) = sl.create_lnk(&lnk) {
        log::warn!("start menu shortcut: failed to create {} ({e:?})", lnk.display());
        return;
    }

    // SHChangeNotify makes Start surface the new shortcut without a reboot.
    const SHCNE_ASSOCCHANGED: i32 = 0x0800_0000;
    const SHCNF_IDLIST: u32 = 0;
    unsafe { SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, std::ptr::null(), std::ptr::null()); }
    log::info!("start menu shortcut: created at {}", lnk.display());
}

/// Materializes the embedded app icon to a user-writable path and points the
/// AUMID's `IconUri` at it. The agent ships only the chat executable — no Tauri
/// `resources/` on disk — so a bundled-resource path never exists; and
/// notify-rust ignores per-notification icons on Windows, leaving this registry
/// icon as the only logo source for toasts and the Action Center.
#[cfg(target_os = "windows")]
fn register_notification_icon(app: &tauri::AppHandle) {
    use winreg::{enums::*, RegKey};

    const ICON_BYTES: &[u8] = include_bytes!("../icons/128x128.png");

    let icon_dir = match app.path().app_local_data_dir() {
        Ok(dir) => dir,
        Err(e) => {
            log::warn!("notification icon: no app data dir ({e}) — toasts will show no icon");
            return;
        }
    };
    let icon_path = icon_dir.join("notification-icon.png");
    // Rewritten each launch so an app update ships a refreshed icon.
    if let Err(e) =
        std::fs::create_dir_all(&icon_dir).and_then(|_| std::fs::write(&icon_path, ICON_BYTES))
    {
        log::warn!("notification icon: failed to write {} ({e})", icon_path.display());
        return;
    }

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok((key, _)) =
        hkcu.create_subkey(r"Software\Classes\AppUserModelId\com.openframe.chat")
    {
        let _ = key.set_value("IconUri", &icon_path.to_string_lossy().into_owned());
        // Some Windows builds only render the registered icon when a background
        // color is present; transparent preserves the PNG's own alpha.
        let _ = key.set_value("IconBackgroundColor", &"#00000000");
    }
}

#[tauri::command]
async fn nats_status(bridge: State<'_, NatsBridge>) -> Result<NatsStatus, String> {
    Ok(bridge.status().await)
}

#[tauri::command]
fn nats_set_notifications_enabled(bridge: State<'_, NatsBridge>, enabled: bool) {
    bridge.set_notifications_enabled(enabled);
}

#[tauri::command]
async fn nats_subscribe_dialog(
    bridge: State<'_, NatsBridge>,
    dialog_id: String,
    opt_start_seq: Option<u64>,
) -> Result<(), String> {
    bridge.subscribe_dialog(dialog_id, opt_start_seq).await;
    Ok(())
}

#[tauri::command]
async fn nats_unsubscribe_dialog(
    bridge: State<'_, NatsBridge>,
    dialog_id: String,
) -> Result<(), String> {
    bridge.unsubscribe_dialog(&dialog_id).await;
    Ok(())
}

#[tauri::command]
async fn nats_register_event_channel(
    bridge: State<'_, NatsBridge>,
    channel: tauri::ipc::Channel<NatsEvent>,
) -> Result<(), String> {
    bridge.register_event_channel(channel).await;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "windows")]
    {
        register_app_id();
        register_start_menu_shortcut();
    }

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

    let background_mode_clone = background_mode;

    builder = builder
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            log::info!("single-instance: second launch intercepted");
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            #[cfg(target_os = "macos")]
            {
                let _ = app.set_activation_policy(ActivationPolicy::Regular);
                restore_dock_icon();
            }
            let mut cfg = config_reader::AppConfig::from_args(&argv);
            if !cfg.is_valid() {
                cfg = config_reader::AppConfig::from_preferences();
            }
            if cfg.is_valid() {
                apply_config(app, cfg);
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
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
                    // Warn keeps the fork's connection errors while dropping
                    // its ~6-line-per-attempt reconnect narration at Info and
                    // the full connect URL (incl. the bearer token query
                    // param) it logs at Debug. The bridge logs its own
                    // connected/disconnected/auth lines.
                    .level_for("async_nats", log::LevelFilter::Warn)
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

            let url_state = ServerUrlState { url: Arc::new(Mutex::new(None)) };
            let bridge_url_state = url_state.clone();
            app.manage(url_state);

            app.manage(DebugModeState { enabled: Arc::new(Mutex::new(false)) });

            // Empty until apply_config enables it (now, on recovery, or on a
            // single-instance relaunch). The bridge clone shares the same source.
            let token_source = TokenSource::new();
            let bridge_token_source = token_source.clone();
            app.manage(token_source);

            // Seed for the bridge; the WebView can override at runtime via
            // nats_set_machine_id. Captured before apply_config consumes config.
            let machine_id = config.machine_id.clone();
            let startup_valid = config.is_valid();
            apply_config(app.handle(), config);

            if !startup_valid {
                log::warn!("config incomplete at startup — starting recovery watcher");
                let handle = app.handle().clone();
                std::thread::spawn(move || loop {
                    std::thread::sleep(std::time::Duration::from_secs(5));
                    let cfg = config_reader::AppConfig::from_preferences();
                    if cfg.is_valid() {
                        log::info!("config recovered — applying");
                        apply_config(&handle, cfg);
                        break;
                    }
                });
            }

            // Construct and start the NATS bridge. Runs an async connect
            // loop in the background; the WebView interacts via commands
            // and `nats:status` events.
            let bridge = NatsBridge::new(
                app.handle().clone(),
                bridge_url_state,
                bridge_token_source,
                machine_id,
            );
            app.manage(bridge.clone());
            bridge.start();
            log::info!("NATS bridge initialized");
            
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

            // Windows takes a toast's app logo from the AUMID's registered icon;
            // materialize the embedded PNG to disk and register it (the agent
            // ships no resources/, so resource_dir has no icon file).
            #[cfg(target_os = "windows")]
            register_notification_icon(app.handle());

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
                .tooltip("OpenFrame")
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
                let app_submenu = Submenu::with_items(app, "OpenFrame", true, &[
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

                    // Hide the window instead
                    let _ = window.hide();
                }
                WindowEvent::Focused(true) => {
                    // Click-on-notification heuristic: when the main window
                    // gains focus shortly after a NATS-driven notification
                    // fired, ask the bridge to emit notification:click so
                    // the WebView can navigate to the source dialog.
                    if window.label() == "main" {
                        if let Some(bridge) = window.app_handle().try_state::<NatsBridge>() {
                            bridge.on_main_window_focused();
                        }
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_token,
            get_server_url,
            get_debug_mode,
            log_from_js,
            nats_status,
            nats_set_notifications_enabled,
            nats_subscribe_dialog,
            nats_unsubscribe_dialog,
            nats_register_event_channel,
        ]);
    
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

