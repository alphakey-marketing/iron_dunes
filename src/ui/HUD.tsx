import React from 'react';
import { useGameStore } from '../store/gameStore';

const hudStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  pointerEvents: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  padding: '8px',
  userSelect: 'none',
};

const topBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  background: 'rgba(0,0,0,0.7)',
  padding: '6px 12px',
  borderRadius: '4px',
  color: '#e8d5b0',
  fontSize: '14px',
  fontFamily: 'monospace',
};

const btnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.3)',
  color: '#e8d5b0',
  padding: '3px 8px',
  cursor: 'pointer',
  borderRadius: '3px',
  fontFamily: 'monospace',
  fontSize: '12px',
};

function BarWidget({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ width: 80, height: 8, background: 'rgba(0,0,0,0.5)', borderRadius: 2 }}>
      <div style={{ width: `${pct * 100}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.2s' }} />
    </div>
  );
}

function getHpColor(pct: number): string {
  if (pct > 0.6) return '#44aa44';
  if (pct > 0.3) return '#aaaa00';
  return '#aa3333';
}

function getHungerColor(hunger: number): string {
  if (hunger > 60) return '#88aa44';
  if (hunger > 30) return '#cc8822';
  return '#aa3333';
}

export function HUD() {
  const { day, timeOfDay, isNight, cats, squad, selectedCharId, paused, slowMotion, togglePause, toggleSlowMotion, selectChar, openBountyBoard, openRecruit } = useGameStore();

  const progress = timeOfDay / 600;
  const hour = Math.floor(progress * 24);
  const minute = Math.floor((progress * 24 * 60) % 60);
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return (
    <div style={hudStyle}>
      <div style={topBarStyle}>
        <span>Day {day} — {timeStr}</span>
        {isNight && <span style={{ color: '#8888ff' }}>🌙</span>}
        <span style={{ marginLeft: 'auto' }}>⚙ {cats} cats</span>
        <button style={btnStyle} onClick={openBountyBoard} title="Bounty Board [B]">📋 Bounties</button>
        <button style={btnStyle} onClick={openRecruit} title="Recruit [R]">👤 Recruit</button>
        <button style={{ ...btnStyle, background: slowMotion ? 'rgba(200,150,0,0.3)' : undefined }} onClick={toggleSlowMotion}>
          {slowMotion ? '0.25x' : '1x'}
        </button>
        <button style={{ ...btnStyle, background: paused ? 'rgba(200,0,0,0.3)' : undefined }} onClick={togglePause}>
          {paused ? '▶' : '⏸'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {squad.map(char => {
          const totalHp = Object.values(char.bodyParts).reduce((a, b) => a + b, 0);
          const hpPct = totalHp / 700;
          const isSelected = char.id === selectedCharId;
          return (
            <div
              key={char.id}
              onClick={() => selectChar(char.id)}
              style={{
                background: isSelected ? 'rgba(79,152,163,0.3)' : 'rgba(0,0,0,0.7)',
                border: isSelected ? '1px solid #4F98A3' : '1px solid rgba(255,255,255,0.2)',
                padding: '6px 10px',
                borderRadius: 4,
                color: '#e8d5b0',
                fontFamily: 'monospace',
                fontSize: 12,
                cursor: 'pointer',
                minWidth: 120,
              }}
            >
              <div style={{ marginBottom: 4 }}>{char.name}</div>
              <div style={{ marginBottom: 2 }}>
                <BarWidget value={hpPct * 100} max={100} color={getHpColor(hpPct)} />
              </div>
              <div style={{ marginBottom: 2 }}>
                <BarWidget value={char.hunger} max={100} color={getHungerColor(char.hunger)} />
              </div>
              <div style={{ fontSize: 10, color: '#aaa' }}>{char.status}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
