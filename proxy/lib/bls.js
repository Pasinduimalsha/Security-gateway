const crypto = require('crypto');

/**
 * Simulates BLS12-381 Aggregate Signatures for the Audit Logger.
 * Real pairing-based crypto requires large WASM libraries (like @noble/bls12-381).
 * We simulate the "aggregation" property here using chained SHA-256 hashes.
 * 
 * Property simulated: N events produce a single constant-size proof.
 */
class BLSAuditSim {
    constructor(privateKey) {
        // Use injected private key instead of hardcoded config
        this.privateKey = privateKey || 'default_bls_key';
        this.aggregateSignature = crypto.createHash('sha256').update('GENESIS').digest('hex');
        this.sigCount = 0;
    }

    /**
     * Signs a single log entry and aggregates it into the session proof.
     */
    signAndAggregate(eventPayload) {
        // 1. Sign the individual event
        const hmac = crypto.createHmac('sha256', this.privateKey);
        hmac.update(JSON.stringify(eventPayload));
        const eventSig = hmac.digest('hex');

        // 2. Aggregate: Combine the new signature with the existing aggregate signature
        // In real BLS this is scalar point addition. Here we simulate it by hashing them together.
        const aggregator = crypto.createHash('sha256');
        aggregator.update(this.aggregateSignature + eventSig);
        this.aggregateSignature = aggregator.digest('hex');
        
        this.sigCount++;
        
        return {
            eventSig,
            aggregateSignature: this.aggregateSignature,
            sigIndex: this.sigCount
        };
    }
}

module.exports = BLSAuditSim;
