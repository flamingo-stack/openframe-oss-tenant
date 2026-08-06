use tokio::io::{AsyncRead, AsyncReadExt};
use tokio::task::JoinHandle;
use tokio::time::{timeout, Duration};

pub(crate) const MAX_OUTPUT_SIZE: usize = 10 * 1024 * 1024;

pub(crate) async fn join_reads(
    mut stdout_task: JoinHandle<Vec<u8>>,
    mut stderr_task: JoinHandle<Vec<u8>>,
    grace: Duration,
    kill: impl FnOnce(),
) -> (Vec<u8>, Vec<u8>) {
    let pair = async {
        let out = (&mut stdout_task).await.unwrap_or_default();
        let err = (&mut stderr_task).await.unwrap_or_default();
        (out, err)
    };
    tokio::pin!(pair);

    match timeout(grace, &mut pair).await {
        Ok(result) => result,
        Err(_) => {
            tracing::warn!(
                "output streams still open after exit (backgrounded child?), killing process tree"
            );
            kill();
            timeout(grace, &mut pair).await.unwrap_or_default()
        }
    }
}

pub(crate) async fn read_capped<R>(reader: Option<R>) -> Vec<u8>
where
    R: AsyncRead + Unpin,
{
    let mut reader = match reader {
        Some(reader) => reader,
        None => return Vec::new(),
    };

    let mut buf = Vec::new();
    {
        let mut capped = (&mut reader).take(MAX_OUTPUT_SIZE as u64);
        let _ = capped.read_to_end(&mut buf).await;
    }

    if buf.len() >= MAX_OUTPUT_SIZE {
        tracing::warn!(
            cap = MAX_OUTPUT_SIZE,
            "command output hit cap, draining remainder"
        );
        let mut sink = tokio::io::sink();
        let _ = tokio::io::copy(&mut reader, &mut sink).await;
    }

    buf
}

pub(crate) fn clean_string(bytes: &[u8]) -> String {
    let bytes = if bytes.len() > MAX_OUTPUT_SIZE {
        let mut end = MAX_OUTPUT_SIZE;
        while end > 0 && (bytes[end] & 0xC0) == 0x80 {
            end -= 1;
        }
        &bytes[..end]
    } else {
        bytes
    };

    let cleaned: Vec<u8> = bytes.iter().copied().filter(|&b| b != 0).collect();

    let mut out = String::with_capacity(cleaned.len());
    let mut rest = &cleaned[..];
    loop {
        match std::str::from_utf8(rest) {
            Ok(valid) => {
                out.push_str(valid);
                break;
            }
            Err(error) => {
                out.push_str(std::str::from_utf8(&rest[..error.valid_up_to()]).unwrap());
                match error.error_len() {
                    Some(len) => rest = &rest[error.valid_up_to() + len..],
                    None => break,
                }
            }
        }
    }
    out
}

#[cfg(test)]
#[path = "output_tests.rs"]
mod tests;

