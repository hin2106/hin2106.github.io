const SVG_NS = 'http://www.w3.org/2000/svg';
const EDGE_TARGETS = [
  '.cover',
  '.sidebar-section',
  '.main-content',
  '.download-card',
  '.tiktok-card',
  '.player-container',
];

const FLAKE_STYLES = [
  { end: 44, branches: [[17, 9, 8], [27, 11, 9], [36, 8, 7]], width: 3.0, tip: 'fork', center: 'ring' },
  { end: 41, branches: [[18, 12, 7], [30, 9, 11]], width: 3.8, tip: 'diamond', center: 'star' },
  { end: 45, branches: [[14, 7, 6], [24, 10, 8], [34, 12, 8]], width: 2.6, tip: 'circle', center: 'hex' },
  { end: 46, branches: [[20, 13, 6], [31, 13, 10]], width: 3.2, tip: 'fork', center: 'dot' },
  { end: 42, branches: [[16, 7, 10], [25, 9, 6], [33, 7, 9]], width: 4.0, tip: 'none', center: 'star' },
  { end: 43, branches: [[19, 14, 8], [32, 10, 7]], width: 2.8, tip: 'diamond', center: 'ring' },
  { end: 40, branches: [[13, 6, 7], [22, 8, 9], [31, 10, 6]], width: 3.4, tip: 'circle', center: 'dot' },
  { end: 46, branches: [[17, 11, 5], [26, 8, 12], [37, 12, 6]], width: 2.5, tip: 'fork', center: 'hex' },
];

const COLORS = ['#f4fbff', '#d9f1ff', '#bfe6ff', '#e9dcff', '#cfd7ff'];

