use super::*;

async fn run(code: &str, args: &[String], env: &[String]) -> ExecResult {
    execute_script(ScriptParams {
        code,
        shell: "/bin/sh",
        args,
        timeout_secs: 30,
        privilege: crate::executor::Privilege::Agent,
        env_vars: env,
    })
    .await
}

#[tokio::test]
async fn happy_path() {
    let r = run("#!/bin/sh\necho hi\n", &[], &[]).await;
    assert_eq!(r.stdout, "hi\n");
    assert_eq!(r.retcode, 0);
    assert!(!r.timed_out);
}

#[tokio::test]
async fn script_exit_code() {
    let r = run("#!/bin/sh\nexit 42\n", &[], &[]).await;
    assert_eq!(r.retcode, 42);
}

#[tokio::test]
async fn stderr_captured() {
    let r = run("#!/bin/sh\necho err 1>&2\n", &[], &[]).await;
    assert_eq!(r.stdout, "");
    assert_eq!(r.stderr, "err\n");
}

#[tokio::test]
async fn raw_no_trailing_newline() {
    let r = run("#!/bin/sh\nprintf hi\n", &[], &[]).await;
    assert_eq!(r.stdout, "hi");
}

#[tokio::test]
async fn raw_preserves_crlf_in_output() {
    let r = run("#!/bin/sh\nprintf 'a\\r\\nb'\n", &[], &[]).await;
    assert_eq!(r.stdout, "a\r\nb");
}

#[tokio::test]
async fn passes_args() {
    let args = vec!["x".to_string(), "y".to_string()];
    let r = run("#!/bin/sh\necho \"$1 $2\"\n", &args, &[]).await;
    assert_eq!(r.stdout, "x y\n");
}

#[tokio::test]
async fn applies_env_vars() {
    let env = vec!["FOO=bar".to_string()];
    let r = run("#!/bin/sh\nprintf '%s' \"$FOO\"\n", &[], &env).await;
    assert_eq!(r.stdout, "bar");
}

#[tokio::test]
async fn env_value_with_equals() {
    let env = vec!["K=a=b".to_string()];
    let r = run("#!/bin/sh\nprintf '%s' \"$K\"\n", &[], &env).await;
    assert_eq!(r.stdout, "a=b");
}

#[tokio::test]
async fn crlf_in_code_normalized() {
    let r = run("#!/bin/sh\r\necho hi\r\n", &[], &[]).await;
    assert_eq!(r.stdout, "hi\n");
    assert_eq!(r.retcode, 0);
}

#[tokio::test]
async fn no_shebang_runs_via_sh() {
    let r = run("echo hi\n", &[], &[]).await;
    assert_eq!(r.stdout, "hi\n");
    assert_eq!(r.retcode, 0);
}

#[tokio::test]
async fn bad_shebang_interpreter_fails() {
    let r = run("#!/nonexistent/ofcmd-bad-interp\necho hi\n", &[], &[]).await;
    assert_eq!(r.retcode, 85);
}

#[tokio::test]
async fn empty_code_runs_empty() {
    let r = run("", &[], &[]).await;
    assert_eq!(r.retcode, 0);
    assert_eq!(r.stdout, "");
}
