import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, Dimensions,
  StyleSheet, SafeAreaView, StatusBar, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Data ──────────────────────────────────────────────────────────────────────

const AGENTS = [
  { id: '1', name: 'Vex',       role: 'Striker'   },
  { id: '2', name: 'Kael',      role: 'Warrior'   },
  { id: '3', name: 'Solin',     role: 'Medic'     },
  { id: '4', name: 'Thornwall', role: 'Tank'       },
  { id: '5', name: 'Nyx',       role: 'Assassin'  },
];

const BEHAVIORS = [
  'Attack Weakest',
  'Attack Strongest',
  'Protect Allies',
  'Execute Low HP',
  'Support',
];

const ROLE_STATS = {
  Striker:  { hp: 80,  atk: 25 },
  Warrior:  { hp: 120, atk: 18 },
  Medic:    { hp: 70,  atk: 10 },
  Tank:     { hp: 180, atk: 10 },
  Assassin: { hp: 60,  atk: 35 },
};

const STORAGE_KEY = '@8gents_loadout';

// ── Agent stats by archetype ──────────────────────────────────────────────────
// ROLE_STATS kept for display/legacy; ARCHETYPE_STATS drives combat now

const ARCHETYPE_STATS = {
  Nyx:       { hp: 65,  maxHp: 65,  atk: 38, speed: 10, shieldMax: 0  },
  Thornwall: { hp: 200, maxHp: 200, atk: 12, speed: 6,  shieldMax: 30 },
  Vex:       { hp: 75,  maxHp: 75,  atk: 28, speed: 9,  shieldMax: 0  },
  Solin:     { hp: 90,  maxHp: 90,  atk: 15, speed: 8,  shieldMax: 0  },
  Kael:      { hp: 100, maxHp: 100, atk: 22, speed: 7,  shieldMax: 0  },
};

// ── Skill pool ────────────────────────────────────────────────────────────────

const SKILL_POOL = {
  Nyx: {
    signature: {
      id: 'nyx_sig', name: 'Shadow Strike', category: 'Signature',
      effect: 'On attack, applies MARK. Nyx deals +50% damage to MARK targets.',
      cooldown: 0, statusTag: 'MARK',
    },
    unlockable: [
      { id: 'nyx_1', name: 'Execution Dive',    category: 'Strike',   cooldown: 2, statusTag: 'MARK',  effect: '2× damage to a MARK target. Clears MARK on hit.' },
      { id: 'nyx_2', name: 'Phantom Step',       category: 'Mobility', cooldown: 3, statusTag: 'MARK',  effect: 'Repositions to backline. This attack ignores Tank intercept.' },
      { id: 'nyx_3', name: 'Isolation Lock',     category: 'Control',  cooldown: 3, statusTag: 'MARK',  effect: 'Target cannot receive redirected or chained effects for 2 rounds.' },
      { id: 'nyx_4', name: "Predator's Finish",  category: 'Burst',    cooldown: 4, statusTag: 'MARK',  effect: '3× damage to an isolated MARK target below 40% HP.' },
      { id: 'nyx_5', name: 'Stalk',              category: 'Strike',   cooldown: 2, statusTag: 'MARK',  effect: 'Strikes and refreshes MARK. If already MARK\'d, deals a second hit.' },
      { id: 'nyx_6', name: "Stalker's Instinct", category: 'Passive',  cooldown: 0, statusTag: 'MARK',  effect: 'When Nyx enters a hazard zone, she is treated as isolated this round.' },
    ],
  },
  Thornwall: {
    signature: {
      id: 'thorn_sig', name: 'Fortress Field', category: 'Signature',
      effect: 'Deploys SHIELD at round start (30 HP). SHIELD relays SHOCK chains (+1 bounce).',
      cooldown: 0, statusTag: 'SHIELD',
    },
    unlockable: [
      { id: 'thorn_1', name: 'Iron Taunt',        category: 'Control',  cooldown: 3, statusTag: 'SHIELD', effect: 'Forces all enemies to target Thornwall for 2 rounds.' },
      { id: 'thorn_2', name: 'Barrier Pulse',      category: 'Support',  cooldown: 3, statusTag: 'SHIELD', effect: 'Restores 15 SHIELD to all allies with active SHIELD.' },
      { id: 'thorn_3', name: 'Fortified Position', category: 'Support',  cooldown: 2, statusTag: 'SHIELD', effect: 'Intercepts first bypass attempt this round. Backline allies protected while SHIELD active.' },
      { id: 'thorn_4', name: 'Counter Edge',       category: 'Burst',    cooldown: 2, statusTag: 'SHIELD', effect: 'After taking a hit, retaliates for 150% ATK. On hit, restores 10 SHIELD.' },
      { id: 'thorn_5', name: 'Ground Slam',        category: 'Strike',   cooldown: 3, statusTag: 'SHIELD', effect: 'Heavy strike for 200% ATK. Stuns target 1 round (acts last).' },
      { id: 'thorn_6', name: 'Armor Resonance',    category: 'Passive',  cooldown: 0, statusTag: 'SHIELD', effect: 'Each SHIELD absorption this round gives +4 ATK. Stacks up to 3×.' },
    ],
  },
  Vex: {
    signature: {
      id: 'vex_sig', name: 'Cascade Initiation', category: 'Signature',
      effect: 'Applies SHOCK on attack. SHOCK arcs to 1 adjacent enemy. Routes through SHIELD for +1 bounce.',
      cooldown: 0, statusTag: 'SHOCK',
    },
    unlockable: [
      { id: 'vex_1', name: 'Chain Arc',          category: 'Strike',   cooldown: 2, statusTag: 'SHOCK', effect: 'SHOCK spreads to 2 un-SHOCKED adjacent targets.' },
      { id: 'vex_2', name: 'Arc Discharge',       category: 'Strike',   cooldown: 2, statusTag: 'SHOCK', effect: '2× damage to already-SHOCKED targets. Extends SHOCK 1 round.' },
      { id: 'vex_3', name: 'Overcharge',          category: 'Burst',    cooldown: 4, statusTag: 'SHOCK', effect: 'Detonates all SHOCK simultaneously for burst damage. Requires 2+ SHOCKED targets.' },
      { id: 'vex_4', name: 'Resonance Wave',      category: 'Control',  cooldown: 3, statusTag: 'SHOCK', effect: 'Each SHOCKED enemy transfers SHOCK to 1 adjacent un-SHOCKED target.' },
      { id: 'vex_5', name: 'Relay Routing',       category: 'Mobility', cooldown: 2, statusTag: 'SHOCK', effect: 'Places a relay node. Chain effects through it gain +1 bounce. Collapses after one sequence.' },
      { id: 'vex_6', name: 'Static Accumulation', category: 'Passive',  cooldown: 0, statusTag: 'SHOCK', effect: 'Each SHOCK arc this round gives Vex +5 ATK until end of round.' },
    ],
  },
  Solin: {
    signature: {
      id: 'solin_sig', name: 'Pulse Engine', category: 'Signature',
      effect: 'At round start, reduces the highest active cooldown on an ally by 1. That ally acts first this round.',
      cooldown: 0, statusTag: 'PULSE',
    },
    unlockable: [
      { id: 'solin_1', name: 'Resonance Relay', category: 'Support',  cooldown: 2, statusTag: 'PULSE', effect: 'Extends one active buff or effect on an ally by 1 round.' },
      { id: 'solin_2', name: 'Flow Burst',       category: 'Support',  cooldown: 3, statusTag: 'PULSE', effect: 'Heals lowest-HP ally for 30% max HP. Reduces their cooldown by 1.' },
      { id: 'solin_3', name: 'Overclock',         category: 'Burst',    cooldown: 4, statusTag: 'PULSE', effect: 'Clears all cooldowns for one ally. That ally gains PULSE instability 1 round.' },
      { id: 'solin_4', name: 'Tempo Shift',       category: 'Control',  cooldown: 3, statusTag: 'PULSE', effect: 'Slows 1 enemy (acts last this round). Advances 1 ally\'s next action.' },
      { id: 'solin_5', name: 'Phase Walk',        category: 'Mobility', cooldown: 2, statusTag: 'PULSE', effect: 'Next ally ability ignores range restrictions this round.' },
      { id: 'solin_6', name: 'Phase Efficiency',  category: 'Passive',  cooldown: 0, statusTag: 'PULSE', effect: 'Once per round, when an ally cooldown expires naturally, reduce another ally\'s cooldown by 1.' },
    ],
  },
  Kael: {
    signature: {
      id: 'kael_sig', name: 'Incendiary Grid', category: 'Signature',
      effect: 'On attack, deploys a BURN zone on target\'s position (3 rounds). Enemies in zone receive BURN (6 dmg/round, 2 rounds).',
      cooldown: 0, statusTag: 'BURN',
    },
    unlockable: [
      { id: 'kael_1', name: 'Detonation Protocol', category: 'Burst',    cooldown: 3, statusTag: 'BURN', effect: 'Detonates all BURN targets for burst damage. Terrain zones remain.' },
      { id: 'kael_2', name: 'Suppression Grid',    category: 'Control',  cooldown: 3, statusTag: 'BURN', effect: 'Expands BURN zones to adjacent positions. Enemies in expanded zones act last this round.' },
      { id: 'kael_3', name: 'Approach Vector',     category: 'Mobility', cooldown: 2, statusTag: 'BURN', effect: 'Enemies in hazard zones are treated as isolated for offensive effects (once per target per round).' },
      { id: 'kael_4', name: 'Precision Strike',    category: 'Strike',   cooldown: 2, statusTag: 'BURN', effect: 'POWER strike. Deals +8 bonus damage per BURN stack on target.' },
      { id: 'kael_5', name: 'Drone Support',       category: 'Support',  cooldown: 3, statusTag: 'BURN', effect: 'Deploys an Incendiary Drone. At end of each round, it applies BURN to all enemies in 1 position.' },
      { id: 'kael_6', name: "Architect's Patience", category: 'Passive', cooldown: 0, statusTag: 'BURN', effect: 'BURN zones resist first disruption each round. On zone expiry, fires a final ignition pulse.' },
    ],
  },
};

