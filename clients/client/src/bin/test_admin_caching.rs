extern crate openframe;

use openframe::platform::permissions::PermissionUtils;

fn main() {
    println!("Testing admin privilege caching");

    // First call to ensure_admin should prompt for privileges
    println!("\n1. First call to ensure_admin:");
    let result1 = PermissionUtils::ensure_admin();
    match result1 {
        Ok(_) => println!("✅ Successfully obtained admin privileges on first call"),
        Err(e) => println!("❌ Failed to obtain admin privileges: {:?}", e),
    }

    // Second call should use cached privileges and NOT prompt again
    println!("\n2. Second call to ensure_admin (should use cache):");
    let result2 = PermissionUtils::ensure_admin();
    match result2 {
        Ok(_) => println!("✅ Successfully used cached admin privileges on second call"),
        Err(e) => println!("❌ Failed on second call: {:?}", e),
    }

    // Test run_as_admin (should use cached privileges)
    println!("\n3. Call to run_as_admin with echo (should use cache):");
    let result3 = PermissionUtils::run_as_admin("echo", &["Admin privileges are cached!"]);
    match result3 {
        Ok(_) => println!("✅ Successfully ran command with cached admin privileges"),
        Err(e) => println!("❌ Failed to run command: {:?}", e),
    }

    println!("\nTest completed. If you didn't see multiple authentication prompts, the caching is working correctly.");
}
