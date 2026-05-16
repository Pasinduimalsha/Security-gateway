const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const config = require('../config');

const app = express();
app.use(cors());
app.use(express.json());

const logs = [];
let currentAggregateProof = null;

app.post('/log', (req, res) => {
    const entry = req.body;
    logs.push(entry);
    currentAggregateProof = entry.aggregateSignature;
    console.log(`[Audit] Received log entry ${entry.sigIndex} for user ${entry.user}. New proof: ${currentAggregateProof.substring(0, 20)}...`);
    res.json({ status: 'Logged' });
});

app.get('/verify', (req, res) => {
    try {
        if (logs.length === 0) return res.json({ valid: true, message: 'Log is empty' });

        let calculatedProof = crypto.createHash('sha256').update('GENESIS').digest('hex');
        const privateKey = config.bls.privateKey;

        for (const entry of logs) {
            // Re-calculate individual signature
            const hmac = crypto.createHmac('sha256', privateKey);
            const payload = { ...entry };
            delete payload.eventSig;
            delete payload.aggregateSignature;
            delete payload.sigIndex;
            
            hmac.update(JSON.stringify(payload));
            const eventSig = hmac.digest('hex');

            // Aggregate
            const aggregator = crypto.createHash('sha256');
            aggregator.update(calculatedProof + eventSig);
            calculatedProof = aggregator.digest('hex');
        }

        const isValid = calculatedProof === currentAggregateProof;
        console.log(`[Audit] Verification: ${isValid ? 'PASSED' : 'FAILED'}`);
        
        res.json({
            valid: isValid,
            calculated: calculatedProof,
            stored: currentAggregateProof,
            totalEntries: logs.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/logs', (req, res) => {
    res.json(logs);
});

app.get('/proof', (req, res) => {
    res.json({ aggregateProof: currentAggregateProof, totalEntries: logs.length });
});

// A simple minimal endpoint to prove the Gateway reaches us!
app.get('/', (req, res) => {
    res.json({
        message: 'Successfully reached the Protected Audit Service! 📜',
        totalLogs: logs.length
    });
});

const PORT = process.env.AUDIT_PORT || 5001;
app.listen(PORT, () => {
    console.log(`[Audit] Service running on port ${PORT}`);
});