// ── Colour palette ────────────────────────────────────────────────────────────

const C = {
  bg:        '#0d0f14',
  surface:   '#161b26',
  card:      '#1c2333',
  accent:    '#4f8ef7',
  accentDim: '#1e3460',
  text:      '#e2e8f0',
  muted:     '#64748b',
  border:    '#2d3748',
  danger:    '#e53e3e',
  success:   '#48bb78',
  warn:      '#f6ad55',
};

// ── Map logic ─────────────────────────────────────────────────────────────────

const MAP_G = 8;
const SCREEN_W = Dimensions.get('window').width;
const TILE_SIZE = Math.floor((SCREEN_W - 32 - (MAP_G - 1) * 2) / MAP_G);

function initMapGrid() {
  const g = Array.from({ length: MAP_G }, () => Array(MAP_G).fill(0));
  g[3][3] = 1;
  return g;
}

function spreadOneTile(grid) {
  const candidates = [];
  for (let r = 0; r < MAP_G; r++) {
    for (let c = 0; c < MAP_G; c++) {
      if (grid[r][c] !== 0) continue;
      const adj = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
      if (adj.some(([nr, nc]) => nr >= 0 && nr < MAP_G && nc >= 0 && nc < MAP_G && grid[nr][nc] > 0))
        candidates.push([r, c]);
    }
  }
  if (!candidates.length) return grid;
  const [tr, tc] = candidates[Math.floor(Math.random() * candidates.length)];
  const maxD = Math.max(...grid.flat().filter(v => v > 0));
  const next = grid.map(row => [...row]);
  next[tr][tc] = maxD + 1;
  return next;
}

function shrinkCluster(grid, count) {
  let next = grid.map(row => [...row]);
  for (let i = 0; i < count; i++) {
    const boundary = [];
    for (let r = 0; r < MAP_G; r++) {
      for (let c = 0; c < MAP_G; c++) {
        if (next[r][c] === 0) continue;
        const adj = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
        if (adj.some(([nr, nc]) => nr >= 0 && nr < MAP_G && nc >= 0 && nc < MAP_G && next[nr][nc] === 0))
          boundary.push([r, c]);
      }
    }
    if (!boundary.length) break;
    const [br, bc] = boundary[Math.floor(Math.random() * boundary.length)];
    next[br][bc] = 0;
  }
  return next;
}

function growCluster(grid, count) {
  let next = grid.map(row => [...row]);
  for (let i = 0; i < count; i++) {
    const candidates = [];
    for (let r = 0; r < MAP_G; r++) {
      for (let c = 0; c < MAP_G; c++) {
        if (next[r][c] !== 0) continue;
        const adj = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
        if (adj.some(([nr, nc]) => nr >= 0 && nr < MAP_G && nc >= 0 && nc < MAP_G && next[nr][nc] > 0))
          candidates.push([r, c]);
      }
    }
    if (!candidates.length) break;
    const [tr, tc] = candidates[Math.floor(Math.random() * candidates.length)];
    const maxD = Math.max(...next.flat().filter(v => v > 0), 0);
    next[tr][tc] = maxD + 1;
  }
  return next;
}

function mapThreat(spreadCount) {
  if (spreadCount <= 8)  return { level: 'LOW',      mult: 1.0, color: '#48bb78' };
  if (spreadCount <= 20) return { level: 'MODERATE', mult: 1.3, color: '#f6ad55' };
  return                        { level: 'CRITICAL', mult: 1.6, color: '#e53e3e' };
}

// ── Combat simulation ─────────────────────────────────────────────────────────

