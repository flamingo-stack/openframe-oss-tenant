use super::*;

#[test]
fn detects_client_secret_invalid() {
    let body = r#"{"code":"CLIENT_SECRET_INVALID","message":"Invalid client secret"}"#;
    assert!(is_client_secret_error(StatusCode::UNAUTHORIZED, body));
}

#[test]
fn detects_client_secret_empty() {
    let body = r#"{"code":"CLIENT_SECRET_EMPTY","message":"Client secret is empty"}"#;
    assert!(is_client_secret_error(StatusCode::UNAUTHORIZED, body));
}

#[test]
fn ignores_other_401_error_codes() {
    let body = r#"{"code":"INITIAL_KEY_INVALID","message":"..."}"#;
    assert!(!is_client_secret_error(StatusCode::UNAUTHORIZED, body));
}

#[test]
fn ignores_client_secret_error_on_non_401() {
    let body = r#"{"code":"CLIENT_SECRET_INVALID"}"#;
    assert!(!is_client_secret_error(StatusCode::BAD_REQUEST, body));
}

#[test]
fn handles_non_json_body() {
    assert!(!is_client_secret_error(
        StatusCode::UNAUTHORIZED,
        "gateway timeout"
    ));
}

#[test]
fn terminal_statuses_are_already_gone() {
    for status in [
        StatusCode::UNAUTHORIZED,
        StatusCode::FORBIDDEN,
        StatusCode::NOT_FOUND,
        StatusCode::GONE,
    ] {
        assert!(is_already_gone(status), "{status} should be terminal");
    }
}

#[test]
fn transient_statuses_are_not_already_gone() {
    for status in [
        StatusCode::BAD_REQUEST,
        StatusCode::TOO_MANY_REQUESTS,
        StatusCode::INTERNAL_SERVER_ERROR,
        StatusCode::BAD_GATEWAY,
        StatusCode::SERVICE_UNAVAILABLE,
    ] {
        assert!(!is_already_gone(status), "{status} should be retried");
    }
}
