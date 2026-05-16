const crypto = require('crypto');

/**
 * SecureChannel implements the Elliptic-Curve Diffie-Hellman (ECDH) key exchange
 * and AES-256-GCM authenticated encryption for secure communication.
 * 
 * This fulfills the Confidentiality and Integrity requirements of the CIA triad.
 */
class SecureChannel {
    constructor() {
        // Using secp256k1, the standard curve used in many high-security applications
        this.ecdh = crypto.createECDH('secp256k1');
        this.ecdh.generateKeys();
        this.aesKey = null;
    }

    /**
     * Gets the public key to share with the other untrusted party.
     * @returns {string} Hexadecimal representation of the public key
     */
    getPublicKey() {
        return this.ecdh.getPublicKey('hex');
    }

    /**
     * Computes the shared symmetric secret using the other party's public key.
     * @param {string} otherPublicKeyHex 
     */
    computeSharedSecret(otherPublicKeyHex) {
        // ECDH math: Your Private Key + Their Public Key = Shared Secret
        const sharedSecret = this.ecdh.computeSecret(otherPublicKeyHex, 'hex');
        
        // We hash the shared secret with SHA-256 to ensure we get a perfect 32-byte key for AES-256
        this.aesKey = crypto.createHash('sha256').update(sharedSecret).digest();
        return true;
    }

    /**
     * Encrypts a payload using AES-256-GCM.
     * @param {Object|string} payload The data to encrypt
     * @returns {Object} The encryption envelope containing ciphertext, iv, and auth tag
     */
    encrypt(payload) {
        if (!this.aesKey) throw new Error("Security Error: Shared secret not computed yet.");
        
        // GCM standard requires a unique 12-byte (96-bit) Initialization Vector per encryption
        const iv = crypto.randomBytes(12); 
        
        const cipher = crypto.createCipheriv('aes-256-gcm', this.aesKey, iv);
        
        const stringifiedPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
        let ciphertext = cipher.update(stringifiedPayload, 'utf8', 'hex');
        ciphertext += cipher.final('hex');
        
        // The Authentication Tag provides Integrity - it proves the ciphertext hasn't been tampered with
        const authTag = cipher.getAuthTag().toString('hex');

        return {
            ciphertext,
            iv: iv.toString('hex'),
            authTag
        };
    }

    /**
     * Decrypts an AES-256-GCM encrypted envelope.
     * @param {Object} envelope The envelope containing ciphertext, iv, and authTag
     * @returns {Object|string} The decrypted plaintext
     */
    decrypt({ ciphertext, iv, authTag }) {
        if (!this.aesKey) throw new Error("Security Error: Shared secret not computed yet.");

        const decipher = crypto.createDecipheriv(
            'aes-256-gcm', 
            this.aesKey, 
            Buffer.from(iv, 'hex')
        );
        
        // Set the auth tag to verify integrity before decryption
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));

        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8'); // Will throw error if tampered!

        try {
            return JSON.parse(decrypted);
        } catch (e) {
            return decrypted; // Fallback if plaintext was just a string
        }
    }
}

module.exports = {
    SecureChannel
};
