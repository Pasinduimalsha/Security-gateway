module.exports = {
  ports: {
    proxy: 3000,
    enclave: 4000,
    audit: 5000,
    dashboard: 6000
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    expiresIn: '1h'
  },
  mls: {
    levels: ['U', 'C', 'S', 'TS'] // U=lowest, TS=highest
  },
  rbac: {
    policies: {
      admin: { resources: ['*'], actions: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], mlsMin: 'U' },
      analyst: { resources: ['/data/*', '/reports/*'], actions: ['GET', 'POST'], mlsMin: 'C' },
      reader: { resources: ['/data/*', '/reports/*', '/public/*'], actions: ['GET'], mlsMin: 'U' },
      operator: { resources: ['/exec/*', '/jobs/*'], actions: ['GET', 'POST'], mlsMin: 'S' }
    }
  },
  enclave: {
    mrenclave: 'simulated_mrenclave_hash_12345'
  },
  bls: {
    privateKey: 'simulated_bls_private_key'
  }
};
