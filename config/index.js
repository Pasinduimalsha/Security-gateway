module.exports = {
  ports: {
    proxy: 3000,
    enclave: 4000,
    audit: 5001,
    dashboard: 6000
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    expiresIn: '1h'
  },
  mls: {
    lattice: { 'U': 10, 'C': 20, 'S': 30, 'TS': 40 }
  },
  rbac: {
    policies: {
      admin: { resources: ['*'], actions: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], mlsMin: 'TS' },
      user: { resources: ['/data/*', '/reports/*'], actions: ['GET', 'POST'], mlsMin: 'S' },
      guest: { resources: ['/public/*'], actions: ['GET'], mlsMin: 'U' }
    }
  },
  enclave: {
    mrenclave: 'simulated_mrenclave_hash_12345'
  },
  bls: {
    privateKey: 'simulated_bls_private_key'
  }
};
