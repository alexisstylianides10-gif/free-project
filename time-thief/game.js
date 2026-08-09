(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const hpFill = document.getElementById('hpFill');
  const bankFill = document.getElementById('bankFill');
  const bankText = document.getElementById('bankText');
  const scoreEl = document.getElementById('score');
  const waveEl = document.getElementById('wave');
  const burstBtn = document.getElementById('burstBtn');
  const startScreen = document.getElementById('startScreen');
  const startBtn = document.getElementById('startBtn');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const finalScoreEl = document.getElementById('finalScore');
  const restartBtn = document.getElementById('restartBtn');

  // ---- Config ----
  const BANK_MAX = 15;           // limited stolen-time reserve, in seconds
  const STEAL_RATE = 2;          // seconds of "time" stolen per real second held
  const STEAL_RADIUS = 90;       // px, how close the pointer must be to a target
  const ROCK_THRESHOLD = 5;      // seconds to freeze+shatter a rock (per spec)
  const ENEMY_THRESHOLD = 8;     // seconds to fully capture an enemy
  const BURST_SECONDS_PER_BANK = 1.4; // freeze duration multiplier from spent bank
  const VAULT_MAX_HP = 100;
  const ROCK_DAMAGE = 10;
  const ENEMY_DAMAGE = 14;

  let W = 0, H = 0, groundY = 0, vaultX = 0, vaultY = 0;

  function resize() {
    W = canvas.width = canvas.clientWidth * devicePixelRatio;
    H = canvas.height = canvas.clientHeight * devicePixelRatio;
    groundY = H - 70 * devicePixelRatio;
    vaultX = W / 2;
    vaultY = groundY;
  }
  window.addEventListener('resize', resize);

  // ---- State ----
  let state;
  function freshState() {
    return {
      running: false,
      time: 0,
      bank: 0,
      vaultHP: VAULT_MAX_HP,
      score: 0,
      wave: 1,
      objects: [],
      particles: [],
      shake: 0,
      burstTimer: 0,     // remaining seconds all objects stay frozen from burst
      spawnRockAt: 1.2,
      spawnEnemyAt: 4,
      pointer: { x: -9999, y: -9999, down: false },
    };
  }

  function resetGame() {
    state = freshState();
    resize();
  }

  // ---- Entities ----
  function spawnRock() {
    const r = 16 + Math.random() * 12;
    const speed = (40 + state.wave * 6 + Math.random() * 30) * devicePixelRatio;
    state.objects.push({
      type: 'rock',
      x: r + Math.random() * (W - 2 * r),
      y: -r,
      vy: speed,
      radius: r * devicePixelRatio,
      stolen: 0,
      threshold: ROCK_THRESHOLD,
      neutralized: false,
      dead: false,
    });
  }

  function spawnEnemy() {
    const fromLeft = Math.random() < 0.5;
    const r = 16 * devicePixelRatio;
    const speed = (30 + state.wave * 5 + Math.random() * 18) * devicePixelRatio;
    state.objects.push({
      type: 'enemy',
      x: fromLeft ? -r : W + r,
      y: groundY - r,
      dir: fromLeft ? 1 : -1,
      baseSpeed: speed,
      radius: r,
      stolen: 0,
      threshold: ENEMY_THRESHOLD,
      neutralized: false,
      dead: false,
    });
  }

  function addParticle(x, y, text, color) {
    state.particles.push({ x, y, text, color, life: 1, vy: -40 * devicePixelRatio });
  }

  // ---- Update ----
  function update(dt) {
    if (!state.running) return;
    state.time += dt;

    // difficulty ramp
    state.wave = 1 + Math.floor(state.time / 20);

    state.spawnRockAt -= dt;
    if (state.spawnRockAt <= 0) {
      spawnRock();
      state.spawnRockAt = Math.max(0.45, 1.3 - state.wave * 0.06) + Math.random() * 0.4;
    }
    state.spawnEnemyAt -= dt;
    if (state.spawnEnemyAt <= 0) {
      spawnEnemy();
      state.spawnEnemyAt = Math.max(1.6, 4.2 - state.wave * 0.2) + Math.random() * 1.2;
    }

    if (state.burstTimer > 0) state.burstTimer -= dt;
    const globalFrozen = state.burstTimer > 0;

    // find single nearest stealable target within radius
    let target = null;
    if (state.pointer.down) {
      let best = Infinity;
      for (const o of state.objects) {
        if (o.dead || o.neutralized) continue;
        const dx = o.x - state.pointer.x;
        const dy = o.y - state.pointer.y;
        const d = Math.hypot(dx, dy);
        if (d <= STEAL_RADIUS * devicePixelRatio && d < best) {
          best = d;
          target = o;
        }
      }
    }
    if (target && state.bank < BANK_MAX) {
      const steal = Math.min(STEAL_RATE * dt, BANK_MAX - state.bank);
      target.stolen += steal;
      state.bank += steal;
      if (Math.random() < 0.3) {
        addParticle(target.x, target.y - target.radius, `+${steal.toFixed(1)}s`, '#7c6bff');
      }
    }

    for (const o of state.objects) {
      if (o.dead || o.neutralized) continue;

      const speedFactor = globalFrozen ? 0 : Math.max(0.08, 1 - (o.stolen / o.threshold) * 0.92);

      if (o.type === 'rock') {
        o.y += o.vy * speedFactor * dt;
        if (o.stolen >= o.threshold) {
          o.neutralized = true;
          state.score += 15;
          addParticle(o.x, o.y, 'Frozen! +15', '#4fd3ff');
        } else if (o.y >= groundY - o.radius) {
          o.dead = true;
          state.vaultHP -= ROCK_DAMAGE;
          state.shake = 8;
          addParticle(o.x, groundY, 'Smash!', '#ff5e7a');
        }
      } else if (o.type === 'enemy') {
        o.x += o.baseSpeed * o.dir * speedFactor * dt;
        if (o.stolen >= o.threshold) {
          o.neutralized = true;
          state.score += 25;
          addParticle(o.x, o.y - o.radius, 'Captured! +25', '#4fd3ff');
        } else if (Math.abs(o.x - vaultX) <= o.radius + 18 * devicePixelRatio) {
          o.dead = true;
          state.vaultHP -= ENEMY_DAMAGE;
          state.shake = 10;
          addParticle(o.x, o.y, 'Breach!', '#ff5e7a');
        }
      }
    }

    state.objects = state.objects.filter(o => !o.dead && !(o.neutralized && objectSettled(o)));

    for (const p of state.particles) {
      p.y += p.vy * dt;
      p.life -= dt * 1.1;
    }
    state.particles = state.particles.filter(p => p.life > 0);

    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);

    if (state.vaultHP <= 0) {
      state.vaultHP = 0;
      endGame();
    }

    updateHUD();
  }

  function objectSettled() {
    // neutralized objects are removed immediately after their score particle spawns
    return true;
  }

  function updateHUD() {
    hpFill.style.width = `${Math.max(0, (state.vaultHP / VAULT_MAX_HP) * 100)}%`;
    bankFill.style.width = `${(state.bank / BANK_MAX) * 100}%`;
    bankText.textContent = `${state.bank.toFixed(1)}s`;
    scoreEl.textContent = state.score;
    waveEl.textContent = state.wave;
    burstBtn.disabled = state.bank <= 0.05;
  }

  // ---- Draw ----
  function draw() {
    ctx.clearRect(0, 0, W, H);

    let ox = 0, oy = 0;
    if (state.shake > 0) {
      ox = (Math.random() - 0.5) * state.shake * devicePixelRatio;
      oy = (Math.random() - 0.5) * state.shake * devicePixelRatio;
    }
    ctx.save();
    ctx.translate(ox, oy);

    // ground
    ctx.fillStyle = '#0d1224';
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.strokeStyle = 'rgba(124,107,255,0.35)';
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    // vault
    const vaultPulse = 1 + Math.sin(state.time * 3) * 0.03;
    ctx.save();
    ctx.translate(vaultX, vaultY);
    ctx.scale(vaultPulse, vaultPulse);
    ctx.font = `${44 * devicePixelRatio}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('🏰', 0, 6 * devicePixelRatio);
    ctx.restore();

    // burst global freeze overlay
    if (state.burstTimer > 0) {
      ctx.fillStyle = `rgba(79,211,255,${0.08 + 0.05 * Math.sin(state.time * 10)})`;
      ctx.fillRect(0, 0, W, H);
    }

    // steal beam
    if (state.pointer.down) {
      let target = null, best = Infinity;
      for (const o of state.objects) {
        if (o.neutralized || o.dead) continue;
        const d = Math.hypot(o.x - state.pointer.x, o.y - state.pointer.y);
        if (d <= STEAL_RADIUS * devicePixelRatio && d < best) { best = d; target = o; }
      }
      ctx.beginPath();
      ctx.arc(state.pointer.x, state.pointer.y, STEAL_RADIUS * devicePixelRatio, 0, Math.PI * 2);
      ctx.strokeStyle = target ? 'rgba(124,107,255,0.7)' : 'rgba(124,107,255,0.25)';
      ctx.lineWidth = 2 * devicePixelRatio;
      ctx.stroke();
      if (target) {
        ctx.beginPath();
        ctx.moveTo(state.pointer.x, state.pointer.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = '#7c6bff';
        ctx.lineWidth = 3 * devicePixelRatio;
        ctx.stroke();
      }
    }

    // objects
    for (const o of state.objects) {
      const frac = Math.min(1, o.stolen / o.threshold);
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.font = `${o.radius * 2.3}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(o.type === 'rock' ? '🪨' : '👹', 0, 0);
      if (frac > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, o.radius + 8 * devicePixelRatio, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
        ctx.strokeStyle = o.type === 'rock' ? '#4fd3ff' : '#7c6bff';
        ctx.lineWidth = 3 * devicePixelRatio;
        ctx.stroke();
      }
      ctx.restore();
    }

    // particles
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.font = `${13 * devicePixelRatio}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // ---- Burst ability ----
  function tryBurst() {
    if (!state.running || state.bank <= 0.05) return;
    state.burstTimer = state.bank * BURST_SECONDS_PER_BANK;
    state.bank = 0;
    updateHUD();
  }

  // ---- Game flow ----
  function endGame() {
    state.running = false;
    finalScoreEl.textContent = state.score;
    gameOverScreen.classList.remove('hidden');
  }

  function startGame() {
    resetGame();
    state.running = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
  }

  // ---- Input ----
  function pointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * devicePixelRatio,
      y: (clientY - rect.top) * devicePixelRatio,
    };
  }

  function onDown(e) {
    e.preventDefault();
    const p = pointerPos(e);
    state.pointer.x = p.x;
    state.pointer.y = p.y;
    state.pointer.down = true;
  }
  function onMove(e) {
    const p = pointerPos(e);
    state.pointer.x = p.x;
    state.pointer.y = p.y;
  }
  function onUp(e) {
    state.pointer.down = false;
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  canvas.addEventListener('touchstart', onDown, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onUp);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      tryBurst();
    }
  });
  burstBtn.addEventListener('click', tryBurst);
  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);

  // ---- Loop ----
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  resetGame();
  resize();
  requestAnimationFrame(frame);
})();
