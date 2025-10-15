use aes_gcm::{
    aead::{Aead, KeyInit, generic_array::GenericArray},
    Aes256Gcm,
};
use base64::{Engine as _, engine::general_purpose};

/// Service for decrypting tokens encrypted with AES-256-GCM alg
#[derive(Clone)]
pub struct TokenDecryptionService {
    key: [u8; 32],
}

impl TokenDecryptionService {
    /// Creates a new TokenDecryptionService with the provided secret key
    pub fn new(secret: String) -> Result<Self, String> {
        if secret.len() != 32 {
            return Err(format!("Secret must be exactly 32 bytes, got {}", secret.len()));
        }
        
        let mut key = [0u8; 32];
        key.copy_from_slice(secret.as_bytes());
        
        Ok(Self { key })
    }

    /// Decrypts an encrypted token
    pub fn decrypt(&self, encrypted_data: &str) -> Result<String, String> {
        // Decode base64
        let combined = general_purpose::STANDARD.decode(encrypted_data)
            .map_err(|e| format!("Failed to decode base64: {}", e))?;

        if combined.len() < 12 {
            return Err("Encrypted data too short".to_string());
        }

        // Extract nonce (first 12 bytes) and ciphertext (rest)
        let (nonce_bytes, ciphertext) = combined.split_at(12);
        let nonce = GenericArray::from_slice(nonce_bytes);

        // Create cipher
        let cipher = Aes256Gcm::new_from_slice(&self.key)
            .map_err(|e| format!("Failed to create cipher: {}", e))?;

        // Decrypt
        let plaintext = cipher.decrypt(nonce, ciphertext)
            .map_err(|e| format!("Failed to decrypt: {}", e))?;

        // Convert to string
        String::from_utf8(plaintext)
            .map_err(|e| format!("Failed to convert to UTF-8: {}", e))
    }
}

