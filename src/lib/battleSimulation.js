// 8gents Battle Simulation Engine
// Deterministic combat pre-computation

const ARCHETYPES = {
  nyx: { name: 'Nyx', role: 'Predator', color: '#4f46e5', hp: 60, atk: 35, speed: 10 },
  thornwall: { name: 'Thornwall', role: 'Bastion', color: '#dc2626', hp: 180, atk: 10, speed: 6 },
  vex: { name: 'Vex', role: 'Conduit', color: '#2563eb', hp: 75, atk: 22, speed: 9 },
  solin: { name: 'Solin', role: 'Catalyst', color: '#059669', hp: 70, atk: 12, speed: 8 },
  kael: { name: 'Kael', role: 'Architect', color: '#dc2626', hp: 85, atk: 20, speed: 7 },
};

const ENEMY_ARCHETYPE = { name: 'Goblin', role: 'Enemy', color: '#7c2d12', hp: 60, atk: 12, speed: 7 };

// Signature skills (auto-fire each round)
const SIGNATURES = {
  nyx: { name: 'Shadow Strike', cooldown: 0, effect: 'Applies MARK to target' },
  thornwall: { name: 'Fortress Field', cooldown: 0, effect: 'Refreshes 30 HP SHIELD' },
  vex: { name: 'Cascade Initiation', cooldown: 0, effect: 'Applies SHOCK (2 rounds)' },
  solin: { name: 'Pulse Engine', cooldown: 0, effect: 'Reduces highest ally CD by 1' },
  kael: { name: 'Incendiary Grid', cooldown: 0, effect: 'Deploys BURN zone at target' },
};

export function simulateBattle(playerTeam, enemyTeam, maxRounds = 20) {
  const events = [];
  const units = [];
  let turnCounter = 0;

  // Initialize units
  playerTeam.forEach((archKey, i) => {
    const arch = ARCHETYPES[archKey];
    units.push({
      id: `player_${i}`,
      type: 'player',
      archtype: archKey,
      name: arch.name,
      pos: i,
      hp: arch.hp,
      maxHp: arch.hp,
      atk: arch.atk,
      speed: arch.speed,
      color: arch.color,
      mark: false,
      shock: 0,
      burn: 0,
      shield: archKey === 'thornwall' ? 30 : 0,
      stunned: 0,
    });
  });

  enemyTeam.forEach((_, i) => {
    units.push({
      id: `enemy_${i}`,
      type: 'enemy',
      name: ENEMY_ARCHETYPE.name,
      pos: 4 + i,
      hp: ENEMY_ARCHETYPE.hp,
      maxHp: ENEMY_ARCHETYPE.hp,
      atk: ENEMY_ARCHETYPE.atk,
      speed: ENEMY_ARCHETYPE.speed,
      color: ENEMY_ARCHETYPE.color,
      mark: false,
      shock: 0,
      burn: 0,
      shield: 0,
      stunned: 0,
    });
  });

  // Combat loop
  for (let round = 0; round < maxRounds; round++) {
    turnCounter++;
    events.push({
      type: 'round_start',
      round: turnCounter,
      timestamp: round * 350,
    });

    // Signature skills
    units.forEach(u => {
      if (u.hp > 0) {
        const sig = SIGNATURES[u.archtype];
        if (sig) {
          if (u.archtype === 'thornwall') {
            u.shield = 30;
            events.push({
              type: 'skill',
              actor: u.id,
              actorName: u.name,
              skill: sig.name,
              effect: 'SHIELD +30',
              timestamp: round * 350 + 50,
            });
          } else if (u.archtype === 'vex') {
            const targets = units.filter(t => t.type !== u.type && t.hp > 0);
            if (targets.length) {
              const target = targets[Math.floor(Math.random() * targets.length)];
              target.shock = Math.max(target.shock, 2);
              events.push({
                type: 'skill',
                actor: u.id,
                target: target.id,
                targetName: target.name,
                actorName: u.name,
                skill: sig.name,
                effect: 'SHOCK +2',
                timestamp: round * 350 + 50,
              });
            }
          } else if (u.archtype === 'kael') {
            const targets = units.filter(t => t.type !== u.type && t.hp > 0);
            if (targets.length) {
              const target = targets[Math.floor(Math.random() * targets.length)];
              target.burn = Math.max(target.burn, 2);
              events.push({
                type: 'skill',
                actor: u.id,
                target: target.id,
                targetName: target.name,
                actorName: u.name,
                skill: sig.name,
                effect: 'BURN +2',
                timestamp: round * 350 + 50,
              });
            }
          } else if (u.archtype === 'nyx') {
            const targets = units.filter(t => t.type !== u.type && t.hp > 0);
            if (targets.length) {
              const target = targets[Math.floor(Math.random() * targets.length)];
              target.mark = true;
              events.push({
                type: 'skill',
                actor: u.id,
                target: target.id,
                targetName: target.name,
                actorName: u.name,
                skill: sig.name,
                effect: 'MARK',
                timestamp: round * 350 + 50,
              });
            }
          }
        }
      }
    });

    // Normal attacks
    const combatants = units.filter(u => u.hp > 0 && u.stunned === 0).sort((a, b) => b.speed - a.speed);

    combatants.forEach((actor, idx) => {
      const targets = units.filter(t => t.type !== actor.type && t.hp > 0);
      if (targets.length) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        let dmg = actor.atk + Math.floor(Math.random() * 8);

        if (actor.mark) dmg = Math.floor(dmg * 1.5);
        if (target.burn > 0) dmg *= 1.1;

        const actualDmg = Math.max(1, dmg - Math.floor(Math.random() * 3));
        const shieldAbsorb = Math.min(target.shield, actualDmg);
        const hpDmg = actualDmg - shieldAbsorb;

        target.shield = Math.max(0, target.shield - shieldAbsorb);
        target.hp = Math.max(0, target.hp - hpDmg);

        events.push({
          type: 'attack',
          actor: actor.id,
          actorName: actor.name,
          target: target.id,
          targetName: target.name,
          dmg: actualDmg,
          timestamp: round * 350 + 100 + idx * 40,
        });

        if (target.hp === 0) {
          events.push({
            type: 'defeat',
            unit: target.id,
            unitName: target.name,
            timestamp: round * 350 + 120 + idx * 40,
          });
        }
      }
    });

    // Tick down durations
    units.forEach(u => {
      u.shock = Math.max(0, u.shock - 1);
      u.burn = Math.max(0, u.burn - 1);
      u.stunned = Math.max(0, u.stunned - 1);
    });

    // Check win condition
    const playersAlive = units.filter(u => u.type === 'player' && u.hp > 0).length;
    const enemiesAlive = units.filter(u => u.type === 'enemy' && u.hp > 0).length;

    if (playersAlive === 0 || enemiesAlive === 0) {
      const winner = playersAlive > 0 ? 'player' : 'enemy';
      events.push({
        type: 'battle_end',
        winner,
        timestamp: (round + 1) * 350,
      });
      break;
    }
  }

  return { events, finalUnits: units };
}
