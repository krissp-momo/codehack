'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

const API = 'http://localhost:8000';

const SUGGESTIONS = [
  { icon: '🎙️', text: 'I just had a call with Rahul from ABC Corp, schedule a follow-up next Tuesday and log it' },
  { icon: '✉️', text: 'Extract data from this email: Hi, I am Priya from TechVentures, mobile 9876543210' },
  { icon: '📅', text: 'Book an online meeting with the client team tomorrow at 4pm' },
  { icon: '📝', text: 'Save a note: Q1 targets discussed, follow-up needed on pricing' },
  { icon: '📊', text: 'Log: Client Name: Anjali, Mobile: 9812345678, Status: Hot Lead' },
];

type StepStatus = 'pending' | 'running' | 'done' | 'buffered' | 'failed' | 'verify';

interface Step {
  id: string; tool: string; description: string;
  status: StepStatus; note?: string; data?: Record<string, string | null>;
}

interface Msg {
  id: string; role: 'user' | 'agent';
  type: 'text' | 'thinking' | 'plan' | 'verify';
  text?: string; intent?: string; steps?: Step[];
  data?: Record<string, string | null>;
}

const TOOL_ICONS: Record<string, string> = {
  extract_email: '✉️', extract_transcript: '🎙️',
  push_to_sheets: '📊', schedule_meeting: '📅',
  add_note: '📝', send_comms: '💬',
};

const TOOL_LABELS: Record<string, string> = {
  extract_email: 'email', extract_transcript: 'transcript',
  push_to_sheets: 'sheets', schedule_meeting: 'calendar',
  add_note: 'notes', send_comms: 'comms',
};

const STATUS_ICON: Record<StepStatus, string> = {
  pending: '○', running: '↻', done: '✓', buffered: '⏸', failed: '✗', verify: '◈',
};

const STATUS_COLOR: Record<StepStatus, string> = {
  pending:  '#555',
  running:  '#3b82f6',
  done:     '#22c55e',
  buffered: '#f59e0b',
  failed:   '#ef4444',
  verify:   '#a78bfa',
};

