'use client';

interface StreamEvent {
  step?:    string;
  status?:  string;
  service?: string;
  note?:    string;
  done?:    boolean;
}

const STATUS_COLORS: Record<string, string> = {
  running:          'var(--accent)',
  done:             'var(--success)',
  done_via_fallback:'var(--success)',
  buffered:         'var(--warning)',
  failed:           'var(--danger)',
};

interface Props {
  events: StreamEvent[];
}

export default function WorkflowStream({ events }: Props) {
  if (events.length === 0) return null;

  return (
    <div className="stream-log" style={{ marginTop: 12 }}>
      {events.map((e, i) => {
        if (e.done) return <div key={i} style={{ color: 'var(--success)', marginTop: 4 }}>✓ Workflow complete</div>;
        const color = STATUS_COLORS[e.status ?? ''] ?? 'inherit';
        return (
          <div key={i} style={{ marginBottom: 2 }}>
            <span style={{ color }}>●</span>{' '}
            <span style={{ color: 'var(--text-secondary)' }}>[{e.service}]</span>{' '}
            <span style={{ fontWeight: 500 }}>{e.step}</span>{' '}
            <span style={{ color }}>→ {e.status}</span>
            {e.note && <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}> ({e.note})</span>}
          </div>
        );
      })}
    </div>
  );
}
