'use client';
import { useState } from 'react';

const API = 'http://localhost:8000';

type Tab = 'events' | 'notes';

export default function CalendarPanel() {
  const [tab, setTab] = useState<Tab>('events');

  // -- Event form
  const [eTitle,    setETitle]   = useState('');
  const [eDesc,     setEDesc]    = useState('');
  const [eStart,    setEStart]   = useState('');
  const [eEnd,      setEEnd]     = useState('');
  const [eMType,    setEMType]   = useState('online');
  const [eAttend,   setEAttend]  = useState('');
  const [eReminder, setEReminder]= useState(15);
  const [eLoading,  setELoading] = useState(false);
  const [eMsg,      setEMsg]     = useState('');
  const [events,    setEvents]   = useState<any[]>([]);

  // -- Note form
  const [nTitle, setNTitle] = useState('');
  const [nBody,  setNBody]  = useState('');
  const [nLoading,setNLoad] = useState(false);
  const [nMsg,   setNMsg]   = useState('');
  const [notes,  setNotes]  = useState<any[]>([]);

  const scheduleEvent = async () => {
    if (!eTitle || !eStart || !eEnd) { setEMsg('Title, start and end time are required.'); return; }
    setELoading(true); setEMsg('');
    const res = await fetch(`${API}/api/calendar/schedule`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: eTitle, description: eDesc, start_time: eStart, end_time: eEnd,
        meeting_type: eMType, reminder_minutes: eReminder,
        attendees: eAttend ? eAttend.split(',').map(a => a.trim()) : [],
      }),
    });
    const data = await res.json();
    if (data.success) {
      setEMsg('✓ Meeting scheduled!');
      setEvents(prev => [data.event, ...prev]);
      setETitle(''); setEDesc(''); setEStart(''); setEEnd(''); setEAttend('');
    }
    setELoading(false);
  };

  const addNote = async () => {
    if (!nTitle || !nBody) { setNMsg('Title and content required.'); return; }
    setNLoad(true); setNMsg('');
    const res = await fetch(`${API}/api/calendar/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: nTitle, content: nBody }),
    });
    const data = await res.json();
    if (data.success) {
      setNMsg('✓ Note saved!');
      setNotes(prev => [data.note, ...prev]);
      setNTitle(''); setNBody('');
    }
    setNLoad(false);
  };

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(['events','notes'] as Tab[]).map(t => (
          <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t)}>
            {t === 'events' ? '📅 Schedule Meeting' : '📝 Notes'}
          </button>
        ))}
      </div>

      {tab === 'events' && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Schedule a Meeting / Call</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="grid-2">
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, display:'block', marginBottom:4 }}>Title</label>
                <input id="evt-title" className="input" placeholder="Client call Q2" value={eTitle} onChange={e=>setETitle(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, display:'block', marginBottom:4 }}>Meeting Type</label>
                <select id="evt-type" className="input" value={eMType} onChange={e=>setEMType(e.target.value)}>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, display:'block', marginBottom:4 }}>Start Time</label>
                <input id="evt-start" className="input" type="datetime-local" value={eStart} onChange={e=>setEStart(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, display:'block', marginBottom:4 }}>End Time</label>
                <input id="evt-end" className="input" type="datetime-local" value={eEnd} onChange={e=>setEEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display:'block', marginBottom:4 }}>Attendees (comma separated)</label>
              <input id="evt-attend" className="input" placeholder="aayushi@firm.com, client@example.com" value={eAttend} onChange={e=>setEAttend(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display:'block', marginBottom:4 }}>Description</label>
              <textarea id="evt-desc" className="input" placeholder="Agenda..." value={eDesc} onChange={e=>setEDesc(e.target.value)} style={{ minHeight: 60 }} />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Reminder (min before):</label>
              <input id="evt-reminder" className="input" type="number" value={eReminder} onChange={e=>setEReminder(Number(e.target.value))} style={{ width:80 }} />
            </div>
            {eMsg && <div style={{ fontSize:12, color: eMsg.startsWith('✓') ? 'var(--success)' : 'var(--danger)' }}>{eMsg}</div>}
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button id="schedule-btn" className="btn btn-primary" onClick={scheduleEvent} disabled={eLoading}>
                {eLoading ? '⏳ Saving...' : '📅 Schedule'}
              </button>
            </div>
          </div>

          {events.length > 0 && (
            <div style={{ marginTop:20 }}>
              <div style={{ fontSize:12, fontWeight:600, marginBottom:8, color:'var(--text-secondary)' }}>SCHEDULED</div>
              {events.map(ev => (
                <div key={ev.id} style={{ padding:'10px 0', borderTop:'1px solid var(--border)' }}>
                  <div style={{ fontWeight:500 }}>{ev.title} <span className={`badge ${ev.meeting_type === 'online' ? 'badge-blue' : 'badge-gray'}`}>{ev.meeting_type}</span></div>
                  <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{ev.start_time} → {ev.end_time} · Reminder: {ev.reminder_minutes}m</div>
                  {ev.attendees?.length > 0 && <div style={{ fontSize:12 }}>{ev.attendees.join(', ')}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div className="card">
          <div style={{ fontWeight:600, marginBottom:16 }}>Quick Notes</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:500, display:'block', marginBottom:4 }}>Title</label>
              <input id="note-title" className="input" placeholder="Note title" value={nTitle} onChange={e=>setNTitle(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:500, display:'block', marginBottom:4 }}>Content</label>
              <textarea id="note-content" className="input" placeholder="Your note..." value={nBody} onChange={e=>setNBody(e.target.value)} style={{ minHeight:100 }} />
            </div>
            {nMsg && <div style={{ fontSize:12, color: nMsg.startsWith('✓') ? 'var(--success)' : 'var(--danger)' }}>{nMsg}</div>}
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button id="save-note-btn" className="btn btn-primary" onClick={addNote} disabled={nLoading}>
                {nLoading ? '⏳ Saving...' : '💾 Save Note'}
              </button>
            </div>
          </div>

          {notes.length > 0 && (
            <div style={{ marginTop:20 }}>
              {notes.map(n => (
                <div key={n.id} style={{ padding:'10px 0', borderTop:'1px solid var(--border)' }}>
                  <div style={{ fontWeight:500 }}>{n.title}</div>
                  <div style={{ fontSize:13, color:'var(--text-secondary)', marginTop:2 }}>{n.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
