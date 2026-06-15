#[cfg(not(target_os = "windows"))]
pub fn configure_console() {}

#[cfg(target_os = "windows")]
pub use windows::configure_console;

#[cfg(target_os = "windows")]
mod windows {
    use winapi::um::consoleapi::{GetConsoleMode, SetConsoleMode};
    use winapi::um::processenv::GetStdHandle;
    use winapi::um::winbase::STD_OUTPUT_HANDLE;
    use winapi::um::wincon::{SetConsoleOutputCP, ENABLE_VIRTUAL_TERMINAL_PROCESSING};

    const CP_UTF8: u32 = 65001;

    pub fn configure_console() {
        unsafe {
            let stdout = GetStdHandle(STD_OUTPUT_HANDLE);
            let mut mode = 0u32;
            if GetConsoleMode(stdout, &mut mode) != 0 {
                SetConsoleMode(stdout, mode | ENABLE_VIRTUAL_TERMINAL_PROCESSING);
            }

            SetConsoleOutputCP(CP_UTF8);
        }
    }
}
