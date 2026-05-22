import { MapState, EscalationCluster, Tile } from './types';

const GRID_SIZE = 8;
const SPREAD_INTERVAL = 2000; // ms
const EXPONENTIAL_GROWTH = 1.15; // 15% radius expansion per spread

export function initializeMap(): MapState {
  const tiles = Array.from({ length: GRID_SIZE }, (_, y) =>
    Array.from({ length: GRID_SIZE }, (_, x) => ({
      x,
      y,
      contamination: 0,
      infected: false,
    }))
  );

  const cluster: EscalationCluster = {
    centerX: 4,
    centerY: 4,
    radius: 1,
    intensity: 1,
  };

  return {
    tiles,
    escalation: {
      clusters: [cluster],
      intensity: 0.5,
      spreadVelocity: 0.5,
    },
    lastSpreadTime: Date.now(),
  };
}

export function updateEscalation(mapState: MapState): MapState {
  const now = Date.now();
  const timeSinceSpread = now - mapState.lastSpreadTime;

  if (timeSinceSpread < SPREAD_INTERVAL) {
    return updateContamination(mapState);
  }

  // Expand clusters
  const updatedClusters = mapState.escalation.clusters.map((cluster) => ({
    ...cluster,
    radius: cluster.radius * EXPONENTIAL_GROWTH,
    intensity: Math.min(1, cluster.intensity + 0.1),
  }));

  const newState: MapState = {
    ...mapState,
    escalation: {
      ...mapState.escalation,
      clusters: updatedClusters,
      spreadVelocity: Math.min(2, mapState.escalation.spreadVelocity + 0.15),
    },
    lastSpreadTime: now,
  };

  return updateContamination(newState);
}

function updateContamination(mapState: MapState): MapState {
  const tiles = mapState.tiles.map((row) => [...row]);

  // Reset contamination
  tiles.forEach((row) => {
    row.forEach((tile) => {
      tile.contamination = 0;
      tile.infected = false;
    });
  });

  // Apply cluster contamination
  mapState.escalation.clusters.forEach((cluster) => {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const distance = Math.hypot(x - cluster.centerX, y - cluster.centerY);
        const falloff = Math.max(0, 1 - distance / cluster.radius);
        const contamination = falloff * cluster.intensity;

        tiles[y][x].contamination = Math.max(
          tiles[y][x].contamination,
          contamination
        );

        if (contamination > 0.3) {
          tiles[y][x].infected = true;
        }
      }
    }
  });

  return {
    ...mapState,
    tiles,
  };
}

export function getInfectedZones(tiles: Tile[][]): Tile[] {
  return tiles.flat().filter((tile) => tile.infected);
}

export function getClusterAtPosition(
  mapState: MapState,
  x: number,
  y: number
): EscalationCluster | null {
  for (const cluster of mapState.escalation.clusters) {
    const distance = Math.hypot(x - cluster.centerX, y - cluster.centerY);
    if (distance <= cluster.radius) {
      return cluster;
    }
  }
  return null;
}