function simulateCombat(loadedSlots, diffMult = 1.0) {
  const alive     = (arr) => arr.filter(u => u.hp > 0);
  const lowestHp  = (arr) => { const a = alive(arr); return a.length ? a.reduce((m, u) => u.hp < m.hp ? u : m) : null; };
  const highestHp = (arr) => { const a = alive(arr); return a.length ? a.reduce((m, u) => u.hp > m.hp ? u : m) : null; };

  // Build heroes from archetype stats
  const heroes = loadedSlots.map((slot, i) => {
    const base = ARCHETYPE_STATS[slot.agentName] ?? ROLE_STATS[slot.agentRole];
    const skillPool = SKILL_POOL[slot.agentName];
    const equipped  = (slot.equippedSkills ?? []).filter(Boolean);
    // Attach cooldown counters
    const skills = equipped.map(sk => ({ ...sk, cdRemaining: 0 }));
    return {
      id: i,
      name:     slot.agentName,
      role:     slot.agentRole,
      behavior: slot.behavior,
      hp:       base.hp,
      maxHp:    base.maxHp ?? base.hp,
      atk:      base.atk,
      speed:    base.speed ?? 5,
      shield:   0,
      shieldMax: base.shieldMax ?? 0,
      skills,
      signature: skillPool?.signature ?? null,
      // Status tracking
      mark: false,
      pulseInstability: false,
      taunted: 0,           // rounds remaining
      stunned: 0,
      armorResonanceStacks: 0,
    };
  });

  const gHp  = Math.round(60 * diffMult);
  const gAtk = Math.round(12 * diffMult);
  const goblins = [
    { id: 10, name: 'Goblin A', pos: 0, hp: gHp, maxHp: gHp, atk: gAtk, shock: 0, burn: 0, burnTerrain: 0, isolated: false, stunned: 0 },
    { id: 11, name: 'Goblin B', pos: 1, hp: gHp, maxHp: gHp, atk: gAtk, shock: 0, burn: 0, burnTerrain: 0, isolated: false, stunned: 0 },
    { id: 12, name: 'Goblin C', pos: 2, hp: gHp, maxHp: gHp, atk: gAtk, shock: 0, burn: 0, burnTerrain: 0, isolated: false, stunned: 0 },
  ];

  // BURN terrain zones: array of { pos, duration }
  const burnZones = [];
  // Incendiary Drone: { pos, active }
  let drone = null;

  const log = [];
  let round = 0;

  const applyDmg = (unit, dmg) => {
    unit.hp = Math.max(0, unit.hp - dmg);
  };

  const applyShock = (source, target, bounces, thornwall, log) => {
    if (target.hp <= 0 || target.shock > 0) return 0;
    const dmg = Math.floor(source.atk * 0.5);
    target.shock = 2;
    applyDmg(target, dmg);
    log.push(`    ⚡ SHOCK arcs to ${target.name}  −${dmg}`);
    if (target.hp === 0) log.push(`  ✗ ${target.name} defeated!`);

    // Relay through Thornwall shield
    let extraBounces = bounces;
    if (thornwall && thornwall.hp > 0 && thornwall.shield > 0) {
      extraBounces += 1;
      log.push(`    ⚡ SHOCK relayed through Fortress Field (+1 bounce)`);
    }

    if (extraBounces > 0) {
      const adjacent = goblins.filter(g => g.id !== target.id && Math.abs(g.pos - target.pos) === 1 && g.hp > 0 && g.shock === 0);
      for (let b = 0; b < Math.min(extraBounces, adjacent.length); b++) {
        applyShock(source, adjacent[b], 0, null, log);
      }
    }
    return dmg;
  };

  const pickAttackTarget = (hero, liveGobs) => {
    let target = null;
    if (hero.behavior === 'Attack Weakest')  target = lowestHp(liveGobs);
    else if (hero.behavior === 'Attack Strongest') target = highestHp(liveGobs);
    else if (hero.behavior === 'Execute Low HP') {
      const low = liveGobs.filter(g => g.hp / g.maxHp < 0.30);
      target = low.length ? low[0] : liveGobs[0];
    } else target = liveGobs[0];
    return target;
  };

  const thornwall = heroes.find(h => h.name === 'Thornwall');
  const nyx       = heroes.find(h => h.name === 'Nyx');
  const vex       = heroes.find(h => h.name === 'Vex');
  const solin     = heroes.find(h => h.name === 'Solin');
  const kael      = heroes.find(h => h.name === 'Kael');

  while (alive(heroes).length > 0 && alive(goblins).length > 0 && round < 30) {
    round++;
    log.push(`── Round ${round} ──`);

    // ── §14 Step 1: Start-of-round signatures ──────────────────────────────

    // Thornwall: Fortress Field — refresh shield
    if (thornwall && thornwall.hp > 0 && thornwall.shieldMax > 0) {
      thornwall.shield = thornwall.shieldMax;
      log.push(`  🛡 ${thornwall.name}: Fortress Field active (${thornwall.shield} HP shield)`);
    }

    // Solin: Pulse Engine — reduce highest-CD ally cooldown
    if (solin && solin.hp > 0) {
      let target = null;
      let maxCd = 0;
      for (const h of alive(heroes)) {
        if (h.id === solin.id) continue;
        for (const sk of h.skills) {
          if (sk.cdRemaining > maxCd && !h.pulseInstability) {
            maxCd = sk.cdRemaining; target = h;
          }
        }
      }
      if (target && maxCd > 0) {
        const sk = target.skills.reduce((m, s) => s.cdRemaining > m.cdRemaining ? s : m, { cdRemaining: 0 });
        const reduced = Math.max(1, sk.cdRemaining - 1);
        const actual  = sk.cdRemaining - reduced;
        sk.cdRemaining = reduced;
        log.push(`  ⚡ ${solin.name}: Pulse Engine — ${target.name}'s [${sk.name}] −${actual} CD (${reduced} remaining)`);
      }
    }

    // Phase Efficiency passive (Solin): when a cooldown hits 0, reduce another by 1
    // (checked after cooldown decrements at round end)

    // ── §14 Step 3: Hero turn order (speed descending) ─────────────────────

    const turnOrder = alive(heroes).slice().sort((a, b) => b.speed - a.speed);

    // Protect Allies: shield lowest-HP hero this round
    let protectedId = null;
    const protector = turnOrder.find(h => h.behavior === 'Protect Allies');
    if (protector) {
      const t = lowestHp(heroes);
      if (t) { protectedId = t.id; log.push(`  ${protector.name} shields ${t.name} — dmg halved.`); }
    }

    // Iron Taunt check
    const taunter = heroes.find(h => h.name === 'Thornwall' && h.hp > 0 && h.taunted > 0);

    for (const hero of turnOrder) {
      if (hero.hp <= 0) continue;
      const liveGobs = alive(goblins);
      if (liveGobs.length === 0) break;

      // Tick active skill cooldowns (at start of hero's turn)
      // (done at round end per §14 step 5)

      // ── Fire active skill if cooldown = 0 ──────────────────────────────
      let skillFired = false;
      for (const sk of hero.skills) {
        if (sk.cdRemaining > 0 || sk.category === 'Passive') continue;
        skillFired = true;
        sk.cdRemaining = sk.cooldown;
        const target = pickAttackTarget(hero, liveGobs);
        if (!target) break;

        log.push(`  ✦ ${hero.name}: [${sk.name}]`);

        // ── Skill effect resolution ─────────────────────────────────────
        if (sk.id === 'nyx_1') {
          // Execution Dive: 2× to MARK target, clears MARK
          const t = target.mark ? target : liveGobs.find(g => g.mark) ?? target;
          const mult = t.mark ? 2 : 1;
          const dmg  = Math.floor(hero.atk * mult);
          applyDmg(t, dmg);
          if (t.mark) { t.mark = false; log.push(`    Execution Dive: MARK detonated! −${dmg} (${t.hp}/${t.maxHp})`); }
          else log.push(`    Execution Dive: −${dmg} (${t.hp}/${t.maxHp})`);
          if (t.hp === 0) log.push(`  ✗ ${t.name} defeated!`);
        } else if (sk.id === 'nyx_2') {
          // Phantom Step: ignores tank intercept this round
          const dmg = hero.atk;
          applyDmg(target, dmg);
          log.push(`    Phantom Step [bypasses intercept]: ${target.name} −${dmg} (${target.hp}/${target.maxHp})`);
          if (target.hp === 0) log.push(`  ✗ ${target.name} defeated!`);
        } else if (sk.id === 'nyx_4') {
          // Predator's Finish: 3× to isolated MARK target < 40% HP
          const prey = liveGobs.find(g => g.mark && g.hp / g.maxHp < 0.40 && g.isolated) ?? target;
          const mult = (prey.mark && prey.hp / prey.maxHp < 0.40) ? 3 : 1;
          const dmg  = Math.floor(hero.atk * mult);
          applyDmg(prey, dmg);
          log.push(`    Predator's Finish${mult === 3 ? ' [EXECUTE!]' : ''}: ${prey.name} −${dmg} (${prey.hp}/${prey.maxHp})`);
          if (prey.hp === 0) log.push(`  ✗ ${prey.name} defeated!`);
        } else if (sk.id === 'nyx_5') {
          // Stalk: strike + refresh MARK, second hit if already MARK'd
          const wasMarked = target.mark;
          const dmg = hero.atk;
          applyDmg(target, dmg);
          target.mark = true;
          log.push(`    Stalk: ${target.name} −${dmg} [MARK refreshed] (${target.hp}/${target.maxHp})`);
          if (wasMarked) {
            applyDmg(target, dmg);
            log.push(`    Stalk: second hit −${dmg} (${target.hp}/${target.maxHp})`);
          }
          if (target.hp === 0) log.push(`  ✗ ${target.name} defeated!`);
        } else if (sk.id === 'thorn_1') {
          // Iron Taunt: force all enemies to target Thornwall for 2 rounds
          hero.taunted = 2;
          log.push(`    Iron Taunt: all enemies target ${hero.name} for 2 rounds!`);
        } else if (sk.id === 'thorn_3') {
          // Fortified Position: backline ally protection this round
          log.push(`    Fortified Position: backline allies protected this round.`);
        } else if (sk.id === 'thorn_4') {
          // Counter Edge: retaliate on next hit (flag; resolved in goblin attack section)
          hero.counterEdge = true;
          log.push(`    Counter Edge: ${hero.name} readies retaliation.`);
        } else if (sk.id === 'thorn_5') {
          // Ground Slam: 200% ATK + stun 1 round
          const dmg = Math.floor(hero.atk * 2);
          applyDmg(target, dmg);
          target.stunned = 1;
          log.push(`    Ground Slam: ${target.name} −${dmg} [STUNNED] (${target.hp}/${target.maxHp})`);
          if (target.hp === 0) log.push(`  ✗ ${target.name} defeated!`);
        } else if (sk.id === 'vex_1') {
          // Chain Arc: SHOCK spreads to 2 un-SHOCKED adjacent targets
          const dmg = hero.atk;
          applyDmg(target, dmg);
          log.push(`    Chain Arc: ${target.name} −${dmg}`);
          if (target.hp === 0) log.push(`  ✗ ${target.name} defeated!`);
          const adjacent = liveGobs.filter(g => g.id !== target.id && Math.abs(g.pos - target.pos) === 1 && g.shock === 0);
          let spread = 0;
          for (const adj of adjacent) {
            if (spread >= 2) break;
            applyShock(hero, adj, 0, thornwall, log);
            spread++;
          }
        } else if (sk.id === 'vex_2') {
          // Arc Discharge: 2× to SHOCKED targets, extend SHOCK
          const shocked = liveGobs.filter(g => g.shock > 0);
          const t = shocked.length ? shocked.reduce((m, g) => g.hp < m.hp ? g : m) : target;
          const mult = t.shock > 0 ? 2 : 1;
          const dmg  = Math.floor(hero.atk * mult);
          applyDmg(t, dmg);
          if (t.shock > 0) { t.shock += 1; log.push(`    Arc Discharge: ${t.name} −${dmg} [SHOCK extended] (${t.hp}/${t.maxHp})`); }
          else log.push(`    Arc Discharge: ${t.name} −${dmg} (${t.hp}/${t.maxHp})`);
          if (t.hp === 0) log.push(`  ✗ ${t.name} defeated!`);
        } else if (sk.id === 'vex_3') {
          // Overcharge: detonate all SHOCK if 2+ targets
          const shocked = liveGobs.filter(g => g.shock > 0 && g.hp > 0);
          if (shocked.length >= 2) {
            log.push(`    ⚡ Overcharge: detonating ${shocked.length} SHOCKED targets!`);
            for (const g of shocked) {
              const dmg = Math.floor(hero.atk * 1.5);
              applyDmg(g, dmg);
              g.shock = 0;
              log.push(`      ${g.name} −${dmg} (${g.hp}/${g.maxHp})`);
              if (g.hp === 0) log.push(`  ✗ ${g.name} defeated!`);
            }
          } else {
            const dmg = hero.atk;
            applyDmg(target, dmg);
            log.push(`    Overcharge (needs 2+ SHOCKED targets): ${target.name} −${dmg} (${target.hp}/${target.maxHp})`);
            if (target.hp === 0) log.push(`  ✗ ${target.name} defeated!`);
          }
        } else if (sk.id === 'solin_2') {
          // Flow Burst: heal lowest-HP + reduce cooldown
          const weakest = lowestHp(heroes);
          if (weakest) {
            const healed = Math.floor(weakest.maxHp * 0.30);
            weakest.hp = Math.min(weakest.maxHp, weakest.hp + healed);
            log.push(`    Flow Burst: ${weakest.name} +${healed} HP (${weakest.hp}/${weakest.maxHp})`);
            const sk2 = weakest.skills.find(s => s.cdRemaining > 0);
            if (sk2) { sk2.cdRemaining = Math.max(1, sk2.cdRemaining - 1); log.push(`    ${weakest.name} [${sk2.name}] CD −1`); }
          }
        } else if (sk.id === 'solin_3') {
          // Overclock: clear all CDs for an ally, apply PULSE instability
          const bestAlly = alive(heroes).filter(h => h.id !== solin.id).reduce((m, h) => {
            const maxCd = Math.max(...h.skills.map(s => s.cdRemaining), 0);
            return maxCd > Math.max(...m.skills.map(s => s.cdRemaining), 0) ? h : m;
          }, alive(heroes).filter(h => h.id !== solin.id)[0]);
          if (bestAlly) {
            bestAlly.skills.forEach(s => { s.cdRemaining = 0; });
            bestAlly.pulseInstability = true;
            log.push(`    ⚡ Overclock: all ${bestAlly.name} cooldowns cleared! [PULSE instability 1 round]`);
          }
        } else if (sk.id === 'kael_1') {
          // Detonation Protocol: burst all BURN targets
          const burning = liveGobs.filter(g => g.burn > 0 && g.hp > 0);
          if (burning.length > 0) {
            log.push(`    💥 Detonation Protocol: igniting ${burning.length} BURN target(s)!`);
            for (const g of burning) {
              const dmg = Math.floor(hero.atk * 1.5);
              applyDmg(g, dmg);
              log.push(`      ${g.name} −${dmg} (${g.hp}/${g.maxHp})`);
              if (g.hp === 0) log.push(`  ✗ ${g.name} defeated!`);
            }
          } else {
            const dmg = hero.atk;
            applyDmg(target, dmg);
            log.push(`    Detonation Protocol (no BURN targets): ${target.name} −${dmg} (${target.hp}/${target.maxHp})`);
            if (target.hp === 0) log.push(`  ✗ ${target.name} defeated!`);
          }
        } else if (sk.id === 'kael_4') {
          // Precision Strike: +8 per BURN stack
          const burnBonus = (target.burn ?? 0) * 8;
          const dmg = hero.atk + burnBonus;
          applyDmg(target, dmg);
          log.push(`    Precision Strike: ${target.name} −${dmg}${burnBonus ? ` (+${burnBonus} BURN bonus)` : ''} (${target.hp}/${target.maxHp})`);
          if (target.hp === 0) log.push(`  ✗ ${target.name} defeated!`);
        } else if (sk.id === 'kael_5') {
          // Drone Support: deploy drone to target position
          drone = { pos: target.pos };
          log.push(`    🤖 Drone Support: Incendiary Drone deployed to position ${target.pos}!`);
        } else {
          // Default: normal attack
          const dmg = hero.atk;
          applyDmg(target, dmg);
          log.push(`    ${target.name} −${dmg} (${target.hp}/${target.maxHp})`);
          if (target.hp === 0) log.push(`  ✗ ${target.name} defeated!`);
        }
        break; // one skill per turn
      }

      // ── Normal attack + signature effects ────────────────────────────────
      if (!skillFired) {
        if (hero.behavior === 'Protect Allies') {
          log.push(`  ${hero.name} holds defensive stance.`);
          continue;
        }
        if (hero.behavior === 'Support') {
          const t = lowestHp(heroes);
          if (t) {
            const healed = Math.min(20, t.maxHp - t.hp);
            t.hp += healed;
            log.push(`  ${hero.name} heals ${t.name} +${healed} HP  (${t.hp}/${t.maxHp})`);
          }
          continue;
        }

        const liveGobsCurrent = alive(goblins);
        if (!liveGobsCurrent.length) continue;
        const target = pickAttackTarget(hero, liveGobsCurrent);
        if (!target) continue;

        let atk = hero.atk;

        // Nyx: Stalker's Instinct passive (ATK boost near hazard — simplified)
        if (hero.name === 'Nyx' && burnZones.length > 0) {
          const onZone = burnZones.find(z => z.pos === target.pos);
          if (onZone) target.isolated = true; // treated as isolated
        }

        // Nyx mark bonus
        let markBonus = false;
        if (hero.name === 'Nyx' && target.mark) {
          atk = Math.floor(atk * 1.5);
          target.mark = false;
          markBonus = true;
        }

        let dmg = atk;
        applyDmg(target, dmg);
        log.push(`  ${hero.name} → ${target.name}  −${dmg}${markBonus ? ' [MARK!]' : ''}  (${target.hp}/${target.maxHp})`);
        if (target.hp === 0) log.push(`  ✗ ${target.name} defeated!`);

        // Nyx signature: apply MARK after attack
        if (hero.name === 'Nyx' && target.hp > 0) {
          target.mark = true;
          log.push(`    🎯 Shadow Strike: ${target.name} MARK'd`);
        }

        // Vex signature: apply SHOCK + arc
        if (hero.name === 'Vex' && target.hp > 0) {
          target.shock = Math.max(target.shock, 2);
          log.push(`    ⚡ Cascade Initiation: ${target.name} SHOCK'd`);
          // SHOCK arcs to 1 adjacent
          const adjacent = liveGobsCurrent.filter(g => g.id !== target.id && Math.abs(g.pos - target.pos) === 1 && g.hp > 0);
          let bounces = 0;
          if (thornwall && thornwall.hp > 0 && thornwall.shield > 0) bounces = 1;
          if (adjacent.length > 0) applyShock(hero, adjacent[0], bounces, thornwall, log);
        }

        // Kael signature: deploy BURN zone
        if (hero.name === 'Kael') {
          const existingZone = burnZones.find(z => z.pos === target.pos);
          if (!existingZone) {
            burnZones.push({ pos: target.pos, duration: 3 });
            log.push(`    🔥 Incendiary Grid: BURN zone deployed at position ${target.pos} (3 rounds)`);
          }
          // Apply BURN to target
          target.burn = Math.max(target.burn, 2);
          log.push(`    🔥 ${target.name} BURN'd (${target.burn} rounds)`);
        }
      }
    }

    if (alive(goblins).length === 0) break;

    // ── §14 Step 4: End-of-round autonomous triggers ───────────────────────

    // BURN zone tick: apply BURN target to occupying enemies
    for (const zone of burnZones) {
      const occupying = alive(goblins).filter(g => g.pos === zone.pos);
      for (const g of occupying) {
        if (g.burn === 0) {
          g.burn = 2;
          log.push(`    🔥 BURN zone: ${g.name} enters BURN zone → BURN applied`);
        }
      }
    }

    // BURN target tick: deal damage
    for (const g of alive(goblins)) {
      if (g.burn > 0) {
        const dmg = 6;
        applyDmg(g, dmg);
        log.push(`    🔥 ${g.name} BURN tick  −${dmg}  (${g.hp}/${g.maxHp})`);
        if (g.hp === 0) log.push(`  ✗ ${g.name} burned down!`);
      }
    }

    // SHOCK tick: deal damage
    for (const g of alive(goblins)) {
      if (g.shock > 0) {
        const dmg = 4;
        applyDmg(g, dmg);
        log.push(`    ⚡ ${g.name} SHOCK tick  −${dmg}  (${g.hp}/${g.maxHp})`);
        if (g.hp === 0) log.push(`  ✗ ${g.name} shocked out!`);
      }
    }

    // Drone Support: apply BURN to enemies at drone position
    if (drone) {
      const droneTargets = alive(goblins).filter(g => g.pos === drone.pos);
      for (const g of droneTargets) {
        g.burn = Math.max(g.burn, 2);
        log.push(`    🤖 Incendiary Drone: ${g.name} BURN'd at position ${drone.pos}`);
      }
    }

    if (alive(goblins).length === 0) break;

    // ── Goblins act: target weakest hero ────────────────────────────────────
    const activeTank = heroes.find(h => h.name === 'Thornwall' && h.hp > 0);

    for (const goblin of goblins) {
      if (goblin.hp <= 0) continue;
      if (goblin.stunned > 0) {
        log.push(`  ${goblin.name} is stunned — skips action`);
        continue;
      }
      if (alive(heroes).length === 0) break;

      // Taunted: must target Thornwall
      let gTarget;
      if (taunter && taunter.hp > 0) {
        gTarget = taunter;
        log.push(`  ${goblin.name} is taunted → targets ${taunter.name}`);
      } else {
        gTarget = lowestHp(heroes);
      }
      if (!gTarget) break;

      let dmg = goblin.atk;
      const shielded = gTarget.id === protectedId;
      if (shielded) dmg = Math.floor(dmg * 0.5);

      const tankActive = activeTank && activeTank.hp > 0 && activeTank.id !== gTarget.id;
      const armorRes   = tankActive && heroes.find(h => h.name === 'Thornwall')?.skills.find(sk => sk.id === 'thorn_6');

      if (tankActive) {
        let tankShare = Math.floor(dmg * 0.5);
        const heroShare = dmg - tankShare;

        // Shield absorbs tank's portion first
        if (activeTank.shield > 0) {
          const absorbed = Math.min(activeTank.shield, tankShare);
          activeTank.shield -= absorbed;
          tankShare -= absorbed;
          if (absorbed > 0) {
            log.push(`    🛡 SHIELD absorbs ${absorbed} (${activeTank.shield} remaining)`);
            if (armorRes) { activeTank.armorResonanceStacks = Math.min(3, activeTank.armorResonanceStacks + 1); }
          }
        }

        // Counter Edge check: retaliation
        if (activeTank.counterEdge) {
          activeTank.counterEdge = false;
          const retDmg = Math.floor(activeTank.atk * 1.5);
          applyDmg(goblin, retDmg);
          activeTank.shield = Math.min(activeTank.shieldMax, activeTank.shield + 10);
          log.push(`    ⚔ Counter Edge: ${activeTank.name} retaliates! ${goblin.name} −${retDmg} (+10 SHIELD restored)`);
          if (goblin.hp === 0) log.push(`  ✗ ${goblin.name} defeated by Counter Edge!`);
        }

        applyDmg(gTarget, heroShare);
        if (tankShare > 0) applyDmg(activeTank, tankShare);
        log.push(`  ${goblin.name} → ${gTarget.name}${shielded ? ' [shielded]' : ''}  −${heroShare}  |  ${activeTank.name} intercepts  −${tankShare}`);
        log.push(`    ${gTarget.name}: ${gTarget.hp}/${gTarget.maxHp}  ·  ${activeTank.name}: ${activeTank.hp}/${activeTank.maxHp}${activeTank.shield > 0 ? ` [🛡${activeTank.shield}]` : ''}`);
        if (gTarget.hp     === 0) log.push(`  ✗ ${gTarget.name} defeated!`);
        if (activeTank.hp  === 0) log.push(`  ✗ ${activeTank.name} defeated!`);
      } else {
        // Shield absorbs directly on target if they are Thornwall
        if (gTarget.shield > 0) {
          const absorbed = Math.min(gTarget.shield, dmg);
          gTarget.shield -= absorbed;
          dmg -= absorbed;
          if (absorbed > 0) log.push(`    🛡 SHIELD absorbs ${absorbed} (${gTarget.shield} remaining)`);
        }
        applyDmg(gTarget, dmg);
        if (dmg > 0) log.push(`  ${goblin.name} → ${gTarget.name}${shielded ? ' [shielded]' : ''}  −${dmg}  (${gTarget.hp}/${gTarget.maxHp})`);
        if (gTarget.hp === 0) log.push(`  ✗ ${gTarget.name} defeated!`);
      }
    }

    // ── §14 Step 5: Duration decrements ────────────────────────────────────

    for (const g of goblins) {
      if (g.burn  > 0) g.burn--;
      if (g.shock > 0) g.shock--;
      if (g.stunned > 0) g.stunned--;
    }
    for (const h of heroes) {
      if (h.taunted > 0) h.taunted--;
      h.pulseInstability = false;
      // Armor Resonance: apply stacked ATK bonus
      if (h.armorResonanceStacks > 0) {
        h.armorResonanceStacks = 0; // reset each round
      }
      // Skill cooldowns
      const phaseEff = h.skills.find(sk => sk.id === 'solin_6');
      for (const sk of h.skills) {
        const wasCd = sk.cdRemaining;
        if (sk.cdRemaining > 0) sk.cdRemaining--;
        // Phase Efficiency: when cooldown expires, reduce another ally by 1
        if (phaseEff && wasCd > 0 && sk.cdRemaining === 0 && solin && solin.hp > 0) {
          const other = alive(heroes).find(oh => oh.id !== h.id && oh.skills.some(s => s.cdRemaining > 1));
          if (other) {
            const otherSk = other.skills.find(s => s.cdRemaining > 1);
            if (otherSk) { otherSk.cdRemaining--; log.push(`    ⚡ Phase Efficiency: ${other.name} [${otherSk.name}] −1 CD`); }
          }
        }
      }
    }

    // BURN zone duration
    for (let i = burnZones.length - 1; i >= 0; i--) {
      burnZones[i].duration--;
      if (burnZones[i].duration <= 0) {
        log.push(`    🔥 BURN zone at position ${burnZones[i].pos} expires.`);
        burnZones.splice(i, 1);
      }
    }

    // Update isolated state
    for (const g of alive(goblins)) {
      const adjacentAlive = alive(goblins).filter(o => o.id !== g.id && Math.abs(o.pos - g.pos) === 1);
      g.isolated = adjacentAlive.length === 0;
    }
  }

  if (alive(heroes).length > 0 && alive(goblins).length > 0) {
    log.push('── Stalemate — neither side falls. ──');
  }

  return { log, won: alive(goblins).length === 0 };
}

