extern crate openframe;

use openframe::platform::permissions::PermissionUtils;

fn main() {
    println!("Testing run_as_admin function with echo command");

    // Test the run_as_admin function
    let result = PermissionUtils::run_as_admin("echo", &["Hello from run_as_admin test!"]);

    match result {
        Ok(_) => {
            println!("SUCCESS: run_as_admin executed successfully!");
        }
        Err(e) => {
            println!("FAILURE: run_as_admin failed with error: {:?}", e);
        }
    }
}
