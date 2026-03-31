'use client';
import { useState } from 'react';
import WorkflowStream from './WorkflowStream';

const API = 'http://localhost:8000';

interface ExtractedField {
  [key: string]: string | null;
}

interface StreamEvent {
  step?: string; status?: string; service?: string; note?: string; done?: boolean;
}

interface Props {
  extracted: ExtractedField;
  costEstimate: Record<string, string | number>;
  source: string;
  onClose: () => void;
}

export default function VerificationModal({ extracted, costEstimate, source, onClose }: Props) {
  const [fields, setFields] = useState<ExtractedField>(extracted);
  const [pushing, setPushing] = useState(false);
  const [events, setEvents]   = useState<StreamEvent[]>([]);
  const [done, setDone]       = useState(false);

  const update = (key: string, value: string) =>
    setFields(prev => ({ ...prev, [key]: value }));

  const handlePush = async () => {
    setPushing(true);
    setEvents([]);
    setDone(false);

    const res = await fetch(`${API}/api/sheets/push`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ data: fields }),
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    while (reader) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) break;
      const chunk = decoder.decode(value);
      chunk.split('\n').forEach(line => {
        if (line.startsWith('data:')) {
          try {
            const ev = JSON.parse(line.slice(5).trim());
            setEvents(prev => [...prev, ev]);
            if (ev.done) setDone(true);
          } catch {}
        }
      });
    }
    setPushing(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 28, width: 620, maxHeight: '85vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Review Extracted Data</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Source: <span className="badge badge-blue">{source}</span>
              &nbsp;· Est. cost: <strong>${costEstimate.estimated_cost_usd}</strong>
              &nbsp;· Tokens: {costEstimate.estimated_input_tokens} in / {costEstimate.estimated_output_tokens} out
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>✕ Close</button>
        </div>

        {/* Edit table */}
        <table className="field-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Extracted Value (editable)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(fields).map(([k, v]) => (
              <tr key={k}>
                <td style={{ fontWeight: 500, whiteSpace: 'nowrap', width: 160 }}>{k}</td>
                <td>
                  <input
                    id={`field-${k.replace(/\s+/g, '-')}`}
                    className="input"
                    value={v ?? ''}
                    onChange={e => update(k, e.target.value)}
                    placeholder="(not found)"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Stream log */}
        <WorkflowStream events={events} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={pushing}>Cancel</button>
          {!done && (
            <button
              id="approve-sync-btn"
              className="btn btn-success"
              onClick={handlePush}
              disabled={pushing}
            >
              {pushing ? '⏳ Pushing...' : '✓ Approve & Sync to Sheets'}
            </button>
          )}
          {done && <span style={{ color: 'var(--success)', fontWeight: 500, alignSelf: 'center' }}>✓ Data pushed!</span>}
        </div>
      </div>
    </div>
  );
}
