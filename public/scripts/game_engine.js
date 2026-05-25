
/* =========================================
   TASTY TRAVELS — DRINK SHOOTER
   public/scripts/game_engine.js
   ========================================= */

// ── Canvas & Context ──────────────────────
const canvas   = document.getElementById('gameCanvas');
const ctx      = canvas.getContext('2d');
const nxtCvs   = document.getElementById('nextCanvas');
const nxtCtx   = nxtCvs.getContext('2d');
const curCvs   = document.getElementById('currentCanvas');
const curCtx   = curCvs.getContext('2d');

canvas.width  = 360;
canvas.height = 520;

// ── Background Image ──────────────────────
const bgImg = new Image();
bgImg.src = 'assets/beach_table_bg.png';   // ← public/assets/ qovluğunda olmalıdır

// ── Drink Types ───────────────────────────
const DRINKS = [
  { emoji: '🍹', c1: '#ff6b6b', c2: '#cc2222', name: 'Red' },
  { emoji: '🧋', c1: '#ffbb33', c2: '#cc7700', name: 'Orange' },
  { emoji: '🍵', c1: '#2ed573', c2: '#009933', name: 'Green' },
  { emoji: '🥤', c1: '#1e90ff', c2: '#0044cc', name: 'Blue' },
  { emoji: '🍷', c1: '#d980fa', c2: '#7700bb', name: 'Purple' },
  { emoji: '🥛', c1: '#f0f0f0', c2: '#aaaaaa', name: 'White' },
];
const MAX_TYPES = DRINKS.length;

// ── Grid Config ───────────────────────────
const R         = 22;           // içki yarıçapı
const COLS      = 7;
const CELL_W    = R * 2 + 2;
const CELL_H    = R * 1.85;
const GRID_TOP  = 52;           // HUD altından başlama (canvas koordinatı)
const GRID_LEFT = (canvas.width - COLS * CELL_W) / 2 + R;

// ── Shooter Config ────────────────────────
const SX    = canvas.width / 2;   // shooter X
const SY    = canvas.height - 30; // shooter Y (canvasın altı)
const SPEED = 10;

// ── Game State ────────────────────────────
let grid        = [];
let bullet      = null;
let curType     = 0;
let nxtType     = 0;
let coins       = 4200;
let score       = 0;
let level       = 1;
let soundOn     = true;
let aimX        = canvas.width / 2;
let aimY        = 100;
let particles   = [];
let scorePopups = [];
let isGameOver  = false;
let isLevelUp   = false;

// ── Web Audio (Səs) ───────────────────────
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playSound(type) {
  if (!soundOn) return;
  try {
    const ac = getAudioCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);

    if (type === 'shoot') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
      osc.start(); osc.stop(ac.currentTime + 0.12);

    } else if (type === 'pop') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(900, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.2);
      gain.gain.setValueAtTime(0.25, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
      osc.start(); osc.stop(ac.currentTime + 0.2);

    } else if (type === 'bounce') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ac.currentTime + 0.06);
      gain.gain.setValueAtTime(0.15, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
      osc.start(); osc.stop(ac.currentTime + 0.06);

    } else if (type === 'levelup') {
      // Xoş akkord: do-mi-sol
      [523, 659, 784].forEach((freq, i) => {
        const o2 = ac.createOscillator();
        const g2 = ac.createGain();
        o2.connect(g2); g2.connect(ac.destination);
        o2.type = 'sine';
        o2.frequency.value = freq;
        g2.gain.setValueAtTime(0, ac.currentTime + i * 0.1);
        g2.gain.linearRampToValueAtTime(0.25, ac.currentTime + i * 0.1 + 0.05);
        g2.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.1 + 0.4);
        o2.start(ac.currentTime + i * 0.1);
        o2.stop(ac.currentTime + i * 0.1 + 0.5);
      });
      return;

    } else if (type === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.5);
      gain.gain.setValueAtTime(0.3, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
      osc.start(); osc.stop(ac.currentTime + 0.5);
    }
  } catch(e) { /* audio failed silently */ }
}

// ── Random ────────────────────────────────
function rndType() {
  const active = Math.min(level + 2, MAX_TYPES);
  return Math.floor(Math.random() * active);
}

// ── Grid Helpers ──────────────────────────
function cellX(r, c) {
  const off = (r % 2 !== 0) ? R + 1 : 0;
  return GRID_LEFT + c * CELL_W + off;
}
function cellY(r) { return GRID_TOP + r * CELL_H; }

function colsInRow(r) { return (r % 2 === 0) ? COLS : COLS - 1; }

function getCell(r, c) {
  if (r < 0 || r >= grid.length) return undefined;
  if (c < 0 || c >= grid[r].length) return undefined;
  return grid[r][c];
}

