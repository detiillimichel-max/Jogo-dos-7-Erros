/* ============================================
   JOGO DOS 7 ERROS — app.js
   Geração procedural de puzzles via Canvas
   ============================================ */

'use strict';

// ─── REGISTRO SERVICE WORKER ───────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(r => console.log('[SW] Registrado:', r.scope))
      .catch(e => console.warn('[SW] Falha:', e));
  });
}

// ─── ESTADO GLOBAL ─────────────────────────────────────────────────────────
const STATE = {
  level:      1,
  score:      0,
  found:      0,
  hintsLeft:  3,
  totalTime:  120,
  timeLeft:   120,
  timerID:    null,
  errors:     [],   // [{cx, cy, r, type, found}]
  startTime:  null,
};

// ─── PALETA DE CENAS POR FASE ───────────────────────────────────────────────
const SCENES = [
  { bg: '#0d1b2a', name: 'Espaço Sideral',  palette: ['#00f5ff','#ff6b00','#ffe600','#ff2d78'] },
  { bg: '#1a0d00', name: 'Floresta Noturna', palette: ['#00ff88','#ffaa00','#ff4444','#aa88ff'] },
  { bg: '#0a001a', name: 'Cidade Neon',      palette: ['#ff2d78','#00f5ff','#ffe600','#00ff88'] },
  { bg: '#001a0d', name: 'Fundo do Mar',     palette: ['#00aaff','#00ff88','#ffee00','#ff6644'] },
  { bg: '#1a0a00', name: 'Vulcão',           palette: ['#ff4400','#ffaa00','#ff0044','#ffee00'] },
];

// ─── DOM REFS ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const splash      = $('splash');
const gameScreen  = $('game-screen');
const canvasL     = $('canvas-left');
const canvasR     = $('canvas-right');
const ctxL        = canvasL.getContext('2d');
const ctxR        = canvasR.getContext('2d');
const hudDots     = $('hud-dots');
const hudTimer    = $('hud-timer');
const hudLevelNum = $('hud-level-num');
const foundBadge  = $('found-badge');
const scoreVal    = $('score-val');
const hintCount   = $('hint-count');
const toast       = $('toast');

// ─── CANVAS SIZE ────────────────────────────────────────────────────────────
const CW = 320;
const CH = 260;

// ─── UTILITÁRIOS ────────────────────────────────────────────────────────────
const rand    = (a, b) => Math.random() * (b - a) + a;
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick    = arr  => arr[randInt(0, arr.length - 1)];
const clamp   = (v, a, b) => Math.max(a, Math.min(b, v));

function showToast(msg, duration = 1800) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, duration);
}

