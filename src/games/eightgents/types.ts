export type GameState = 'map' | 'combat' | 'result';

export interface Tile {
  x: number;
  y: number;
  contamination: number; // 0-1
  infected: boolean;
}

export interface EscalationState {
  clusters: EscalationCluster[];
  intensity: number; // 0-1
  spreadVelocity: number; // tiles per second
}

export interface EscalationCluster {
  centerX: number;
  centerY: number;
  radius: number;
  intensity: number; // 0-1
}

export interface MapState {
  tiles: Tile[][];
  escalation: EscalationState;
  lastSpreadTime: number;
}

export interface CombatState {
  enemyCount: number;
  hazardLevel: number;
  arenaContaminatedTiles: Tile[];
  playerHealth: number;
  playerMaxHealth: number;
  playerDamageThisRound: number;
  enemyDamageThisRound: number;
  round: number;
  victory: boolean;
}

export interface CombatResult {
  victory: boolean;
  damageDealt: number;
  damageTaken: number;
  spreadReduction: number; // how much to reduce spread on victory
}
