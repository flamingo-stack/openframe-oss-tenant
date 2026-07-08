use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use serde::Deserialize;

#[derive(Deserialize)]
struct ExpClaim {
    exp: i64,
}

/// Decode a JWT's `exp` claim (seconds since the Unix epoch) without verifying the signature.
/// Returns `None` if the token is malformed or carries no `exp`.
pub fn token_exp_unix(token: &str) -> Option<i64> {
    // Require a well-formed `header.payload.signature` — reject tokens with missing or extra parts.
    let mut parts = token.split('.');
    let (Some(_header), Some(payload), Some(_signature), None) =
        (parts.next(), parts.next(), parts.next(), parts.next())
    else {
        return None;
    };
    let bytes = URL_SAFE_NO_PAD.decode(payload.trim_end_matches('=')).ok()?;
    let claim: ExpClaim = serde_json::from_slice(&bytes).ok()?;
    Some(claim.exp)
}

#[cfg(test)]
mod tests {
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
}
