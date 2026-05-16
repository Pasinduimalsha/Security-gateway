const { SecureChannel } = require('./crypto');
const crypto = require('crypto');

/**
 * EnclaveClient acts as the secure intermediary between the Proxy and the TEE.
 * It enforces Enclave Attestation and establishes an ECDH secure channel.
 */
class EnclaveClient {
    constructor(enclaveUrl, expectedMrenclave) {
        this.enclaveUrl = enclaveUrl;
        this.expectedMrenclave = expectedMrenclave;
        this.channel = new SecureChannel();
        this.isAttested = false;
    }

    async attestAndHandshake() {
        const nonce = crypto.randomBytes(16).toString('hex');
        const clientPubKey = this.channel.getPublicKey();

        // 1. Send our public key and a nonce to the Enclave
        const response = await fetch(`${this.enclaveUrl}/attest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nonce, clientPublicKey: clientPubKey })
        });
        
        const data = await response.json();

        // 2. Verify mrenclave (Simulated hardware hash)
        if (data.mrenclave !== this.expectedMrenclave) {
            throw new Error('ATTESTATION FAILED: Unknown mrenclave hash! Server might be spoofed.');
        }

        // 3. Verify Quote (Simulated hardware ECDSA signature using HMAC)
        const hmac = crypto.createHmac('sha256', 'simulated_hardware_key');
        hmac.update(data.mrenclave + nonce + data.publicKey);
        const expectedQuote = hmac.digest('hex');
        
        if (data.quote !== expectedQuote) {
            throw new Error('ATTESTATION FAILED: Invalid hardware quote! Key exchange compromised.');
        }

        // 4. Compute shared secret with the verified enclave public key
        this.channel.computeSharedSecret(data.publicKey);
        this.isAttested = true;
        console.log('[Proxy->Enclave] Attestation successful. ECDH secure channel established.');
    }

    async seal(payload, label, token) {
        if (!this.isAttested) await this.attestAndHandshake();
        const encrypted = this.channel.encrypt(payload);
        const response = await fetch(`${this.enclaveUrl}/seal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ ...encrypted, label })
        });
        return response.json();
    }

    async unseal(label, token) {
        if (!this.isAttested) await this.attestAndHandshake();
        const response = await fetch(`${this.enclaveUrl}/unseal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ label })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unseal failed');
        return this.channel.decrypt(data);
    }

    async execute(payload, token) {
        // If we haven't verified the enclave yet, do it now
        if (!this.isAttested) {
            await this.attestAndHandshake();
        }

        try {
            // Encrypt the payload using AES-256-GCM
            const encrypted = this.channel.encrypt(payload);
            
            // Send to Enclave
            const response = await fetch(`${this.enclaveUrl}/execute`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(encrypted)
            });

            const data = await response.json();
            
            if (!response.ok) {
                // AUTO-RETRY LOGIC: If enclave restarted, re-attest once
                if (data.error && data.error.includes("Shared secret not computed")) {
                    console.warn('[Proxy] Enclave session lost. Re-attesting and retrying...');
                    this.isAttested = false;
                    await this.attestAndHandshake();
                    return this.execute(payload, token); // Recursive retry
                }
                throw new Error(data.error || 'Execution failed');
            }

            // Decrypt the response
            return this.channel.decrypt(data);
        } catch (error) {
            // If encryption failed because secret was somehow null (concurrency), retry
            if (error.message.includes("not computed")) {
                this.isAttested = false;
                await this.attestAndHandshake();
                return this.execute(payload, token);
            }
            throw error;
        }
    }
}

module.exports = EnclaveClient;
