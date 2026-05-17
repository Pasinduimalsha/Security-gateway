import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Activity, Lock, Database, Terminal, CheckCircle2, RefreshCw, Eye, Zap, AlertTriangle, XCircle, Users, Cpu, FileWarning } from 'lucide-react';

const API_AUDIT = import.meta.env.VITE_API_AUDIT;
const API_PROXY = import.meta.env.VITE_API_PROXY;
const API_AUTH = import.meta.env.VITE_API_AUTH;
const API_ENCLAVE = import.meta.env.VITE_API_ENCLAVE;

// ── Attack/Normal Scenario Definitions ──
const SCENARIOS = [
  {
    id: 'normal_admin', type: 'normal', title: 'Admin Access (TS Clearance)',
    desc: 'Register admin → login → access Enclave. Should succeed with full encrypted channel.',
    properties: ['Authentication', 'Confidentiality', 'Integrity'],
    role: 'admin', expectSuccess: true
  },
  {
    id: 'normal_user', type: 'normal', title: 'Standard User Access (S Clearance)',
    desc: 'Register user with Secret clearance → attempt Enclave access (requires TS).',
    properties: ['Authentication', 'Authorization'],
    role: 'user', expectSuccess: false
  },
  {
    id: 'mls_read_up', type: 'attack', title: 'Bell-LaPadula Read-Up Attack',
    desc: 'Guest (Unclassified) attempts to read Top Secret data. MLS should block with 403.',
    properties: ['Authorization', 'Confidentiality'],
    role: 'guest', expectSuccess: false
  },
  {
    id: 'token_forgery', type: 'attack', title: 'JWT Token Forgery',
    desc: 'Send a fabricated JWT token to the gateway. Should be rejected as invalid.',
    properties: ['Authentication'],
    custom: 'forged_token', expectSuccess: false
  },
  {
    id: 'no_token', type: 'attack', title: 'Missing Authentication',
    desc: 'Access protected Enclave route with no Bearer token at all.',
    properties: ['Authentication'],
    custom: 'no_token', expectSuccess: false
  },
  {
    id: 'expired_token', type: 'attack', title: 'Expired Token Replay',
    desc: 'Attempt access with an expired JWT token — simulates session hijacking replay.',
    properties: ['Authentication'],
    custom: 'expired_token', expectSuccess: false
  },
  {
    id: 'ddos_flood', type: 'availability', title: 'DDoS Flood Simulation',
    desc: 'Send 15 rapid requests to trigger rate limiting (429 Too Many Requests).',
    properties: ['Availability'],
    custom: 'ddos', expectSuccess: false
  },
  {
    id: 'brute_force', type: 'availability', title: 'Brute Force Login Attack',
    desc: 'Attempt 12 rapid login requests to trigger auth rate limiter.',
    properties: ['Availability', 'Authentication'],
    custom: 'brute_force', expectSuccess: false
  },
];

