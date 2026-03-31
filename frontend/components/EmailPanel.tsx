'use client';
import { useState } from 'react';
import VoiceInput from './VoiceInput';
import VerificationModal from './VerificationModal';

const API = 'http://localhost:8000';

export default function EmailPanel() {
  const [subject, setSubject] = useState('');
  const [sender,  setSender]  = useState('');
  const [body,    setBody]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [modal,   setModal]   = useState<null | { extracted: any; costEstimate: any; source: string }>(null);

  const handleVoice = (text: string) => setBody(prev => prev + ' ' + text);

  const handleExtract = async () => {
    if (!body.trim()) { setError('Email body is required.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/email/extract`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subject, sender, body }),
      });
      const data = await res.json();
      setModal({ extracted: data.extracted, costEstimate: data.cost_estimate, source: 'email' });
    } catch {
      setError('Backend unavailable. Make sure the Python server is running on :8000');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Extract Data from Email</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Paste the email text — the AI will map it to your Google Sheet headers.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Sender Email</label>
            <input id="email-sender" className="input" placeholder="client@example.com" value={sender} onChange={e => setSender(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Subject</label>
            <input id="email-subject" className="input" placeholder="Meeting follow-up..." value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Body &nbsp;
              <VoiceInput label="Dictate body" onResult={handleVoice} />
            </label>
            <textarea id="email-body" className="input" placeholder="Paste the email body here..." value={body} onChange={e => setBody(e.target.value)} style={{ minHeight: 140 }} />
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: 12 }}>⚠ {error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button id="email-extract-btn" className="btn btn-primary" onClick={handleExtract} disabled={loading}>
              {loading ? '⏳ Extracting...' : '🔍 Extract & Review'}
            </button>
          </div>
        </div>
      </div>

      {modal && (
        <VerificationModal
          extracted={modal.extracted}
          costEstimate={modal.costEstimate}
          source={modal.source}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
