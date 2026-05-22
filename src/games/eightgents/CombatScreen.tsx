import React, { useEffect, useState } from 'react';
import { CombatState } from './types';
import './CombatScreen.css';

interface CombatScreenProps {
  combatState: CombatState;
  onCombatEnd: () => void;
  autoResolve?: boolean;
}

export const CombatScreen: React.FC<CombatScreenProps> = ({
  combatState,
  onCombatEnd,
  autoResolve = true,
}) => {
  const [displayState, setDisplayState] = useState(combatState);

  useEffect(() => {
    if (autoResolve && !combatState.victory && combatState.playerHealth > 0) {
      const timer = setTimeout(onCombatEnd, 1500);
      return () => clearTimeout(timer);
    }
  }, [combatState, onCombatEnd, autoResolve]);

  return (
    <div className="combat-container">
      <div className="combat-title">
        <h2>Combat Engagement</h2>
      </div>

      <div className="combat-arena">
        <div className="combat-zone">
          <span className="zone-label">Contaminated Tiles:</span>
          <span className="zone-value">{combatState.arenaContaminatedTiles.length}</span>
        </div>
        <div className="hazard-indicator">
          <span className="hazard-label">Hazard Level:</span>
          <div className="hazard-bar">
            <div
              className="hazard-fill"
              style={{ width: `${combatState.hazardLevel * 100}%` }}
            />
          </div>
          <span className="hazard-value">
            {(combatState.hazardLevel * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="combat-status">
        <div className="combatant player">
          <div className="combatant-name">Player</div>
          <div className="health-bar">
            <div
              className="health-fill"
              style={{ width: `${(combatState.playerHealth / combatState.playerMaxHealth) * 100}%` }}
            />
          </div>
          <div className="health-text">
            {combatState.playerHealth} / {combatState.playerMaxHealth}
          </div>
          {combatState.round > 0 && (
            <div className="round-damage">-{combatState.enemyDamageThisRound}</div>
          )}
        </div>

        <div className="vs">VS</div>

        <div className="combatant enemy">
          <div className="combatant-name">Enemies</div>
          <div className="enemy-count">{combatState.enemyCount}</div>
          <div className="enemy-label">remaining</div>
          {combatState.round > 0 && (
            <div className="round-damage">-{combatState.playerDamageThisRound}</div>
          )}
        </div>
      </div>

      <div className="combat-round">
        <div className="round-label">Round {combatState.round}</div>
      </div>

      {combatState.victory && (
        <div className="combat-result victory">
          <div className="result-icon">✓</div>
          <div className="result-text">Victory!</div>
          <div className="result-detail">Spread will be contained</div>
        </div>
      )}

      {combatState.playerHealth === 0 && !combatState.victory && (
        <div className="combat-result defeat">
          <div className="result-icon">✗</div>
          <div className="result-text">Defeated</div>
          <div className="result-detail">Spread will accelerate</div>
        </div>
      )}

      {!combatState.victory && combatState.playerHealth > 0 && (
        <div className="combat-status-text">
          Engaging... Round {combatState.round + 1}
        </div>
      )}

      <button className="continue-btn" onClick={onCombatEnd}>
        {combatState.victory ? 'Return to Map' : 'Continue'}
      </button>
    </div>
  );
};
