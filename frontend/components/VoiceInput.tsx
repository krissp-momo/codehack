'use client';
import { useState, useEffect, useRef } from 'react';

interface Props {
  onResult: (text: string) => void;
  label?: string;
}

export default function VoiceInput({ onResult, label = 'Voice Input' }: Props) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported]   = useState(true);
  const recRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }

    const rec = new SR();
    rec.continuous      = false;
    rec.interimResults  = true;
    rec.lang            = 'hi-IN'; // Hindi + English fallback

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const text = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('');
      setTranscript(text);
    };

    rec.onend = () => {
      setListening(false);
      if (transcript) onResult(transcript);
    };

    recRef.current = rec;
  }, [transcript, onResult]);

  const toggle = () => {
    if (!recRef.current) return;
    if (listening) {
      recRef.current.stop();
    } else {
      setTranscript('');
      recRef.current.start();
      setListening(true);
    }
  };

  if (!supported) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button className={`btn ${listening ? 'btn-danger' : 'btn-secondary'}`} onClick={toggle}>
        {listening && <span className="recording-dot" />}
        {listening ? 'Stop Recording' : `🎤 ${label}`}
      </button>
      {transcript && (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          "{transcript}"
        </span>
      )}
    </div>
  );
}