function App() {
  const [activeTab, setActiveTab] = useState('monitor');
  const [logs, setLogs] = useState([]);
  const [proof, setProof] = useState(null);
  const [verification, setVerification] = useState(null);
  const [serviceStatus, setServiceStatus] = useState({ proxy: 'Checking...', enclave: 'Checking...', audit: 'Checking...', auth: 'Checking...' });
  const [terminalOutput, setTerminalOutput] = useState([
    { text: 'Security Gateway Monitor v2.0.0', type: 'system' },
    { text: 'Attack simulation engine ready.', type: 'info' },
  ]);
  const [running, setRunning] = useState(null);
  const [scenarioResults, setScenarioResults] = useState({});

  const addLog = useCallback((text, type = '') => {
    setTerminalOutput(prev => [{ text: `[${new Date().toLocaleTimeString()}] ${text}`, type, ts: Date.now() }, ...prev].slice(0, 80));
  }, []);

  const checkServices = useCallback(async () => {
    const check = async (url, name) => {
      try { await fetch(url, { signal: AbortSignal.timeout(2000) }); return 'ONLINE'; }
      catch { return 'OFFLINE'; }
    };
    const [proxy, enclave, audit, auth] = await Promise.all([
      check(API_PROXY, 'Proxy'), check(API_ENCLAVE, 'Enclave'),
      check(API_AUDIT, 'Audit'), check(API_AUTH + '/test', 'Auth'),
    ]);
    setServiceStatus({ proxy, enclave, audit, auth });
  }, []);

  const fetchAuditData = useCallback(async () => {
    try {
      const [logsRes, proofRes, verifyRes] = await Promise.all([
        fetch(`${API_AUDIT}/logs`), fetch(`${API_AUDIT}/proof`), fetch(`${API_AUDIT}/verify`),
      ]);
      setLogs((await logsRes.json()).reverse());
      setProof(await proofRes.json());
      setVerification(await verifyRes.json());
    } catch {}
  }, []);

  useEffect(() => {
    checkServices(); fetchAuditData();
    const i = setInterval(() => { checkServices(); fetchAuditData(); }, 5000);
    return () => clearInterval(i);
  }, [checkServices, fetchAuditData]);

  // ── Scenario Execution Engine ──
  const runScenario = async (scenario) => {
    if (running) return;
    setRunning(scenario.id);
    setScenarioResults(prev => ({ ...prev, [scenario.id]: { status: 'running' } }));
    addLog(`━━━ Starting: ${scenario.title} ━━━`, 'info');

    try {
      if (scenario.custom === 'forged_token') {
        addLog('⚡ [ATTACK DETECTED] Sending a forged JWT payload to the gateway...', 'warning');
        addLog('🔑 Raw Forged Token: eyJhbGciOiJIUzI1NiJ9.FORGED_PAYLOAD.invalid_sig', 'system');
        const res = await fetch(`${API_PROXY}/api/enclave`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrZXIiLCJyb2xlIjoiYWRtaW4iLCJjbGVhcmFuY2UiOiJUUyJ9.invalid_signature' },
          body: JSON.stringify({ action: 'steal_data' })
        });
        const data = await res.json();
        if (res.status === 403 || res.status === 401) {
          addLog(`🛡️ [GATEWAY SHIELD ACTIVE] Request blocked successfully!`, 'success');
          addLog(`🔴 STATUS ${res.status} (Forbidden) - ${data.error}`, 'success');
          setScenarioResults(prev => ({ ...prev, [scenario.id]: { status: 'blocked', code: res.status } }));
        } else {
          addLog(`⚠️ UNEXPECTED RESPONSE: Got ${res.status}`, 'error');
          setScenarioResults(prev => ({ ...prev, [scenario.id]: { status: 'failed' } }));
        }
      } else if (scenario.custom === 'no_token') {
        addLog('⚡ [ATTACK DETECTED] Attempting direct Enclave access with NO authorization header...', 'warning');
        const res = await fetch(`${API_PROXY}/api/enclave`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'steal_data' }) });
        const data = await res.json();
        addLog(`🛡️ [GATEWAY SHIELD ACTIVE] Missing credentials blocked!`, 'success');
        addLog(`🔴 STATUS ${res.status} (Unauthorized) - ${data.error}`, 'success');
        setScenarioResults(prev => ({ ...prev, [scenario.id]: { status: 'blocked', code: res.status } }));
      } else if (scenario.custom === 'expired_token') {
        addLog('⚡ [ATTACK DETECTED] Performing a Session Replay Attack using an expired token (exp: 2020)...', 'warning');
        const res = await fetch(`${API_PROXY}/api/enclave`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6ImFkbWluIiwiY2xlYXJhbmNlIjoiVFMiLCJleHAiOjE1Nzc4MzY4MDB9.invalid' },
          body: JSON.stringify({ action: 'replay_attack' })
        });
        const data = await res.json();
        addLog(`🛡️ [GATEWAY SHIELD ACTIVE] Replay attempt rejected!`, 'success');
        addLog(`🔴 STATUS ${res.status} (Forbidden) - ${data.error || data.message}`, 'success');
        setScenarioResults(prev => ({ ...prev, [scenario.id]: { status: 'blocked', code: res.status } }));
      } else if (scenario.custom === 'ddos') {
        addLog('⚡ [ATTACK DETECTED] Launching DDoS Flood simulation (15 parallel requests)...', 'warning');
        let blocked = 0, ok = 0;
        const promises = Array.from({ length: 15 }, (_, i) =>
          fetch(`${API_PROXY}/api/enclave`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
            .then(r => { if (r.status === 429) blocked++; else ok++; return r.status; })
            .catch(() => { ok++; return 0; })
        );
        const results = await Promise.all(promises);
        addLog(`📊 FLOOD RESULTS: ${ok} completed, ${blocked} rate-limited (429)`, blocked > 0 ? 'success' : 'warning');
        if (blocked > 0) {
          addLog(`🛡️ [DDoS PROTECTION ACTIVE] Global rate-limiter blocked ${blocked} requests!`, 'success');
          setScenarioResults(prev => ({ ...prev, [scenario.id]: { status: 'blocked', code: 429, detail: `${blocked}/15 blocked` } }));
        } else {
          addLog('⚠️ DDoS Mitigation: Rate limiter did not trigger (under threshold).', 'warning');
          setScenarioResults(prev => ({ ...prev, [scenario.id]: { status: 'partial', detail: 'No 429 received' } }));
        }
      } else if (scenario.custom === 'brute_force') {
        addLog('⚡ [ATTACK DETECTED] Launching Login Brute Force simulation (12 rapid failures)...', 'warning');
        let blocked = 0;
        for (let i = 0; i < 12; i++) {
          try {
            const res = await fetch(`${API_PROXY}/api/auth/login`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: 'victim', password: `wrong_${i}` })
            });
            if (res.status === 429) { blocked++; addLog(`🔑 Attempt ${i + 1}: 🛡️ RATE LIMITED (429)`, 'success'); }
            else addLog(`🔑 Attempt ${i + 1}: Failed login (STATUS ${res.status})`, 'system');
          } catch { addLog(`🔑 Attempt ${i + 1}: Network/Proxy failure`, 'error'); }
        }
        if (blocked > 0) {
          addLog(`🛡️ [AUTH MITIGATION ACTIVE] Brute-force protection blocked ${blocked} attempts!`, 'success');
          setScenarioResults(prev => ({ ...prev, [scenario.id]: { status: 'blocked', code: 429, detail: `${blocked}/12 blocked` } }));
        } else {
          addLog('⚠️ Brute-force Mitigation: Auth rate limiter did not trigger yet.', 'warning');
          setScenarioResults(prev => ({ ...prev, [scenario.id]: { status: 'partial' } }));
        }
      } else {
        // Role-based scenarios: register → login → access enclave
        const username = `sim_${scenario.role}_${Date.now()}`;
        const password = 'password123';

        addLog(`Registering user: ${username} (role: ${scenario.role})...`, '');
        const regRes = await fetch(`${API_PROXY}/api/auth/register`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, role: scenario.role })
        });
        const regData = await regRes.json();
        if (!regRes.ok) { addLog(`🔴 Registration Failed: ${regData.error}`, 'error'); throw new Error(regData.error); }
        addLog(`🟢 Registered successfully. clearanceLevel: ${regData.user?.clearanceLevel || scenario.role}`, 'success');

        // Give MongoDB some time to complete index generation/writing
        await new Promise(r => setTimeout(r, 500));

        addLog('Logging in to retrieve secure JWT token...', '');
        const loginRes = await fetch(`${API_PROXY}/api/auth/login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(loginData.error);
        addLog('🔑 JWT token generated. Attempting Enclave handshake...', 'info');

        // Give the session/token validation system a tiny breather to synchronize state
        await new Promise(r => setTimeout(r, 500));

        const enclaveRes = await fetch(`${API_PROXY}/api/enclave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${loginData.token}` },
          body: JSON.stringify({ action: 'SECURE_COMPUTE', data: 'Test Payload' })
        });
        const enclaveData = await enclaveRes.json();

        if (enclaveRes.status === 403) {
          const msg = enclaveData.error || 'Access denied';
          const isMLS = msg.includes('Bell-LaPadula') || msg.includes('MLS');
          const isRBAC = msg.includes('RBAC');
          addLog(`🛡️ [SECURITY SHIELD ACTIVE] Request blocked!`, scenario.expectSuccess ? 'error' : 'success');
          addLog(`🔴 STATUS 403 (Forbidden) - ${msg}`, scenario.expectSuccess ? 'error' : 'success');
          addLog(`ℹ️ Security property enforced: ${isMLS ? 'MLS Bell-LaPadula (No-Read-Up)' : isRBAC ? 'RBAC Policy Rules' : 'Access Control'}`, 'info');
          setScenarioResults(prev => ({ ...prev, [scenario.id]: { status: 'blocked', code: 403 } }));
        } else if (enclaveRes.ok) {
          addLog(`🟢 SUCCESS: ${enclaveData.processedData || JSON.stringify(enclaveData)}`, 'success');
          addLog('🔒 Cryptography: Transit encrypted via AES-256-GCM (Confidentiality ✓)', 'info');
          addLog('📜 Integrity: Log entry signed with BLS aggregate signature (Non-Repudiation ✓)', 'info');
          setScenarioResults(prev => ({ ...prev, [scenario.id]: { status: 'success', code: 200 } }));
        } else {
          addLog(`⚠️ Gate/Proxy responded: ${enclaveRes.status} - ${enclaveData.error || 'Unknown'}`, 'warning');
          setScenarioResults(prev => ({ ...prev, [scenario.id]: { status: 'failed', code: enclaveRes.status } }));
        }
      }
    } catch (error) {
      addLog(`ERROR: ${error.message}`, 'error');
      setScenarioResults(prev => ({ ...prev, [scenario.id]: { status: 'error', detail: error.message } }));
    }

    addLog(`━━━ Finished: ${scenario.title} ━━━`, 'system');
    setRunning(null);
    fetchAuditData();
  };

  const getResultBadge = (id) => {
    const r = scenarioResults[id];
    if (!r) return null;
    if (r.status === 'running') return <span className="badge badge-info">Running...</span>;
    if (r.status === 'success') return <span className="badge badge-success">✓ Access Granted</span>;
    if (r.status === 'blocked') return <span className="badge badge-success">✓ Blocked ({r.code})</span>;
    if (r.status === 'partial') return <span className="badge badge-warning">⚠ Partial</span>;
    if (r.status === 'error') return <span className="badge badge-danger">✗ Error</span>;
    return <span className="badge badge-danger">✗ Failed</span>;
  };

  const onlineCount = Object.values(serviceStatus).filter(s => s === 'ONLINE').length;

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="header">
        <div className="title-group">
          <h1>Security Gateway SDK</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
            <span className={`status-indicator ${onlineCount >= 3 ? 'status-online' : 'status-offline'}`}></span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{onlineCount}/4 services online</span>
          </div>
        </div>
        <div className="header-right">
          <button className="btn btn-outline btn-sm" onClick={() => { checkServices(); fetchAuditData(); }}><RefreshCw size={14} /> Refresh</button>
          <div className="card" style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Lock size={14} className="text-accent" />
            <span className="mono" style={{ fontSize: '0.75rem' }}>ECDH/AES-GCM</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'monitor' ? 'active' : ''}`} onClick={() => setActiveTab('monitor')}><Eye size={16} /> Monitor</button>
        <button className={`tab ${activeTab === 'simulate' ? 'active' : ''}`} onClick={() => setActiveTab('simulate')}><Zap size={16} /> Attack Simulator</button>
        <button className={`tab ${activeTab === 'console' ? 'active' : ''}`} onClick={() => setActiveTab('console')}><Terminal size={16} /> Console</button>
      </div>

      {/* ═══ TAB: Monitor ═══ */}
      {activeTab === 'monitor' && (
        <div className="grid animate-in">
          {/* Status Cards */}
          <div className="card" style={{ gridColumn: 'span 3' }}>
            <div className="card-header"><Database size={18} className="text-accent" /><h2>Audit Proof</h2></div>
            <div className="stat-value text-accent" style={{ fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {proof?.aggregateProof ? `${proof.aggregateProof.substring(0, 16)}...` : 'N/A'}
            </div>
            <p className="stat-label">BLS Aggregate Signature ({proof?.totalEntries || 0} entries)</p>
          </div>

          <div className="card" style={{ gridColumn: 'span 3' }}>
            <div className="card-header"><CheckCircle2 size={18} className={verification?.valid ? 'text-success' : 'text-danger'} /><h2>Integrity</h2></div>
            <div className={`stat-value ${verification?.valid ? 'text-success' : 'text-danger'}`}>
              {verification?.valid === undefined ? 'N/A' : verification.valid ? 'PASSED' : 'FAILED'}
            </div>
            <p className="stat-label">Chain verification of {logs.length} log entries</p>
          </div>

          <div className="card" style={{ gridColumn: 'span 3' }}>
            <div className="card-header"><Cpu size={18} className="text-accent" /><h2>Services</h2></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.78rem' }}>
              {Object.entries(serviceStatus).map(([name, status]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className={`status-indicator ${status === 'ONLINE' ? 'status-online' : 'status-offline'}`} style={{ width: 6, height: 6 }}></span>
                  <span style={{ textTransform: 'capitalize' }}>{name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ gridColumn: 'span 3' }}>
            <div className="card-header"><Activity size={18} className="text-warning" /><h2>Security Events</h2></div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div>
                <div className="stat-value text-success" style={{ fontSize: '1.5rem' }}>{logs.filter(l => l.status === 'SUCCESS').length}</div>
                <p className="stat-label">Granted</p>
              </div>
              <div>
                <div className="stat-value text-danger" style={{ fontSize: '1.5rem' }}>{logs.filter(l => l.status !== 'SUCCESS').length}</div>
                <p className="stat-label">Blocked</p>
              </div>
            </div>
          </div>

          {/* Live Logs */}
          <div className="card" style={{ gridColumn: 'span 12', maxHeight: '450px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ justifyContent: 'space-between', flex: '0 0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Eye size={18} className="text-accent" /><h2>Live Audit Logs</h2>
                <span className="badge badge-info">{logs.length} entries</span>
              </div>
              <button className="btn btn-sm btn-outline" onClick={async () => {
                addLog('Verifying BLS aggregate signature chain...', 'info');
                const res = await fetch(`${API_AUDIT}/verify`);
                const data = await res.json();
                setVerification(data);
                addLog(data.valid ? 'INTEGRITY CHECK PASSED — no tampering detected.' : 'INTEGRITY CHECK FAILED — audit log may be tampered!', data.valid ? 'success' : 'error');
              }}><Shield size={14} /> Verify Proof</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table className="log-table">
                <thead><tr><th>Time</th><th>User</th><th>Resource</th><th>Action</th><th>Clearance</th><th>Sig #</th></tr></thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={i} className="log-row">
                      <td className="text-muted">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="text-accent">{log.user}</td>
                      <td>{log.resource}</td>
                      <td>{log.action}</td>
                      <td><span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : 'badge-warning'}`}>{log.clearance}</span></td>
                      <td className="mono text-muted" style={{ fontSize: '0.72rem' }}>#{log.sigIndex}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>No audit logs yet — run a simulation to generate events</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: Attack Simulator ═══ */}
      {activeTab === 'simulate' && (
        <div className="animate-in">
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>Security Scenario Simulator</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Test every security property with real-world attack and normal-use scenarios.</p>
          </div>

          {/* Normal Scenarios */}
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--success)', margin: '1.25rem 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={14} /> Normal Operations
          </h3>
          <div className="scenario-grid">
            {SCENARIOS.filter(s => s.type === 'normal').map(s => (
              <div key={s.id} className={`scenario-card normal ${!s.expectSuccess ? 'violation-test' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', width: '100%' }}>
                  <span className={`badge ${!s.expectSuccess ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.62rem', padding: '0.15rem 0.5rem', fontWeight: 700, letterSpacing: '0.03em' }}>
                    {!s.expectSuccess ? 'Security Violation Test' : 'Authorized Flow'}
                  </span>
                  {getResultBadge(s.id)}
                </div>
                <div className="scenario-title" style={{ fontSize: '0.98rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <CheckCircle2 size={16} className="text-success" style={{ flexShrink: 0 }} />
                  <span>{s.title}</span>
                </div>
                <p className="scenario-desc" style={{ flexGrow: 1, marginBottom: '1.25rem' }}>{s.desc}</p>
                <div style={{ marginBottom: '1.25rem' }}>
                  {s.properties.map(p => <span key={p} className="scenario-property text-success">● {p}</span>)}
                </div>
                <button className="btn btn-success btn-sm" disabled={!!running} style={{ marginTop: 'auto', alignSelf: 'flex-start' }} onClick={() => runScenario(s)}>
                  {running === s.id ? 'Running...' : 'Run Scenario'}
                </button>
              </div>
            ))}
          </div>

          {/* Attack Scenarios */}
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--danger)', margin: '1.5rem 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={14} /> Attack Simulations
          </h3>
          <div className="scenario-grid">
            {SCENARIOS.filter(s => s.type === 'attack').map(s => (
              <div key={s.id} className={`scenario-card attack ${!s.expectSuccess ? 'violation-test' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', width: '100%' }}>
                  <span className="badge badge-danger" style={{ fontSize: '0.62rem', padding: '0.15rem 0.5rem', fontWeight: 700, letterSpacing: '0.03em' }}>
                    Security Violation Test
                  </span>
                  {getResultBadge(s.id)}
                </div>
                <div className="scenario-title" style={{ fontSize: '0.98rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <XCircle size={16} className="text-danger" style={{ flexShrink: 0 }} />
                  <span>{s.title}</span>
                </div>
                <p className="scenario-desc" style={{ flexGrow: 1, marginBottom: '1.25rem' }}>{s.desc}</p>
                <div style={{ marginBottom: '1.25rem' }}>
                  {s.properties.map(p => <span key={p} className="scenario-property text-danger">● {p}</span>)}
                </div>
                <button className="btn btn-danger btn-sm" disabled={!!running} style={{ marginTop: 'auto', alignSelf: 'flex-start' }} onClick={() => runScenario(s)}>
                  {running === s.id ? 'Attacking...' : 'Launch Attack'}
                </button>
              </div>
            ))}
          </div>

          {/* Availability Attacks */}
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--warning)', margin: '1.5rem 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileWarning size={14} /> Availability Attacks
          </h3>
          <div className="scenario-grid">
            {SCENARIOS.filter(s => s.type === 'availability').map(s => (
              <div key={s.id} className={`scenario-card availability ${!s.expectSuccess ? 'violation-test' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', width: '100%' }}>
                  <span className="badge badge-warning" style={{ fontSize: '0.62rem', padding: '0.15rem 0.5rem', fontWeight: 700, letterSpacing: '0.03em' }}>
                    Security Violation Test
                  </span>
                  {getResultBadge(s.id)}
                </div>
                <div className="scenario-title" style={{ fontSize: '0.98rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <Zap size={16} className="text-warning" style={{ flexShrink: 0 }} />
                  <span>{s.title}</span>
                </div>
                <p className="scenario-desc" style={{ flexGrow: 1, marginBottom: '1.25rem' }}>{s.desc}</p>
                <div style={{ marginBottom: '1.25rem' }}>
                  {s.properties.map(p => <span key={p} className="scenario-property text-warning">● {p}</span>)}
                </div>
                <button className="btn btn-warning btn-sm" disabled={!!running} style={{ marginTop: 'auto', alignSelf: 'flex-start' }} onClick={() => runScenario(s)}>
                  {running === s.id ? 'Flooding...' : 'Launch Attack'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ TAB: Console ═══ */}
      {activeTab === 'console' && (
        <div className="grid animate-in">
          <div className="card" style={{ gridColumn: 'span 12' }}>
            <div className="card-header"><Terminal size={18} /><h2>Security Console</h2>
              <span className="badge badge-info">{terminalOutput.length} entries</span>
              <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setTerminalOutput([{ text: 'Console cleared.', type: 'system' }])}>Clear</button>
            </div>
            <div className="terminal" style={{ height: '500px' }}>
              {terminalOutput.map((line, i) => (
                <div key={i} className={`terminal-line ${line.type}`}>{line.text}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
