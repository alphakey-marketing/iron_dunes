import { useGameStore } from '../store/gameStore';

export function BountyBoard() {
  const { bountyBoardOpen, bounties, closeBountyBoard, acceptBounty } = useGameStore();

  if (!bountyBoardOpen) return null;

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
      onClick={e => { if (e.target === e.currentTarget) closeBountyBoard(); }}
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
          <div style={{ fontSize: 16, fontWeight: 'bold' }}>Bounty Board</div>
          <button onClick={closeBountyBoard} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {bounties.filter(b => !b.completed).map(bounty => (
          <div
            key={bounty.id}
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 4,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 13, marginBottom: 6 }}>{bounty.description}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#f0c040', fontSize: 12 }}>Reward: {bounty.reward} cats</span>
              <button
                onClick={() => acceptBounty(bounty.id)}
                style={{
                  background: 'rgba(200,150,0,0.3)',
                  border: '1px solid rgba(200,150,0,0.6)',
                  color: '#f0c040',
                  padding: '3px 12px',
                  cursor: 'pointer',
                  borderRadius: 3,
                  fontFamily: 'monospace',
                  fontSize: 11,
                }}
              >
                Accept
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
