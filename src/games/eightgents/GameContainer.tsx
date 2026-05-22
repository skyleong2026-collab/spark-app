import React, { useState, useEffect, useCallback } from 'react';
import { MapState, GameState, CombatState } from './types';
import {
  initializeMap,
  updateEscalation,
  getInfectedZones,
} from './escalation';
import {
  initiateCombat,
  resolveCombatRound,
  finalizeCombat,
  applyVictory,
  applyDefeat,
} from './combat';
import { MapRenderer } from './MapRenderer';
import { CombatScreen } from './CombatScreen';
import './GameContainer.css';

export const GameContainer: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('map');
  const [mapState, setMapState] = useState<MapState>(initializeMap());
  const [combatState, setCombatState] = useState<CombatState | null>(null);
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);

  // Update escalation every frame
  useEffect(() => {
    const interval = setInterval(() => {
      setMapState((prev) => updateEscalation(prev));
    }, 200); // 200ms update interval for smooth spread

    return () => clearInterval(interval);
  }, []);

  // Auto-resolve combat rounds
  useEffect(() => {
    if (gameState !== 'combat' || !combatState) return;

    if (combatState.victory || combatState.playerHealth === 0) {
      // Combat is over, wait for user to continue
      return;
    }

    const timer = setTimeout(() => {
      const nextState = resolveCombatRound(combatState);
      setCombatState(nextState);
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameState, combatState]);

  const handleTileClick = useCallback(
    (x: number, y: number) => {
      if (gameState !== 'map') return;

      setSelectedTile({ x, y });
      const newCombatState = initiateCombat(mapState, x, y);
      setCombatState(newCombatState);
      setGameState('combat');
    },
    [gameState, mapState]
  );

  const handleCombatEnd = useCallback(() => {
    if (!combatState || !selectedTile) return;

    const result = finalizeCombat(combatState);
    let updatedMap = mapState;

    if (result.victory) {
      updatedMap = applyVictory(mapState, selectedTile.x, selectedTile.y);
    } else {
      updatedMap = applyDefeat(mapState);
    }

    setMapState(updatedMap);
    setCombatState(null);
    setSelectedTile(null);
    setGameState('map');
  }, [combatState, selectedTile, mapState]);

  const resetGame = useCallback(() => {
    setGameState('map');
    setMapState(initializeMap());
    setCombatState(null);
    setSelectedTile(null);
  }, []);

  const infectedZones = getInfectedZones(mapState.tiles);
  const gameWon = infectedZones.length === 0;

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>8gents: Vertical Slice</h1>
        <p className="subtitle">Map Escalation → Combat Intervention → World State Consequence</p>
      </div>

      {gameState === 'map' && (
        <>
          <MapRenderer
            mapState={mapState}
            onTileClick={handleTileClick}
            disabled={gameWon}
          />
          {gameWon && (
            <div className="game-success">
              <div className="success-message">
                <h3>Escalation Contained</h3>
                <p>The infected zones have been fully neutralized.</p>
                <button onClick={resetGame} className="reset-btn">
                  New Game
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {gameState === 'combat' && combatState && (
        <CombatScreen combatState={combatState} onCombatEnd={handleCombatEnd} />
      )}

      <div className="game-footer">
        <div className="footer-section">
          <h4>Design Goals:</h4>
          <ul className="goals-list">
            <li>Test escalation → intervention → consequence loop</li>
            <li>Victory reduces spread; defeat accelerates it</li>
            <li>Combat difficulty scales with map contamination</li>
            <li>Continuous gameplay feel across modes</li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>Mechanics:</h4>
          <ul className="mechanics-list">
            <li>Cluster expands every 2 seconds (exponential growth)</li>
            <li>8 enemy types scale from contaminated tiles</li>
            <li>Auto-resolve combat in ~3-5 seconds</li>
            <li>Victory: reduce radius & intensity</li>
            <li>Defeat: accelerate expansion</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
