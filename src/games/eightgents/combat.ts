import { MapState, CombatState, CombatResult, Tile } from './types';

export function initiateCombat(mapState: MapState, tapX: number, tapY: number): CombatState {
  const infectedCount = mapState.tiles
    .flat()
    .filter((t) => t.infected).length;

  // Scale enemy count to infected zones, but cap at 12 for prototype
  const baseEnemies = Math.min(12, Math.ceil(infectedCount * 0.8));
  const hazardLevel = mapState.escalation.intensity;

  // Get tiles in contaminated zone around tap point
  const arenaContaminatedTiles = getArenaContamination(mapState, tapX, tapY);

  // Scale health based on hazard level
  const playerMaxHealth = Math.ceil(10 + hazardLevel * 5);

  return {
    enemyCount: baseEnemies,
    hazardLevel,
    arenaContaminatedTiles,
    playerHealth: playerMaxHealth,
    playerMaxHealth,
    playerDamageThisRound: 0,
    enemyDamageThisRound: 0,
    round: 0,
    victory: false,
  };
}

export function resolveCombatRound(combatState: CombatState): CombatState {
  const nextRound = combatState.round + 1;

  // Player damage: base 2-3, scales with round, slight randomness
  const playerDamage = Math.ceil(2.5 + nextRound * 0.3 + Math.random() * 1.5);

  // Enemy damage: scales with hazard and their count, reduced as they die
  const enemyHealthScaling = Math.max(0, 1 - (nextRound * 0.25) / combatState.enemyCount);
  const hazardScaling = 1 + combatState.hazardLevel * 1.5;
  const enemyDamage = Math.ceil(2 * hazardScaling * (0.5 + enemyHealthScaling));

  const remainingEnemies = Math.max(0, combatState.enemyCount - Math.ceil(playerDamage / 2));
  const newPlayerHealth = Math.max(0, combatState.playerHealth - enemyDamage);

  const victory = remainingEnemies === 0;

  return {
    ...combatState,
    round: nextRound,
    playerHealth: newPlayerHealth,
    playerDamageThisRound: playerDamage,
    enemyDamageThisRound: enemyDamage,
    enemyCount: remainingEnemies,
    victory: victory || newPlayerHealth === 0,
  };
}

export function finalizeCombat(combatState: CombatState): CombatResult {
  const victory = combatState.victory && combatState.playerHealth > 0;

  return {
    victory,
    damageDealt: combatState.playerDamageThisRound,
    damageTaken: combatState.enemyDamageThisRound,
    spreadReduction: victory ? 0.3 : 0,
  };
}

export function applyVictory(mapState: MapState, tapX: number, tapY: number): MapState {
  // Reduce spread intensity and cluster radius
  const updatedClusters = mapState.escalation.clusters.map((cluster) => ({
    ...cluster,
    radius: Math.max(0.5, cluster.radius * 0.7),
    intensity: Math.max(0, cluster.intensity - 0.2),
  }));

  // Also reduce contamination in the combat zone
  const tiles = mapState.tiles.map((row) =>
    row.map((tile) => {
      const distance = Math.hypot(tile.x - tapX, tile.y - tapY);
      if (distance < 3) {
        return {
          ...tile,
          contamination: Math.max(0, tile.contamination - 0.3),
        };
      }
      return tile;
    })
  );

  return {
    ...mapState,
    tiles,
    escalation: {
      ...mapState.escalation,
      clusters: updatedClusters,
      intensity: Math.max(0, mapState.escalation.intensity - 0.1),
    },
  };
}

export function applyDefeat(mapState: MapState): MapState {
  // Accelerate spread on defeat
  const updatedClusters = mapState.escalation.clusters.map((cluster) => ({
    ...cluster,
    radius: cluster.radius * 1.3,
    intensity: Math.min(1, cluster.intensity + 0.15),
  }));

  return {
    ...mapState,
    escalation: {
      ...mapState.escalation,
      clusters: updatedClusters,
      spreadVelocity: Math.min(3, mapState.escalation.spreadVelocity + 0.3),
      intensity: Math.min(1, mapState.escalation.intensity + 0.15),
    },
  };
}

function getArenaContamination(mapState: MapState, tapX: number, tapY: number): Tile[] {
  const nearby = [];
  for (let y = Math.max(0, tapY - 2); y <= Math.min(7, tapY + 2); y++) {
    for (let x = Math.max(0, tapX - 2); x <= Math.min(7, tapX + 2); x++) {
      if (mapState.tiles[y][x].contamination > 0) {
        nearby.push(mapState.tiles[y][x]);
      }
    }
  }
  return nearby;
}