const s = {
  shell: { display:'flex', height:'100vh', background:'#0a0a0a', color:'#f0f0f0', fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", fontSize:13.5, WebkitFontSmoothing:'antialiased' } as React.CSSProperties,

  sidebar: { width:250, minWidth:250, background:'#111', borderRight:'1px solid #1f1f1f', display:'flex', flexDirection:'column' as const },
  sbHead:  { padding:'20px 18px 16px', borderBottom:'1px solid #1f1f1f' },
  sbLogo:  { fontSize:15, fontWeight:700, color:'#3b82f6', display:'flex', alignItems:'center', gap:8, letterSpacing:'-0.02em' },
  sbDot:   { width:8, height:8, borderRadius:'50%', background:'#3b82f6', boxShadow:'0 0 10px #3b82f6' },
  sbTag:   { fontSize:11, color:'#444', marginTop:3 },
  sbSec:   { padding:'16px 18px 6px', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase' as const, color:'#444' },
  chip:    { display:'block', width:'calc(100% - 24px)', margin:'2px 12px', padding:'9px 12px', background:'transparent', border:'1px solid transparent', borderRadius:6, fontSize:12, color:'#888', cursor:'pointer', textAlign:'left' as const, transition:'all 0.15s', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, lineHeight:1.4 },
  sbStats: { marginTop:'auto', padding:'14px 18px', borderTop:'1px solid #1f1f1f' },
  stRow:   { display:'flex', justifyContent:'space-between', padding:'3px 0', fontSize:12, color:'#666' },

  main:    { flex:1, display:'flex', flexDirection:'column' as const, overflow:'hidden', background:'#0a0a0a' },
  topbar:  { padding:'13px 24px', background:'#111', borderBottom:'1px solid #1f1f1f', display:'flex', alignItems:'center', justifyContent:'space-between' },
  msgs:    { flex:1, overflowY:'auto' as const, padding:'28px 24px', display:'flex', flexDirection:'column' as const, gap:20 },
  inputBar:{ padding:'14px 24px 18px', borderTop:'1px solid #1f1f1f', background:'#0a0a0a' },
};

export default function AgentChat() {
  const [msgs,     setMsgs]     = useState<Msg[]>([{
    id:'welcome', role:'agent', type:'text',
    text:"Hi! I'm your MCP Agentic Gateway. Just tell me what you need in plain English (or Hindi 🎤) and I'll orchestrate everything — extract data, log to sheets, schedule meetings, and more.",
  }]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [listening,setListening]= useState(false);
  const [stats,    setStats]    = useState({ input:0, output:0, cost:0, outbox:0 });

  const bottomRef  = useRef<HTMLDivElement>(null);
  const recRef     = useRef<SpeechRecognition | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  const fetchStats = useCallback(async () => {
    try {
      const [c,o] = await Promise.all([fetch(`${API}/api/costs/dashboard`), fetch(`${API}/api/sheets/outbox`)]);
      const cd = await c.json(); const od = await o.json();
      setStats({ input:cd.total_input_tokens, output:cd.total_output_tokens, cost:cd.total_cost_usd, outbox: Array.isArray(od)?od.length:0 });
    } catch {}
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'hi-IN';
    rec.onresult = (e: SpeechRecognitionEvent) => setInput(p => (p+' '+e.results[0][0].transcript).trim());
    rec.onend = () => setListening(false);
    recRef.current = rec;
  }, []);

  const toggleVoice = () => {
    if (!recRef.current) return;
    if (listening) recRef.current.stop();
    else { recRef.current.start(); setListening(true); }
  };

  const patchMsg  = (id: string, patch: Partial<Msg>) => setMsgs(p => p.map(m => m.id===id ? {...m,...patch} : m));
  const patchStep = (msgId: string, stepId: string, patch: Partial<Step>) =>
    setMsgs(p => p.map(m => m.id===msgId && m.steps ? { ...m, steps:m.steps.map(s=>s.id===stepId?{...s,...patch}:s) } : m));

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput(''); setLoading(true);
    const uid = Date.now().toString();
    setMsgs(p => [...p, { id:uid, role:'user', type:'text', text:msg }]);
    const thinkId = uid+'_t';
    setMsgs(p => [...p, { id:thinkId, role:'agent', type:'thinking' }]);
    const planId = uid+'_p';

    try {
      const res = await fetch(`${API}/api/agent/chat`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ message:msg }),
      });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data:')) continue;
          let ev: any;
          try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }

          if (ev.type === 'plan') {
            const steps: Step[] = ev.steps.map((s:any) => ({...s, status:'pending'}));
            patchMsg(thinkId, { id:planId, type:'plan', intent:ev.intent, steps });
          } else if (ev.type === 'step_start') {
            patchStep(planId, ev.id, { status:'running' });
          } else if (ev.type === 'step_result') {
            if (ev.status === 'needs_verification') {
              patchStep(planId, ev.id, { status:'verify', note:ev.message });
              setMsgs(p => [...p, { id:ev.id+'_v', role:'agent', type:'verify', data:ev.data, text:ev.message }]);
            } else {
              patchStep(planId, ev.id, { status:ev.status, note:ev.message });
            }
          } else if (ev.type === 'dag_event') {
            const st: StepStatus = ev.status==='done'||ev.status==='done_via_fallback'?'done':ev.status==='buffered'?'buffered':ev.status==='failed'?'failed':'running';
            patchStep(planId, ev.step??ev.id, { status:st, note:ev.note });
          } else if (ev.type === 'done') {
            setMsgs(p => [...p, { id:uid+'_done', role:'agent', type:'text', text:ev.text }]);
            fetchStats();
          }
        }
      }
    } catch {
      patchMsg(thinkId, { type:'text', text:'⚠ Backend unreachable. Make sure the Python server is running on :8000' });
    } finally { setLoading(false); }
  };

  const approve = async (verifyId: string, data: Record<string, string>) => {
    patchMsg(verifyId, { type:'text', text:'✓ Pushing to Google Sheets…' });
    try {
      const res = await fetch(`${API}/api/sheets/push`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ data }),
      });
      const reader = res.body!.getReader(); const dec = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data:')) continue;
          try {
            const ev = JSON.parse(line.slice(5).trim());
            if (ev.done) setMsgs(p => [...p, { id:Date.now().toString(), role:'agent', type:'text', text:'✅ Synced to Google Sheets successfully!' }]);
          } catch {}
        }
      }
    } catch {
      setMsgs(p => [...p, { id:Date.now().toString(), role:'agent', type:'text', text:'⚠ Push failed — saved to outbox buffer for retry.' }]);
    }
    fetchStats();
  };

  return (
    <div style={s.shell}>
      {/* ── Sidebar ── */}
      <aside style={s.sidebar}>
        <div style={s.sbHead}>
          <div style={s.sbLogo}>
            <div style={{...s.sbDot, animation:'glow-pulse 2s ease-in-out infinite'}} />
            MCP Gateway
          </div>
          <div style={s.sbTag}>Agentic AI Orchestrator · PS-6</div>
        </div>

        <div style={s.sbSec}>Try asking…</div>
        {SUGGESTIONS.map((sg, i) => (
          <button key={i} style={s.chip} onClick={() => send(sg.text)}
            onMouseEnter={e => { (e.target as HTMLElement).style.background='#1a1a1a'; (e.target as HTMLElement).style.color='#ccc'; (e.target as HTMLElement).style.borderColor='#2a2a2a'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.background='transparent'; (e.target as HTMLElement).style.color='#888'; (e.target as HTMLElement).style.borderColor='transparent'; }}
          >
            {sg.icon} {sg.text}
          </button>
        ))}

        <div style={s.sbStats}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#444', marginBottom:10 }}>Session</div>
          <div style={s.stRow}><span>Input tokens</span><span style={{ fontWeight:600, color:'#ccc', fontVariantNumeric:'tabular-nums' }}>{stats.input}</span></div>
          <div style={s.stRow}><span>Output tokens</span><span style={{ fontWeight:600, color:'#ccc', fontVariantNumeric:'tabular-nums' }}>{stats.output}</span></div>
          <div style={s.stRow}><span>Cost (USD)</span><span style={{ fontWeight:600, color:'#3b82f6', fontVariantNumeric:'tabular-nums' }}>${stats.cost.toFixed(5)}</span></div>
          {stats.outbox > 0 && (
            <div style={{...s.stRow, color:'#f59e0b', marginTop:4}}>
              <span>⏸ Buffer</span><span style={{ fontWeight:600 }}>{stats.outbox} pending</span>
            </div>
          )}
        </div>
      </aside>

      {/* ── Chat ── */}
      <div style={s.main}>
        {/* Topbar */}
        <div style={s.topbar}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:600, fontSize:14 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 8px #22c55e' }} />
            Agent is ready
          </div>
          <div style={{ fontSize:11, color:'#444', background:'#161616', border:'1px solid #222', borderRadius:20, padding:'2px 10px' }}>
            Coders · Tic Tech Toe '26
          </div>
        </div>

        {/* Messages */}
        <div style={s.msgs}>
          {msgs.map(m => <MsgRow key={m.id} msg={m} onApprove={approve} />)}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={s.inputBar}>
          <div style={{ background:'#161616', border:`1px solid ${listening?'#ef4444':'#2a2a2a'}`, borderRadius:12, padding:'10px 12px', display:'flex', alignItems:'flex-end', gap:8, transition:'border-color 0.2s, box-shadow 0.2s', boxShadow: listening ? '0 0 0 3px rgba(239,68,68,0.15)' : 'none' }}>
            <textarea
              rows={1}
              style={{ flex:1, border:'none', background:'transparent', fontSize:13.5, fontFamily:'inherit', color:'#f0f0f0', outline:'none', resize:'none', maxHeight:120, lineHeight:1.55, padding:'1px 0' }}
              placeholder="Tell me what you need…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={loading}
            />
            <button
              id="voice-btn"
              onClick={toggleVoice}
              style={{ background:'none', border:'none', cursor:'pointer', padding:6, color: listening ? '#ef4444' : '#555', borderRadius:6, fontSize:17, display:'flex', alignItems:'center', transition:'color 0.15s' }}
              title="Voice input (Hindi + English)"
            >
              {listening ? <><span style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:'#ef4444', boxShadow:'0 0 8px #ef4444', animation:'pulse 1s infinite', marginRight:4 }} />🎤</> : '🎤'}
            </button>
            <button
              id="send-btn"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{ background: (loading||!input.trim()) ? '#1e1e1e' : '#3b82f6', color: (loading||!input.trim()) ? '#555' : '#fff', border:'none', borderRadius:8, width:34, height:34, cursor:(loading||!input.trim())?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, transition:'all 0.15s', boxShadow:(loading||!input.trim())?'none':'0 2px 10px rgba(59,130,246,0.4)' }}
            >
              ➤
            </button>
          </div>
          <div style={{ fontSize:11, color:'#333', textAlign:'center', marginTop:8 }}>
            Enter to send · Shift+Enter for newline · 🎤 Hindi & English voice
          </div>
        </div>
      </div>

      <style>{`
        @keyframes glow-pulse { 0%,100%{box-shadow:0 0 6px #3b82f6} 50%{box-shadow:0 0 16px #3b82f6} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes blink { 0%,80%,100%{opacity:.2;transform:scale(.7)} 40%{opacity:1;transform:scale(1)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#222;border-radius:4px}
        * { box-sizing: border-box; margin:0; padding:0; }
      `}</style>
    </div>
  );
}

