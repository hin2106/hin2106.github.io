import { initDynamicBackground } from './core/background.js';
import { initSnowEffect } from './core/snow.js';
import { initZaloQr } from './core/qr.js';
import { initContentProtection } from './core/protection.js';
import { initMusicPlayer } from './components/single-player.js';

const loaderStartedAt = performance.now();
let loaderFinished = false;

function finishLoadingScreen() {
  if (loaderFinished) return;
  loaderFinished = true;
  const minimumVisibleTime = 1000;
  const remainingTime = Math.max(0, minimumVisibleTime - (performance.now() - loaderStartedAt));
  window.setTimeout(() => document.body.classList.add('loaded'), remainingTime);
}

initMusicPlayer();
function initFpsCounter() {
  if (document.getElementById('fps-counter')) return;
  const meter = document.createElement('div');
  meter.id = 'fps-counter';
  meter.textContent = 'FPS: --';
  meter.setAttribute('aria-hidden', 'true');
  document.body.appendChild(meter);

  let frames = 0;
  let startedAt = performance.now();
  let performanceTier = 'balanced';
  let tierCandidate = performanceTier;
  let tierSamples = 0;

  function sample(now) {
    if (!document.hidden) {
      frames += 1;
      const elapsed = now - startedAt;
      if (elapsed >= 500) {
        const fps = Math.round(frames * 1000 / elapsed);
        meter.textContent = `FPS: ${fps}`;
        const nextTier = fps < 28 ? 'economy' : fps > 50 ? 'high' : 'balanced';
        if (nextTier === tierCandidate) tierSamples += 1;
        else {
          tierCandidate = nextTier;
          tierSamples = 1;
        }
        if (tierSamples >= 3 && nextTier !== performanceTier) {
          performanceTier = nextTier;
          tierSamples = 0;
          window.dispatchEvent(new CustomEvent('site-performance-tier', { detail: performanceTier }));
        }
        frames = 0;
        startedAt = now;
      }
    } else {
      frames = 0;
      startedAt = now;
    }
    requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);
}

document.addEventListener('DOMContentLoaded', () => {
  initFpsCounter();
  initDynamicBackground();
  initSnowEffect();
  initZaloQr();
  initContentProtection();
});

window.addEventListener('load', finishLoadingScreen, { once: true });
window.setTimeout(finishLoadingScreen, 4000);

document.addEventListener('visibilitychange', () => {
  document.documentElement.classList.toggle('page-hidden', document.hidden);
});
