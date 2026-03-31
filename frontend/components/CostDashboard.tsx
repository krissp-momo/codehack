'use client';
import { useState, useEffect } from 'react';

const API = 'http://localhost:8000';

export default function CostDashboard() {
  const [data,    setData]    = useState<any>(null);
  const [outbox,  setOutbox]  = useState<any[]>([]);
  const [retrying,setRetrying]= useState(false);
  const [msg,     setMsg]     = useState('');

  const fetchData = async () => {
    try {
      const [cRes, oRes] = await Promise.all([
        fetch(`${API}/api/costs/dashboard`),
        fetch(`${API}/api/sheets/outbox`),
      ]);
      setData(await cRes.json());
      setOutbox(await oRes.json());
    } catch {
      setMsg('⚠ Backend unavailable.');
    }
  };

  useEffect(() => { fetchData(); }, []);

  const retryOutbox = async () => {
    setRetrying(true); setMsg('');
    const res = await fetch(`${API}/api/sheets/retry-outbox`, { method: 'POST' });
    const d = await res.json();
    setMsg(`Retried ${d.results?.length ?? 0} items.`);
    await fetchData();
    setRetrying(false);
  };

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="stat-label">Input Tokens</div>
          <div className="stat-value">{data?.total_input_tokens ?? '—'}</div>
        </div>
        <div className="card">
          <div className="stat-label">Output Tokens</div>
          <div className="stat-value">{data?.total_output_tokens ?? '—'}</div>
        </div>
        <div className="card">
          <div className="stat-label">Total Cost (USD)</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>
            ${data?.total_cost_usd?.toFixed(5) ?? '0.00000'}
          </div>
        </div>
      </div>

      {/* Outbox buffer */}
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontWeight:600 }}>Outbox Buffer <span className="badge badge-yellow">{outbox.length} pending</span></div>
          <div style={{ display:'flex', gap:8 }}>
            <button id="refresh-btn" className="btn btn-secondary" onClick={fetchData}>↻ Refresh</button>
            <button id="retry-outbox-btn" className="btn btn-primary" onClick={retryOutbox} disabled={retrying || outbox.length === 0}>
              {retrying ? '⏳ Retrying...' : '⟳ Retry All'}
            </button>
          </div>
        </div>

        {msg && <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:8 }}>{msg}</div>}

        {outbox.length === 0 ? (
          <div style={{ fontSize:13, color:'var(--text-secondary)', textAlign:'center', padding:'20px 0' }}>
            ✓ No pending items in buffer
          </div>
        ) : (
          <table className="field-table">
            <thead>
              <tr>
                <th>#</th><th>Service</th><th>Status</th><th>Retries</th><th>Created</th>
              </tr>
            </thead>
            <tbody>
              {outbox.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td><span className="badge badge-blue">{item.service}</span></td>
                  <td><span className={`badge ${item.status === 'pending' ? 'badge-yellow' : item.status === 'done' ? 'badge-green' : 'badge-red'}`}>{item.status}</span></td>
                  <td>{item.retries}</td>
                  <td style={{ fontSize:11, color:'var(--text-secondary)' }}>{item.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
