import { useGameStore } from '../store/gameStore';

export function SquadPanel() {
  const { squad, selectedCharId, selectChar } = useGameStore();

  return (
    <div style={{
      position: 'absolute',
      left: 8,
      top: 130,
      width: 160,
      pointerEvents: 'auto',
      fontFamily: 'monospace',
      fontSize: 12,
      color: '#e8d5b0',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <div style={{ fontSize: 11, color: '#aaa', marginBottom: 2 }}>SQUAD</div>
      {squad.map(char => (
        <div
          key={char.id}
          onClick={() => selectChar(char.id)}
          style={{
            background: char.id === selectedCharId ? 'rgba(79,152,163,0.3)' : 'rgba(0,0,0,0.6)',
            border: char.id === selectedCharId ? '1px solid #4F98A3' : '1px solid rgba(255,255,255,0.15)',
            padding: '4px 8px',
            borderRadius: 3,
            cursor: 'pointer',
          }}
        >
          {char.name}
        </div>
      ))}
    </div>
  );
}
