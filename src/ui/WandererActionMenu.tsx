import React from 'react';
import { useGameStore } from '../store/gameStore';

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
};

const panelStyle: React.CSSProperties = {
  background: 'rgba(20,18,16,0.95)',
  border: '1px solid rgba(232,213,176,0.4)',
  borderRadius: 6,
  padding: '16px 20px',
  color: '#e8d5b0',
  fontFamily: 'monospace',
  fontSize: 13,
  minWidth: 240,
  maxWidth: 320,
  pointerEvents: 'auto',
};

const titleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 'bold',
  marginBottom: 4,
  color: '#f5c842',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#aaa',
  marginBottom: 12,
};

const skillRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 11,
  color: '#ccc',
  marginBottom: 2,
};

const costStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#f5c842',
  marginTop: 10,
  marginBottom: 12,
};

const btnRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginTop: 4,
};

const btnBase: React.CSSProperties = {
  flex: 1,
  padding: '5px 0',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: 3,
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 12,
  color: '#e8d5b0',
};

export function WandererActionMenu() {
  const { wandererMenuId, wanderers, squad, cats, closeWandererMenu, recruitWanderer } = useGameStore();

  if (!wandererMenuId) return null;

  const wanderer = wanderers.find(w => w.id === wandererMenuId);
  if (!wanderer) return null;

  const isNeutral = wanderer.archetype !== 'desperateRaider';
  const squadFull = squad.filter(c => c.status !== 'dead').length >= 4;
  const canAfford = wanderer.recruitCost !== null && cats >= wanderer.recruitCost;

  const archetypeLabel =
    wanderer.archetype === 'drifter' ? 'Drifter'
    : wanderer.archetype === 'scavenger' ? 'Scavenger'
    : 'Desperate Raider';

  function handleAttack() {
    // Signal to main.ts to set the selected character's combatTarget
    window.dispatchEvent(new CustomEvent('iron-dunes:attackWanderer', { detail: { id: wandererMenuId } }));
    closeWandererMenu();
  }

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <div style={titleStyle}>{wanderer.name}</div>
        <div style={subtitleStyle}>{archetypeLabel} · {isNeutral ? 'Neutral' : 'Hostile'}</div>

        {isNeutral && (
          <>
            <div style={skillRowStyle}><span>Melee</span><span>{Math.round(wanderer.skills.melee)}</span></div>
            <div style={skillRowStyle}><span>Defence</span><span>{Math.round(wanderer.skills.defence)}</span></div>
            <div style={skillRowStyle}><span>Athletics</span><span>{Math.round(wanderer.skills.athletics)}</span></div>
            <div style={skillRowStyle}><span>Stealth</span><span>{Math.round(wanderer.skills.stealth)}</span></div>
            <div style={costStyle}>
              Recruit: {wanderer.recruitCost} cats
              {!canAfford && <span style={{ color: '#e84040', marginLeft: 6 }}>(not enough cats)</span>}
              {squadFull && <span style={{ color: '#e84040', marginLeft: 6 }}>(squad is full)</span>}
            </div>
          </>
        )}

        <div style={btnRowStyle}>
          {isNeutral ? (
            <>
              <button
                style={{ ...btnBase, background: 'rgba(255,255,255,0.07)' }}
                onClick={closeWandererMenu}
              >
                Talk
              </button>
              <button
                style={{
                  ...btnBase,
                  background: canAfford && !squadFull ? 'rgba(80,160,80,0.3)' : 'rgba(80,80,80,0.3)',
                  cursor: canAfford && !squadFull ? 'pointer' : 'not-allowed',
                  opacity: canAfford && !squadFull ? 1 : 0.6,
                }}
                onClick={() => {
                  if (canAfford && !squadFull) recruitWanderer(wandererMenuId);
                }}
                title={squadFull ? 'Squad is full' : !canAfford ? 'Not enough cats' : ''}
              >
                Recruit
              </button>
              <button
                style={{ ...btnBase, background: 'rgba(255,255,255,0.07)' }}
                onClick={closeWandererMenu}
              >
                Ignore
              </button>
            </>
          ) : (
            <>
              <button
                style={{ ...btnBase, background: 'rgba(200,60,60,0.3)' }}
                onClick={handleAttack}
              >
                Attack
              </button>
              <button
                style={{ ...btnBase, background: 'rgba(255,255,255,0.07)' }}
                onClick={closeWandererMenu}
              >
                Ignore
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
