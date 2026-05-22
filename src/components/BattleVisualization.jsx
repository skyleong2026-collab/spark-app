import React, { useState, useEffect, useRef, useCallback } from 'react';
import { simulateBattle } from '../lib/battleSimulation';
import '../styles/BattleVisualization.css';

const PLAYER_TEAM = ['nyx', 'thornwall', 'vex'];
const ENEMY_TEAM  = [null, null, null];

// Fixed coordinate system — units are nodes on a field, not list items
const ARENA_W = 720;
const ARENA_H = 300;
const UNIT_POS = {
  player_0: { x: 110, y:  80 },
  player_1: { x: 110, y: 160 },
  player_2: { x: 110, y: 240 },
  enemy_0:  { x: 610, y:  80 },
  enemy_1:  { x: 610, y: 160 },
  enemy_2:  { x: 610, y: 240 },
};

const PLAYER_UNITS = [
  { id: 'player_0', name: 'Nyx',      maxHp:  60 },
  { id: 'player_1', name: 'Thornwall', maxHp: 180 },
  { id: 'player_2', name: 'Vex',       maxHp:  75 },
];
const ENEMY_UNITS = [
  { id: 'enemy_0', name: 'Goblin', maxHp: 60 },
  { id: 'enemy_1', name: 'Goblin', maxHp: 60 },
  { id: 'enemy_2', name: 'Goblin', maxHp: 60 },
];

function initStates(finalUnits) {
  const s = {};
  finalUnits.forEach(u => {
    s[u.id] = {
      hp: u.maxHp, maxHp: u.maxHp,
      mark: false, shock: 0, burn: 0,
      shield: u.archtype === 'thornwall' ? 30 : 0,
    };
  });
  return s;
}

