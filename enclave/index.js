const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });
const { 
    createSecurityMiddleware, 
    createMLSMiddleware, 
    SecureChannel 
} = require('../config/sdk-resolver');
const config = require('../config');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const enclaveChannel = new SecureChannel();
const mrenclave = config.enclave.mrenclave;

// Generate a quote (signature) to prove identity
const generateQuote = (nonce, pubKey) => {
    const hmac = crypto.createHmac('sha256', 'simulated_hardware_key');
    hmac.update(mrenclave + nonce + pubKey);
    return hmac.digest('hex');
};

app.post('/attest', (req, res) => {
    const { nonce, clientPublicKey } = req.body;

    // Compute shared secret using the client's public key
    enclaveChannel.computeSharedSecret(clientPublicKey);

    const enclavePubKey = enclaveChannel.getPublicKey();
    const quote = generateQuote(nonce, enclavePubKey);

    console.log('[Enclave] Attestation requested. Sent Quote and Public Key.');
    res.json({
        mrenclave,
        publicKey: enclavePubKey,
        quote
    });
});

// Require valid cryptographically signed JWT to access Enclave directly
const verifyToken = createSecurityMiddleware(process.env.JWT_SECRET || 'fallback_secret');

// Mount Bell-LaPadula Shield locally: Dynamic classification based on environment
const ENCLAVE_LEVEL = process.env.ENCLAVE_CLASSIFICATION || 'TS';
const mlsShield = createMLSMiddleware(ENCLAVE_LEVEL);

const sealedStorage = new Map();

app.post('/seal', verifyToken, mlsShield, (req, res) => {
    const { ciphertext, iv, authTag, label } = req.body;
    try {
        const decrypted = enclaveChannel.decrypt({ ciphertext, iv, authTag });
        const key = label || 'default_seal';
        
        // Simulating Hardware Sealing: Data is "stored" in a way that only the enclave can read
        sealedStorage.set(key, decrypted);
        
        console.log(`[Enclave] Data sealed under label: ${key}`);
        res.json({ status: 'Success', message: `Data sealed under label: ${key}` });
    } catch (error) {
        res.status(400).json({ error: 'Sealing failed: ' + error.message });
    }
});

app.post('/unseal', verifyToken, mlsShield, (req, res) => {
    const { label } = req.body;
    const data = sealedStorage.get(label);
    
    if (!data) {
        return res.status(404).json({ error: 'No sealed data found for label: ' + label });
    }

    console.log(`[Enclave] Data unsealed for label: ${label}`);
    const encrypted = enclaveChannel.encrypt(data);
    res.json(encrypted);
});

app.post('/execute', verifyToken, mlsShield, (req, res) => {
    const { ciphertext, iv, authTag } = req.body;
    try {
        // Decrypt payload
        const decryptedPayload = enclaveChannel.decrypt({ ciphertext, iv, authTag });

        console.log(`[Enclave] User ${req.user.sub} executing secure payload:`, decryptedPayload);

        // Execute sensitive logic inside TEE
        const result = {
            status: 'Success',
            processedData: (decryptedPayload.action || 'Unknown') + ' completed securely inside TEE.'
        };

        // Encrypt response before sending out of TEE
        const encryptedResponse = enclaveChannel.encrypt(result);
        res.json(encryptedResponse);
    } catch (error) {
        console.error('[Enclave] Execution error:', error.message);
        res.status(400).json({ error: 'Secure execution failed: ' + error.message });
    }
});

app.get('/', (req, res) => {
    res.json({
        message: 'Successfully reached the Protected Enclave Service! 🔒',
        status: 'ONLINE'
    });
});

app.listen(4000, () => {
    console.log(`[Enclave] Secured Service running on port 4000`);
});
