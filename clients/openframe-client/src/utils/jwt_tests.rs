use super::*;

fn make_token(payload: &str) -> String {
    format!("header.{}.sig", URL_SAFE_NO_PAD.encode(payload.as_bytes()))
}

#[test]
fn decodes_exp() {
    let token = make_token(r#"{"exp":1700000000,"sub":"machine"}"#);
    assert_eq!(token_exp_unix(&token), Some(1700000000));
}

#[test]
fn none_without_exp_claim() {
    let token = make_token(r#"{"sub":"machine"}"#);
    assert_eq!(token_exp_unix(&token), None);
}

#[test]
fn none_when_malformed() {
    assert_eq!(token_exp_unix("not-a-jwt"), None);
    assert_eq!(token_exp_unix(""), None);
}

#[test]
fn none_when_wrong_segment_count() {
    let payload = URL_SAFE_NO_PAD.encode(r#"{"exp":1700000000}"#.as_bytes());
    assert_eq!(token_exp_unix(&format!("header.{payload}")), None);
    assert_eq!(token_exp_unix(&format!("header.{payload}.sig.extra")), None);
}