// ─── GERAÇÃO DE CENAS ───────────────────────────────────────────────────────
function drawScene(ctx, scene, seed) {
  const r = mulberry32(seed);

  ctx.fillStyle = scene.bg;
  ctx.fillRect(0, 0, CW, CH);

  // Stars / partículas
  for (let i = 0; i < 60; i++) {
    const x = r() * CW, y = r() * CH;
    const s = r() * 2 + 0.5;
    ctx.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Formas geométricas (objetos da cena)
  const shapes = 14 + STATE.level * 2;
  for (let i = 0; i < shapes; i++) {
    const x   = r() * CW;
    const y   = r() * CH;
    const sz  = r() * 28 + 10;
    const col = scene.palette[Math.floor(r() * scene.palette.length)];
    const type = Math.floor(r() * 4);

    ctx.save();
    ctx.globalAlpha = 0.5 + r() * 0.5;
    ctx.fillStyle   = col;
    ctx.strokeStyle = col;
    ctx.lineWidth   = 2;
    ctx.shadowColor = col;
    ctx.shadowBlur  = 8;

    if (type === 0) {
      ctx.beginPath();
      ctx.arc(x, y, sz / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 1) {
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    } else if (type === 2) {
      ctx.beginPath();
      ctx.moveTo(x, y - sz / 2);
      ctx.lineTo(x + sz / 2, y + sz / 2);
      ctx.lineTo(x - sz / 2, y + sz / 2);
      ctx.closePath();
      ctx.fill();
    } else {
      // Cruz / estrela
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - sz / 2, y); ctx.lineTo(x + sz / 2, y);
      ctx.moveTo(x, y - sz / 2); ctx.lineTo(x, y + sz / 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Grade de linhas neon decorativas
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = scene.palette[0];
  ctx.lineWidth = 1;
  for (let x = 0; x < CW; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
  }
  for (let y = 0; y < CH; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
  }
  ctx.restore();
}

// Gerador pseudoaleatório determinístico (Mulberry32)
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ─── ERROS (DIFERENÇAS) ─────────────────────────────────────────────────────
function generateErrors(scene, seed) {
  const r = mulberry32(seed + 9999);
  const errors = [];
  const margin = 40;
  const types  = ['missing', 'color', 'size', 'shape', 'moved'];

  // Garante 7 erros sem sobreposição excessiva
  const attempts = 200;
  let placed = 0;
  for (let i = 0; i < attempts && placed < 7; i++) {
    const cx   = rand(margin, CW - margin);
    const cy   = rand(margin, CH - margin);
    const radius = rand(18, 28);
    // Verifica sobreposição
    const overlap = errors.some(e =>
      Math.hypot(e.cx - cx, e.cy - cy) < (e.r + radius + 10)
    );
    if (!overlap) {
      errors.push({ cx, cy, r: radius, type: pick(types), found: false, col: pick(scene.palette) });
      placed++;
    }
  }
  return errors;
}

// Aplica as diferenças no canvas direito
function applyErrors(ctx, errors) {
  errors.forEach((err, idx) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(err.cx, err.cy, err.r, 0, Math.PI * 2);
    ctx.clip();

    switch (err.type) {
      case 'missing':
        // Apaga o elemento (preenche com cor de fundo)
        ctx.fillStyle = SCENES[(STATE.level - 1) % SCENES.length].bg;
        ctx.fillRect(err.cx - err.r, err.cy - err.r, err.r * 2, err.r * 2);
        break;
      case 'color':
        ctx.globalCompositeOperation = 'hue';
        ctx.fillStyle = err.col;
        ctx.fillRect(err.cx - err.r, err.cy - err.r, err.r * 2, err.r * 2);
        break;
      case 'size':
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = err.col;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(err.cx, err.cy, err.r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'shape':
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = err.col;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(err.cx - err.r * 0.7, err.cy - err.r * 0.7, err.r * 1.4, err.r * 1.4);
        break;
      case 'moved':
        // Desloca levemente a imagem dentro do círculo
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = err.col;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(err.cx + err.r * 0.4, err.cy - err.r * 0.3, err.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();

    // Borda sutil para garantir visibilidade mínima durante dev
    // (remover se quiser mais desafio)
    if (false) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(err.cx, err.cy, err.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  });
}

// ─── UI DE PONTOS ───────────────────────────────────────────────────────────
function buildDots() {
  hudDots.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const d = document.createElement('div');
    d.className = 'dot';
    d.id = `dot-${i}`;
    hudDots.appendChild(d);
  }
}

function markDot(idx) {
  const d = $(`dot-${idx}`);
  if (d) d.classList.add('found');
}

// ─── TIMER ──────────────────────────────────────────────────────────────────
function startTimer() {
  clearInterval(STATE.timerID);
  STATE.timeLeft = STATE.totalTime;
  renderTimer();

  STATE.timerID = setInterval(() => {
    STATE.timeLeft--;
    renderTimer();
    if (STATE.timeLeft <= 20) hudTimer.classList.add('urgent');
    if (STATE.timeLeft <= 0) {
      clearInterval(STATE.timerID);
      loseGame();
    }
  }, 1000);
}

function renderTimer() {
  const m = Math.floor(STATE.timeLeft / 60).toString().padStart(2, '0');
  const s = (STATE.timeLeft % 60).toString().padStart(2, '0');
  hudTimer.textContent = `${m}:${s}`;
}

// ─── CANVAS SIZING ──────────────────────────────────────────────────────────
function sizeCanvases() {
  const panel  = document.querySelector('.puzzle-panel');
  if (!panel) return;
  const pw = panel.clientWidth;
  const ph = panel.clientHeight - 32; // label
  const scale = Math.min(pw / CW, ph / CH);
  const W = Math.floor(CW * scale);
  const H = Math.floor(CH * scale);

  [canvasL, canvasR].forEach(c => {
    c.style.width  = W + 'px';
    c.style.height = H + 'px';
    c.width  = CW;
    c.height = CH;
  });
}

// ─── INICIAR FASE ────────────────────────────────────────────────────────────
function initLevel() {
  const scene = SCENES[(STATE.level - 1) % SCENES.length];
  const seed  = STATE.level * 12345;

  // Reset state
  STATE.found      = 0;
  STATE.hintsLeft  = 3;
  STATE.errors     = generateErrors(scene, seed);
  STATE.startTime  = Date.now();
  STATE.totalTime  = Math.max(60, 120 - (STATE.level - 1) * 10);
  hudTimer.classList.remove('urgent');

  // UI
  hudLevelNum.textContent = STATE.level;
  foundBadge.textContent  = '0/7';
  hintCount.textContent   = STATE.hintsLeft;
  scoreVal.textContent    = STATE.score;
  $('btn-hint').disabled  = false;
  buildDots();

  // Remover marcadores antigos
  document.querySelectorAll('.found-circle,.click-marker').forEach(e => e.remove());

  // Desenhar
  sizeCanvases();
  drawScene(ctxL, scene, seed);

  // Copiar para direita e aplicar erros
  ctxR.drawImage(canvasL, 0, 0);
  applyErrors(ctxR, STATE.errors);

  // Iniciar timer
  startTimer();
}

// ─── CLIQUE / TOQUE ─────────────────────────────────────────────────────────
function handleCanvasClick(e, canvas) {
  const rect  = canvas.getBoundingClientRect();
  const scaleX = CW / rect.width;
  const scaleY = CH / rect.height;

  let clientX, clientY;
  if (e.touches) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  const px = (clientX - rect.left) * scaleX;
  const py = (clientY - rect.top)  * scaleY;

  // Verifica acerto
  let hit = false;
  STATE.errors.forEach((err, idx) => {
    if (err.found) return;
    const dist = Math.hypot(err.cx - px, err.cy - py);
    if (dist <= err.r + 8) {
      err.found = true;
      STATE.found++;
      hit = true;

      // Bonus de pontuação (tempo restante)
      const bonus = 50 + Math.floor(STATE.timeLeft * 2);
      STATE.score += bonus;
      scoreVal.textContent = STATE.score;

      markDot(idx);
      foundBadge.textContent = `${STATE.found}/7`;

      // Círculo nos dois painéis
      spawnCircle($('panel-left'),  err.cx, err.cy, err.r);
      spawnCircle($('panel-right'), err.cx, err.cy, err.r);

      showToast(`+${bonus} pts — ERRO ${STATE.found} ENCONTRADO!`);
      vibrate([30, 20, 30]);

      if (STATE.found === 7) {
        clearInterval(STATE.timerID);
        setTimeout(winGame, 600);
      }
    }
  });

  if (!hit) {
    // Clique errado
    spawnWrongMarker(canvas.parentElement, clientX - rect.left, clientY - rect.top);
    STATE.score = Math.max(0, STATE.score - 5);
    scoreVal.textContent = STATE.score;
    vibrate([80]);
  }
}

function spawnCircle(panel, cx, cy, r) {
  const rect   = panel.querySelector('canvas').getBoundingClientRect();
  const scaleX = rect.width  / CW;
  const scaleY = rect.height / CH;

  const div = document.createElement('div');
  div.className = 'found-circle';
  div.style.left   = (rect.left - panel.getBoundingClientRect().left + cx * scaleX) + 'px';
  div.style.top    = (rect.top  - panel.getBoundingClientRect().top  + cy * scaleY) + 'px';
  div.style.width  = (r * 2 * scaleX + 12) + 'px';
  div.style.height = (r * 2 * scaleY + 12) + 'px';
  panel.appendChild(div);
}

function spawnWrongMarker(panel, x, y) {
  const div = document.createElement('div');
  div.className = 'click-marker wrong';
  div.style.left = x + 'px';
  div.style.top  = y + 'px';
  panel.appendChild(div);
  setTimeout(() => div.remove(), 700);
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// ─── DICA ────────────────────────────────────────────────────────────────────
function useHint() {
  if (STATE.hintsLeft <= 0) return;
  const unfound = STATE.errors.filter(e => !e.found);
  if (!unfound.length) return;

  STATE.hintsLeft--;
  hintCount.textContent = STATE.hintsLeft;
  if (STATE.hintsLeft === 0) $('btn-hint').disabled = true;

  // Pisca o erro mais fácil de achar (menor índice)
  const err = unfound[0];
  flashHint($('panel-right'), err);
  showToast('💡 DICA REVELADA!');
  STATE.score = Math.max(0, STATE.score - 30);
  scoreVal.textContent = STATE.score;
}

function flashHint(panel, err) {
  const rect   = panel.querySelector('canvas').getBoundingClientRect();
  const pRect  = panel.getBoundingClientRect();
  const scaleX = rect.width  / CW;
  const scaleY = rect.height / CH;

  const div = document.createElement('div');
  div.className = 'found-circle';
  div.style.left        = (rect.left - pRect.left + err.cx * scaleX) + 'px';
  div.style.top         = (rect.top  - pRect.top  + err.cy * scaleY) + 'px';
  div.style.width       = (err.r * 2 * scaleX + 20) + 'px';
  div.style.height      = (err.r * 2 * scaleY + 20) + 'px';
  div.style.borderColor = '#ffe600';
  div.style.boxShadow   = '0 0 20px #ffe600';
  div.style.animation   = 'circleReveal .5s ease forwards';
  panel.appendChild(div);
  setTimeout(() => div.remove(), 2000);
}

// ─── WIN / LOSE ──────────────────────────────────────────────────────────────
function winGame() {
  const elapsed = Math.floor((Date.now() - STATE.startTime) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  $('stat-time').textContent  = `${mm}:${ss}`;
  $('stat-score').textContent = STATE.score;
  $('modal-win').classList.remove('hidden');
  vibrate([50, 30, 50, 30, 100]);
}

function loseGame() {
  $('lose-found').textContent = STATE.found;
  $('modal-lose').classList.remove('hidden');
  vibrate([200]);
}

// ─── EVENTOS ─────────────────────────────────────────────────────────────────
$('btn-start').addEventListener('click', () => {
  splash.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  STATE.level = 1;
  STATE.score = 0;
  initLevel();
});

$('btn-back').addEventListener('click', () => {
  clearInterval(STATE.timerID);
  gameScreen.classList.add('hidden');
  splash.classList.remove('hidden');
});

$('btn-hint').addEventListener('click', useHint);

$('btn-next').addEventListener('click', () => {
  $('modal-win').classList.add('hidden');
  STATE.level++;
  initLevel();
});

$('btn-retry').addEventListener('click', () => {
  $('modal-lose').classList.add('hidden');
  initLevel();
});

$('btn-menu').addEventListener('click', () => {
  $('modal-lose').classList.add('hidden');
  clearInterval(STATE.timerID);
  gameScreen.classList.add('hidden');
  splash.classList.remove('hidden');
});

// Canvas clicks
[canvasL, canvasR].forEach(c => {
  c.addEventListener('click',      e => handleCanvasClick(e, c));
  c.addEventListener('touchstart', e => { e.preventDefault(); handleCanvasClick(e, c); }, { passive: false });
});

// Resize
window.addEventListener('resize', () => {
  sizeCanvases();
  // Redesenha os círculos reposicionando — simplificado: apenas remove
  // (num app real, recalcularíamos as posições)
  document.querySelectorAll('.found-circle').forEach(e => e.remove());
  STATE.errors.forEach((err, idx) => {
    if (err.found) {
      spawnCircle($('panel-left'),  err.cx, err.cy, err.r);
      spawnCircle($('panel-right'), err.cx, err.cy, err.r);
    }
  });
});
