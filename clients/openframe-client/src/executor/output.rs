use tokio::io::{AsyncRead, AsyncReadExt};

pub(crate) const MAX_OUTPUT_SIZE: usize = 10 * 1024 * 1024;

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
mod tests {
    use super::*;

    #[test]
    fn strips_nulls() {
        assert_eq!(clean_string(b"a\x00b\x00c"), "abc");
    }

    #[test]
    fn drops_invalid_keeps_replacement_char() {
        let mut bytes = b"ok".to_vec();
        bytes.push(0xFF);
        bytes.extend_from_slice(b"end");
        assert_eq!(clean_string(&bytes), "okend");
        assert_eq!(clean_string("a\u{FFFD}b".as_bytes()), "a\u{FFFD}b");
    }

    #[test]
    fn passes_valid_utf8_through() {
        assert_eq!(clean_string("héllo\nworld".as_bytes()), "héllo\nworld");
    }
}
