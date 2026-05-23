// 8gents Battle Simulation Engine — §20 Step 1: Combat Event Digest
// Deterministic pre-computation with full diagnostic logging.

const ARCHETYPES = {
  nyx:       { name: 'Nyx',       hp: 60,  atk: 35, speed: 10 },
  thornwall: { name: 'Thornwall', hp: 180, atk: 10, speed: 6  },
  vex:       { name: 'Vex',       hp: 75,  atk: 22, speed: 9  },
  solin:     { name: 'Solin',     hp: 70,  atk: 12, speed: 8  },
  kael:      { name: 'Kael',      hp: 85,  atk: 20, speed: 7  },
};

const ENEMY_ARCHETYPE = { hp: 120, atk: 22, speed: 7 };
const GOBLIN_LABELS   = ['A', 'B', 'C'];

// Signature skills — startCD = rounds before first use, maxCD = rounds between uses.
const SIGNATURES = {
  nyx:       { name: 'Shadow Strike',   startCD: 2, maxCD: 2 },
  thornwall: { name: 'Fortress Field',  startCD: 0, maxCD: 1 },
  vex:       { name: 'Cascade Init',    startCD: 3, maxCD: 3 },
  solin:     { name: 'Pulse Engine',    startCD: 0, maxCD: 0 },
  kael:      { name: 'Incendiary Grid', startCD: 2, maxCD: 2 },
};

// Game-logic positions (separate from visual SVG coordinates in the component).
// Player side: 0, 1, 2.  Enemy side: 4, 5, 7.
// The gap between Goblin B (pos 5) and Goblin C (pos 7) means:
//   Normal SHOCK chain range (|diff| <= 1): B can reach A but NOT C.
//   Relay range via Thornwall SHIELD (|diff| <= 2): B can reach C.
// This creates the relay evaluation in every battle Vex fires.
const PLAYER_POS     = [0, 1, 2];
const ENEMY_POS      = [4, 5, 7];
const NORMAL_RANGE   = 1;
const RELAY_RANGE    = 2;
const SUPPORT_RADIUS = 2;