function svgNode(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function addLine(parent, x1, y1, x2, y2) {
  parent.appendChild(svgNode('line', { x1, y1, x2, y2 }));
}

function pointsForStar(outerRadius, innerRadius, count = 6) {
  const points = [];
  for (let index = 0; index < count * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + index * Math.PI / count;
    points.push(`${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`);
  }
  return points.join(' ');
}

function buildSnowflake(variant, size, isEdgeFlake) {
  const style = FLAKE_STYLES[variant % FLAKE_STYLES.length];
  const svg = svgNode('svg', {
    viewBox: '-50 -50 100 100',
    width: size,
    height: size,
    'aria-hidden': 'true',
    focusable: 'false',
  });
  svg.classList.add('snowflake-svg');
  if (isEdgeFlake) svg.classList.add('snowflake-edge');

  const root = svgNode('g', {
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': style.width,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });

  for (let armIndex = 0; armIndex < 6; armIndex += 1) {
    const arm = svgNode('g', { transform: `rotate(${armIndex * 60})` });
    addLine(arm, 0, 0, 0, -style.end);
    style.branches.forEach(([at, reach, rise]) => {
      addLine(arm, 0, -at, reach, -at - rise);
      addLine(arm, 0, -at, -reach, -at - rise);
    });

    if (style.tip === 'fork') {
      addLine(arm, 0, -style.end, 7, -style.end + 8);
      addLine(arm, 0, -style.end, -7, -style.end + 8);
    } else if (style.tip === 'circle') {
      arm.appendChild(svgNode('circle', { cx: 0, cy: -style.end, r: 2.8, fill: 'currentColor', stroke: 'none' }));
    } else if (style.tip === 'diamond') {
      arm.appendChild(svgNode('polygon', {
        points: `0,${-style.end - 4} 4,${-style.end} 0,${-style.end + 4} -4,${-style.end}`,
        fill: 'none',
      }));
    }
    root.appendChild(arm);
  }

  if (style.center === 'ring') {
    root.appendChild(svgNode('circle', { cx: 0, cy: 0, r: 7 }));
  } else if (style.center === 'dot') {
    root.appendChild(svgNode('circle', { cx: 0, cy: 0, r: 5, fill: 'currentColor', stroke: 'none' }));
  } else if (style.center === 'hex') {
    root.appendChild(svgNode('polygon', { points: pointsForStar(8, 8, 6) }));
  } else if (style.center === 'star') {
    root.appendChild(svgNode('polygon', { points: pointsForStar(9, 4, 6), fill: 'currentColor', stroke: 'none' }));
  }

  svg.appendChild(root);
  return svg;
}

function visibleEdgeTargets() {
  return [...document.querySelectorAll(EDGE_TARGETS.join(','))].filter(element => {
    if (element.closest('.snowfall-layer')) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && rect.width > 60
      && rect.top > 18
      && rect.top < window.innerHeight - 24
      && rect.right > 0
      && rect.left < window.innerWidth;
  });
}

function randomBetween(minimum, maximum) {
  return minimum + Math.random() * (maximum - minimum);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function initSnowEffect() {
  if (document.querySelector('.snowfall-layer')) return;

  const layer = document.createElement('div');
  layer.className = 'snowfall-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const activeAnimations = new Set();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let performanceTier = reduceMotion ? 'economy' : 'balanced';
  let uiHeavy = false;
  let spawnTimer = 0;
  let activeFlakes = 0;

  function limits() {
    const mobile = window.innerWidth <= 768;
    if (performanceTier === 'economy') return { maximum: mobile ? 14 : 20, interval: mobile ? 760 : 620 };
    if (performanceTier === 'high') return { maximum: mobile ? 32 : 48, interval: mobile ? 300 : 190 };
    return { maximum: mobile ? 23 : 36, interval: mobile ? 440 : 300 };
  }

  function chooseEdgeLanding(size) {
    const targets = visibleEdgeTargets();
    if (!targets.length) return null;
    const target = targets[Math.floor(Math.random() * targets.length)];
    const rect = target.getBoundingClientRect();
    return {
      x: clamp(randomBetween(rect.left + size, rect.right - size), size, window.innerWidth - size),
      y: rect.top - size * 0.55,
    };
  }

  function spawnFlake() {
    const edgeLanding = Math.random() < 0.34;
    const size = edgeLanding
      ? randomBetween(5, 9)
      : randomBetween(8, Math.random() < 0.18 ? 28 : 19);
    const landing = edgeLanding ? chooseEdgeLanding(size) : null;
    const landsOnEdge = Boolean(landing);
    const flake = buildSnowflake(Math.floor(Math.random() * FLAKE_STYLES.length), size, landsOnEdge);
    flake.style.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    flake.style.opacity = '0';
    layer.appendChild(flake);
    activeFlakes += 1;

    const targetX = landing?.x ?? randomBetween(size, Math.max(size, window.innerWidth - size));
    const targetY = landing?.y ?? window.innerHeight - size * 0.62;
    const startX = clamp(targetX + randomBetween(-90, 90), -size, window.innerWidth);
    const sway = randomBetween(-48, 48);
    const rotation = randomBetween(160, 620) * (Math.random() < 0.5 ? -1 : 1);
    const fallDuration = landsOnEdge
      ? clamp(3000 + targetY * 4, 3200, 7200)
      : randomBetween(7200, 12500);
    const lingerDuration = randomBetween(2200, 4300);
    const totalDuration = fallDuration + lingerDuration;
    const landOffset = fallDuration / totalDuration;
    const settleOffset = landOffset + (1 - landOffset) * 0.68;

    const animation = flake.animate([
      {
        transform: `translate3d(${startX}px, ${-size * 2}px, 0) rotate(0deg) scale(0.72)`,
        opacity: 0,
        offset: 0,
      },
      {
        transform: `translate3d(${startX + sway}px, ${targetY * 0.30}px, 0) rotate(${rotation * 0.30}deg) scale(0.9)`,
        opacity: 0.82,
        offset: landOffset * 0.30,
      },
      {
        transform: `translate3d(${targetX - sway * 0.45}px, ${targetY * 0.62}px, 0) rotate(${rotation * 0.63}deg) scale(1)`,
        opacity: 0.94,
        offset: landOffset * 0.62,
      },
      {
        transform: `translate3d(${targetX}px, ${targetY}px, 0) rotate(${rotation}deg) scale(1)`,
        opacity: 0.96,
        offset: landOffset,
      },
      {
        transform: `translate3d(${targetX}px, ${targetY + 1}px, 0) rotate(${rotation}deg) scale(0.96)`,
        opacity: 0.82,
        offset: settleOffset,
      },
      {
        transform: `translate3d(${targetX}px, ${targetY + 2}px, 0) rotate(${rotation}deg) scale(0.68)`,
        opacity: 0,
        offset: 1,
      },
    ], {
      duration: totalDuration,
      easing: 'linear',
      fill: 'forwards',
    });

    activeAnimations.add(animation);
    animation.onfinish = () => {
      activeAnimations.delete(animation);
      flake.remove();
      activeFlakes -= 1;
    };
    animation.oncancel = animation.onfinish;
  }

  function scheduleSpawn() {
    const { maximum, interval } = limits();
    const wait = interval * randomBetween(0.7, 1.35) * (uiHeavy ? 1.8 : 1);
    spawnTimer = window.setTimeout(() => {
      if (!document.hidden && activeFlakes < maximum) spawnFlake();
      scheduleSpawn();
    }, wait);
  }

  const initialCount = reduceMotion ? 5 : (window.innerWidth <= 768 ? 11 : 18);
  for (let index = 0; index < initialCount; index += 1) {
    window.setTimeout(() => {
      if (!document.hidden) spawnFlake();
    }, index * 240);
  }
  scheduleSpawn();

  document.addEventListener('visibilitychange', () => {
    activeAnimations.forEach(animation => {
      if (document.hidden) animation.pause();
      else animation.play();
    });
  });
  window.addEventListener('site-performance-tier', event => {
    if (['economy', 'balanced', 'high'].includes(event.detail)) performanceTier = event.detail;
  });
  window.addEventListener('site-ui-heavy', event => {
    uiHeavy = Boolean(event.detail);
  });
  window.addEventListener('beforeunload', () => clearTimeout(spawnTimer), { once: true });
}
