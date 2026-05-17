const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Robust workspace-aware dotenv loading
if (fs.existsSync(path.join(process.cwd(), '.env'))) {
    dotenv.config({ path: path.join(process.cwd(), '.env') });
} else if (fs.existsSync(path.join(process.cwd(), '..', '.env'))) {
    dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
} else {
    dotenv.config();
}
const express = require('express');
const cors = require('cors');
const { SecurityGateway } = require('./index');

const app = express();
app.use(cors());

const PORT = process.env.PROXY_PORT || 3000;

/**
 * PROJECT-AGNOSTIC CONFIG LOADER
 * The proxy no longer reaches out to '../config'. 
 * It looks for a 'gateway-config.json' in the current working directory 
 * or a path specified by GATEWAY_CONFIG_PATH.
 */
let configPath = process.env.GATEWAY_CONFIG_PATH 
    ? path.resolve(process.env.GATEWAY_CONFIG_PATH) 
    : path.join(process.cwd(), 'gateway-config.json');

// Robust fallback: check parent directory if not found in current working directory
if (!fs.existsSync(configPath)) {
    const parentConfigPath = path.join(process.cwd(), '..', 'gateway-config.json');
    if (fs.existsSync(parentConfigPath)) {
        configPath = parentConfigPath;
    }
}

let gatewayConfig = { routes: [], rbacPolicies: {}, mlsLattice: {} };

if (fs.existsSync(configPath)) {
    try {
        gatewayConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log(`[Proxy] Configuration loaded from: ${configPath}`);
    } catch (err) {
        console.error(`[Proxy] Failed to parse config at ${configPath}:`, err.message);
    }
} else {
    console.warn(`[Proxy] Warning: No config file found at ${configPath}. Using defaults.`);
}

// Initialize the Security Gateway using the injected configuration
app.use('/api', SecurityGateway({
    jwtSecret: process.env.JWT_SECRET || 'fallback_secret',
    routes: gatewayConfig.routes || [],
    rbacPolicies: gatewayConfig.rbacPolicies || {},
    mlsLattice: gatewayConfig.mlsLattice || {}
}));

app.get('/', (req, res) => {
    res.json({ 
        message: 'Security Gateway Standalone Server is running.',
        config_source: configPath,
        active_routes: (gatewayConfig.routes || []).length
    });
});

app.listen(PORT, () => {
    console.log(`[Proxy] Standalone Gateway running on port ${PORT}`);
});
