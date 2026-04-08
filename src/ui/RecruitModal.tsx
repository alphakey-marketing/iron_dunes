import { useGameStore } from '../store/gameStore';

export function RecruitModal() {
  const { recruitOpen, recruits, cats, squad, closeRecruit, recruitMember } = useGameStore();

  if (!recruitOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        zIndex: 100,
      }}
      onClick={e => { if (e.target === e.currentTarget) closeRecruit(); }}
    >
      <div style={{
        background: '#1e1a16',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: 8,
        padding: 20,
        width: 420,
        fontFamily: 'monospace',
        color: '#e8d5b0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 'bold' }}>Wanderers for Hire</div>
          <div style={{ color: '#aaa' }}>Cats: <span style={{ color: '#f0c040' }}>{cats}</span></div>
          <button onClick={closeRecruit} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        {squad.length >= 4 && (
          <div style={{ color: '#e84040', fontSize: 12, marginBottom: 12 }}>Squad is full (max 4)</div>
        )}
        {recruits.length === 0 ? (
          <div style={{ color: '#666', fontSize: 12 }}>No wanderers available today.</div>
        ) : (
          recruits.map(r => (
            <div key={r.id} style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 4,
              padding: 12,
              marginBottom: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 'bold' }}>{r.name}</span>
                <span style={{ color: '#f0c040' }}>{r.cost} cats</span>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: '#aaa', marginBottom: 8 }}>
                {Object.entries(r.skills).map(([sk, val]) => (
                  <span key={sk}>{sk[0].toUpperCase() + sk.slice(1)}: <span style={{ color: '#e8d5b0' }}>{val}</span></span>
                ))}
              </div>
              <button
                disabled={cats < r.cost || squad.length >= 4}
                onClick={() => recruitMember(r.id)}
                style={{
                  background: cats >= r.cost && squad.length < 4 ? 'rgba(79,152,163,0.4)' : 'rgba(80,80,80,0.3)',
                  border: '1px solid rgba(79,152,163,0.6)',
                  color: cats >= r.cost && squad.length < 4 ? '#4F98A3' : '#555',
                  padding: '3px 14px',
                  cursor: cats >= r.cost && squad.length < 4 ? 'pointer' : 'not-allowed',
                  borderRadius: 3,
                  fontFamily: 'monospace',
                  fontSize: 11,
                }}
              >
                Hire
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
