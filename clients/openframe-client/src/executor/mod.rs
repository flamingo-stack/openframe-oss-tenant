mod env;
mod output;
mod tempfile;

#[cfg(unix)]
mod unix;
#[cfg(windows)]
mod windows;

#[cfg(unix)]
pub use unix::execute_script;
#[cfg(windows)]
pub use windows::execute_script;

pub struct ScriptParams<'a> {
    pub code: &'a str,
    pub shell: &'a str,
    pub args: &'a [String],
    pub timeout_secs: u32,
    pub run_as_user: Option<&'a str>,
    pub env_vars: &'a [String],
}

pub struct ExecResult {
    pub stdout: String,
    pub stderr: String,
    pub retcode: i32,
    pub timed_out: bool,
}
