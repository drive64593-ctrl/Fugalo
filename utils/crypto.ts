// Simple encryption utility for frontend storage
// Note: This provides obfuscation and basic security for local storage. 
// It prevents casual reading of cookies but is not military-grade encryption.

const SECRET_KEY = 'AUTOSEED_SECURE_V1_KEY';

export const encryptData = (text: string): string => {
  if (!text) return '';
  try {
    // 1. Convert string to byte array (UTF-8)
    const textBytes = new TextEncoder().encode(text);
    const keyBytes = new TextEncoder().encode(SECRET_KEY);
    
    // 2. XOR Cipher
    const encryptedBytes = textBytes.map((byte, i) => byte ^ keyBytes[i % keyBytes.length]);
    
    // 3. Convert to Binary String
    const binaryString = String.fromCharCode(...encryptedBytes);
    
    // 4. Base64 Encode to store safely as string
    return btoa(binaryString);
  } catch (e) {
    console.error("Encryption error:", e);
    return '';
  }
};

export const decryptData = (ciphertext: string): string => {
  if (!ciphertext) return '';
  try {
    // 1. Base64 Decode
    const binaryString = atob(ciphertext);
    
    // 2. Convert to Byte Array
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    // 3. XOR Cipher (Reversible)
    const keyBytes = new TextEncoder().encode(SECRET_KEY);
    const decryptedBytes = bytes.map((byte, i) => byte ^ keyBytes[i % keyBytes.length]);
    
    // 4. Decode to UTF-8 String
    return new TextDecoder().decode(decryptedBytes);
  } catch (e) {
    console.error("Decryption error:", e);
    return '';
  }
};