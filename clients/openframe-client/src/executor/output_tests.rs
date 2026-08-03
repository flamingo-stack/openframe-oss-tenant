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
