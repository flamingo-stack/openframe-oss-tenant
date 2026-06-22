use std::collections::HashSet;
use std::os::windows::io::AsRawHandle;
use std::path::{Path, PathBuf};

use anyhow::{anyhow, Result};
use windows::core::PWSTR;
use windows::Win32::Foundation::{
    CloseHandle, SetHandleInformation, HANDLE, HANDLE_FLAG_INHERIT, TRUE, WAIT_TIMEOUT,
};
use windows::Win32::Security::{
    DuplicateTokenEx, SecurityImpersonation, TokenPrimary, TOKEN_ALL_ACCESS,
};
use windows::Win32::System::Environment::{CreateEnvironmentBlock, DestroyEnvironmentBlock};
use windows::Win32::System::RemoteDesktop::{
    WTSActive, WTSEnumerateSessionsW, WTSFreeMemory, WTSGetActiveConsoleSessionId,
    WTSQueryUserToken, WTS_CURRENT_SERVER_HANDLE, WTS_SESSION_INFOW,
};
use windows::Win32::System::Threading::{
    CreateProcessAsUserW, GetExitCodeProcess, ResumeThread, WaitForSingleObject, CREATE_NO_WINDOW,
    CREATE_SUSPENDED, CREATE_UNICODE_ENVIRONMENT, PROCESS_INFORMATION, STARTF_USESHOWWINDOW,
    STARTF_USESTDHANDLES, STARTUPINFOW,
};
use windows::Win32::UI::WindowsAndMessaging::SW_HIDE;

use super::job::JobHandle;
use super::Interpreter;
use crate::executor::env::split_env;
use crate::executor::output::{clean_string, MAX_OUTPUT_SIZE};
use crate::executor::tempfile::{temp_script_name, TempFileGuard};
use crate::executor::{ExecResult, ScriptParams};

pub(super) async fn run_as_interactive(
    interpreter: &Interpreter,
    tmp_file: &Path,
    params: &ScriptParams<'_>,
) -> ExecResult {
    let command_line = build_command_line(interpreter, tmp_file, params.args);
    let dir = match tmp_file.parent() {
        Some(dir) => dir.to_path_buf(),
        None => return super::spawn_error("temp script has no parent directory".to_string()),
    };
    let out_path = dir.join(temp_script_name("out"));
    let err_path = dir.join(temp_script_name("err"));
    let timeout_secs = params.timeout_secs;
    let env_vars: Vec<String> = params.env_vars.to_vec();

    let result = tokio::task::spawn_blocking(move || {
        run_as_blocking(command_line, env_vars, out_path, err_path, timeout_secs)
    })
    .await;

    match result {
        Ok(Ok(exec)) => exec,
        Ok(Err(e)) => super::spawn_error(e.to_string()),
        Err(e) => super::spawn_error(format!("run-as task failed: {e}")),
    }
}

fn build_command_line(interpreter: &Interpreter, tmp_file: &Path, args: &[String]) -> String {
    let mut parts = vec![quote(&interpreter.exe)];
    for &flag in interpreter.flags {
        parts.push(flag.to_string());
    }
    parts.push(quote(&tmp_file.to_string_lossy()));
    for arg in args {
        parts.push(quote(arg));
    }
    parts.join(" ")
}

fn quote(arg: &str) -> String {
    if !arg.is_empty()
        && !arg
            .bytes()
            .any(|b| matches!(b, b' ' | b'\t' | b'"' | b'\\'))
    {
        return arg.to_string();
    }
    let mut out = String::from('"');
    let mut backslashes = 0usize;
    for c in arg.chars() {
        if c == '\\' {
            backslashes += 1;
        } else {
            if c == '"' {
                out.extend(std::iter::repeat_n('\\', backslashes * 2 + 1));
            } else {
                out.extend(std::iter::repeat_n('\\', backslashes));
            }
            backslashes = 0;
            out.push(c);
        }
    }
    out.extend(std::iter::repeat_n('\\', backslashes * 2));
    out.push('"');
    out
}

