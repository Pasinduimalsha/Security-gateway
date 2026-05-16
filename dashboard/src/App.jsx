import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Activity, 
  Lock, 
  Database, 
  Terminal, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  RefreshCw,
  Eye,
  Key
} from 'lucide-react';

const API_AUDIT = 'http://localhost:5001';
const API_ENCLAVE = 'http://localhost:4000';
const API_PROXY = 'http://localhost:3000';

function App() {
  const [logs, setLogs] = useState([]);
  const [proof, setProof] = useState(null);
  const [verification, setVerification] = useState(null);
  const [enclaveStatus, setEnclaveStatus] = useState('Checking...');
  const [loading, setLoading] = useState(true);
  const [terminalOutput, setTerminalOutput] = useState(['Welcome to Security Gateway Monitor v1.0.0', 'Initializing systems...']);

  const addToTerminal = (msg) => {
    setTerminalOutput(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const fetchData = async () => {
    try {
      // Fetch Logs
      const logsRes = await fetch(`${API_AUDIT}/logs`);
      const logsData = await logsRes.json();
      setLogs(logsData.reverse());

      // Fetch Proof
      const proofRes = await fetch(`${API_AUDIT}/proof`);
      const proofData = await proofRes.json();
      setProof(proofData);

      // Verify Proof
      const verifyRes = await fetch(`${API_AUDIT}/verify`);
      const verifyData = await verifyRes.json();
      setVerification(verifyData);

      setEnclaveStatus('ONLINE');
      setLoading(false);
    } catch (error) {
      console.error('Fetch error:', error);
      setEnclaveStatus('OFFLINE');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualVerify = async () => {
    addToTerminal('Initiating BLS Aggregate Signature verification...');
    const res = await fetch(`${API_AUDIT}/verify`);
    const data = await res.json();
    if (data.valid) {
      addToTerminal('SUCCESS: Aggregate proof matches local log reconstruction.');
    } else {
      addToTerminal('CRITICAL: Audit log tampering detected! Proof mismatch.');
    }
    setVerification(data);
  };

  const handleSimulateRequest = async () => {
    const role = document.getElementById('userSelect').value;
    const username = `sim_${role}_${Math.floor(Math.random() * 1000)}`;
    const password = 'password123';

    try {
      addToTerminal(`Starting simulation for role: ${role.toUpperCase()}...`);
      
      // 1. Register
      addToTerminal(`Registering user ${username}...`);
      const regRes = await fetch(`${API_PROXY}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.error || 'Registration failed');
      addToTerminal('Registration successful.');

      // 2. Login
      addToTerminal('Logging in to obtain JWT...');
      const loginRes = await fetch(`${API_PROXY}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.error || 'Login failed');
      const token = loginData.token;
      addToTerminal('JWT obtained and verified.');

      // 3. Call Enclave via Proxy
      addToTerminal(`Calling Secure Enclave via Gateway (Clearance: ${role === 'admin' ? 'TS' : role === 'user' ? 'S' : 'U'})...`);
      const enclaveRes = await fetch(`${API_PROXY}/api/enclave`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'SECURE_COMPUTE', data: 'Classified Payload' })
      });
      
      const enclaveData = await enclaveRes.json();
      
      if (enclaveRes.status === 403) {
        addToTerminal(`ACCESS DENIED: ${enclaveData.error}`);
      } else if (enclaveRes.ok) {
        addToTerminal(`SUCCESS: ${enclaveData.processedData}`);
      } else {
        throw new Error(enclaveData.error || 'Gateway request failed');
      }

      fetchData(); // Refresh logs
    } catch (error) {
      addToTerminal(`ERROR: ${error.message}`);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="title-group">
          <h1>Security Gateway SDK</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span className="status-indicator status-online"></span>
            <span style={{ fontSize: '0.9rem', color: '#888' }}>Real-time Security Enforcement Active</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)' }} onClick={fetchData}>
            <RefreshCw size={16} style={{ marginRight: '0.5rem' }} /> Refresh
          </button>
          <div className="card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <Lock size={18} className="text-accent" />
             <span className="mono">ECDH/AES-GCM ACTIVE</span>
          </div>
        </div>
      </header>

      <div className="grid">
        {/* Status Cards */}
        <div className="card" style={{ gridColumn: 'span 3' }}>
          <div className="card-header">
            <Database size={20} className="text-accent" />
            <h2>Audit Proof</h2>
          </div>
          <div className="stat-value text-accent" style={{ fontSize: '1.2rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {proof?.aggregateProof ? `${proof.aggregateProof.substring(0, 16)}...` : 'N/A'}
          </div>
          <p style={{ margin: '0.5rem 0 0', color: '#666', fontSize: '0.8rem' }}>BLS Aggregate Signature</p>
        </div>

        <div className="card" style={{ gridColumn: 'span 3' }}>
          <div className="card-header">
            <CheckCircle2 size={20} className="text-success" />
            <h2>Integrity</h2>
          </div>
          <div className={`stat-value ${verification?.valid ? 'text-success' : 'text-danger'}`}>
            {verification?.valid ? 'PASSED' : 'FAILED'}
          </div>
          <p style={{ margin: '0.5rem 0 0', color: '#666', fontSize: '0.8rem' }}>Verification of {logs.length} entries</p>
        </div>

        <div className="card" style={{ gridColumn: 'span 3' }}>
          <div className="card-header">
            <Shield size={20} className="text-accent" />
            <h2>Enclave</h2>
          </div>
          <div className="stat-value">{enclaveStatus}</div>
          <p style={{ margin: '0.5rem 0 0', color: '#666', fontSize: '0.8rem' }}>Simulated Intel SGX / ARM CCA</p>
        </div>

        <div className="card" style={{ gridColumn: 'span 3' }}>
          <div className="card-header">
            <Activity size={20} className="text-warning" />
            <h2>Violations</h2>
          </div>
          <div className="stat-value text-warning">
            {logs.filter(l => l.status === 'DENIED' || l.status === 'BLOCKED').length}
          </div>
          <p style={{ margin: '0.5rem 0 0', color: '#666', fontSize: '0.8rem' }}>Lattice & RBAC Blocks</p>
        </div>

        {/* Live Logs */}
        <div className="card" style={{ gridColumn: 'span 8', minHeight: '400px' }}>
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Eye size={20} className="text-accent" />
              <h2>Live Immutable Audit Logs</h2>
            </div>
            <button className="btn" onClick={handleManualVerify} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              Verify Proof
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="log-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Resource</th>
                  <th>Action</th>
                  <th>Clearance</th>
                  <th>Proof Index</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={i} className="log-row">
                    <td style={{ color: '#888' }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="text-accent">{log.user}</td>
                    <td>{log.resource}</td>
                    <td>{log.action}</td>
                    <td><span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : 'badge-warning'}`}>{log.clearance}</span></td>
                    <td className="mono" style={{ fontSize: '0.75rem' }}>#{log.sigIndex}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>No logs detected yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Console / Terminal */}
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <div className="card-header">
            <Terminal size={20} />
            <h2>Security Console</h2>
          </div>
          <div className="terminal">
            {terminalOutput.map((line, i) => (
              <div key={i} style={{ marginBottom: '0.25rem' }}>{line}</div>
            ))}
          </div>
          <div className="controls" style={{ marginTop: '1.5rem' }}>
            <div className="input-group">
               <label style={{ fontSize: '0.8rem', color: '#666' }}>Simulate Gateway Access</label>
               <select id="userSelect">
                  <option value="admin">Admin (TS Clearance)</option>
                  <option value="user">User (S Clearance)</option>
                  <option value="guest">Guest (U Clearance)</option>
               </select>
            </div>
            <button className="btn" onClick={handleSimulateRequest}>
              Send Secured Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
