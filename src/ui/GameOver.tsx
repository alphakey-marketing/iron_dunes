import { useGameStore } from '../store/gameStore';

export function GameOver() {
  const { gameOver } = useGameStore();

  if (!gameOver) return null;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'auto',
      zIndex: 200,
      fontFamily: 'monospace',
      color: '#e8d5b0',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, color: '#e84040', marginBottom: 16 }}>GAME OVER</div>
        <div style={{ fontSize: 18, color: '#aaa', marginBottom: 32 }}>Your squad has fallen in the Iron Dunes.</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'rgba(79,152,163,0.3)',
            border: '1px solid #4F98A3',
            color: '#4F98A3',
            padding: '10px 32px',
            cursor: 'pointer',
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: 16,
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
