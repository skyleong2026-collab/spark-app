import React, { useState, useEffect } from 'react';
import { simulateBattle } from '../lib/battleSimulation';
import '../styles/BattleVisualization.css';

const PLAYER_TEAM = ['nyx', 'thornwall', 'vex'];
const ENEMY_TEAM = [null, null, null];

export default function BattleVisualization() {
  const [battleData, setBattleData] = useState(null);
  const [eventIndex, setEventIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [unitStates, setUnitStates] = useState({});
  const [currentEvent, setCurrentEvent] = useState(null);
  const [turnText, setTurnText] = useState('');

  // Initialize battle
  useEffect(() => {
    const { events, finalUnits } = simulateBattle(PLAYER_TEAM, ENEMY_TEAM);
    setBattleData({ events });

    const initialStates = {};
    finalUnits.forEach(u => {
      initialStates[u.id] = { hp: u.maxHp, mark: false, shock: 0, burn: 0, shield: 0, stunned: 0 };
    });
    setUnitStates(initialStates);
    setEventIndex(0);
  }, []);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || !battleData) return;

    const timer = setTimeout(() => {
      if (eventIndex < battleData.events.length) {
        const event = battleData.events[eventIndex];
        setCurrentEvent(event);

        // Apply event to unit states
        if (event.type === 'skill') {
          if (event.effect.includes('SHIELD')) {
            setUnitStates(s => ({
              ...s,
              [event.actor]: { ...s[event.actor], shield: 30 },
            }));
          } else if (event.effect.includes('MARK')) {
            setUnitStates(s => ({
              ...s,
              [event.target]: { ...s[event.target], mark: true },
            }));
          } else if (event.effect.includes('SHOCK')) {
            setUnitStates(s => ({
              ...s,
              [event.target]: { ...s[event.target], shock: 2 },
            }));
          } else if (event.effect.includes('BURN')) {
            setUnitStates(s => ({
              ...s,
              [event.target]: { ...s[event.target], burn: 2 },
            }));
          }
        }

        if (event.type === 'attack') {
          setUnitStates(s => ({
            ...s,
            [event.target]: {
              ...s[event.target],
              hp: Math.max(0, s[event.target].hp - event.dmg),
            },
          }));
        }

        if (event.type === 'round_start') {
          setTurnText(`Turn ${event.round}`);
        }

        setEventIndex(eventIndex + 1);
      } else {
        setIsPlaying(false);
      }
    }, Math.max(50, 300 / speed));

    return () => clearTimeout(timer);
  }, [isPlaying, eventIndex, battleData, speed]);

  if (!battleData) return <div className="battle-loading">Loading battle...</div>;

  const players = [
    { id: 'player_0', name: 'Nyx', pos: 0 },
    { id: 'player_1', name: 'Thornwall', pos: 1 },
    { id: 'player_2', name: 'Vex', pos: 2 },
  ];

  const enemies = [
    { id: 'enemy_0', name: 'Goblin', pos: 0 },
    { id: 'enemy_1', name: 'Goblin', pos: 1 },
    { id: 'enemy_2', name: 'Goblin', pos: 2 },
  ];

  const renderUnit = (unit, isPlayer) => {
    const state = unitStates[unit.id] || { hp: unit.maxHp, mark: false, shock: 0, burn: 0, shield: 0 };
    const hpPercent = Math.max(0, (state.hp / 60) * 100);
    const isDead = state.hp === 0;

    return (
      <div key={unit.id} className="unit-card">
        <div className={`unit-circle ${isPlayer ? 'player' : 'enemy'} ${isDead ? 'dead' : ''}`}>
          {state.mark && <div className="status-mark"></div>}
          {state.shock > 0 && <div className="status-shock"></div>}
          {state.burn > 0 && <div className="status-burn"></div>}
          {state.shield > 0 && <div className="status-shield"></div>}
          <div className="unit-name">{unit.name}</div>
        </div>
        <div className="hp-bar">
          <div className="hp-fill" style={{ width: `${hpPercent}%` }}></div>
        </div>
        <div className="hp-text">
          {Math.max(0, Math.floor(state.hp))}/{60}
        </div>
      </div>
    );
  };

  return (
    <div className="battle-visualization">
      <div className="turn-indicator">{turnText}</div>

      <div className="battle-grid">
        <div className="team player-team">
          <div className="team-label">PLAYER</div>
          <div className="formation">
            {players.map(unit => renderUnit(unit, true))}
          </div>
        </div>

        <div className="team enemy-team">
          <div className="team-label">ENEMY</div>
          <div className="formation">
            {enemies.map(unit => renderUnit(unit, false))}
          </div>
        </div>
      </div>

      <div className="log-section">
        <div className="log-entry">
          {currentEvent ? `${currentEvent.actorName || ''} ${currentEvent.type} ${currentEvent.effect || ''}` : 'Battle starting...'}
        </div>
      </div>

      <div className="controls">
        <button onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={() => { setEventIndex(0); setIsPlaying(false); }}>⟲ Restart</button>
        <div className="speed-control">
          <label>Speed:</label>
          <select value={speed} onChange={e => setSpeed(parseFloat(e.target.value))}>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
          </select>
        </div>
        <div className="progress-text">{eventIndex} / {battleData.events.length}</div>
      </div>
    </div>
  );
}