export function simulateBattle(playerTeamIds, _unused, maxRounds = 20) {
  const events = []; // visualization event stream — existing format preserved
  const digest = []; // §20 raw event log
  let   round  = 0;

  const log = line => digest.push(`[R${round}] ${line}`);

  // ── Unit initialization ──────────────────────────────────
  const units = [];

  playerTeamIds.forEach((key, i) => {
    const arch = ARCHETYPES[key];
    if (!arch) return;
    const sig = SIGNATURES[key] ?? { name: '—', startCD: 0, maxCD: 0 };
    units.push({
      id: `player_${i}`, type: 'player', archtype: key,
      name: arch.name, pos: PLAYER_POS[i] ?? i,
      hp: arch.hp, maxHp: arch.hp, atk: arch.atk, speed: arch.speed,
      mark: false, shock: 0, burn: 0,
      shield: key === 'thornwall' ? 30 : 0,
      stunned: 0, sigCD: sig.startCD, sigMaxCD: sig.maxCD, sigName: sig.name,
      _dead: false,
    });
  });

  for (let i = 0; i < 3; i++) {
    units.push({
      id: `enemy_${i}`, type: 'enemy', archtype: 'goblin',
      name: `Goblin ${GOBLIN_LABELS[i]}`, pos: ENEMY_POS[i],
      hp: ENEMY_ARCHETYPE.hp, maxHp: ENEMY_ARCHETYPE.hp,
      atk: ENEMY_ARCHETYPE.atk, speed: ENEMY_ARCHETYPE.speed,
      mark: false, shock: 0, burn: 0, shield: 0, stunned: 0,
      sigCD: 0, sigMaxCD: 0, sigName: '', _dead: false,
    });
  }

  const terrain = {}; // pos → { type: 'burn', rounds: N }

  const alive      = type => units.filter(u => (!type || u.type === type) && u.hp > 0);
  const getThornwall = () => units.find(u => u.archtype === 'thornwall' && u.hp > 0);

  function defeat(unit, ts) {
    if (!unit._dead) {
      unit._dead = true;
      log(`  ${unit.name} eliminated.`);
      events.push({ type: 'defeat', unit: unit.id, unitName: unit.name, timestamp: ts });
    }
  }

  // ── Terrain tick ─────────────────────────────────────────
  function terrainTick(unit, ts) {
    const t = terrain[unit.pos];
    if (!t || t.rounds <= 0) return;
    const dmg = 12;
    unit.hp = Math.max(0, unit.hp - dmg);
    log(`  Terrain: ${unit.name} at pos ${unit.pos} — BURN zone (${t.rounds} round(s) remaining). ${dmg} BURN damage. HP: ${unit.hp}/${unit.maxHp}.`);
    events.push({ type: 'attack', actor: 'terrain', actorName: 'BURN Terrain', target: unit.id, targetName: unit.name, dmg, timestamp: ts });
    if (unit.hp === 0) defeat(unit, ts + 5);
  }

  // ── SHOCK chain propagation ───────────────────────────────
  function propagateShock(vex, firstTarget, ts) {
    const tw      = getThornwall();
    const shocked = new Set([firstTarget.id]);
    firstTarget.shock = 2;

    log(`SHOCK chain initiated. Vex (pos ${vex.pos}) → ${firstTarget.name} (pos ${firstTarget.pos}).`);
    log(`  ${firstTarget.name} SHOCKED (2 rounds). Chain depth: 1.`);
    events.push({ type: 'skill', actor: vex.id, target: firstTarget.id, actorName: 'Vex', targetName: firstTarget.name, skill: 'Cascade Init', effect: 'SHOCK +2', timestamp: ts });

    let current = firstTarget;
    for (let hop = 0; hop < 4; hop++) {
      const normal = alive('enemy').filter(t =>
        !shocked.has(t.id) && Math.abs(current.pos - t.pos) <= NORMAL_RANGE
      );
      const relay = (tw && tw.shield > 0)
        ? alive('enemy').filter(t =>
            !shocked.has(t.id) && !normal.includes(t) &&
            Math.abs(current.pos - t.pos) <= RELAY_RANGE
          )
        : [];

      if (!normal.length && !relay.length) {
        if (!tw)
          log(`  Chain from ${current.name} (pos ${current.pos}): no adjacent un-SHOCKED targets. No Thornwall in team — relay unavailable. Chain terminated.`);
        else if (!tw.shield)
          log(`  Chain from ${current.name} (pos ${current.pos}): no adjacent un-SHOCKED targets. Relay check: Thornwall SHIELD depleted (0 HP) — relay unavailable. Chain terminated.`);
        else
          log(`  Chain from ${current.name} (pos ${current.pos}): no un-SHOCKED targets within relay range. Chain terminated.`);
        break;
      }

      let next, viaRelay = false;
      if (normal.length) {
        next = normal[Math.floor(Math.random() * normal.length)];
        log(`  Chain hop: ${current.name} (pos ${current.pos}) → ${next.name} (pos ${next.pos}). Standard propagation.`);
      } else {
        next     = relay[Math.floor(Math.random() * relay.length)];
        viaRelay = true;
        log(`  Chain from ${current.name} (pos ${current.pos}): normal range exhausted. Relay check: Thornwall SHIELD active (${tw.shield} HP). Chain ROUTED THROUGH THORNWALL SHIELD → ${next.name} (pos ${next.pos}, dist ${Math.abs(current.pos - next.pos)} — beyond normal range). SHOCK amplified. Shield cost: -5 HP.`);
        tw.shield = Math.max(0, tw.shield - 5);
        events.push({ type: 'skill', actor: tw.id, actorName: 'Thornwall', target: next.id, targetName: next.name, skill: 'SHIELD Relay', effect: 'SHOCK chain relay', timestamp: ts + hop * 30 });
      }

      const dur = viaRelay ? 3 : 2;
      next.shock = Math.max(next.shock, dur);
      shocked.add(next.id);
      log(`  ${next.name} SHOCKED (${dur} rounds${viaRelay ? ', amplified via relay' : ''}). Chain depth: ${hop + 2}.`);
      events.push({ type: 'skill', actor: vex.id, target: next.id, actorName: 'Vex', targetName: next.name, skill: viaRelay ? 'SHOCK Chain (relay)' : 'SHOCK Chain', effect: `SHOCK +${dur}`, timestamp: ts + (hop + 1) * 30 });

      current = next;
    }
    log(`  SHOCK chain complete. ${shocked.size} unit(s) SHOCKED.`);
  }

  // ── Attack resolution ─────────────────────────────────────
  function resolveAttack(actor, target, base, ts) {
    let dmg = base;

    if (target.shock > 0) {
      const bonus = Math.floor(dmg * 0.15);
      log(`  Synergy: ${target.name} is SHOCKED — +${bonus} shock vulnerability bonus.`);
      dmg += bonus;
    }

    if (actor.archtype === 'nyx') {
      if (target.mark) {
        const det = Math.floor(dmg * 2);
        target.mark = false;
        log(`  MARK detonation: ${target.name} was MARKED. Nyx attack: ${det} damage (2× base ${dmg}). MARK cleared on detonation.`);
        events.push({ type: 'skill', actor: actor.id, target: target.id, actorName: 'Nyx', targetName: target.name, skill: 'Mark Detonation', effect: `${det} dmg (2x base)`, timestamp: ts });
        dmg = det;
      } else {
        log(`  MARK check: ${target.name} not marked. Standard Nyx attack (${dmg} dmg).`);
      }
    } else if (target.mark) {
      log(`  Synergy check: ${actor.name} attacks MARKED ${target.name}. Mark interaction: passive — only Nyx detonates marks.`);
    }

    const absorbed = Math.min(target.shield, dmg);
    const hpDmg   = Math.max(1, dmg - absorbed);
    if (absorbed > 0) {
      log(`  ${actor.name} → ${target.name}: ${dmg} total → ${absorbed} SHIELD absorbed → ${hpDmg} HP damage. ${target.name} SHIELD: ${target.shield} → ${target.shield - absorbed}.`);
      target.shield = Math.max(0, target.shield - absorbed);
    } else {
      log(`  ${actor.name} → ${target.name}: ${hpDmg} HP damage.`);
    }

    target.hp = Math.max(0, target.hp - hpDmg);
    return hpDmg;
  }

  // ── Solin Pulse Engine ────────────────────────────────────
  function pulseEngine(solin, ts) {
    const allies = alive('player').filter(u => u.id !== solin.id);
    log(`Solin — Pulse Engine evaluation:`);
    if (!allies.length) { log(`  No allies alive. No action.`); return; }

    [...allies].sort((a, b) => b.sigCD - a.sigCD).forEach(u =>
      log(`  ${u.name} (${u.sigName || '—'}): CD ${u.sigCD}/${u.sigMaxCD}${u.sigCD === 0 ? ' — ready' : ''}`)
    );

    const best = allies.filter(u => u.sigCD > 0).sort((a, b) => b.sigCD - a.sigCD)[0];
    if (!best) { log(`  All ally cooldowns at 0. No reduction needed.`); return; }

    const prev = best.sigCD;
    best.sigCD = Math.max(0, prev - 1);
    log(`  Highest cooldown: ${best.name} (${prev} → ${best.sigCD}). ${best.name} will act 1 round earlier.`);
    events.push({ type: 'skill', actor: solin.id, actorName: 'Solin', skill: 'Pulse Engine', effect: `${best.name} CD: ${prev}→${best.sigCD}`, timestamp: ts });
  }

  // ── Positional snapshot ───────────────────────────────────
  function logPositional(label) {
    log(`[Positional state — ${label}]`);
    alive().forEach(u => {
      const allies  = alive(u.type).filter(a => a.id !== u.id);
      const nearest = allies.sort((a, b) => Math.abs(u.pos - a.pos) - Math.abs(u.pos - b.pos))[0];
      const dist    = nearest ? Math.abs(u.pos - nearest.pos) : null;
      const s = [
        u.mark      ? 'MARKED'              : '',
        u.shock > 0 ? `SHOCKED:${u.shock}`  : '',
        u.burn  > 0 ? `BURNED:${u.burn}`    : '',
        u.shield > 0 ? `SHIELD:${u.shield}` : '',
      ].filter(Boolean).join(' ');
      log(`  ${u.name} pos:${u.pos} HP:${u.hp}/${u.maxHp}${s ? ` [${s}]` : ''}${nearest ? ` | nearest ally: ${nearest.name} (dist ${dist})${dist > SUPPORT_RADIUS ? ' — OUTSIDE support radius' : ''}` : ''}`);
    });
    Object.entries(terrain).filter(([, t]) => t.rounds > 0).forEach(([pos, t]) => {
      const occ = alive().find(u => u.pos === +pos);
      log(`  Terrain: BURN at pos ${pos} (${t.rounds} round(s) left)${occ ? ` — ${occ.name} occupying` : ''}`);
    });
  }

  // ── Main combat loop ──────────────────────────────────────
  for (let r = 0; r < maxRounds; r++) {
    round = r + 1;
    events.push({ type: 'round_start', round, timestamp: r * 350 });
    digest.push('', `══════════════════════════════`, `ROUND ${round}`, `══════════════════════════════`);
    logPositional('round start');

    const sigTs = r * 350 + 50;

    // ── Signature skill phase ──────────────────────────────
    for (const actor of alive('player').sort((a, b) => b.speed - a.speed)) {
      if (actor.sigCD > 0) {
        log(`${actor.name} — ${actor.sigName}: cooldown ${actor.sigCD} round(s). Skipped.`);
        continue;
      }

      if (actor.archtype === 'thornwall') {
        const prev = actor.shield;
        actor.shield = 30;
        actor.sigCD  = actor.sigMaxCD;
        log(`Thornwall — Fortress Field: SHIELD refreshed (${prev} → 30 HP).`);
        events.push({ type: 'skill', actor: actor.id, actorName: 'Thornwall', skill: 'Fortress Field', effect: 'SHIELD +30', timestamp: sigTs });

      } else if (actor.archtype === 'vex') {
        const enemies = alive('enemy');
        if (!enemies.length) { log(`Vex — Cascade Init: no targets. Skipped.`); continue; }
        actor.sigCD = actor.sigMaxCD;
        propagateShock(actor, enemies[Math.floor(Math.random() * enemies.length)], sigTs);

      } else if (actor.archtype === 'nyx') {
        const enemies = alive('enemy');
        if (!enemies.length) { log(`Nyx — Shadow Strike: no targets. Skipped.`); continue; }
        const unmarked = enemies.filter(e => !e.mark);
        const pool     = unmarked.length ? unmarked : enemies;
        const target   = pool[Math.floor(Math.random() * pool.length)];
        target.mark    = true;
        actor.sigCD    = actor.sigMaxCD;
        log(`Nyx — Shadow Strike: MARK applied to ${target.name} (pos ${target.pos}).${!unmarked.length ? ' (all targets already marked)' : ''}`);
        events.push({ type: 'skill', actor: actor.id, target: target.id, actorName: 'Nyx', targetName: target.name, skill: 'Shadow Strike', effect: 'MARK', timestamp: sigTs });

      } else if (actor.archtype === 'kael') {
        const enemies = alive('enemy');
        if (!enemies.length) { log(`Kael — Incendiary Grid: no targets. Skipped.`); continue; }
        const target = enemies[Math.floor(Math.random() * enemies.length)];
        const had    = terrain[target.pos];
        terrain[target.pos] = { type: 'burn', rounds: 3 };
        actor.sigCD = actor.sigMaxCD;
        log(`Kael — Incendiary Grid: BURN terrain deployed at pos ${target.pos} (3 rounds).${had ? ` (refreshed from ${had.rounds} remaining)` : ''} ${target.name} currently at that position.`);
        events.push({ type: 'skill', actor: actor.id, target: target.id, actorName: 'Kael', targetName: target.name, skill: 'Incendiary Grid', effect: `BURN zone pos ${target.pos}`, timestamp: sigTs });
        terrainTick(target, sigTs + 5);

      } else if (actor.archtype === 'solin') {
        pulseEngine(actor, sigTs);
      }
    }

    // ── Attack phase ───────────────────────────────────────
    const combatants = alive().filter(u => !u.stunned).sort((a, b) => b.speed - a.speed);
    log(`Attack phase — order: ${combatants.map(u => u.name).join(' → ')}`);

    combatants.forEach((actor, idx) => {
      if (actor.hp <= 0) return;
      const targets = alive(actor.type === 'player' ? 'enemy' : 'player');
      if (!targets.length) return;

      const target = targets[Math.floor(Math.random() * targets.length)];
      const base   = actor.atk + Math.floor(Math.random() * 6) - 2;
      const ts     = r * 350 + 100 + idx * 35;
      const hpDmg  = resolveAttack(actor, target, base, ts);

      events.push({ type: 'attack', actor: actor.id, actorName: actor.name, target: target.id, targetName: target.name, dmg: hpDmg, timestamp: ts });
      if (target.hp === 0) defeat(target, ts + 10);
    });

    // ── Terrain tick (end of round) ────────────────────────
    alive('enemy').forEach(u => terrainTick(u, r * 350 + 250));

    // ── Duration tick ──────────────────────────────────────
    units.forEach(u => {
      if (u.hp <= 0) return;
      if (u.shock > 0 && --u.shock === 0) log(`  ${u.name} SHOCK expired.`);
      if (u.burn  > 0 && --u.burn  === 0) log(`  ${u.name} BURN expired.`);
      u.stunned = Math.max(0, u.stunned - 1);
      if (u.sigCD > 0) u.sigCD--;
    });
    Object.entries(terrain).forEach(([pos, t]) => {
      if (--t.rounds <= 0) {
        log(`  Terrain: BURN zone at pos ${pos} expired.`);
        delete terrain[pos];
      }
    });

    // ── Win check ──────────────────────────────────────────
    if (!alive('player').length || !alive('enemy').length) {
      const winner = alive('player').length ? 'player' : 'enemy';
      log(`Battle ended R${round}. Winner: ${winner.toUpperCase()}. Survivors: ${alive().map(u => `${u.name}(${u.hp}HP)`).join(', ')}.`);
      events.push({ type: 'battle_end', winner, timestamp: (r + 1) * 350 });
      break;
    }
  }

  digest.push('', `══════════════════════════════`, `END OF BATTLE`, `══════════════════════════════`);
  return { events, finalUnits: units, digest };
}
