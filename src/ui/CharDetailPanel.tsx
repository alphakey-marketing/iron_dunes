import React from 'react';
import { useGameStore } from '../store/gameStore';
import type { BodyParts, Item } from '../types';

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

const BODY_PARTS: Array<{ key: keyof BodyParts; label: string }> = [
  { key: 'head', label: 'Head' },
  { key: 'chest', label: 'Chest' },
  { key: 'stomach', label: 'Stomach' },
  { key: 'leftArm', label: 'L. Arm' },
  { key: 'rightArm', label: 'R. Arm' },
  { key: 'leftLeg', label: 'L. Leg' },
  { key: 'rightLeg', label: 'R. Leg' },
];

function HPPart({ label, value, onHeal }: { label: string; value: number; onHeal?: () => void }) {
  const color = value > 60 ? '#44aa44' : value > 30 ? '#aaaa00' : '#aa3333';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
      <span style={{ color: '#aaa', flex: 1 }}>{label}</span>
      <span style={{ color, minWidth: 28, textAlign: 'right' }}>{Math.round(value)}</span>
      {onHeal && value < 100 && (
        <button style={{ ...btnSmall, marginLeft: 4, color: '#44cc44' }} onClick={onHeal} title="Use Medical Kit (+30 HP)">+</button>
      )}
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
  const { squad, selectedCharId, equipItem, unequipWeapon, unequipArmour, useMedKit } = useGameStore();
  const char = squad.find(c => c.id === selectedCharId);

  if (!char) return null;

  const hasMedKit = char.backpack.some(item => item.type === 'medical');

  return (
    <div style={{
      position: 'absolute',
      right: 8,
      top: 50,
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
      <div style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>{char.status.toUpperCase()}</div>
      <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>Hunger: {Math.round(char.hunger)}%</div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ color: '#888', fontSize: 10 }}>BODY PARTS</span>
          {hasMedKit && <span style={{ color: '#44cc44', fontSize: 9 }}>Med Kit ✓</span>}
        </div>
        {BODY_PARTS.map(({ key, label }) => (
          <HPPart
            key={key}
            label={label}
            value={char.bodyParts[key]}
            onHeal={hasMedKit ? () => useMedKit(char.id, key) : undefined}
          />
        ))}
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
