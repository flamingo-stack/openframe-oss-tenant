use aes_gcm::{
    aead::{generic_array::GenericArray, rand_core::RngCore, Aead, KeyInit, OsRng},
    Aes256Gcm,
};
use anyhow::Result;
use base64::{engine::general_purpose, Engine as _};

#[derive(Clone)]
pub struct EncryptionService;

impl EncryptionService {
    // TODO: use generated key
    const KEY: &'static str = "12345678901234567890123456789012";

    pub fn new() -> Self {
        Self
    }

    pub fn encrypt(&self, data: &str) -> Result<String> {
        let key = Aes256Gcm::new_from_slice(Self::KEY.as_bytes())
            .map_err(|e| anyhow::anyhow!("Failed to create encryption key: {}", e))?;

        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = GenericArray::from_slice(&nonce_bytes);

        let ciphertext = key
            .encrypt(nonce, data.as_bytes())
            .map_err(|e| anyhow::anyhow!("Failed to encrypt data: {}", e))?;

        let mut combined = nonce_bytes.to_vec();
        combined.extend_from_slice(&ciphertext);

        let base64_encoded = general_purpose::STANDARD.encode(combined);
        Ok(base64_encoded)
    }
}
