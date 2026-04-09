import React from 'react';
import { useGameStore } from '../store/gameStore';
import type { Item } from '../types';

const btnSmall: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.3)',
  color: '#e8d5b0',
  padding: '1px 6px',
  cursor: 'pointer',
  borderRadius: 3,
  fontFamily: 'monospace',
  fontSize: 10,
};

function HPPart({ label, value }: { label: string; value: number }) {
  const color = value > 60 ? '#44aa44' : value > 30 ? '#aaaa00' : '#aa3333';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
      <span style={{ color: '#aaa' }}>{label}</span>
      <span style={{ color }}>{Math.round(value)}</span>
    </div>
  );
}

function EquipSlot({ label, item, onUnequip }: { label: string; item: Item | null; onUnequip: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
      <span style={{ color: '#aaa', minWidth: 50 }}>{label}:</span>
      <span style={{ flex: 1, marginLeft: 4 }}>{item?.name ?? '—'}</span>
      {item && (
        <button style={btnSmall} onClick={onUnequip} title="Unequip">↩</button>
      )}
    </div>
  );
}

export function CharDetailPanel() {
  const { squad, selectedCharId, equipItem, unequipWeapon, unequipArmour } = useGameStore();
  const char = squad.find(c => c.id === selectedCharId);

  if (!char) return null;

  return (
    <div style={{
      position: 'absolute',
      right: 8,
      top: 8,
      width: 220,
      background: 'rgba(0,0,0,0.8)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: 6,
      padding: 12,
      pointerEvents: 'auto',
      fontFamily: 'monospace',
      fontSize: 12,
      color: '#e8d5b0',
      maxHeight: '80vh',
      overflowY: 'auto',
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>{char.name}</div>
      <div style={{ color: '#aaa', fontSize: 11, marginBottom: 8 }}>{char.status.toUpperCase()}</div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ color: '#888', fontSize: 10, marginBottom: 4 }}>BODY PARTS</div>
        <HPPart label="Head" value={char.bodyParts.head} />
        <HPPart label="Chest" value={char.bodyParts.chest} />
        <HPPart label="Stomach" value={char.bodyParts.stomach} />
        <HPPart label="L. Arm" value={char.bodyParts.leftArm} />
        <HPPart label="R. Arm" value={char.bodyParts.rightArm} />
        <HPPart label="L. Leg" value={char.bodyParts.leftLeg} />
        <HPPart label="R. Leg" value={char.bodyParts.rightLeg} />
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ color: '#888', fontSize: 10, marginBottom: 4 }}>SKILLS</div>
        {Object.entries(char.skills).map(([skill, val]) => (
          <div key={skill} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: '#aaa', textTransform: 'capitalize' }}>{skill}</span>
            <span>{Math.round(val)}</span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ color: '#888', fontSize: 10, marginBottom: 4 }}>EQUIPMENT</div>
        <EquipSlot label="Weapon" item={char.weapon} onUnequip={() => unequipWeapon(char.id)} />
        <EquipSlot label="Armour" item={char.armour} onUnequip={() => unequipArmour(char.id)} />
      </div>

      <div>
        <div style={{ color: '#888', fontSize: 10, marginBottom: 4 }}>BACKPACK ({char.backpack.length})</div>
        {char.backpack.length === 0 ? (
          <div style={{ color: '#666', fontSize: 11 }}>Empty</div>
        ) : (
          char.backpack.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ flex: 1 }}>{item.name}</span>
              {(item.type === 'weapon' || item.type === 'armour') && (
                <button
                  style={btnSmall}
                  onClick={() => equipItem(char.id, i)}
                  title="Equip"
                >
                  ↑
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
