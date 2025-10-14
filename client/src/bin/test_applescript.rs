use std::process::Command;

fn main() {
    println!("Testing AppleScript with different syntax variations");

    // Test the exact format used in run_as_admin
    let command = "echo";
    let args = ["Hello from elevated privileges!"];

    // Critical fix: properly escape quotes for AppleScript
    let apple_script = format!(
        "do shell script \"{} {}\" with administrator privileges with prompt \"OpenFrame requires administrator privileges\"",
        command, args[0]
    );

    println!("\nTesting fixed format: {}", apple_script);

    let result = Command::new("osascript")
        .arg("-e")
        .arg(apple_script)
        .status();

    match result {
        Ok(status) => {
            println!("Command executed with status: {}", status);
            if status.success() {
                println!("SUCCESS: Format works correctly!");
            } else {
                println!("FAILURE: Format failed with exit code: {:?}", status.code());
            }
        }
        Err(e) => {
            println!("FAILURE: Format error: {}", e);
        }
    }
}
