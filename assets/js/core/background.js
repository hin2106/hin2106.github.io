export function initDynamicBackground() {
  const matrix = document.getElementById('jp-matrix');
  let illuminateMatrix = () => {};
  let coolMatrix = () => {};
  if (matrix && !matrix.dataset.ready) {
    matrix.dataset.ready = 'true';
    const glyphs = Array.from('アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ');
    let previousCount = 0;
    let matrixColumns = 1;
    let matrixRows = 1;
    let cellSize = 52;
    let matrixResizeTimer = 0;
    let randomGlowTimer = 0;
    const activeCells = new Map();

    const setCellLevel = (span, level) => {
      if (span.dataset.lightLevel === String(level)) return;
      span.dataset.lightLevel = String(level);
      span.classList.toggle('matrix-cursor-fade', level === 0);
      span.classList.toggle('matrix-cursor-edge', level === 1);
      span.classList.toggle('matrix-cursor-near', level === 2);
      span.classList.toggle('matrix-cursor-core', level === 3);
    };

    const renderMatrix = () => {
      cellSize = window.innerWidth <= 600 ? 46 : 52;
      matrixColumns = Math.ceil(window.innerWidth / cellSize);
      matrixRows = Math.ceil(window.innerHeight / cellSize);
      const count = matrixColumns * matrixRows;
      if (count === previousCount) return;
      previousCount = count;
      activeCells.clear();
      matrix.style.setProperty('--matrix-columns', matrixColumns);
      matrix.style.setProperty('--matrix-cell', `${cellSize}px`);

      const fragment = document.createDocumentFragment();
      for (let index = 0; index < count; index += 1) {
        const span = document.createElement('span');
        span.textContent = glyphs[(index * 17 + index * index * 3) % glyphs.length];
        fragment.appendChild(span);
      }
      matrix.replaceChildren(fragment);

      // Keep a scattered baseline of illuminated glyphs so the matrix never
      // becomes completely dark between animated glow waves.
      const spans = [...matrix.children];
      const ambientCount = Math.min(spans.length, Math.max(10, Math.round(spans.length * 0.045)));
      for (let index = spans.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [spans[index], spans[swapIndex]] = [spans[swapIndex], spans[index]];
      }
      spans.slice(0, ambientCount).forEach(span => span.classList.add('matrix-ambient-glow'));
    };

    const scheduleRandomGlow = (delay = 400) => {
      window.clearTimeout(randomGlowTimer);
      randomGlowTimer = window.setTimeout(() => {
        const spans = matrix.children;
        if (!document.hidden && spans.length > 0) {
          const glowCount = Math.min(spans.length, 24 + Math.floor(Math.random() * 15));
          const selected = new Set();
          let attempts = 0;
          while (selected.size < glowCount && attempts < glowCount * 8) {
            attempts += 1;
            const span = spans[Math.floor(Math.random() * spans.length)];
            if (!span || activeCells.has(span) || span.classList.contains('matrix-random-glow') || span.classList.contains('matrix-ambient-glow')) continue;
            selected.add(span);
          }

          selected.forEach(span => {
            const variant = 1 + Math.floor(Math.random() * 3);
            const duration = 2200 + Math.round(Math.random() * 1100);
            span.style.setProperty('--random-glow-duration', `${duration}ms`);
            span.classList.add('matrix-random-glow', `matrix-random-glow-${variant}`);
            window.setTimeout(() => {
              span.classList.remove('matrix-random-glow', `matrix-random-glow-${variant}`);
              span.style.removeProperty('--random-glow-duration');
            }, duration);
          });
        }
        scheduleRandomGlow(1400 + Math.round(Math.random() * 500));
      }, delay);
    };

    illuminateMatrix = (x, y, now) => {
      const spans = matrix.children;
      const cellWidth = window.innerWidth / matrixColumns;
      const cellHeight = window.innerHeight / matrixRows;
      const centerColumn = Math.floor(x / cellWidth);
      const centerRow = Math.floor(y / cellHeight);
      const radius = window.innerWidth <= 600 ? 2.2 : 2.7;
      const reach = Math.ceil(radius);

      for (let rowOffset = -reach; rowOffset <= reach; rowOffset += 1) {
        const row = centerRow + rowOffset;
        if (row < 0 || row >= matrixRows) continue;
        for (let columnOffset = -reach; columnOffset <= reach; columnOffset += 1) {
          const column = centerColumn + columnOffset;
          if (column < 0 || column >= matrixColumns) continue;
          const distance = Math.hypot(columnOffset, rowOffset);
          if (distance > radius) continue;
          const span = spans[row * matrixColumns + column];
          if (!span) continue;
          const level = distance < .9 ? 3 : distance < 2.1 ? 2 : 1;
          const previous = activeCells.get(span);
          const nextLevel = Math.max(level, previous?.level || 0);
          setCellLevel(span, nextLevel);
          activeCells.set(span, { touchedAt: now, level: nextLevel });
        }
      }
    };

    coolMatrix = now => {
      activeCells.forEach((state, span) => {
        const age = now - state.touchedAt;
        if (age > 1100) {
          setCellLevel(span, -1);
          activeCells.delete(span);
        } else if (age > 720) {
          if (state.level !== 0) {
            state.level = 0;
            setCellLevel(span, 0);
          }
        } else if (age > 470 && state.level !== 1) {
          state.level = 1;
          setCellLevel(span, 1);
        } else if (age > 260 && state.level === 3) {
          state.level = 2;
          setCellLevel(span, 2);
        }
      });
    };

    renderMatrix();
    scheduleRandomGlow();
    window.addEventListener('resize', () => {
      clearTimeout(matrixResizeTimer);
      matrixResizeTimer = window.setTimeout(renderMatrix, 160);
    }, { passive: true });
  }

  const canvas = document.querySelector('.gradient-canvas');
  const context = canvas?.getContext('2d', { alpha: false });
  if (!canvas || !context) return;

  const rootStyle = getComputedStyle(document.documentElement);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const qualityByTier = { economy: 0.24, balanced: 0.34, high: 0.46 };
  const frameTimeByTier = { economy: 1000 / 24, balanced: 1000 / 30, high: 1000 / 40 };
  let tier = 'balanced';
  let uiHeavy = false;
  let width = 1;
  let height = 1;
  let lastFrame = 0;
  let resizeTimer = 0;
  let pointerX = window.innerWidth * 0.5;
  let pointerY = window.innerHeight * 0.5;
  let targetX = pointerX;
  let targetY = pointerY;
  let velocityX = 0;
  let velocityY = 0;
  let pointerActivityUntil = 0;

  function readRgb(name) {
    return rootStyle.getPropertyValue(name).split(',').map(value => Number.parseFloat(value.trim()) || 0);
  }

  const colors = ['--color1', '--color2', '--color3', '--color4', '--color5'].map(readRgb);
  const background1 = rootStyle.getPropertyValue('--color-bg1').trim() || 'rgb(20, 5, 40)';
  const background2 = rootStyle.getPropertyValue('--color-bg2').trim() || 'rgb(8, 2, 20)';

  function resizeCanvas() {
    const quality = qualityByTier[tier];
    const nextWidth = Math.max(280, Math.round(window.innerWidth * quality));
    const nextHeight = Math.max(180, Math.round(window.innerHeight * quality));
    if (canvas.width === nextWidth && canvas.height === nextHeight) return;

    let previousFrame = null;
    if (lastFrame > 0 && canvas.width > 0 && canvas.height > 0) {
      previousFrame = document.createElement('canvas');
      previousFrame.width = canvas.width;
      previousFrame.height = canvas.height;
      previousFrame.getContext('2d')?.drawImage(canvas, 0, 0);
    }

    width = nextWidth;
    height = nextHeight;
    canvas.width = width;
    canvas.height = height;
    if (previousFrame) context.drawImage(previousFrame, 0, 0, width, height);
  }

  function drawBlob(x, y, radius, color, opacity) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${opacity})`);
    gradient.addColorStop(0.42, `rgba(${color[0]},${color[1]},${color[2]},${opacity * 0.68})`);
    gradient.addColorStop(0.76, `rgba(${color[0]},${color[1]},${color[2]},${opacity * 0.16})`);
    gradient.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function render(now) {
    requestAnimationFrame(render);
    const frameInterval = frameTimeByTier[uiHeavy ? 'economy' : tier];
    if (document.hidden || now - lastFrame < frameInterval - 2) return;
    lastFrame = now - ((now - lastFrame) % frameInterval);

    const seconds = now * 0.001;
    const background = context.createLinearGradient(0, height, width, 0);
    background.addColorStop(0, background1);
    background.addColorStop(1, background2);
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'screen';

    const radius = Math.max(width, height) * 0.48;
    const blobs = [
      [0.50 + Math.sin(seconds * 0.20) * 0.05, 0.50 + Math.sin(seconds * 0.16) * 0.28, 1.00, 0.62],
      [0.50 + Math.cos(seconds * 0.28) * 0.30, 0.48 + Math.sin(seconds * 0.28) * 0.24, 0.95, 0.60],
      [0.28 + Math.cos(seconds * 0.15) * 0.24, 0.66 + Math.sin(seconds * 0.15) * 0.22, 1.05, 0.56],
      [0.50 + Math.sin(seconds * 0.13) * 0.34, 0.46 + Math.sin(seconds * 0.19) * 0.10, 1.00, 0.50],
      [0.55 + Math.cos(seconds * 0.11) * 0.40, 0.54 + Math.sin(seconds * 0.11) * 0.30, 1.55, 0.40],
    ];
    blobs.forEach((blob, index) => {
      drawBlob(blob[0] * width, blob[1] * height, radius * blob[2], colors[index], blob[3]);
    });

    velocityX = (velocityX + (targetX - pointerX) * 0.045) * 0.74;
    velocityY = (velocityY + (targetY - pointerY) * 0.045) * 0.74;
    pointerX += velocityX;
    pointerY += velocityY;
    const speed = Math.min(1, Math.hypot(velocityX, velocityY) / 28);
    if (now < pointerActivityUntil || speed > .012) illuminateMatrix(pointerX, pointerY, now);
    coolMatrix(now);
    context.globalCompositeOperation = 'source-over';
  }

  function updatePointer(event) {
    targetX = event.clientX;
    targetY = event.clientY;
    pointerActivityUntil = performance.now() + (event.type === 'pointerdown' ? 360 : 150);
  }

  window.addEventListener('pointermove', updatePointer, { passive: true });
  window.addEventListener('pointerdown', updatePointer, { passive: true });
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 120);
  }, { passive: true });
  window.addEventListener('site-performance-tier', event => {
    if (!qualityByTier[event.detail] || event.detail === tier) return;
    tier = event.detail;
    resizeCanvas();
  });
  window.addEventListener('site-ui-heavy', event => {
    const nextState = Boolean(event.detail);
    if (nextState === uiHeavy) return;
    uiHeavy = nextState;
  });

  if (reduceMotion) tier = 'economy';
  resizeCanvas();
  requestAnimationFrame(render);
}
