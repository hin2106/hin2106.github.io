const COUNTER_API = 'https://profile-view-counter.concun185.workers.dev/view';
const MAX_VIEWS = 9_999_999;
const DIGIT_COUNT = 7;

function renderCounter(counter, count) {
  const safeCount = Math.min(MAX_VIEWS, Math.max(0, Number(count) || 0));
  const value = String(safeCount).padStart(DIGIT_COUNT, '0').slice(-DIGIT_COUNT);
  const fragment = document.createDocumentFragment();

  [...value].forEach((digit, index) => {
    const tile = document.createElement('span');
    tile.className = 'view-digit';
    tile.textContent = digit;
    tile.style.setProperty('--digit-delay', `${index * 55}ms`);
    tile.setAttribute('aria-hidden', 'true');
    fragment.appendChild(tile);
  });

  counter.replaceChildren(fragment);
  counter.closest('.view-counter')?.setAttribute(
    'aria-label',
    `${safeCount.toLocaleString('vi-VN')} lượt xem`
  );
}

export async function initViewCounter() {
  const counter = document.getElementById('view-counter-digits');
  if (!counter || counter.dataset.ready === '1') return;
  counter.dataset.ready = '1';

  renderCounter(counter, 0);

  try {
    const response = await fetch(COUNTER_API, {
      method: 'POST',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Counter API error: ${response.status}`);
    }

    const data = await response.json();
    renderCounter(counter, data.count);
  } catch (error) {
    counter.closest('.view-counter')?.classList.add('view-counter--error');
    console.error('Không tải được bộ đếm lượt xem:', error);
  }
}
