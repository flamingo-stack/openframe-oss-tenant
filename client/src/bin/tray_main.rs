#[cfg(target_os = "macos")]
#[macro_use]
extern crate objc;

use std::process;
use std::path::Path;
use tracing::{info, error, warn};

#[cfg(target_os = "macos")]
use tray_icon::{TrayIconBuilder, menu::Menu};

#[cfg(target_os = "macos")]
use image::io::Reader as ImageReader;

/// Main entry point for the OpenFrame system tray application
fn main() {
    // Initialize logging with fallback to stdout if system logging fails
    if let Err(e) = init_simple_logging() {
        eprintln!("Failed to initialize logging: {}", e);
        // Continue anyway, just log to stdout
    }

    info!("OpenFrame Tray starting up");

    #[cfg(target_os = "macos")]
    {
        if let Err(e) = run_tray_app() {
            error!("Failed to run tray app: {}", e);
            process::exit(1);
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        eprintln!("This tray application is currently only supported on macOS");
        process::exit(1);
    }
}

/// Simple logging initialization that doesn't require system directories
fn init_simple_logging() -> Result<(), Box<dyn std::error::Error>> {
    use tracing_subscriber::{fmt, EnvFilter};
    
    // Use simple stdout logging instead of system logging
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

#[cfg(target_os = "macos")]
fn run_tray_app() -> Result<(), Box<dyn std::error::Error>> {
    use std::thread;
    use std::time::Duration;

    info!("Initializing system tray for macOS");

    // Initialize macOS application
    init_macos_app();

    // Load the tray icon
    let icon_path = get_icon_path();
    let icon = load_icon(&icon_path)?;

    // Create a simple menu (for future use)
    let menu = Menu::new();
    
    // Create the tray icon
    let _tray_icon = TrayIconBuilder::new()
        .with_menu(Box::new(menu))
        .with_tooltip("OpenFrame")
        .with_icon(icon)
        .build()?;

    info!("System tray icon created successfully");
    info!("Look for the OpenFrame icon in the menu bar (top right)");
    info!("Press Ctrl+C to stop the application");

    // Keep the application running with proper event loop
    run_event_loop();
    
    Ok(())
}

#[cfg(target_os = "macos")]
fn get_icon_path() -> String {
    // Try to find the icon in different possible locations
    let possible_paths = vec![
        "assets/icons/tray_icon.png",
        "client/assets/icons/tray_icon.png",
        "../assets/icons/tray_icon.png",
        "./tray_icon.png",
    ];

    for path in possible_paths {
        if Path::new(path).exists() {
            info!("Found icon at: {}", path);
            return path.to_string();
        }
    }

    // If no icon found, we'll create a fallback
    warn!("Icon file not found in expected locations, will create a simple fallback");
    create_fallback_icon()
}

#[cfg(target_os = "macos")]
fn create_fallback_icon() -> String {
    use std::fs;
    
    // Create a simple 64x64 PNG icon programmatically
    let icon_data = create_simple_icon_data();
    let fallback_path = "/tmp/openframe_tray_icon.png";
    
    if let Err(e) = fs::write(fallback_path, icon_data) {
        error!("Failed to create fallback icon: {}", e);
        return String::new();
    }
    
    info!("Created fallback icon at: {}", fallback_path);
    fallback_path.to_string()
}

#[cfg(target_os = "macos")]
fn create_simple_icon_data() -> Vec<u8> {
    // This is a minimal 32x32 PNG icon data (a simple square)
    vec![
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x20,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x73, 0x7A, 0x7A, 0xF4, 0x00, 0x00, 0x00,
        0x19, 0x74, 0x45, 0x58, 0x74, 0x53, 0x6F, 0x66, 0x74, 0x77, 0x61, 0x72,
        0x65, 0x00, 0x41, 0x64, 0x6F, 0x62, 0x65, 0x20, 0x49, 0x6D, 0x61, 0x67,
        0x65, 0x52, 0x65, 0x61, 0x64, 0x79, 0x71, 0xC9, 0x65, 0x3C, 0x00, 0x00,
        0x02, 0x40, 0x49, 0x44, 0x41, 0x54, 0x78, 0xDA, 0xED, 0x97, 0x4D, 0x6A,
        0x02, 0x31, 0x10, 0x85, 0xDF, 0x26, 0x26, 0x26, 0x26, 0x26, 0x26, 0x26,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]
}

#[cfg(target_os = "macos")]
fn load_icon(icon_path: &str) -> Result<tray_icon::Icon, Box<dyn std::error::Error>> {
    use tray_icon::Icon;

    if icon_path.is_empty() || !Path::new(icon_path).exists() {
        warn!("Icon file not found: {}, using fallback", icon_path);
        return create_fallback_tray_icon();
    }

    info!("Loading icon from: {}", icon_path);
    
    // Load the image
    let img = ImageReader::open(icon_path)?
        .decode()?;
    
    // Convert to RGBA
    let rgba_img = img.to_rgba8();
    let (width, height) = rgba_img.dimensions();
    let rgba_data = rgba_img.into_raw();
    
    // Create the tray icon
    let icon = Icon::from_rgba(rgba_data, width, height)?;
    
    info!("Icon loaded successfully: {}x{}", width, height);
    Ok(icon)
}

#[cfg(target_os = "macos")]
fn create_fallback_tray_icon() -> Result<tray_icon::Icon, Box<dyn std::error::Error>> {
    use tray_icon::Icon;
    
    // Create a simple 64x64 red square as fallback for better visibility
    let width = 64;
    let height = 64;
    let mut rgba_data = Vec::with_capacity((width * height * 4) as usize);
    
    for y in 0..height {
        for x in 0..width {
            // Create a simple pattern - blue square with white border
            if x == 0 || x == width - 1 || y == 0 || y == height - 1 {
                // White border
                rgba_data.extend_from_slice(&[255, 255, 255, 255]);
            } else if x > 16 && x < width - 16 && y > 16 && y < height - 16 {
                // Inner bright red square - very visible!
                rgba_data.extend_from_slice(&[255, 0, 0, 255]);
            } else {
                // Light red area
                rgba_data.extend_from_slice(&[255, 150, 150, 255]);
            }
        }
    }
    
    let icon = Icon::from_rgba(rgba_data, width, height)?;
    info!("Created fallback tray icon: {}x{}", width, height);
    Ok(icon)
}

#[cfg(target_os = "macos")]
fn init_macos_app() {
    use objc::runtime::{Class, Object};
    use objc::{class, msg_send, sel, sel_impl};
    
    unsafe {
        // Get NSApplication class
        let ns_app_class: &Class = class!(NSApplication);
        let shared_app: *mut Object = msg_send![ns_app_class, sharedApplication];
        
        if !shared_app.is_null() {
            // Set activation policy to accessory (1) so the app doesn't appear in dock
            let _: () = msg_send![shared_app, setActivationPolicy: 1];
            info!("macOS NSApplication initialized");
        } else {
            warn!("Failed to get NSApplication shared instance");
        }
    }
}

#[cfg(target_os = "macos")]
fn run_event_loop() {
    use tao::event_loop::{EventLoop, ControlFlow};
    use tao::event::Event;
    
    // Create proper event loop for macOS
    let event_loop = EventLoop::new();
    
    // Set up signal handler for graceful shutdown
    ctrlc::set_handler(move || {
        println!("Received interrupt signal, shutting down...");
        std::process::exit(0);
    }).expect("Error setting Ctrl-C handler");
    
    println!("Starting macOS event loop...");
    
    // Run the proper macOS event loop
    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        
        match event {
            Event::WindowEvent { .. } => {
                // Handle window events if needed
            }
            Event::MainEventsCleared => {
                // Main events cleared
            }
            _ => {}
        }
    });
}
