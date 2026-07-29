use aes_gcm::{
    aead::{generic_array::GenericArray, rand_core::RngCore, Aead, KeyInit, OsRng},
    Aes256Gcm,
};
use anyhow::Result;
use base64::{engine::general_purpose, Engine as _};

#[derive(Clone)]
pub struct EncryptionService;

impl Default for EncryptionService {
    /// Constructs an encryption service.
    ///
    /// # Examples
    ///
    /// ```
    /// let _service = EncryptionService::default();
    /// ```
    fn default() -> Self {
        Self::new()
    }
}

impl EncryptionService {
    // TODO: use generated key
    const KEY: &'static str = "12345678901234567890123456789012";

    /// Creates an encryption service.
    ///
    /// # Examples
    ///
    /// ```
    /// let service = EncryptionService::new();
    /// ```
    pub fn new() -> Self {
        Self
    }

    /// Encrypts text with AES-256-GCM and encodes the result as Base64.
    ///
    /// # Examples
    ///
    /// ```
    /// let service = EncryptionService::new();
    /// let encrypted = service.encrypt("secret message").unwrap();
    ///
    /// assert!(!encrypted.is_empty());
    /// ```
    ///
    /// # Returns
    ///
    /// The Base64-encoded nonce and ciphertext.
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

        Ok(general_purpose::STANDARD.encode(combined))
    }

    /// Decrypts Base64-encoded AES-256-GCM data into a UTF-8 string.
    ///
    /// # Examples
    ///
    /// ```
    /// let service = EncryptionService::new();
    /// let encrypted = service.encrypt("secret")?;
    ///
    /// assert_eq!(service.decrypt(&encrypted)?, "secret");
    /// # Ok::<(), anyhow::Error>(())
    /// ```
    ///
    /// # Errors
    ///
    /// Returns an error if the input is not valid Base64, is too short to contain
    /// a nonce, fails authentication, or does not contain valid UTF-8.
    ///
    /// # Arguments
    ///
    /// * `encrypted_data` - Base64-encoded data containing the nonce and ciphertext.
    ///
    /// # Returns
    ///
    /// The decrypted UTF-8 string.
    pub fn decrypt(&self, encrypted_data: &str) -> Result<String> {
        let combined = general_purpose::STANDARD
            .decode(encrypted_data)
            .map_err(|e| anyhow::anyhow!("Failed to decode base64: {}", e))?;

        if combined.len() < 12 {
            anyhow::bail!("Encrypted data too short");
        }

        let (nonce_bytes, ciphertext) = combined.split_at(12);
        let nonce = GenericArray::from_slice(nonce_bytes);

        let cipher = Aes256Gcm::new_from_slice(Self::KEY.as_bytes())
            .map_err(|e| anyhow::anyhow!("Failed to create cipher: {}", e))?;

        let plaintext = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| anyhow::anyhow!("Failed to decrypt: {}", e))?;

        String::from_utf8(plaintext)
            .map_err(|e| anyhow::anyhow!("Failed to convert to UTF-8: {}", e))
    }
}