export default function BattleVisualization() {
  const [battleData,    setBattleData]    = useState(null);
  const [eventIndex,    setEventIndex]    = useState(0);
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [speed,         setSpeed]         = useState(1);
  const [unitStates,    setUnitStates]    = useState({});
  const [logText,       setLogText]       = useState('Press Play');
  const [turnText,      setTurnText]      = useState('');
  const [battleCount,   setBattleCount]   = useState(1);
  const [autoReplay,    setAutoReplay]    = useState(false);

  // Relationship visualization state
  const [telegraph,     setTelegraph]     = useState(null); // {from,to,kind}
  const [activeActor,   setActiveActor]   = useState(null);
  const [damageFloats,  setDamageFloats]  = useState([]);   // [{id,unitId,dmg}]
  const floatId = useRef(0);

  const addFloat = useCallback((unitId, dmg) => {
    const id = floatId.current++;
    setDamageFloats(prev => [...prev, { id, unitId, dmg }]);
    setTimeout(() => setDamageFloats(prev => prev.filter(f => f.id !== id)), 900);
  }, []);

  const startBattle = useCallback(() => {
    const { events, finalUnits } = simulateBattle(PLAYER_TEAM, ENEMY_TEAM);
    setBattleData({ events });
    setUnitStates(initStates(finalUnits));
    setEventIndex(0);
    setTelegraph(null);
    setActiveActor(null);
    setDamageFloats([]);
    setLogText('Battle ready — press Play');
    setTurnText('');
  }, []);

  useEffect(() => { startBattle(); }, [startBattle]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || !battleData) return;
    const delay = Math.max(60, 300 / speed);

    const timer = setTimeout(() => {
      if (eventIndex >= battleData.events.length) {
        setIsPlaying(false);
        return;
      }

      const ev = battleData.events[eventIndex];

      if (ev.type === 'round_start') {
        setTurnText(`Turn ${ev.round}`);
        setActiveActor(null);
        setTelegraph(null);
        setLogText(`⟳  Round ${ev.round}`);
      }

      if (ev.type === 'skill') {
        setActiveActor(ev.actor);
        const kind = ev.effect.includes('MARK')  ? 'mark'  :
                     ev.effect.includes('SHOCK') ? 'shock' :
                     ev.effect.includes('BURN')  ? 'burn'  :
                     ev.effect.includes('SHIELD')? 'shield': 'skill';
        if (ev.target) setTelegraph({ from: ev.actor, to: ev.target, kind });

        setUnitStates(s => {
          const next = { ...s };
          if (ev.effect.includes('SHIELD') && next[ev.actor])
            next[ev.actor] = { ...next[ev.actor], shield: 30 };
          if (ev.effect.includes('MARK') && next[ev.target])
            next[ev.target] = { ...next[ev.target], mark: true };
          if (ev.effect.includes('SHOCK') && next[ev.target])
            next[ev.target] = { ...next[ev.target], shock: 2 };
          if (ev.effect.includes('BURN') && next[ev.target])
            next[ev.target] = { ...next[ev.target], burn: 2 };
          return next;
        });
        setLogText(`🎯 ${ev.actorName} → ${ev.skill}`);
        setTimeout(() => setTelegraph(null), 220 / speed);
      }

      if (ev.type === 'attack') {
        setActiveActor(ev.actor);
        setTelegraph({ from: ev.actor, to: ev.target, kind: 'attack' });
        setLogText(`⚔  ${ev.actorName} → ${ev.targetName}`);

        setTimeout(() => {
          setUnitStates(s => {
            const next = { ...s };
            if (next[ev.target]) {
              next[ev.target] = { ...next[ev.target], hp: Math.max(0, next[ev.target].hp - ev.dmg) };
            }
            return next;
          });
          addFloat(ev.target, ev.dmg);
          setTelegraph(null);
        }, 180 / speed);
      }

      if (ev.type === 'defeat') {
        setLogText(`💀 ${ev.unitName} eliminated`);
      }

      if (ev.type === 'battle_end') {
        const result = ev.winner === 'player' ? '✓ PLAYER WINS' : '✗ ENEMY WINS';
        setLogText(result);
        setTurnText(result);
        setActiveActor(null);
        setTelegraph(null);
        if (autoReplay && battleCount < 20) {
          setTimeout(() => {
            startBattle();
            setBattleCount(c => c + 1);
            setIsPlaying(true);
          }, 1500);
          setIsPlaying(false);
          return;
        }
        setIsPlaying(false);
        return;
      }

      setEventIndex(i => i + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [isPlaying, eventIndex, battleData, speed, autoReplay, battleCount, addFloat, startBattle]);

  // ── SVG relationship layer ──────────────────────────────
  const getPos = (id) => UNIT_POS[id] || { x: 0, y: 0 };

  const svgTelegraph = () => {
    if (!telegraph) return null;
    const a = getPos(telegraph.from);
    const b = getPos(telegraph.to);
    const color = telegraph.kind === 'attack' ? '#f87171' :
                  telegraph.kind === 'shock'  ? '#60a5fa' :
                  telegraph.kind === 'mark'   ? '#fbbf24' :
                  telegraph.kind === 'burn'   ? '#f97316' : '#c084fc';
    return (
      <g>
        {/* Shadow line for depth */}
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke="rgba(0,0,0,0.5)" strokeWidth="5" />
        {/* Main telegraph line */}
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke={color} strokeWidth="2" strokeDasharray="8,4" opacity="0.9">
          <animate attributeName="stroke-dashoffset" from="0" to="-24"
            dur="0.3s" repeatCount="indefinite" />
        </line>
        {/* Arrowhead at target */}
        <circle cx={b.x} cy={b.y} r="5" fill={color} opacity="0.8" />
      </g>
    );
  };

  const svgShockArcs = () => {
    const shocked = Object.entries(unitStates)
      .filter(([, s]) => s.shock > 0 && s.hp > 0)
      .map(([id]) => id);
    if (shocked.length < 2) return null;
    return shocked.slice(0, -1).map((id, i) => {
      const a = getPos(id);
      const b = getPos(shocked[i + 1]);
      const cx = (a.x + b.x) / 2 + (Math.random() > 0.5 ? 40 : -40);
      const cy = (a.y + b.y) / 2 - 30;
      return (
        <path key={`shock-${i}`}
          d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
          stroke="#60a5fa" strokeWidth="1.5" fill="none"
          strokeDasharray="5,3" opacity="0.65">
          <animate attributeName="opacity" values="0.4;0.85;0.4"
            dur="0.8s" repeatCount="indefinite" />
        </path>
      );
    });
  };

  const svgBurnZones = () => {
    return Object.entries(unitStates)
      .filter(([, s]) => s.burn > 0 && s.hp > 0)
      .map(([id]) => {
        const p = getPos(id);
        return (
          <g key={`burn-${id}`}>
            <ellipse cx={p.x} cy={p.y} rx="44" ry="44"
              fill="rgba(249,115,22,0.12)" stroke="#f97316"
              strokeWidth="1.5" strokeDasharray="4,3">
              <animate attributeName="rx" values="42;46;42"
                dur="1.2s" repeatCount="indefinite" />
              <animate attributeName="ry" values="42;46;42"
                dur="1.2s" repeatCount="indefinite" />
            </ellipse>
          </g>
        );
      });
  };

  // ── Unit rendering ──────────────────────────────────────
  const renderUnit = (unit, isPlayer) => {
    const s = unitStates[unit.id] || { hp: unit.maxHp, maxHp: unit.maxHp, mark: false, shock: 0, burn: 0, shield: 0 };
    const hp  = s.hp ?? unit.maxHp;
    const mhp = s.maxHp ?? unit.maxHp;
    const pct = Math.max(0, (hp / mhp) * 100);
    const dead   = hp === 0;
    const active = activeActor === unit.id;
    const dimmed = activeActor && activeActor !== unit.id && !dead;

    const p   = getPos(unit.id);
    const R   = 35;
    const style = { position: 'absolute', left: p.x - R, top: p.y - R, width: R * 2 };

    const classes = ['unit-circle',
      isPlayer ? 'player' : 'enemy',
      dead   ? 'dead'   : '',
      active ? 'active' : '',
      dimmed ? 'dimmed' : '',
      s.mark    ? 'has-mark'   : '',
      s.shock>0 ? 'has-shock'  : '',
      s.shield>0? 'has-shield' : '',
    ].filter(Boolean).join(' ');

    const myFloats = damageFloats.filter(f => f.unitId === unit.id);

    return (
      <div key={unit.id} style={style}>
        <div className={classes}>
          {s.mark     && <div className="status-mark" />}
          {s.shock > 0 && <div className="status-shock" />}
          {s.shield > 0 && <div className="status-shield" />}
          <span className="unit-name">{unit.name}</span>
          {myFloats.map(f => (
            <span key={f.id} className="damage-float">-{f.dmg}</span>
          ))}
        </div>
        <div className="hp-bar">
          <div className="hp-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="hp-text">{Math.max(0, Math.floor(hp))}/{mhp}</div>
      </div>
    );
  };

  if (!battleData) return <div className="battle-loading">Initializing…</div>;

  return (
    <div className="battle-visualization">
      <div className="turn-indicator">{turnText || '8gents — Combat Diagnostic'}</div>

      <div className="battle-arena">
        {/* Relationship SVG — drawn under units so lines connect circles */}
        <svg className="rel-svg" viewBox={`0 0 ${ARENA_W} ${ARENA_H}`}
          preserveAspectRatio="none" width={ARENA_W} height={ARENA_H}>
          {/* Mid-field divider */}
          <line x1={ARENA_W/2} y1={20} x2={ARENA_W/2} y2={ARENA_H-20}
            stroke="#1e293b" strokeWidth="1.5" />

          {/* State layers: burn zones first (background), then shock arcs, then telegraph on top */}
          {svgBurnZones()}
          {svgShockArcs()}
          {svgTelegraph()}
        </svg>

        {/* Team labels */}
        <div className="team-label player-label">PLAYER</div>
        <div className="team-label enemy-label">ENEMY</div>

        {/* Units rendered absolutely over SVG */}
        {PLAYER_UNITS.map(u => renderUnit(u, true))}
        {ENEMY_UNITS.map(u => renderUnit(u, false))}
      </div>

      <div className="log-section">
        <span className="log-entry">{logText}</span>
      </div>

      <div className="controls">
        <button onClick={() => setIsPlaying(p => !p)}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={() => { startBattle(); setBattleCount(1); setIsPlaying(false); }}>
          ⟲ Restart
        </button>
        <button
          onClick={() => { setAutoReplay(a => !a); if (!autoReplay) setIsPlaying(true); }}
          className={autoReplay ? 'btn-active' : ''}
        >
          {autoReplay ? '🔄 Auto ON' : '🔄 Auto OFF'}
        </button>
        <select value={speed} onChange={e => setSpeed(parseFloat(e.target.value))}>
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={2}>2×</option>
        </select>
        <span className="progress-text">
          Battle {battleCount}/20 · {eventIndex}/{battleData.events.length}
        </span>
      </div>
    </div>
  );
}
