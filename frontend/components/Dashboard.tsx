'use client';
import { useState } from 'react';
import EmailPanel    from './EmailPanel';
import OtterPanel    from './OtterPanel';
import CalendarPanel from './CalendarPanel';
import CostDashboard from './CostDashboard';

const TABS = [
  { id: 'email',    label: 'Email Extractor',   icon: '✉️' },
  { id: 'otter',    label: 'Transcripts',        icon: '🎙️' },
  { id: 'calendar', label: 'Calendar & Notes',   icon: '📅' },
  { id: 'costs',    label: 'Cost Dashboard',     icon: '📊' },
];

export default function Dashboard() {
  const [active, setActive] = useState('email');

  return (
    <div className="layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">⚙ MCP Gateway</div>
        <div className="sidebar-label">Workflows</div>
        {TABS.map(t => (
          <div
            key={t.id}
            className={`nav-item ${active === t.id ? 'active' : ''}`}
            onClick={() => setActive(t.id)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </div>
        ))}
        <div className="sidebar-label" style={{ marginTop: 'auto' }}>System</div>
        <div className="nav-item" onClick={() => setActive('costs')}>
          <span>💡</span><span>Token Usage</span>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-area">
        <div className="topbar">
          <span className="topbar-title">
            {TABS.find(t => t.id === active)?.label ?? 'Dashboard'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Coders · Tic Tech Toe '26 · PS-6
          </span>
        </div>

        <div className="content">
          {active === 'email'    && <EmailPanel />}
          {active === 'otter'    && <OtterPanel />}
          {active === 'calendar' && <CalendarPanel />}
          {active === 'costs'    && <CostDashboard />}
        </div>
      </div>
    </div>
  );
}
