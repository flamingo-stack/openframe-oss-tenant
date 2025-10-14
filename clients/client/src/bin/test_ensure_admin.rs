extern crate openframe;

use openframe::platform::permissions::PermissionUtils;

fn main() {
    println!("Testing ensure_admin function");

    // Test the ensure_admin function
    let result = PermissionUtils::ensure_admin();

    match result {
        Ok(_) => {
            println!("SUCCESS: ensure_admin executed successfully!");
        }
        Err(e) => {
            println!("FAILURE: ensure_admin failed with error: {:?}", e);
        }
    }
}
