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
#[path = "jwt_tests.rs"]
mod tests;
