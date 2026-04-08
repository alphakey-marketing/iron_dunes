import type { Character as CharData } from '../types';
import { updateCharacter, isAlive, isConscious, createCharacter } from './Character';

const MAX_SQUAD_SIZE = 4;

export class Squad {
  characters: CharData[] = [];
  selectedCharId: string | null = null;

  constructor() {
    const wanderer = createCharacter('wanderer_1', 'The Wanderer', 32, 30);
    this.characters.push(wanderer);
    this.selectedCharId = wanderer.id;
  }

  update(delta: number): void {
    for (const char of this.characters) {
      updateCharacter(char, delta);
    }
  }

  selectCharacter(id: string): void {
    this.selectedCharId = id;
  }

  addCharacter(char: CharData): boolean {
    if (this.characters.length >= MAX_SQUAD_SIZE) return false;
    this.characters.push(char);
    return true;
  }

  removeCharacter(id: string): void {
    this.characters = this.characters.filter(c => c.id !== id);
    if (this.selectedCharId === id) {
      this.selectedCharId = this.characters[0]?.id ?? null;
    }
  }

  getLeader(): CharData | null {
    return this.characters.find(c => isAlive(c)) ?? null;
  }

  allDead(): boolean {
    return this.characters.every(c => !isConscious(c));
  }

  getById(id: string): CharData | undefined {
    return this.characters.find(c => c.id === id);
  }
}
