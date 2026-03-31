'use client';
import { useState } from 'react';
import VoiceInput from './VoiceInput';
import VerificationModal from './VerificationModal';

const API = 'http://localhost:8000';

export default function OtterPanel() {
  const [title,    setTitle]   = useState('');
  const [people,   setPeople]  = useState('');
  const [text,     setText]    = useState('');
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState('');
  const [modal, setModal]      = useState<null | { extracted: any; costEstimate: any; source: string }>(null);

  const handleVoice = (t: string) => setText(prev => prev + ' ' + t);

  const handleExtract = async () => {
    if (!text.trim()) { setError('Transcript text is required.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/otter/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript:    text,
          meeting_title: title,
          participants:  people ? people.split(',').map(p => p.trim()) : [],
        }),
      });
      const data = await res.json();
      setModal({ extracted: data.extracted, costEstimate: data.cost_estimate, source: 'otter_transcript' });
    } catch {
      setError('Backend unavailable. Make sure the Python server is running on :8000');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Otter.ai Transcript Extractor</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Paste a meeting transcript — the AI will extract key client details for your Sheet.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Meeting Title</label>
            <input id="otter-title" className="input" placeholder="Q1 Client Review" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Participants (comma separated)</label>
            <input id="otter-people" className="input" placeholder="Aayushi, Krishna, Client" value={people} onChange={e => setPeople(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Transcript &nbsp;
              <VoiceInput label="Dictate transcript" onResult={handleVoice} />
            </label>
            <textarea id="otter-transcript" className="input" placeholder="Paste transcript here..." value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 160 }} />
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: 12 }}>⚠ {error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button id="otter-extract-btn" className="btn btn-primary" onClick={handleExtract} disabled={loading}>
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