fn run_as_blocking(
    command_line: String,
    env_vars: Vec<String>,
    out_path: PathBuf,
    err_path: PathBuf,
    timeout_secs: u32,
) -> Result<ExecResult> {
    let token = InteractiveToken::acquire()?;

    let in_file = std::fs::File::open("NUL").map_err(|e| anyhow!("failed to open NUL: {e}"))?;
    let out_file = std::fs::File::create(&out_path)
        .map_err(|e| anyhow!("failed to create stdout file: {e}"))?;
    let err_file = std::fs::File::create(&err_path)
        .map_err(|e| anyhow!("failed to create stderr file: {e}"))?;
    let _out_guard = TempFileGuard {
        path: out_path.clone(),
    };
    let _err_guard = TempFileGuard {
        path: err_path.clone(),
    };

    let in_handle = HANDLE(in_file.as_raw_handle() as isize);
    let out_handle = HANDLE(out_file.as_raw_handle() as isize);
    let err_handle = HANDLE(err_file.as_raw_handle() as isize);
    unsafe {
        make_inheritable(in_handle)?;
        make_inheritable(out_handle)?;
        make_inheritable(err_handle)?;
    }

    let mut env_block = build_env_block(&token, &env_vars);

    let startup = STARTUPINFOW {
        cb: core::mem::size_of::<STARTUPINFOW>() as u32,
        dwFlags: STARTF_USESTDHANDLES | STARTF_USESHOWWINDOW,
        wShowWindow: SW_HIDE.0 as u16,
        hStdInput: in_handle,
        hStdOutput: out_handle,
        hStdError: err_handle,
        ..Default::default()
    };

    let mut wide: Vec<u16> = command_line
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();
    let mut process_info = PROCESS_INFORMATION::default();

    let spawn = unsafe {
        CreateProcessAsUserW(
            token.0,
            None,
            PWSTR(wide.as_mut_ptr()),
            None,
            None,
            TRUE,
            CREATE_SUSPENDED | CREATE_NO_WINDOW | CREATE_UNICODE_ENVIRONMENT,
            Some(env_block.as_mut_ptr() as *const core::ffi::c_void),
            None,
            &startup,
            &mut process_info,
        )
    };
    spawn.map_err(|e| anyhow!("CreateProcessAsUserW failed: {e}"))?;

    let job = JobHandle::for_handle(process_info.hProcess);
    unsafe {
        ResumeThread(process_info.hThread);
    }

    let wait_ms = ((timeout_secs as u64).saturating_mul(1000)).min(u32::MAX as u64 - 1) as u32;
    let timed_out = unsafe { WaitForSingleObject(process_info.hProcess, wait_ms) == WAIT_TIMEOUT };

    let exit_code = if timed_out {
        job.terminate();
        98
    } else {
        let mut code: u32 = 1;
        unsafe {
            let _ = GetExitCodeProcess(process_info.hProcess, &mut code);
        }
        code as i32
    };

    unsafe {
        let _ = CloseHandle(process_info.hThread);
        let _ = CloseHandle(process_info.hProcess);
    }
    drop(in_file);
    drop(out_file);
    drop(err_file);

    let stdout = read_capped_file(&out_path);
    let mut stderr = read_capped_file(&err_path);
    if timed_out {
        stderr.push_str(&format!(
            "\nScript timed out after {} seconds",
            timeout_secs
        ));
    }

    Ok(ExecResult {
        stdout,
        stderr,
        retcode: exit_code,
        timed_out,
    })
}

unsafe fn make_inheritable(handle: HANDLE) -> Result<()> {
    SetHandleInformation(handle, HANDLE_FLAG_INHERIT.0, HANDLE_FLAG_INHERIT)
        .map_err(|e| anyhow!("SetHandleInformation failed: {e}"))
}