function MsgRow({ msg, onApprove }: { msg: Msg; onApprove: (id:string, data:Record<string,string>)=>void }) {
  const isUser = msg.role === 'user';
  const [fields, setFields] = useState<Record<string,string>>({});
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    if (msg.data) setFields(Object.fromEntries(Object.entries(msg.data).map(([k,v])=>[k,v??''])));
  }, [msg.data]);

  return (
    <div style={{ display:'flex', gap:12, maxWidth:840, alignSelf: isUser?'flex-end':'flex-start', flexDirection: isUser?'row-reverse':'row', animation:'fadeUp 0.2s ease' }}>
      {/* Avatar */}
      <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0, marginTop:2, background: isUser ? '#1e1e1e' : 'linear-gradient(135deg,#1d4ed8,#7c3aed)', border: isUser ? '1px solid #2a2a2a' : 'none', boxShadow: isUser ? 'none' : '0 0 12px rgba(59,130,246,0.25)' }}>
        {isUser ? '👤' : '⚙'}
      </div>

      <div style={{ maxWidth: isUser ? 560 : 720 }}>
        {/* Thinking */}
        {msg.type === 'thinking' && (
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'12px 16px', background:'#161616', border:'1px solid #222', borderRadius:12, borderTopLeftRadius:4, color:'#666', fontSize:13 }}>
            {[0,200,400].map(d=>(
              <div key={d} style={{ width:5, height:5, borderRadius:'50%', background:'#3b82f6', animation:`blink 1.4s ${d}ms infinite` }} />
            ))}
            <span style={{ marginLeft:4 }}>Thinking…</span>
          </div>
        )}

        {/* Text */}
        {msg.type === 'text' && (
          <div style={{ padding:'11px 16px', borderRadius:12, fontSize:13.5, lineHeight:1.55, background: isUser ? '#3b82f6' : '#161616', color: isUser ? '#fff' : '#e5e5e5', border: isUser ? 'none' : '1px solid #222', borderTopLeftRadius: isUser ? 12 : 4, borderTopRightRadius: isUser ? 4 : 12, boxShadow: isUser ? '0 2px 12px rgba(59,130,246,0.3)' : 'none' }}>
            {msg.text}
          </div>
        )}

        {/* Plan */}
        {msg.type === 'plan' && msg.steps && (
          <div style={{ background:'#111', border:'1px solid #222', borderRadius:12, borderTopLeftRadius:4, overflow:'hidden' }}>
            <div style={{ padding:'9px 16px', background:'#161616', borderBottom:'1px solid #1e1e1e', display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#3b82f6' }}>🗂 Workflow Plan</span>
              <span style={{ marginLeft:'auto', fontSize:12, color:'#555' }}>{msg.intent}</span>
            </div>
            {msg.steps.map((step, idx) => (
              <div key={step.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 16px', borderBottom: idx<(msg.steps!.length-1) ? '1px solid #1a1a1a' : 'none' }}>
                <div style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0, marginTop:1, color:STATUS_COLOR[step.status], background:`${STATUS_COLOR[step.status]}18`, border:`1px solid ${STATUS_COLOR[step.status]}44`, animation: step.status==='running' ? 'spin 1s linear infinite' : 'none', transition:'all 0.3s' }}>
                  {STATUS_ICON[step.status]}
                </div>
                <div>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#444', marginBottom:2 }}>
                    {TOOL_ICONS[step.tool]} {TOOL_LABELS[step.tool]??step.tool}
                  </div>
                  <div style={{ fontSize:13, color:'#ccc' }}>{step.description}</div>
                  {step.note && <div style={{ fontSize:11.5, color:'#666', marginTop:3 }}>{step.note}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Verify */}
        {msg.type === 'verify' && !approved && (
          <div style={{ background:'#111', border:'1px solid #2a2030', borderLeft:'2px solid #a78bfa', borderRadius:12, borderTopLeftRadius:4, overflow:'hidden', boxShadow:'0 0 20px rgba(167,139,250,0.08)' }}>
            <div style={{ padding:'9px 16px', background:'#161616', borderBottom:'1px solid #1e1e1e', display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#a78bfa' }}>◈ Review before syncing</span>
              <span style={{ fontSize:12, color:'#555', marginLeft:'auto' }}>Edit any field if needed</span>
            </div>
            <div style={{ maxHeight:280, overflowY:'auto' }}>
              {Object.entries(fields).map(([k,v]) => (
                <div key={k} style={{ display:'flex', alignItems:'center', gap:12, padding:'7px 16px', borderBottom:'1px solid #1a1a1a' }}>
                  <span style={{ width:130, flexShrink:0, fontSize:11, fontWeight:700, color:'#444', textTransform:'uppercase', letterSpacing:'0.05em' }}>{k}</span>
                  <input
                    id={`f-${k.replace(/\s+/g,'-')}`}
                    value={v}
                    onChange={e => setFields(p => ({...p,[k]:e.target.value}))}
                    placeholder="(not found)"
                    style={{ flex:1, padding:'5px 10px', background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:5, fontSize:12.5, fontFamily:'inherit', color:'#e5e5e5', outline:'none' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ padding:'12px 16px', display:'flex', gap:8, justifyContent:'flex-end', background:'#161616', borderTop:'1px solid #1e1e1e' }}>
              <button onClick={() => setApproved(true)} style={{ padding:'7px 16px', background:'transparent', color:'#555', border:'1px solid #2a2a2a', borderRadius:6, fontSize:12.5, fontWeight:600, cursor:'pointer' }}>
                ✕ Discard
              </button>
              <button
                id="approve-btn"
                onClick={() => { setApproved(true); onApprove(msg.id, fields); }}
                style={{ padding:'7px 16px', background:'#22c55e', color:'#fff', border:'none', borderRadius:6, fontSize:12.5, fontWeight:600, cursor:'pointer', boxShadow:'0 2px 10px rgba(34,197,94,0.25)' }}
              >
                ✓ Approve & Push to Sheets
              </button>
            </div>
          </div>
        )}

        {msg.type === 'verify' && approved && (
          <div style={{ padding:'11px 16px', borderRadius:12, fontSize:13.5, background:'#161616', color:'#888', border:'1px solid #222', borderTopLeftRadius:4 }}>
            ✓ Approved
          </div>
        )}
      </div>
    </div>
  );
}
