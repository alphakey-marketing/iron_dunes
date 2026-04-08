import * as PIXI from 'pixi.js';
import type { Character as CharData, Enemy, LootContainer } from '../types';
import { TILE_SIZE } from '../data/map';

const CHAR_RADIUS = 10;
const HEALTH_BAR_WIDTH = 20;
const HEALTH_BAR_HEIGHT = 3;

const COLORS = {
  player: 0x4F98A3,
  enemy: 0xE84040,
  unconscious: 0x888888,
  selected: 0xFFFF00,
  loot: 0xF0C040,
  dead: 0x444444,
};

interface CharSprite {
  container: PIXI.Container;
  circle: PIXI.Graphics;
  hpBar: PIXI.Graphics;
  hpBg: PIXI.Graphics;
}

export class CharRenderer {
  private charLayer: PIXI.Container;
  private charSprites: Map<string, CharSprite> = new Map();
  private lootSprites: Map<string, PIXI.Graphics> = new Map();

  constructor(parent: PIXI.Container) {
    this.charLayer = new PIXI.Container();
    parent.addChild(this.charLayer);
  }

  private getOrCreateSprite(id: string): CharSprite {
    if (this.charSprites.has(id)) return this.charSprites.get(id)!;

    const container = new PIXI.Container();
    const circle = new PIXI.Graphics();
    const hpBg = new PIXI.Graphics();
    const hpBar = new PIXI.Graphics();

    container.addChild(circle);
    container.addChild(hpBg);
    container.addChild(hpBar);
    this.charLayer.addChild(container);

    const sprite = { container, circle, hpBar, hpBg };
    this.charSprites.set(id, sprite);
    return sprite;
  }

  private removeSprite(id: string): void {
    const sprite = this.charSprites.get(id);
    if (sprite) {
      this.charLayer.removeChild(sprite.container);
      this.charSprites.delete(id);
    }
  }

  update(
    squad: CharData[],
    enemies: Enemy[],
    loot: LootContainer[],
    selectedId: string | null
  ): void {
    const activeIds = new Set<string>();

    for (const char of squad) {
      activeIds.add(char.id);
      const sprite = this.getOrCreateSprite(char.id);
      sprite.container.x = char.x * TILE_SIZE;
      sprite.container.y = char.y * TILE_SIZE;

      const color = char.status === 'unconscious' ? COLORS.unconscious
        : char.status === 'dead' ? COLORS.dead
        : COLORS.player;

      sprite.circle.clear();
      if (char.id === selectedId) {
        sprite.circle.circle(0, 0, CHAR_RADIUS + 3);
        sprite.circle.fill({ color: COLORS.selected, alpha: 0.5 });
      }
      sprite.circle.circle(0, 0, CHAR_RADIUS);
      sprite.circle.fill({ color });

      const totalHp = Object.values(char.bodyParts).reduce((a, b) => a + b, 0);
      this.drawHpBar(sprite, totalHp / 700);
    }

    for (const enemy of enemies) {
      if (enemy.status === 'dead') continue;
      activeIds.add(enemy.id);
      const sprite = this.getOrCreateSprite(enemy.id);
      sprite.container.x = enemy.x * TILE_SIZE;
      sprite.container.y = enemy.y * TILE_SIZE;

      const color = enemy.status === 'unconscious' ? COLORS.unconscious : COLORS.enemy;
      sprite.circle.clear();
      sprite.circle.circle(0, 0, CHAR_RADIUS);
      sprite.circle.fill({ color });

      const hpPct = Object.values(enemy.bodyParts).reduce((a, b) => a + b, 0) / 700;
      this.drawHpBar(sprite, hpPct);
    }

    for (const [id] of this.charSprites) {
      if (!activeIds.has(id)) {
        this.removeSprite(id);
      }
    }

    const activeLootIds = new Set<string>();
    for (const container of loot) {
      if (container.opened) continue;
      activeLootIds.add(container.id);

      if (!this.lootSprites.has(container.id)) {
        const gfx = new PIXI.Graphics();
        gfx.rect(-8, -8, 16, 16);
        gfx.fill({ color: COLORS.loot });
        this.charLayer.addChild(gfx);
        this.lootSprites.set(container.id, gfx);
      }

      const gfx = this.lootSprites.get(container.id)!;
      gfx.x = container.x * TILE_SIZE;
      gfx.y = container.y * TILE_SIZE;
    }

    for (const [id, gfx] of this.lootSprites) {
      if (!activeLootIds.has(id)) {
        this.charLayer.removeChild(gfx);
        this.lootSprites.delete(id);
      }
    }
  }

  private drawHpBar(sprite: CharSprite, hpPct: number): void {
    const bx = -HEALTH_BAR_WIDTH / 2;
    const by = -(CHAR_RADIUS + 8);

    sprite.hpBg.clear();
    sprite.hpBg.rect(bx - 1, by - 1, HEALTH_BAR_WIDTH + 2, HEALTH_BAR_HEIGHT + 2);
    sprite.hpBg.fill({ color: 0x000000, alpha: 0.6 });

    const barColor = hpPct > 0.6 ? 0x44AA44 : hpPct > 0.3 ? 0xAAAA00 : 0xAA3333;
    sprite.hpBar.clear();
    sprite.hpBar.rect(bx, by, Math.max(0, HEALTH_BAR_WIDTH * hpPct), HEALTH_BAR_HEIGHT);
    sprite.hpBar.fill({ color: barColor });
  }
}
