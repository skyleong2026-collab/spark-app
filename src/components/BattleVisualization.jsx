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
  const [battleCount, setBattleCount] = useState(1);
  const [autoReplay, setAutoReplay] = useState(false);

  // Initialize battle
  useEffect(() => {
    const { events, finalUnits } = simulateBattle(PLAYER_TEAM, ENEMY_TEAM);
    setBattleData({ events });

    const initialStates = {};
    finalUnits.forEach(u => {
      initialStates[u.id] = {
        hp: u.maxHp,
        maxHp: u.maxHp,
        mark: false,
        shock: 0,
        burn: 0,
        shield: u.archtype === 'thornwall' ? 30 : 0,
        stunned: 0
      };
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

        if (event.type === 'battle_end' && autoReplay && battleCount < 20) {
          // Auto-start next battle after brief delay
          setTimeout(() => {
            const { events, finalUnits } = simulateBattle(PLAYER_TEAM, ENEMY_TEAM);
            setBattleData({ events });
            const initialStates = {};
            finalUnits.forEach(u => {
              initialStates[u.id] = {
                hp: u.maxHp,
                maxHp: u.maxHp,
                mark: false,
                shock: 0,
                burn: 0,
                shield: u.archtype === 'thornwall' ? 30 : 0,
                stunned: 0
              };
            });
            setUnitStates(initialStates);
            setEventIndex(0);
            setBattleCount(c => c + 1);
            setIsPlaying(true);
          }, 1500);
          return;
        }

        setEventIndex(eventIndex + 1);
      } else {
        if (!autoReplay) {
          setIsPlaying(false);
        }
      }
    }, Math.max(50, 300 / speed));

    return () => clearTimeout(timer);
  }, [isPlaying, eventIndex, battleData, speed, autoReplay, battleCount]);

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
    const state = unitStates[unit.id] || { hp: 60, maxHp: 60, mark: false, shock: 0, burn: 0, shield: 0 };
    const maxHp = state.maxHp || 60;
    const hpPercent = Math.max(0, (state.hp / maxHp) * 100);
    const isDead = state.hp === 0;

    const statusClasses = [];
    if (state.mark) statusClasses.push('has-mark');
    if (state.shock > 0) statusClasses.push('has-shock');
    if (state.burn > 0) statusClasses.push('has-burn');
    if (state.shield > 0) statusClasses.push('has-shield');

    return (
      <div key={unit.id} className="unit-card">
        <div className={`unit-circle ${isPlayer ? 'player' : 'enemy'} ${isDead ? 'dead' : ''} ${statusClasses.join(' ')}`}>
          {state.mark && <div className="status-mark"></div>}
          {state.shock > 0 && <div className="status-shock"></div>}
          {state.burn > 0 && <div className="status-burn"></div>}
          {state.shield > 0 && <div className="status-shield"></div>}
          <div className="unit-name">{unit.name}</div>
        </div>
        <div className="hp-container">
          <div className="hp-bar">
            <div className="hp-fill" style={{ width: `${hpPercent}%` }}></div>
          </div>
          <div className="hp-text">
            {Math.max(0, Math.floor(state.hp))}/{maxHp}
          </div>
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
          {currentEvent ?
            currentEvent.type === 'skill' ? `🎯 ${currentEvent.actorName} used ${currentEvent.skill} → ${currentEvent.effect}` :
            currentEvent.type === 'attack' ? `⚔ ${currentEvent.actorName} attacked ${currentEvent.targetName} (${currentEvent.dmg} dmg)` :
            currentEvent.type === 'defeat' ? `💀 ${currentEvent.unitName} defeated` :
            currentEvent.type === 'round_start' ? `📍 Turn ${currentEvent.round}` :
            currentEvent.type === 'battle_end' ? `${currentEvent.winner === 'player' ? '✓ VICTORY' : '✗ DEFEAT'}` :
            `${currentEvent.type}`
          : 'Battle starting...'}
        </div>
      </div>

      <div className="controls">
        <button onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={() => { setEventIndex(0); setIsPlaying(false); setBattleCount(1); }}>⟲ Restart</button>
        <button
          onClick={() => {
            setAutoReplay(!autoReplay);
            if (!autoReplay) setIsPlaying(true);
          }}
          style={{ background: autoReplay ? '#10b981' : '#3b82f6' }}
        >
          {autoReplay ? '🔄 Auto-Replay ON' : '▶ Auto-Replay OFF'}
        </button>
        <div className="speed-control">
          <label>Speed:</label>
          <select value={speed} onChange={e => setSpeed(parseFloat(e.target.value))}>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
          </select>
        </div>
        <div className="progress-text">Battle {battleCount}/20 | Event {eventIndex} / {battleData.events.length}</div>
      </div>
    </div>
  );
}