function neighbors(r, c) {
  const odd = r % 2 !== 0;
  return [
    [r,   c - 1], [r,   c + 1],
    [r-1, c],     [r-1, c + (odd ? 1 : -1)],
    [r+1, c],     [r+1, c + (odd ? 1 : -1)],
  ].filter(([nr, nc]) => {
    if (nr < 0 || nr >= grid.length) return false;
    if (nc < 0 || nc >= colsInRow(nr)) return false;
    return true;
  });
}

function initGrid(rows) {
  grid = [];
  const active = Math.min(level + 2, MAX_TYPES);
  for (let r = 0; r < rows; r++) {
    const cols = colsInRow(r);
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = { type: Math.floor(Math.random() * active) };
    }
  }
}

function ensureRow(r) {
  while (grid.length <= r) {
    const nr = grid.length;
    grid.push(new Array(colsInRow(nr)).fill(null));
  }
}

// ── Nearest Empty Cell ────────────────────
function nearestEmpty(bx, by) {
  let best = null, bestD = Infinity;
  const maxR = grid.length + 1;
  for (let r = 0; r < maxR; r++) {
    const cols = colsInRow(r);
    for (let c = 0; c < cols; c++) {
      if (r < grid.length && grid[r][c]) continue;
      const cx = cellX(r, c), cy = cellY(r);
      // must be adjacent to something (or row 0)
      let adj = (r === 0);
      if (!adj) {
        const odd = r % 2 !== 0;
        const nbrs = [
          [r, c-1],[r, c+1],
          [r-1, c],[r-1, c+(odd?1:-1)],
        ];
        for (const [nr2, nc2] of nbrs) {
          const cell = getCell(nr2, nc2);
          if (cell) { adj = true; break; }
        }
      }
      if (!adj) continue;
      const d = Math.hypot(bx - cx, by - cy);
      if (d < bestD) { bestD = d; best = {r, c}; }
    }
  }
  return best;
}

// ── Shoot ─────────────────────────────────
function shoot(angle) {
  if (bullet) return;
  playSound('shoot');
  bullet = {
    x: SX, y: SY,
    vx: Math.cos(angle) * SPEED,
    vy: Math.sin(angle) * SPEED,
    type: curType,
    trail: []
  };
  curType = nxtType;
  nxtType = rndType();
  drawMiniDrink(curCtx, curCvs.width/2, curCvs.height/2, curType, 28);
  drawMiniDrink(nxtCtx, nxtCvs.width/2, nxtCvs.height/2, nxtType, 20);
}

// ── Update Bullet ─────────────────────────
const WALL_L = 20, WALL_R = canvas.width - 20;

function updateBullet() {
  if (!bullet) return;

  bullet.trail.unshift({ x: bullet.x, y: bullet.y });
  if (bullet.trail.length > 10) bullet.trail.pop();

  bullet.x += bullet.vx;
  bullet.y += bullet.vy;

  // Wall bounce
  if (bullet.x - R < WALL_L) {
    bullet.x = WALL_L + R; bullet.vx = Math.abs(bullet.vx);
    playSound('bounce');
  }
  if (bullet.x + R > WALL_R) {
    bullet.x = WALL_R - R; bullet.vx = -Math.abs(bullet.vx);
    playSound('bounce');
  }

  // Collision with grid cells
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (!grid[r][c]) continue;
      if (Math.hypot(bullet.x - cellX(r,c), bullet.y - cellY(r)) < R * 1.82) {
        snapBullet(); return;
      }
    }
  }

  // Hit top ceiling
  if (bullet.y - R <= GRID_TOP) { snapBullet(); return; }

  // Lost
  if (bullet.y > canvas.height + 40) bullet = null;
}

function snapBullet() {
  if (!bullet) return;
  const cell = nearestEmpty(bullet.x, bullet.y);
  if (!cell) { bullet = null; return; }
  ensureRow(cell.r);
  grid[cell.r][cell.c] = { type: bullet.type };
  bullet = null;
  checkMatches(cell.r, cell.c);
}

// ── BFS Match ─────────────────────────────
function bfsConnected(r, c, type) {
  const visited = new Set();
  const stack = [[r, c]];
  const found = [];
  while (stack.length) {
    const [cr, cc] = stack.pop();
    const key = cr + ',' + cc;
    if (visited.has(key)) continue;
    visited.add(key);
    const cell = getCell(cr, cc);
    if (!cell || cell.type !== type) continue;
    found.push([cr, cc]);
    for (const n of neighbors(cr, cc)) stack.push(n);
  }
  return found;
}