// ── Battle Visualization Screen ──────────────────────────────────────────────

function BattleVisualizationScreen({ slots }) {
  const [battleState, setBattleState] = useState(null);
  const [eventIndex, setEventIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [autoReplay, setAutoReplay] = useState(false);
  const [replayCount, setReplayCount] = useState(0);
  const mountedRef = useRef(true);
  const animationRef = useRef(null);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Generate battle events
  const generateBattle = useCallback(() => {
    const filled = slots.filter(Boolean);
    if (filled.length < 3) return null;
    const { log, won } = simulateCombat(filled);
    return { events: log, won, filled };
  }, [slots]);

  // Initialize first battle
  useEffect(() => {
    const battle = generateBattle();
    if (battle) setBattleState(battle);
  }, [generateBattle]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || !battleState) return;

    const delay = Math.max(200, Math.floor(350 / speed));
    animationRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      if (eventIndex < battleState.events.length) {
        setEventIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
        if (autoReplay && replayCount < 19) {
          setTimeout(() => {
            if (mountedRef.current) {
              const newBattle = generateBattle();
              if (newBattle) {
                setBattleState(newBattle);
                setEventIndex(0);
                setIsPlaying(true);
                setReplayCount(prev => prev + 1);
              }
            }
          }, 1500);
        } else if (autoReplay && replayCount >= 19) {
          setAutoReplay(false);
          setReplayCount(0);
        }
      }
    }, delay);

    return () => clearTimeout(animationRef.current);
  }, [isPlaying, eventIndex, battleState, speed, autoReplay, replayCount, generateBattle]);

  const reset = () => {
    setIsPlaying(false);
    setEventIndex(0);
    setAutoReplay(false);
    setReplayCount(0);
  };

  const startAutoReplay = () => {
    setEventIndex(0);
    setReplayCount(0);
    setAutoReplay(true);
    setIsPlaying(true);
  };

  const filled = slots.filter(Boolean);
  const canRun = filled.length === 3 && battleState;
  const currentEvent = battleState?.events[eventIndex] || '';

  // Render unit circle with status
  const renderUnit = (name, maxHp, hp, statuses, isEnemy, key) => {
    const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    const hasMark = statuses.includes('MARK');
    const hasShock = statuses.includes('SHOCK');
    const hasBurn = statuses.includes('BURN');
    const hasShield = statuses.includes('SHIELD');

    return (
      <View key={key} style={bv.unitWrapper}>
        <View
          style={[
            bv.unitCircle,
            isEnemy && bv.unitEnemy,
            hasShield && bv.unitShield,
            hasShock && bv.unitShock,
            hasBurn && bv.unitBurn,
            hasMark && bv.unitMark,
          ]}
        >
          <Text style={bv.unitName}>{name}</Text>
        </View>
        <View style={bv.hpBarBg}>
          <View style={[bv.hpBar, { width: (hpPercent / 100) * 70 }]} />
        </View>
      </View>
    );
  };

  if (!battleState) {
    return (
      <View style={bv.container}>
        <Text style={bv.title}>Battle Visualization</Text>
        <Text style={bv.subtitle}>Fill all 3 loadout slots to view battles</Text>
      </View>
    );
  }

  // Mock unit data (in real scenario, extract from battle state)
  const playerTeam = [
    { name: 'Nyx', maxHp: 65, hp: 50, statuses: eventIndex % 3 === 0 ? ['MARK'] : [] },
    { name: 'Vex', maxHp: 75, hp: 60, statuses: eventIndex % 4 === 0 ? ['SHOCK'] : [] },
    { name: 'Solin', maxHp: 90, hp: 70, statuses: [] },
  ];

  const enemyTeam = [
    { name: 'Goblin A', maxHp: 60, hp: 45, statuses: eventIndex % 5 === 0 ? ['BURN'] : [] },
    { name: 'Goblin B', maxHp: 60, hp: 40, statuses: [] },
    { name: 'Goblin C', maxHp: 60, hp: 35, statuses: eventIndex % 2 === 0 ? ['SHIELD'] : [] },
  ];

  return (
    <ScrollView style={bv.container} contentContainerStyle={bv.scroll} showsVerticalScrollIndicator={false}>
      <View style={bv.header}>
        <Text style={bv.title}>Battle {replayCount + 1}</Text>
        <Text style={bv.subtitle}>Playback controls: Play/Pause/Restart</Text>
      </View>

      {/* Formation */}
      <View style={bv.formationRow}>
        <View style={bv.teamCol}>
          <Text style={bv.teamLabel}>YOUR TEAM</Text>
          {playerTeam.map((u, i) => renderUnit(u.name, u.maxHp, u.hp, u.statuses, false, i))}
        </View>
        <View style={bv.vsCol}>
          <Text style={bv.vsText}>VS</Text>
        </View>
        <View style={bv.teamCol}>
          <Text style={[bv.teamLabel, { textAlign: 'right' }]}>ENEMIES</Text>
          {enemyTeam.map((u, i) => renderUnit(u.name, u.maxHp, u.hp, u.statuses, true, i))}
        </View>
      </View>

      {/* Event log */}
      {currentEvent && (
        <View style={bv.logBox}>
          <Text style={bv.logLabel}>Event {eventIndex + 1} / {battleState.events.length}</Text>
          <Text style={bv.logText}>{currentEvent}</Text>
        </View>
      )}

      {/* Controls */}
      <View style={bv.controls}>
        <TouchableOpacity style={bv.btn} onPress={() => setIsPlaying(!isPlaying)} activeOpacity={0.7}>
          <Text style={bv.btnText}>{isPlaying ? '⏸ Pause' : '▶ Play'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={bv.btn} onPress={reset} activeOpacity={0.7}>
          <Text style={bv.btnText}>↻ Restart</Text>
        </TouchableOpacity>
        <View style={bv.speedPicker}>
          {[0.5, 1, 2].map(s => (
            <TouchableOpacity
              key={s}
              style={[bv.speedBtn, speed === s && bv.speedBtnActive]}
              onPress={() => setSpeed(s)}
              activeOpacity={0.7}
            >
              <Text style={[bv.speedText, speed === s && bv.speedTextActive]}>{s}x</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Auto-replay */}
      <TouchableOpacity
        style={[bv.autoReplayBtn, autoReplay && bv.autoReplayBtnActive]}
        onPress={startAutoReplay}
        disabled={autoReplay}
        activeOpacity={0.75}
      >
        <Text style={bv.autoReplayText}>{autoReplay ? `Running… ${replayCount + 1}/20` : '▶ Auto-Replay 20x'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Map Screen ────────────────────────────────────────────────────────────────

function MapScreen({ mapGrid, onTileTap, spreadPaused }) {
  const spreadCount = mapGrid.flat().filter(v => v > 0).length;
  const threat = mapThreat(spreadCount);

  const tileColor = (depth) => {
    if (depth === 0) return '#0d1117';
    if (depth <= 3)  return '#1a3a1a';
    if (depth <= 7)  return '#5a2800';
    return                   '#8b1010';
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={m.statsRow}>
        <View style={m.statCard}>
          <Text style={m.statLabel}>SPREAD</Text>
          <Text style={m.statValue}>{spreadCount} tiles</Text>
        </View>
        <View style={m.statCard}>
          <Text style={m.statLabel}>THREAT</Text>
          <Text style={[m.statValue, { color: threat.color }]}>{threat.level}</Text>
        </View>
        <View style={m.statCard}>
          <Text style={m.statLabel}>STATUS</Text>
          <Text style={[m.statValue, { color: spreadPaused ? C.warn : C.muted, fontSize: 12 }]}>
            {spreadPaused ? '⏸ PAUSED' : '◉ LIVE'}
          </Text>
        </View>
      </View>

      <View style={m.grid}>
        {mapGrid.map((row, r) => (
          <View key={r} style={m.row}>
            {row.map((depth, c) => (
              <TouchableOpacity
                key={c}
                style={[m.tile, { backgroundColor: tileColor(depth) }]}
                onPress={depth > 0 ? () => onTileTap(r, c) : undefined}
                activeOpacity={depth > 0 ? 0.6 : 1}
              />
            ))}
          </View>
        ))}
      </View>

      <Text style={m.hint}>Tap any infected tile to intervene.</Text>
    </View>
  );
}

// ── Dungeon Run Screen ────────────────────────────────────────────────────────

function DungeonRunScreen({ slots, difficultyMultiplier = 1.0, onMapReturn }) {
  const [combatLog, setCombatLog] = useState([]);
  const [result, setResult]       = useState(null); // 'win' | 'defeat' | null
  const [running, setRunning]     = useState(false);
  const scrollRef  = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [combatLog]);

  const runDungeon = async () => {
    const filled = slots.filter(Boolean);
    if (filled.length < 3 || running) return;

    setRunning(true);
    setCombatLog([]);
    setResult(null);

    const { log, won } = simulateCombat(filled, difficultyMultiplier);

    for (const line of log) {
      if (!mountedRef.current) return;
      await new Promise(r => setTimeout(r, 65));
      if (!mountedRef.current) return;
      setCombatLog(prev => [...prev, line]);
    }

    await new Promise(r => setTimeout(r, 450));
    if (!mountedRef.current) return;
    setResult(won ? 'win' : 'defeat');
    setRunning(false);
  };

  const reset = () => {
    setCombatLog([]);
    setResult(null);
    setRunning(false);
  };

  const filled  = slots.filter(Boolean);
  const canRun  = filled.length === 3 && !running && result === null;

  const lineColor = (line) => {
    if (line.startsWith('──'))                                                  return C.muted;
    if (line.includes('✗'))                                                     return C.danger;
    if (line.includes('heals') || line.includes('restores') || line.includes('Flow Burst') || line.includes('Barrier')) return C.success;
    if (line.includes('shields') || line.includes('intercepts') || line.includes('defensive') || line.includes('🛡') || line.includes('Fortress Field')) return C.warn;
    if (line.includes('🔥') || line.includes('BURN') || line.includes('Detonation') || line.includes('burned'))        return '#f97316';
    if (line.includes('⚡') || line.includes('SHOCK') || line.includes('Cascade') || line.includes('Overcharge'))      return '#818cf8';
    if (line.includes('🎯') || line.includes('MARK') || line.includes('Execution') || line.includes("Predator"))       return '#e879f9';
    if (line.includes('✦'))                                                     return C.accent;
    if (line.includes('💥') || line.includes('Overclock'))                      return '#fbbf24';
    return C.text;
  };

  const GOBLIN_PREVIEW = [
    { name: 'Goblin A', hp: 60, atk: 12 },
    { name: 'Goblin B', hp: 60, atk: 12 },
    { name: 'Goblin C', hp: 60, atk: 12 },
  ];

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={d.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={d.header}>
        <Text style={d.title}>Dungeon Run</Text>
        <Text style={d.subtitle}>Simulate your loadout in tactical combat</Text>
      </View>

      {/* Teams preview */}
      <View style={d.teamsRow}>
        <View style={d.teamCol}>
          <Text style={d.teamLabel}>YOUR TEAM</Text>
          {slots.map((slot, i) => slot ? (
            <View key={i} style={d.unitCard}>
              <Text style={d.unitName}>{slot.agentName}</Text>
              <Text style={d.unitRole}>{slot.agentRole}</Text>
              <Text style={d.unitStats}>
                {(ARCHETYPE_STATS[slot.agentName] ?? ROLE_STATS[slot.agentRole]).hp} HP
                ·  {(ARCHETYPE_STATS[slot.agentName] ?? ROLE_STATS[slot.agentRole]).atk} ATK
              </Text>
              {(slot.equippedSkills ?? []).filter(Boolean).map(sk => (
                <Text key={sk.id} style={d.unitSkill}>⬡ {sk.name}</Text>
              ))}
            </View>
          ) : (
            <View key={i} style={[d.unitCard, d.unitEmpty]}>
              <Text style={d.emptySlotText}>Empty</Text>
            </View>
          ))}
        </View>

        <View style={d.vsCol}>
          <Text style={d.vsText}>VS</Text>
        </View>

        <View style={d.teamCol}>
          <Text style={[d.teamLabel, { textAlign: 'right' }]}>ENEMIES</Text>
          {GOBLIN_PREVIEW.map((g, i) => (
            <View key={i} style={[d.unitCard, d.enemyCard]}>
              <Text style={[d.unitName, { color: '#fc8181' }]}>{g.name}</Text>
              <Text style={[d.unitRole, { color: '#a0aec0' }]}>Goblin</Text>
              <Text style={d.unitStats}>{g.hp} HP  ·  {g.atk} ATK</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Incomplete loadout warning */}
      {filled.length < 3 && result === null && !running && (
        <View style={d.warnBox}>
          <Text style={d.warnText}>
            Fill all 3 loadout slots in the Loadout tab before running.
          </Text>
        </View>
      )}

      {/* Run Dungeon button */}
      {result === null && (
        <TouchableOpacity
          style={[d.runBtn, !canRun && d.runBtnDisabled]}
          onPress={runDungeon}
          disabled={!canRun}
          activeOpacity={0.8}
        >
          <Text style={d.runBtnText}>{running ? 'Running…' : 'Run Dungeon'}</Text>
        </TouchableOpacity>
      )}

      {/* Combat log */}
      {combatLog.length > 0 && (
        <View style={d.logBox}>
          <Text style={d.logTitle}>COMBAT LOG</Text>
          {combatLog.map((line, i) => (
            <Text key={i} style={[d.logLine, { color: lineColor(line) }]}>
              {line}
            </Text>
          ))}
        </View>
      )}

      {/* Result banner + Run Again */}
      {result !== null && (
        <>
          <View style={[d.resultBanner, result === 'win' ? d.resultWin : d.resultDefeat]}>
            <Text style={[d.resultText, { color: result === 'win' ? C.success : C.danger }]}>
              {result === 'win' ? '⚔  VICTORY' : '✗  DEFEAT'}
            </Text>
            <Text style={d.resultSub}>
              {result === 'win' ? 'All goblins eliminated.' : 'Your team was wiped out.'}
            </Text>
          </View>
          {onMapReturn && (
            <TouchableOpacity
              style={[d.runAgainBtn, { borderColor: C.accent, marginBottom: 8 }]}
              onPress={() => onMapReturn(result === 'win')}
              activeOpacity={0.75}
            >
              <Text style={[d.runAgainText, { color: C.accent }]}>← Return to Map</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={d.runAgainBtn} onPress={reset} activeOpacity={0.75}>
            <Text style={d.runAgainText}>Run Again</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen]                       = useState('map');
  const [slots, setSlots]                         = useState([null, null, null]);
  const [agentPickerSlot, setAgentPickerSlot]     = useState(null);
  const [behaviorPickerSlot, setBehaviorPickerSlot] = useState(null);
  // skillPickerSlot: { slotIdx, skillIdx } — which loadout slot + which equip slot (0 or 1)
  const [skillPickerTarget, setSkillPickerTarget] = useState(null);

  // ── Map state ───────────────────────────────────────────────────────────────
  const [mapGrid, setMapGrid]                 = useState(() => initMapGrid());
  const [mapSpreadPaused, setMapSpreadPaused] = useState(false);
  const [mapBriefTile, setMapBriefTile]       = useState(null);
  const [mapDiffMult, setMapDiffMult]         = useState(1.0);
  const [mapDungeonActive, setMapDungeonActive] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  useEffect(() => {
    if (mapSpreadPaused) return;
    const id = setInterval(() => setMapGrid(prev => spreadOneTile(prev)), 3000);
    return () => clearInterval(id);
  }, [mapSpreadPaused]);

  const loadConfig = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) setSlots(JSON.parse(saved));
    } catch (_) {}
  };

  const persist = async (next) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch (_) {}
  };

  const usedIds = () => slots.filter(Boolean).map(s => s.agentId);

  const pickAgent = (agentId) => {
    const agent = AGENTS.find(a => a.id === agentId);
    const next  = [...slots];
    next[agentPickerSlot] = {
      agentId,
      agentName: agent.name,
      agentRole: agent.role,
      behavior:  next[agentPickerSlot]?.behavior ?? BEHAVIORS[0],
      equippedSkills: [null, null],
    };
    setSlots(next); persist(next); setAgentPickerSlot(null);
  };

  const pickSkill = (skill) => {
    if (!skillPickerTarget) return;
    const { slotIdx, skillIdx } = skillPickerTarget;
    const next = [...slots];
    const equipped = [...(next[slotIdx].equippedSkills ?? [null, null])];
    equipped[skillIdx] = skill;
    next[slotIdx] = { ...next[slotIdx], equippedSkills: equipped };
    setSlots(next); persist(next); setSkillPickerTarget(null);
  };

  const clearSkill = (slotIdx, skillIdx) => {
    const next = [...slots];
    const equipped = [...(next[slotIdx].equippedSkills ?? [null, null])];
    equipped[skillIdx] = null;
    next[slotIdx] = { ...next[slotIdx], equippedSkills: equipped };
    setSlots(next); persist(next);
  };

  const pickBehavior = (behavior) => {
    const next = [...slots];
    next[behaviorPickerSlot] = { ...next[behaviorPickerSlot], behavior };
    setSlots(next); persist(next); setBehaviorPickerSlot(null);
  };

  const removeSlot = (i) => {
    const next = [...slots];
    next[i] = null;
    setSlots(next); persist(next);
  };

  // ── Map handlers ─────────────────────────────────────────────────────────────
  const handleMapTileTap = (row, col) => {
    const count = mapGrid.flat().filter(v => v > 0).length;
    setMapDiffMult(mapThreat(count).mult);
    setMapBriefTile({ row, col });
    setMapSpreadPaused(true);
  };

  const handleMapReturn = (won) => {
    setMapGrid(prev => won ? shrinkCluster(prev, 2) : growCluster(prev, 2));
    setMapDungeonActive(false);
    setMapSpreadPaused(false);
    setScreen('map');
  };

  const navigateToTab = (tab) => {
    if (screen === 'dungeon' && mapDungeonActive && tab !== 'dungeon') {
      setMapDungeonActive(false);
      setMapSpreadPaused(false);
    }
    setScreen(tab);
  };

  const configured = slots.filter(Boolean);

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Tab bar ── */}
      <View style={s.tabBar}>
        {['map', 'loadout', 'dungeon', 'battle'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, screen === tab && s.tabActive]}
            onPress={() => navigateToTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, screen === tab && s.tabTextActive]}>
              {tab === 'map' ? 'Map' : tab === 'loadout' ? 'Loadout' : tab === 'dungeon' ? 'Dungeon' : 'Battle'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Map ── */}
      {screen === 'map' && (
        <MapScreen
          mapGrid={mapGrid}
          onTileTap={handleMapTileTap}
          spreadPaused={mapSpreadPaused}
        />
      )}

      {/* ── Loadout Builder ── */}
      {screen === 'loadout' && (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          <View style={s.header}>
            <Text style={s.title}>Loadout Builder</Text>
            <Text style={s.subtitle}>{configured.length} / 3 8gents configured</Text>
          </View>

          {slots.map((slot, i) => (
            <View key={i} style={s.slotCard}>
              <View style={s.slotHead}>
                <View style={s.badge}><Text style={s.badgeText}>{i + 1}</Text></View>
                <Text style={s.slotLabel}>Slot {i + 1}</Text>
                {slot && (
                  <TouchableOpacity onPress={() => removeSlot(i)}>
                    <Text style={s.removeText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              {slot ? (
                <View style={s.slotBody}>
                  <TouchableOpacity
                    style={s.selectRow}
                    onPress={() => setAgentPickerSlot(i)}
                    activeOpacity={0.75}
                  >
                    <View>
                      <Text style={s.rowCap}>8GENT</Text>
                      <Text style={s.rowVal}>{slot.agentName}</Text>
                      <Text style={s.rowSub}>{slot.agentRole}</Text>
                    </View>
                    <Text style={s.chevron}>▾</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.selectRow, { marginTop: 8 }]}
                    onPress={() => setBehaviorPickerSlot(i)}
                    activeOpacity={0.75}
                  >
                    <View>
                      <Text style={s.rowCap}>BEHAVIOR PRIORITY</Text>
                      <Text style={s.rowVal}>{slot.behavior}</Text>
                    </View>
                    <Text style={s.chevron}>▾</Text>
                  </TouchableOpacity>

                  {/* ── Signature skill (always shown, locked) ── */}
                  {(() => {
                    const sig = SKILL_POOL[slot.agentName]?.signature;
                    return sig ? (
                      <View style={[s.skillRow, { marginTop: 8 }]}>
                        <View style={s.skillSigBadge}><Text style={s.skillSigLabel}>SIG</Text></View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.skillName}>{sig.name}</Text>
                          <Text style={s.skillEffect} numberOfLines={2}>{sig.effect}</Text>
                        </View>
                        <View style={s.statusTagBadge}><Text style={s.statusTagText}>{sig.statusTag}</Text></View>
                      </View>
                    ) : null;
                  })()}

                  {/* ── Active skill slots (2 equippable) ── */}
                  <Text style={[s.rowCap, { marginTop: 10, marginBottom: 4 }]}>ACTIVE SKILLS  (equip 2)</Text>
                  {[0, 1].map(skillIdx => {
                    const eq = (slot.equippedSkills ?? [])[skillIdx];
                    return (
                      <View key={skillIdx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
                        <TouchableOpacity
                          style={[s.skillSlotBtn, eq && s.skillSlotBtnFilled]}
                          onPress={() => setSkillPickerTarget({ slotIdx: i, skillIdx })}
                          activeOpacity={0.75}
                        >
                          {eq ? (
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={s.skillSlotCat}>{eq.category}</Text>
                                <Text style={s.skillSlotName}>{eq.name}</Text>
                              </View>
                              <Text style={s.skillEffect} numberOfLines={1}>{eq.effect}</Text>
                            </View>
                          ) : (
                            <Text style={s.skillSlotEmpty}>+ Equip active skill</Text>
                          )}
                        </TouchableOpacity>
                        {eq && (
                          <TouchableOpacity onPress={() => clearSkill(i, skillIdx)} style={s.skillClearBtn}>
                            <Text style={s.skillClearText}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <TouchableOpacity
                  style={s.addBtn}
                  onPress={() => setAgentPickerSlot(i)}
                  activeOpacity={0.75}
                >
                  <Text style={s.addBtnText}>+ Add 8gent</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>Team Summary</Text>
            {configured.length === 0 ? (
              <Text style={s.summaryEmpty}>
                No 8gents configured yet.{'\n'}Add units above to build your loadout.
              </Text>
            ) : (
              configured.map((slot, i) => (
                <View
                  key={i}
                  style={[s.summaryRow, i < configured.length - 1 && s.summaryRowBorder]}
                >
                  <View style={s.summaryLeft}>
                    <Text style={s.summaryNum}>#{i + 1}</Text>
                    <View>
                      <Text style={s.summaryName}>{slot.agentName}</Text>
                      <Text style={s.summaryRole}>{slot.agentRole}</Text>
                    </View>
                  </View>
                  <View style={s.behaviorTag}>
                    <Text style={s.behaviorTagText} numberOfLines={2}>{slot.behavior}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* ── Dungeon Run ── */}
      {screen === 'dungeon' && (
        <DungeonRunScreen
          slots={slots}
          difficultyMultiplier={mapDungeonActive ? mapDiffMult : 1.0}
          onMapReturn={mapDungeonActive ? handleMapReturn : undefined}
        />
      )}

      {/* ── Battle Visualization ── */}
      {screen === 'battle' && <BattleVisualizationScreen slots={slots} />}

      {/* ── Intervention Brief ── */}
      <Modal visible={mapBriefTile !== null} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.sheet}>
            {(() => {
              const count = mapGrid.flat().filter(v => v > 0).length;
              const threat = mapThreat(count);
              const diffLabel = threat.mult <= 1.0 ? 'Easy' : threat.mult <= 1.3 ? 'Moderate' : 'Hard';
              return (
                <>
                  <Text style={s.sheetTitle}>Intervention Brief</Text>
                  <Text style={s.sheetSub}>Threat type: Exponential Spread</Text>

                  <View style={m.briefGrid}>
                    <View style={m.briefStat}>
                      <Text style={m.briefStatLabel}>SPREAD SIZE</Text>
                      <Text style={m.briefStatValue}>{count} tiles</Text>
                    </View>
                    <View style={m.briefStat}>
                      <Text style={m.briefStatLabel}>THREAT LEVEL</Text>
                      <Text style={[m.briefStatValue, { color: threat.color }]}>{threat.level}</Text>
                    </View>
                    <View style={m.briefStat}>
                      <Text style={m.briefStatLabel}>DIFFICULTY</Text>
                      <Text style={[m.briefStatValue, { color: threat.color }]}>{diffLabel}</Text>
                    </View>
                    <View style={m.briefStat}>
                      <Text style={m.briefStatLabel}>ENEMY SCALE</Text>
                      <Text style={[m.briefStatValue, { color: threat.color }]}>{threat.mult}×</Text>
                    </View>
                  </View>

                  <View style={{ gap: 8, marginTop: 4 }}>
                    <TouchableOpacity
                      style={[s.sheetItem, { backgroundColor: C.accentDim, justifyContent: 'center' }]}
                      onPress={() => {
                        setMapBriefTile(null);
                        setMapSpreadPaused(false);
                        setScreen('loadout');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.sheetItemName, { color: C.accent, textAlign: 'center' }]}>Configure Loadout</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[s.sheetItem, { backgroundColor: '#0a1f12', justifyContent: 'center', borderWidth: 1, borderColor: C.success }]}
                      onPress={() => {
                        setMapBriefTile(null);
                        setMapDungeonActive(true);
                        setScreen('dungeon');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.sheetItemName, { color: C.success, textAlign: 'center' }]}>⚔ Battle Now</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={s.cancelBtn}
                      onPress={() => {
                        setMapBriefTile(null);
                        setMapSpreadPaused(false);
                      }}
                    >
                      <Text style={s.cancelText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Agent Picker Modal ── */}
      <Modal visible={agentPickerSlot !== null} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Select 8gent</Text>
            <Text style={s.sheetSub}>Slot {(agentPickerSlot ?? 0) + 1}</Text>

            {AGENTS.map(agent => {
              const taken    = usedIds().includes(agent.id) && slots[agentPickerSlot]?.agentId !== agent.id;
              const selected = slots[agentPickerSlot]?.agentId === agent.id;
              return (
                <TouchableOpacity
                  key={agent.id}
                  style={[s.sheetItem, taken && s.sheetItemDim]}
                  onPress={() => !taken && pickAgent(agent.id)}
                  activeOpacity={taken ? 1 : 0.75}
                >
                  <View>
                    <Text style={[s.sheetItemName, taken && { color: C.muted }]}>{agent.name}</Text>
                    <Text style={s.sheetItemSub}>{agent.role}</Text>
                  </View>
                  {taken    && <Text style={s.tagMuted}>In use</Text>}
                  {selected && <Text style={s.tagAccent}>✓</Text>}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={s.cancelBtn} onPress={() => setAgentPickerSlot(null)}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Skill Picker Modal ── */}
      <Modal visible={skillPickerTarget !== null} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet, { maxHeight: '85%' }]}>
            {(() => {
              const spt = skillPickerTarget;
              if (!spt) return null;
              const slot = slots[spt.slotIdx];
              if (!slot) return null;
              const pool = SKILL_POOL[slot.agentName];
              if (!pool) return null;
              const otherEquipped = ((slot.equippedSkills ?? [])[spt.skillIdx === 0 ? 1 : 0])?.id;
              return (
                <>
                  <Text style={s.sheetTitle}>Equip Active Skill</Text>
                  <Text style={s.sheetSub}>{slot.agentName}  —  Slot {spt.skillIdx + 1}</Text>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {pool.unlockable.filter(sk => sk.category !== 'Passive').map(sk => {
                      const isOther  = sk.id === otherEquipped;
                      const isActive = (slot.equippedSkills ?? [])[spt.skillIdx]?.id === sk.id;
                      return (
                        <TouchableOpacity
                          key={sk.id}
                          style={[s.sheetItem, isOther && s.sheetItemDim, { flexDirection: 'column', alignItems: 'flex-start' }]}
                          onPress={() => !isOther && pickSkill(sk)}
                          activeOpacity={isOther ? 1 : 0.75}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={s.catBadge}><Text style={s.catBadgeText}>{sk.category}</Text></View>
                              <Text style={[s.sheetItemName, isOther && { color: C.muted }]}>{sk.name}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={s.cdText}>CD {sk.cooldown}</Text>
                              {isActive && <Text style={s.tagAccent}>✓</Text>}
                              {isOther  && <Text style={s.tagMuted}>In use</Text>}
                            </View>
                          </View>
                          <Text style={[s.sheetItemSub, { marginTop: 4 }]}>{sk.effect}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {/* Also show Passives, non-equippable, for reference */}
                    {pool.unlockable.filter(sk => sk.category === 'Passive').map(sk => (
                      <View key={sk.id} style={[s.sheetItem, s.sheetItemDim, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={[s.catBadge, { backgroundColor: '#2d3748' }]}><Text style={[s.catBadgeText, { color: C.muted }]}>Passive</Text></View>
                          <Text style={[s.sheetItemName, { color: C.muted }]}>{sk.name}</Text>
                        </View>
                        <Text style={[s.sheetItemSub, { marginTop: 4 }]}>{sk.effect}</Text>
                        <Text style={[s.sheetItemSub, { color: C.accentDim, marginTop: 2 }]}>Always active — cannot equip</Text>
                      </View>
                    ))}
                  </ScrollView>
                </>
              );
            })()}
            <TouchableOpacity style={[s.cancelBtn, { marginTop: 12 }]} onPress={() => setSkillPickerTarget(null)}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Behavior Picker Modal ── */}
      <Modal visible={behaviorPickerSlot !== null} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Select Behavior</Text>
            <Text style={s.sheetSub}>
              {behaviorPickerSlot !== null ? slots[behaviorPickerSlot]?.agentName : ''}
            </Text>

            {BEHAVIORS.map(b => {
              const selected = behaviorPickerSlot !== null && slots[behaviorPickerSlot]?.behavior === b;
              return (
                <TouchableOpacity
                  key={b}
                  style={s.sheetItem}
                  onPress={() => pickBehavior(b)}
                  activeOpacity={0.75}
                >
                  <Text style={s.sheetItemName}>{b}</Text>
                  {selected && <Text style={s.tagAccent}>✓</Text>}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={s.cancelBtn} onPress={() => setBehaviorPickerSlot(null)}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles: Loadout Builder ───────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 48 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: C.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.muted,
  },
  tabTextActive: {
    color: C.accent,
  },

  // Header
  header:   { marginBottom: 24, marginTop: 8 },
  title:    { fontSize: 30, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },

  // Slot card
  slotCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  slotHead: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 8,
  },
  badge:      { width: 24, height: 24, borderRadius: 12, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  badgeText:  { color: C.accent, fontSize: 12, fontWeight: '700' },
  slotLabel:  { flex: 1, fontSize: 13, color: C.muted, fontWeight: '600', letterSpacing: 0.5 },
  removeText: { color: C.danger, fontSize: 13, fontWeight: '600' },

  slotBody: { paddingHorizontal: 14, paddingBottom: 14 },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowCap:  { fontSize: 10, color: C.muted, fontWeight: '700', letterSpacing: 1 },
  rowVal:  { fontSize: 18, color: C.text,  fontWeight: '700', marginTop: 2 },
  rowSub:  { fontSize: 12, color: C.muted, marginTop: 1 },
  chevron: { color: C.accent, fontSize: 16 },

  addBtn: {
    margin: 14,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.accentDim,
    alignItems: 'center',
  },
  addBtnText: { color: C.accent, fontSize: 15, fontWeight: '600' },

  // Summary card
  summaryCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryTitle:     { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 14 },
  summaryEmpty:     { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 22, paddingVertical: 12 },
  summaryRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  summaryLeft:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryNum:       { color: C.accent, fontSize: 13, fontWeight: '700', width: 22 },
  summaryName:      { fontSize: 16, fontWeight: '700', color: C.text },
  summaryRole:      { fontSize: 12, color: C.muted, marginTop: 1 },
  behaviorTag:      { backgroundColor: C.accentDim, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, maxWidth: 150 },
  behaviorTagText:  { color: C.accent, fontSize: 12, fontWeight: '600' },

  // Skill rows in loadout card
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  skillSigBadge:  { backgroundColor: '#1a2a4a', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  skillSigLabel:  { color: C.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  skillName:      { fontSize: 13, fontWeight: '700', color: C.text },
  skillEffect:    { fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 15 },
  statusTagBadge: { backgroundColor: '#1e2d1e', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  statusTagText:  { color: '#48bb78', fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  skillSlotBtn: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.accentDim,
  },
  skillSlotBtnFilled: { borderStyle: 'solid', borderColor: C.border },
  skillSlotEmpty: { color: C.accent, fontSize: 12, fontWeight: '600' },
  skillSlotCat:   { fontSize: 9, fontWeight: '700', color: C.muted, letterSpacing: 1, textTransform: 'uppercase' },
  skillSlotName:  { fontSize: 13, fontWeight: '700', color: C.text },
  skillClearBtn:  { padding: 6 },
  skillClearText: { color: C.muted, fontSize: 14, fontWeight: '700' },

  // Skill picker modal extras
  catBadge:     { backgroundColor: C.accentDim, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  catBadgeText: { color: C.accent, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cdText:       { color: C.muted, fontSize: 11, fontWeight: '600' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  sheetTitle:    { fontSize: 20, fontWeight: '800', color: C.text },
  sheetSub:      { fontSize: 14, color: C.muted, marginTop: 4, marginBottom: 16 },
  sheetItem:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8 },
  sheetItemDim:  { opacity: 0.4 },
  sheetItemName: { fontSize: 16, fontWeight: '600', color: C.text },
  sheetItemSub:  { fontSize: 12, color: C.muted, marginTop: 2 },
  tagMuted:      { color: C.muted, fontSize: 12 },
  tagAccent:     { color: C.accent, fontSize: 18, fontWeight: '700' },
  cancelBtn:     { marginTop: 8, paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: C.border },
  cancelText:    { color: C.muted, fontSize: 16, fontWeight: '600' },
});

// ── Styles: Dungeon Run ───────────────────────────────────────────────────────

const d = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48 },

  header:   { marginBottom: 20, marginTop: 8 },
  title:    { fontSize: 30, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },

  // Teams row
  teamsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  teamCol:  { flex: 1 },
  vsCol:    { width: 36, alignItems: 'center', justifyContent: 'center' },
  vsText:   { color: C.muted, fontWeight: '800', fontSize: 14 },
  teamLabel: { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 8 },

  unitCard: {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 6,
  },
  enemyCard:    { borderColor: '#4a1a1a' },
  unitEmpty:    { opacity: 0.35, alignItems: 'center', paddingVertical: 16 },
  unitName:     { fontSize: 13, fontWeight: '700', color: C.text },
  unitRole:     { fontSize: 11, color: C.muted, marginTop: 1 },
  unitStats:    { fontSize: 11, color: C.accent, marginTop: 4 },
  emptySlotText: { fontSize: 12, color: C.muted },
  unitSkill:    { fontSize: 10, color: C.accent, marginTop: 2 },

  // Warning
  warnBox:  { backgroundColor: '#1f1400', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#5a3800' },
  warnText: { color: C.warn, fontSize: 13, textAlign: 'center', lineHeight: 18 },

  // Run button
  runBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  runBtnDisabled: { backgroundColor: C.accentDim, opacity: 0.5 },
  runBtnText:     { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },

  // Combat log
  logBox:   { backgroundColor: C.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  logTitle: { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 1.5, marginBottom: 10 },
  logLine:  {
    fontSize: 12.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 20,
    marginBottom: 1,
  },

  // Result banner
  resultBanner: { borderRadius: 16, padding: 28, alignItems: 'center', marginBottom: 14, borderWidth: 1 },
  resultWin:    { backgroundColor: '#0a1f12', borderColor: '#276749' },
  resultDefeat: { backgroundColor: '#1f0a0a', borderColor: '#c53030' },
  resultText:   { fontSize: 30, fontWeight: '900', letterSpacing: 3 },
  resultSub:    { fontSize: 14, color: C.muted, marginTop: 8 },

  // Run Again
  runAgainBtn:  { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: C.border, marginBottom: 20 },
  runAgainText: { color: C.muted, fontSize: 15, fontWeight: '600' },
});

// ── Styles: Battle Visualization ─────────────────────────────────────────────

const bv = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 48 },

  header: { marginBottom: 20, marginTop: 8 },
  title: { fontSize: 30, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },

  // Formation
  formationRow: { flexDirection: 'row', gap: 12, marginBottom: 24, alignItems: 'flex-start' },
  teamCol: { flex: 1 },
  vsCol: { width: 40, alignItems: 'center', justifyContent: 'center', paddingTop: 12 },
  vsText: { color: C.muted, fontWeight: '800', fontSize: 14 },
  teamLabel: { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 12 },

  // Unit circles
  unitWrapper: { marginBottom: 14, alignItems: 'center' },
  unitCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  unitEnemy: { borderColor: '#6b1414' },
  unitMark: { borderColor: '#fbbf24', borderWidth: 3 },
  unitShock: { borderColor: '#818cf8', borderWidth: 2, borderStyle: 'dashed' },
  unitBurn: { backgroundColor: '#2a1414', borderColor: '#dc2626' },
  unitShield: { borderColor: '#eab308', backgroundColor: '#1f2414' },
  unitName: { fontSize: 11, fontWeight: '700', color: C.text, textAlign: 'center' },

  // HP bar
  hpBarBg: { width: 70, height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  hpBar: { height: 5, backgroundColor: C.success, borderRadius: 3 },

  // Event log
  logBox: { backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  logLabel: { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 1.5, marginBottom: 8 },
  logText: { fontSize: 13, color: C.accent, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 18 },

  // Controls
  controls: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' },
  btn: { flex: 1, backgroundColor: C.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  speedPicker: { flexDirection: 'row', gap: 6, backgroundColor: C.surface, borderRadius: 10, padding: 6, borderWidth: 1, borderColor: C.border },
  speedBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6 },
  speedBtnActive: { backgroundColor: C.accent },
  speedText: { color: C.muted, fontSize: 12, fontWeight: '600' },
  speedTextActive: { color: '#fff' },

  // Auto-replay
  autoReplayBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: C.border, marginBottom: 20 },
  autoReplayBtnActive: { backgroundColor: C.accentDim },
  autoReplayText: { color: C.muted, fontSize: 15, fontWeight: '600' },
});

// ── Styles: Map ───────────────────────────────────────────────────────────────

const m = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  statLabel: { fontSize: 9, fontWeight: '700', color: C.muted, letterSpacing: 1, textTransform: 'uppercase' },
  statValue: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 3 },
  statStatus: { fontSize: 12, fontWeight: '700', color: C.muted, marginTop: 3 },
  statStatusPaused: { color: C.warn },

  grid: { gap: 2 },
  row:  { flexDirection: 'row', gap: 2, marginBottom: 0 },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 3,
  },

  hint: {
    marginTop: 12,
    fontSize: 11,
    color: C.muted,
    textAlign: 'center',
  },

  // Intervention Brief grid
  briefGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    marginTop: 4,
  },
  briefStat: {
    width: '47%',
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 12,
  },
  briefStatLabel: { fontSize: 9, fontWeight: '700', color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  briefStatValue: { fontSize: 20, fontWeight: '800', color: C.text },
});
