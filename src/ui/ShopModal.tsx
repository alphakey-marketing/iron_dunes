import { useGameStore } from '../store/gameStore';
import type { Item } from '../types';

function ItemRow({ item, price, btnLabel, onAction }: { item: Item; price: number; btnLabel: string; onAction: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ flex: 1, fontSize: 12 }}>{item.name}</span>
      <span style={{ fontSize: 11, color: '#aaa' }}>{price}c</span>
      <button
        onClick={onAction}
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.3)',
          color: '#e8d5b0',
          padding: '2px 8px',
          cursor: 'pointer',
          borderRadius: 3,
          fontFamily: 'monospace',
          fontSize: 11,
        }}
      >
        {btnLabel}
      </button>
    </div>
  );
}

export function ShopModal() {
  const { shopVendorId, vendors, squad, selectedCharId, cats, closeShop, buyItemAction, sellItemAction } = useGameStore();

  if (!shopVendorId) return null;
  const vendor = vendors.find(v => v.id === shopVendorId);
  if (!vendor) return null;

  const char = squad.find(c => c.id === selectedCharId) ?? squad[0];

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
      onClick={e => { if (e.target === e.currentTarget) closeShop(); }}
    >
      <div style={{
        background: '#1e1a16',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: 8,
        padding: 20,
        width: 560,
        maxHeight: '80vh',
        fontFamily: 'monospace',
        color: '#e8d5b0',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 'bold' }}>{vendor.name}</div>
          <div style={{ color: '#aaa' }}>Balance: <span style={{ color: '#f0c040' }}>{cats} cats</span></div>
          <button onClick={closeShop} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: 10, overflowY: 'auto', maxHeight: '60vh' }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>VENDOR STOCK</div>
            {vendor.inventory.length === 0 ? (
              <div style={{ color: '#666', fontSize: 11 }}>Out of stock</div>
            ) : (
              vendor.inventory.map((item, i) => (
                <ItemRow
                  key={`${item.id}_${i}`}
                  item={item}
                  price={item.buyPrice}
                  btnLabel="Buy"
                  onAction={() => buyItemAction(shopVendorId, item.id)}
                />
              ))
            )}
          </div>

          {char && (
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: 10, overflowY: 'auto', maxHeight: '60vh' }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>YOUR BACKPACK</div>
              {char.backpack.length === 0 ? (
                <div style={{ color: '#666', fontSize: 11 }}>Empty</div>
              ) : (
                char.backpack.map((item, i) => (
                  <ItemRow
                    key={`${item.id}_${i}`}
                    item={item}
                    price={item.sellPrice}
                    btnLabel="Sell"
                    onAction={() => sellItemAction(shopVendorId, char.id, i)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
