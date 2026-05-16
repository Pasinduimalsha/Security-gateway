/**
 * SDK Resolver
 * 
 * This file dynamically switches between using the locally developed 'proxy' SDK
 * and the published 'secure-gateway-sdk' from the NPM registry based on your .env configuration.
 */

const useLocalSDK = process.env.USE_LOCAL_SDK === 'true';

if (useLocalSDK) {
    console.log('[SDK Resolver] Mode: LOCAL. Loading SDK from ../proxy directory.');
    module.exports = require('../proxy');
} else {
    console.log('[SDK Resolver] Mode: NPM. Loading SDK from node_modules (secure-gateway-sdk).');
    module.exports = require('secure-gateway-sdk');
}