function checkMatches(r, c) {
  if (!getCell(r, c)) return;
  const type = grid[r][c].type;
  const connected = bfsConnected(r, c, type);
  if (connected.length >= 3) {
    for (const [pr, pc] of connected) {
      spawnParticles(cellX(pr,pc), cellY(pr), type, 10);
      grid[pr][pc] = null;
    }
    const pts = connected.length * 50;
    coins += pts; score += pts;
    addScorePopup(cellX(r,c), cellY(r), '+' + pts);
    playSound('pop');
    updateHUD();
    setTimeout(dropFloating, 180);
    checkLevelUp();
  }
}

function dropFloating() {
  const visited = new Set();
  const stack = [];
  if (grid[0]) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[0][c]) stack.push([0, c]);
    }
  }
  while (stack.length) {
    const [r, c] = stack.pop();
    const key = r + ',' + c;
    if (visited.has(key)) continue;
    visited.add(key);
    if (!getCell(r, c)) continue;
    for (const n of neighbors(r, c)) stack.push(n);
  }
  for (let r = 1; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] && !visited.has(r + ',' + c)) {
        spawnParticles(cellX(r,c), cellY(r), grid[r][c].type, 6);
        coins += 20; score += 20;
        grid[r][c] = null;
      }
    }
  }
  updateHUD();
}

// ── Level Up ──────────────────────────────
function checkLevelUp() {
  let total = 0;
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[r].length; c++)
      if (grid[r][c]) total++;

  if (total === 0) {
    isLevelUp = true;
    level++;
    playSound('levelup');
    document.getElementById('levelUpText').textContent = 'Səviyyə ' + level;
    document.getElementById('overlayLevelUp').classList.remove('hidden');
  }
}

function nextLevel() {
  isLevelUp = false;
  document.getElementById('overlayLevelUp').classList.add('hidden');
  initGrid(4 + level);
  updateHUD();
}

// ── Game Over ─────────────────────────────
function checkGameOver() {
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[r].length; c++)
      if (grid[r][c] && cellY(r) >= SY - 40) return true;
  return false;
}

function triggerGameOver() {
  isGameOver = true;
  playSound('gameover');
  document.getElementById('finalScore').textContent = score;
  document.getElementById('finalCoins').textContent = coins;
  document.getElementById('overlayGameOver').classList.remove('hidden');
}

function restartGame() {
  isGameOver = false; isLevelUp = false;
  level = 1; score = 0; coins = 4200;
  bullet = null; particles = []; scorePopups = [];
  curType = rndType(); nxtType = rndType();
  document.getElementById('overlayGameOver').classList.add('hidden');
  initGrid(5);
  updateHUD();
  drawMiniDrink(curCtx, curCvs.width/2, curCvs.height/2, curType, 28);
  drawMiniDrink(nxtCtx, nxtCvs.width/2, nxtCvs.height/2, nxtType, 20);
}
window.restartGame = restartGame;
window.nextLevel   = nextLevel;

// ── HUD Update ────────────────────────────
function updateHUD() {
  document.getElementById('coinDisplay').textContent  = '🪙 ' + coins.toLocaleString();
  document.getElementById('scoreDisplay').textContent = score.toLocaleString() + ' XP';
  document.getElementById('levelDisplay').textContent = 'LV ' + level;
}

// ── Particles ─────────────────────────────
function spawnParticles(x, y, type, count) {
  const d = DRINKS[type % MAX_TYPES];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 2 + Math.random() * 5;
    particles.push({
      x, y,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 1,
      life: 1, decay: 0.03 + Math.random() * 0.02,
      r: 3 + Math.random() * 5,
      color: d.c1
    });
  }
}
function updateParticles() {
  particles = particles.filter(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.2;
    p.life -= p.decay;
    return p.life > 0;
  });
}

// ── Score Popups ──────────────────────────
function addScorePopup(x, y, text) {
  scorePopups.push({ x, y, text, life: 1 });
}
function updateScorePopups() {
  scorePopups = scorePopups.filter(p => {
    p.y -= 1.2; p.life -= 0.025;
    return p.life > 0;
  });
}

// ── Draw Helpers ──────────────────────────
function drawDrink(context, x, y, type, radius) {
  radius = radius || R;
  const d = DRINKS[type % MAX_TYPES];
  context.save();

  // Shadow
  context.beginPath();
  context.ellipse(x, y + radius * 0.8, radius * 0.65, 5, 0, 0, Math.PI * 2);
  context.fillStyle = 'rgba(0,0,0,0.22)';
  context.fill();

  // Body gradient
  const g = context.createRadialGradient(x - radius*0.3, y - radius*0.3, 1, x, y, radius);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, d.c1);
  g.addColorStop(1, d.c2);
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = g;
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.6)';
  context.lineWidth = 1.5;
  context.stroke();

  // Shine
  context.beginPath();
  context.arc(x - radius*0.28, y - radius*0.28, radius * 0.22, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255,255,255,0.38)';
  context.fill();

  // Emoji
  context.font = `${radius * 0.95}px Arial`;
  context.textAlign    = 'center';
  context.textBaseline = 'middle';
  context.fillText(d.emoji, x, y + 1);

  context.restore();
}