fn build_env_block(token: &InteractiveToken, extra: &[String]) -> Vec<u16> {
    let mut base = match user_environment(token) {
        Some(entries) => entries,
        None => std::env::vars().map(|(k, v)| format!("{k}={v}")).collect(),
    };

    let extra_keys: HashSet<String> = extra
        .iter()
        .filter_map(|var| split_env(var).map(|(key, _)| key.to_uppercase()))
        .collect();
    base.retain(|entry| {
        split_env(entry)
            .map(|(key, _)| !extra_keys.contains(&key.to_uppercase()))
            .unwrap_or(true)
    });
    for var in extra {
        if split_env(var).is_some() {
            base.push(var.clone());
        }
    }

    let mut block = Vec::new();
    for entry in &base {
        block.extend(entry.encode_utf16());
        block.push(0);
    }
    block.push(0);
    block
}

fn user_environment(token: &InteractiveToken) -> Option<Vec<String>> {
    let mut ptr: *mut core::ffi::c_void = core::ptr::null_mut();
    unsafe {
        if CreateEnvironmentBlock(&mut ptr, token.0, false).is_err() || ptr.is_null() {
            tracing::warn!("CreateEnvironmentBlock failed; falling back to agent environment");
            return None;
        }
        let entries = collect_block(ptr as *const u16);
        let _ = DestroyEnvironmentBlock(ptr);
        Some(entries)
    }
}

unsafe fn collect_block(mut ptr: *const u16) -> Vec<String> {
    let mut entries = Vec::new();
    loop {
        let mut len = 0;
        while *ptr.add(len) != 0 {
            len += 1;
        }
        if len == 0 {
            break;
        }
        let slice = std::slice::from_raw_parts(ptr, len);
        entries.push(String::from_utf16_lossy(slice));
        ptr = ptr.add(len + 1);
    }
    entries
}

fn read_capped_file(path: &Path) -> String {
    use std::io::Read;
    match std::fs::File::open(path) {
        Ok(file) => {
            let mut bytes = Vec::new();
            let _ = file.take(MAX_OUTPUT_SIZE as u64).read_to_end(&mut bytes);
            clean_string(&bytes)
        }
        Err(_) => String::new(),
    }
}

struct InteractiveToken(HANDLE);

impl InteractiveToken {
    fn acquire() -> Result<Self> {
        if let Some(token) = Self::token_for_active_session() {
            return Self::to_primary(token);
        }
        Err(anyhow!(
            "run_as_user requested but no active interactive session"
        ))
    }

    fn token_for_active_session() -> Option<HANDLE> {
        unsafe {
            let console = WTSGetActiveConsoleSessionId();
            if console != 0xFFFF_FFFF {
                let mut token = HANDLE::default();
                if WTSQueryUserToken(console, &mut token).is_ok() {
                    return Some(token);
                }
            }
            first_active_session_token()
        }
    }

    fn to_primary(user_token: HANDLE) -> Result<Self> {
        unsafe {
            let mut primary = HANDLE::default();
            let dup = DuplicateTokenEx(
                user_token,
                TOKEN_ALL_ACCESS,
                None,
                SecurityImpersonation,
                TokenPrimary,
                &mut primary,
            );
            let _ = CloseHandle(user_token);
            dup.map_err(|e| anyhow!("DuplicateTokenEx failed: {e}"))?;
            Ok(InteractiveToken(primary))
        }
    }
}

unsafe fn first_active_session_token() -> Option<HANDLE> {
    let mut sessions: *mut WTS_SESSION_INFOW = core::ptr::null_mut();
    let mut count: u32 = 0;
    WTSEnumerateSessionsW(WTS_CURRENT_SERVER_HANDLE, 0, 1, &mut sessions, &mut count).ok()?;

    let mut result = None;
    let slice = core::slice::from_raw_parts(sessions, count as usize);
    for info in slice {
        if info.State == WTSActive {
            let mut token = HANDLE::default();
            if WTSQueryUserToken(info.SessionId, &mut token).is_ok() {
                result = Some(token);
                break;
            }
        }
    }
    WTSFreeMemory(sessions as *mut core::ffi::c_void);
    result
}

impl Drop for InteractiveToken {
    fn drop(&mut self) {
        unsafe {
            let _ = CloseHandle(self.0);
        }
    }
}
