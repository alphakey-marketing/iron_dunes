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
        width: 460,
        maxHeight: '80vh',
        overflowY: 'auto',
        fontFamily: 'monospace',
        color: '#e8d5b0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 'bold' }}>Bounty Board</div>
          <button onClick={closeBountyBoard} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {bounties.map(bounty => (
          <div
            key={bounty.id}
            style={{
              background: bounty.completed ? 'rgba(60,80,60,0.3)' : bounty.accepted ? 'rgba(79,152,163,0.1)' : 'rgba(0,0,0,0.4)',
              border: bounty.completed ? '1px solid rgba(80,160,80,0.4)' : bounty.accepted ? '1px solid rgba(79,152,163,0.4)' : '1px solid rgba(255,255,255,0.15)',
              borderRadius: 4,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {bounty.completed && <span style={{ color: '#55cc55', fontSize: 11 }}>✓ COMPLETED</span>}
              {bounty.accepted && !bounty.completed && <span style={{ color: '#4F98A3', fontSize: 11 }}>● ACTIVE</span>}
            </div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>{bounty.description}</div>
            {bounty.type === 'banditHunt' && bounty.accepted && !bounty.completed && (
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>
                Progress: <span style={{ color: '#e8d5b0' }}>{bounty.currentCount ?? 0} / {bounty.targetCount}</span> kills
              </div>
            )}
            {(bounty.type === 'campRaid' || bounty.type === 'escort') && bounty.accepted && !bounty.completed && (
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>
                Target: <span style={{ color: '#e8d5b0' }}>({bounty.targetX}, {bounty.targetY})</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#f0c040', fontSize: 12 }}>Reward: {bounty.reward} cats</span>
              {!bounty.accepted && !bounty.completed && (
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
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