function drawMiniDrink(context, x, y, type, radius) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  drawDrink(context, x, y, type, radius);
}

// ── Aim Line ──────────────────────────────
function drawAimLine(toX, toY) {
  const dx = toX - SX, dy = toY - SY;
  if (dy >= -20) return;
  const len = Math.hypot(dx, dy);
  let vx = dx / len, vy = dy / len;
  let x = SX, y = SY;

  ctx.save();
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);

  let bounces = 0;
  while (y > GRID_TOP && bounces < 4) {
    x += vx * 3; y += vy * 3;
    if (x - R < WALL_L) { x = WALL_L + R; vx = Math.abs(vx); bounces++; }
    if (x + R > WALL_R) { x = WALL_R - R; vx = -Math.abs(vx); bounces++; }
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Endpoint dot
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  ctx.restore();
}

// ── Draw Danger Line ──────────────────────
function drawDangerLine() {
  const dy = SY - 50;
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = 'rgba(255, 60, 60, 0.5)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(WALL_L, dy);
  ctx.lineTo(WALL_R, dy);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,60,60,0.7)';
  ctx.font = '11px Arial';
  ctx.textAlign = 'right';
  ctx.fillText('⚠ Təhlükə', WALL_R, dy - 4);
  ctx.restore();
}

// ── Main Draw ─────────────────────────────
function draw() {
  // Background
  if (bgImg.complete && bgImg.naturalWidth > 0) {
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#87CEEB');
    bg.addColorStop(0.55, '#DEB887');
    bg.addColorStop(1, '#7a4520');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Slight overlay on play area
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(0, GRID_TOP, canvas.width, SY - GRID_TOP);

  // Grid drinks
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c]) {
        drawDrink(ctx, cellX(r, c), cellY(r), grid[r][c].type);
      }
    }
  }

  // Danger line
  drawDangerLine();

  // Bullet trail
  if (bullet) {
    bullet.trail.forEach((p, i) => {
      const a = (i / bullet.trail.length) * 0.3;
      drawDrink(ctx, p.x, p.y, bullet.type, R * 0.5);
      ctx.globalAlpha = a;
    });
    ctx.globalAlpha = 1;
    drawDrink(ctx, bullet.x, bullet.y, bullet.type);
  }

  // Aim line
  if (!bullet && !isGameOver && !isLevelUp) {
    drawAimLine(aimX, aimY);
  }

  // Particles
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  }

  // Score popups
  for (const p of scorePopups) {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = '#FFD700';
    ctx.font        = 'bold 18px Arial';
    ctx.textAlign   = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur  = 4;
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  }
}

// ── Game Loop ─────────────────────────────
function loop() {
  if (!isGameOver && !isLevelUp) {
    updateBullet();
    updateParticles();
    updateScorePopups();
    if (checkGameOver()) { triggerGameOver(); }
  }
  draw();
  requestAnimationFrame(loop);
}

// ── Events ────────────────────────────────
function getPos(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width  / rect.width;
  const sy = canvas.height / rect.height;
  return [(clientX - rect.left) * sx, (clientY - rect.top) * sy];
}

canvas.addEventListener('mousemove', e => {
  [aimX, aimY] = getPos(e.clientX, e.clientY);
});

canvas.addEventListener('click', e => {
  if (isGameOver || isLevelUp) return;
  const [cx, cy] = getPos(e.clientX, e.clientY);
  const dx = cx - SX, dy = cy - SY;
  if (dy < -20) shoot(Math.atan2(dy, dx));
});

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const t = e.touches[0];
  [aimX, aimY] = getPos(t.clientX, t.clientY);
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  if (isGameOver || isLevelUp) return;
  const t = e.changedTouches[0];
  const [cx, cy] = getPos(t.clientX, t.clientY);
  const dx = cx - SX, dy = cy - SY;
  if (dy < -20) shoot(Math.atan2(dy, dx));
}, { passive: false });

// Sound toggle button
document.getElementById('btnSound').addEventListener('click', () => {
  soundOn = !soundOn;
  document.getElementById('btnSound').textContent = soundOn ? '🔊' : '🔇';
});

// Reset button
document.getElementById('btnReset').addEventListener('click', restartGame);

// ── Init ──────────────────────────────────
curType = rndType();
nxtType = rndType();
initGrid(5);
updateHUD();
drawMiniDrink(curCtx, curCvs.width/2,  curCvs.height/2,  curType, 28);
drawMiniDrink(nxtCtx, nxtCvs.width/2,  nxtCvs.height/2,  nxtType, 20);
loop();
