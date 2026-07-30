use super::*;

#[test]
fn encrypt_decrypt_round_trips() {
    let svc = EncryptionService::new();
    let plaintext = r#"{"access_token":"abc","refresh_token":"def"}"#;
    let encrypted = svc.encrypt(plaintext).unwrap();
    assert_ne!(encrypted, plaintext);
    assert_eq!(svc.decrypt(&encrypted).unwrap(), plaintext);
}

// Random nonce: identical plaintext must never produce identical ciphertext.
#[test]
fn ciphertexts_differ_between_calls() {
    let svc = EncryptionService::new();
    assert_ne!(svc.encrypt("same").unwrap(), svc.encrypt("same").unwrap());
}

#[test]
fn decrypt_rejects_invalid_base64() {
    assert!(EncryptionService::new().decrypt("not base64 !!!").is_err());
}

#[test]
fn decrypt_rejects_truncated_payload() {
    use base64::{engine::general_purpose, Engine as _};
    let short = general_purpose::STANDARD.encode([0u8; 8]);
    assert!(EncryptionService::new().decrypt(&short).is_err());
}

#[test]
fn decrypt_rejects_tampered_ciphertext() {
    use base64::{engine::general_purpose, Engine as _};
    let svc = EncryptionService::new();
    let encrypted = svc.encrypt("secret").unwrap();

    let mut bytes = general_purpose::STANDARD.decode(&encrypted).unwrap();
    let last = bytes.len() - 1;
    bytes[last] ^= 0xFF;
    let tampered = general_purpose::STANDARD.encode(bytes);

    assert!(svc.decrypt(&tampered).is_err(), "AES-GCM must authenticate");
}
