// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    AppHandle, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
    SystemTrayMenuItem, WindowBuilder, WindowUrl,
};
use tracing::{info, error};

fn main() {
    // Initialize logging
    init_simple_logging().expect("Failed to initialize logging");
    
    info!("OpenFrame Tray starting up - Cross Platform with Tauri + React");

    // Create system tray menu
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let show = CustomMenuItem::new("show".to_string(), "Show Chat");
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    // Create system tray
    let system_tray = SystemTray::new()
        .with_menu(tray_menu)
        .with_tooltip("OpenFrame - Click to open React chat");

    // Build the Tauri app
    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| {
            match event {
                SystemTrayEvent::LeftClick {
                    position: _,
                    size: _,
                    ..
                } => {
                    info!("System tray left clicked");
                    show_chat_window(app);
                }
                SystemTrayEvent::MenuItemClick { id, .. } => {
                    match id.as_str() {
                        "quit" => {
                            info!("Quit selected from tray menu");
                            std::process::exit(0);
                        }
                        "show" => {
                            info!("Show selected from tray menu");
                            show_chat_window(app);
                        }
                        _ => {}
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![])
        .setup(|app| {
            info!("Tauri app setup complete");
            info!("System tray icon should be visible");
            info!("Click the tray icon to open React chat window");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn show_chat_window(app: &AppHandle) {
    // Check if window already exists
    if let Some(window) = app.get_window("chat") {
        info!("Chat window already exists, showing it");
        window.show().unwrap();
        window.set_focus().unwrap();
        return;
    }

    info!("Creating new chat window");
    
    // Create the HTML content with embedded React
    let html_content = get_react_html();
    
    // Create new window with React content
    let _window = WindowBuilder::new(
        app,
        "chat",
        WindowUrl::App("index.html".into())
    )
    .title("OpenFrame Chat")
    .inner_size(800.0, 600.0)
    .resizable(true)
    .center()
    .build();

    match _window {
        Ok(window) => {
            info!("Chat window created successfully");
            // Load the HTML content
            window.eval(&format!(
                r#"document.body.innerHTML = `{}`;"#,
                html_content.replace('`', r#"\`"#)
            )).unwrap();
        }
        Err(e) => {
            error!("Failed to create chat window: {}", e);
        }
    }
}

fn get_react_html() -> String {
    r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenFrame Chat</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }
        
        .chat-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 25px;
            padding: 60px 40px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.15);
            text-align: center;
            max-width: 500px;
            width: 90%;
            border: 1px solid rgba(255, 255, 255, 0.2);
            animation: fadeIn 0.8s ease-out;
        }
        
        .chat-title {
            color: #333;
            font-size: 3em;
            margin-bottom: 20px;
            font-weight: 300;
            background: linear-gradient(45deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .chat-message {
            color: #555;
            font-size: 1.4em;
            margin-bottom: 40px;
            font-weight: 400;
            line-height: 1.6;
        }
        
        .chat-button {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 18px 35px;
            border-radius: 30px;
            font-size: 1.1em;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }
        
        .chat-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 25px rgba(102, 126, 234, 0.4);
        }
        
        .chat-button:active {
            transform: translateY(-1px);
        }
        
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            background: #4CAF50;
            border-radius: 50%;
            margin-right: 10px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
</head>
<body>
    <div id="root"></div>
    
    <script type="text/babel">
        const { useState, useEffect } = React;

        function ChatApp() {
            const [message, setMessage] = useState("Hi, I'm chat");
            const [isAnimated, setIsAnimated] = useState(false);
            const [clickCount, setClickCount] = useState(0);

            useEffect(() => {
                setIsAnimated(true);
            }, []);

            const messages = [
                "Hi, I'm chat",
                "Hello from OpenFrame! 👋",
                "Ready to assist you! 🚀",
                "What can I help you with? 💬",
                "OpenFrame at your service! ⚡",
                "Cross-platform desktop app! 💻",
                "Built with Rust + Tauri + React! 🦀⚛️",
                "System tray integration! 📱"
            ];

            const handleClick = () => {
                setClickCount(prev => prev + 1);
                const newMessage = messages[clickCount % messages.length];
                setMessage(newMessage);
            };

            return (
                <div className={`chat-container ${isAnimated ? 'fade-in' : ''}`}>
                    <h1 className="chat-title">OpenFrame</h1>
                    <p className="chat-message">
                        <span className="status-indicator"></span>
                        {message}
                    </p>
                    <button className="chat-button" onClick={handleClick}>
                        Say Hello
                    </button>
                    <div style={{ marginTop: '20px', fontSize: '0.9em', color: '#888' }}>
                        Desktop App • Cross Platform • Tauri + React
                    </div>
                </div>
            );
        }

        ReactDOM.render(<ChatApp />, document.getElementById('root'));
    </script>
</body>
</html>"#.to_string()
}

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