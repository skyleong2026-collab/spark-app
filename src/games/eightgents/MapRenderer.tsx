import React, { useMemo } from 'react';
import { MapState } from './types';
import './MapRenderer.css';

interface MapRendererProps {
  mapState: MapState;
  onTileClick: (x: number, y: number) => void;
  disabled?: boolean;
}

export const MapRenderer: React.FC<MapRendererProps> = ({
  mapState,
  onTileClick,
  disabled,
}) => {
  const infectedCount = useMemo(() => {
    return mapState.tiles.flat().filter((t) => t.infected).length;
  }, [mapState.tiles]);

  const maxRadius = useMemo(() => {
    return Math.max(...mapState.escalation.clusters.map((c) => c.radius), 1);
  }, [mapState.escalation.clusters]);

  return (
    <div className="map-container">
      <div className="map-stats">
        <div className="stat">
          <span className="label">Contaminated:</span>
          <span className="value">{infectedCount}/64</span>
        </div>
        <div className="stat">
          <span className="label">Intensity:</span>
          <span className="value">{(mapState.escalation.intensity * 100).toFixed(0)}%</span>
        </div>
        <div className="stat">
          <span className="label">Spread Velocity:</span>
          <span className="value">{mapState.escalation.spreadVelocity.toFixed(1)} t/s</span>
        </div>
        <div className="stat">
          <span className="label">Radius:</span>
          <span className="value">{maxRadius.toFixed(1)}</span>
        </div>
      </div>

      <div className="map-grid">
        {mapState.tiles.map((row, y) =>
          row.map((tile, x) => (
            <MapTile
              key={`${x}-${y}`}
              tile={tile}
              onClick={() => !disabled && tile.infected && onTileClick(x, y)}
              clickable={!disabled && tile.infected}
            />
          ))
        )}
      </div>

      <div className="map-help">
        {infectedCount > 0 ? (
          <p>Tap a red zone to initiate combat</p>
        ) : (
          <p>Spread contained! Prototype loop complete.</p>
        )}
      </div>
    </div>
  );
};

interface MapTileProps {
  tile: any;
  onClick: () => void;
  clickable: boolean;
}

const MapTile: React.FC<MapTileProps> = ({ tile, onClick, clickable }) => {
  // Contamination: 0 = white, 1 = deep red
  const getColor = () => {
    if (tile.contamination === 0) return '#f0f0f0';

    // Gradient from light orange to deep red
    const h = 0; // red hue
    const s = Math.round(40 + tile.contamination * 60); // 40-100%
    const l = Math.round(90 - tile.contamination * 40); // 90-50%

    return `hsl(${h}, ${s}%, ${l}%)`;
  };

  return (
    <div
      className={`map-tile ${clickable ? 'clickable' : ''} ${tile.infected ? 'infected' : ''}`}
      style={{
        backgroundColor: getColor(),
        animation: tile.infected ? 'pulse 1.5s ease-in-out infinite' : 'none',
      }}
      onClick={onClick}
    />
  );
};
