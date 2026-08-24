const SVG_NS = 'http://www.w3.org/2000/svg';

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function createFileIcon(extension) {
  const svg = svgElement('svg', {
    class: 'download-file-icon', viewBox: '0 0 24 24', width: '24', height: '24',
    'aria-hidden': 'true', fill: 'none', stroke: 'currentColor', 'stroke-width': '2',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  });

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(extension)) {
    svg.append(
      svgElement('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2', ry: '2' }),
      svgElement('circle', { cx: '9', cy: '9', r: '2' }),
      svgElement('path', { d: 'm21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21' }),
    );
  } else if (['mp4', 'mov', 'mkv', 'avi', 'webm'].includes(extension)) {
    svg.append(
      svgElement('circle', { cx: '12', cy: '13', r: '3' }),
      svgElement('path', { d: 'M9.778 21h4.444c3.121 0 4.682 0 5.803-.735a4.4 4.4 0 0 0 1.226-1.204c.749-1.1.749-2.633.749-5.697s0-4.597-.749-5.697a4.4 4.4 0 0 0-1.226-1.204c-.72-.473-1.622-.642-3.003-.702c-.659 0-1.226-.49-1.355-1.125A2.064 2.064 0 0 0 13.634 3h-3.268c-.988 0-1.839.685-2.033 1.636c-.129.635-.696 1.125-1.355 1.125c-1.38.06-2.282.23-3.003.702A4.4 4.4 0 0 0 2.75 7.667C2 8.767 2 10.299 2 13.364s0 4.596.749 5.697c.324.476.74.885 1.226 1.204C5.096 21 6.657 21 9.778 21Z' }),
    );
  } else {
    svg.appendChild(svgElement('path', { d: 'm6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2' }));
  }

  return svg;
}

function createDownloadSvg() {
  const svg = svgElement('svg', { viewBox: '0 0 24 24', width: '24', height: '24', 'aria-hidden': 'true' });
  svg.appendChild(svgElement('path', {
    fill: 'none', stroke: 'currentColor', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'stroke-width': '2', d: 'M12 15V3m0 12-4-4m4 4 4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17',
  }));
  return svg;
}

function createCloseSvg() {
  const svg = svgElement('svg', { viewBox: '0 0 24 24', width: '20', height: '20', 'aria-hidden': 'true' });
  svg.appendChild(svgElement('path', {
    d: 'M6 6l12 12M18 6 6 18', fill: 'none', stroke: 'currentColor', 'stroke-width': '2',
    'stroke-linecap': 'round',
  }));
  return svg;
}

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 1) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unit;
  return `${value.toFixed(unit === 0 || value >= 10 ? 0 : 1)} ${units[unit]}`;
}

function setProgress(card, loaded, total) {
  const ratio = total > 0 ? Math.min(1, loaded / total) : 0;
  const percentage = Math.round(ratio * 100);
  card.querySelector('.download-percent').textContent = total > 0 ? `${percentage}%` : formatSize(loaded);
  const progress = card.querySelector('.download-progress-value');
  progress.style.width = `${percentage}%`;
  progress.parentElement.setAttribute('aria-valuenow', String(percentage));
}

function resetCard(card) {
  card.classList.remove('is-downloading', 'is-complete', 'has-error');
  card.querySelector('.download-percent').textContent = '0%';
  card.querySelector('.download-progress-value').style.width = '0%';
  card._downloadController = null;
}

async function startDownload(card, file) {
  if (card._downloadController) return;
  const controller = new AbortController();
  card._downloadController = controller;
  card.classList.add('is-downloading');
  setProgress(card, 0, file.size);

  try {
    const response = await fetch(file.url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const total = Number(response.headers.get('Content-Length')) || Number(file.size) || 0;
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    const chunks = [];
    let loaded = 0;

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        setProgress(card, loaded, total);
      }
    } else {
      const fallbackBlob = await response.blob();
      chunks.push(fallbackBlob);
      loaded = fallbackBlob.size;
    }

    const blob = new Blob(chunks, { type: contentType });
    setProgress(card, total || blob.size, total || blob.size);
    card.classList.remove('is-downloading');
    card.classList.add('is-complete');
    card.querySelector('.download-percent').textContent = '100%';

    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    window.setTimeout(() => resetCard(card), 1800);
  } catch (error) {
    if (error.name === 'AbortError') {
      card.querySelector('.download-percent').textContent = 'Đã hủy';
      window.setTimeout(() => resetCard(card), 650);
    } else {
      console.warn('[Downloads]', error);
      card.classList.remove('is-downloading');
      card.classList.add('has-error');
      card.querySelector('.download-percent').textContent = 'Lỗi';
      window.setTimeout(() => resetCard(card), 2200);
    }
  }
}

function createDownloadCard(file) {
  const card = document.createElement('article');
  card.className = 'download-card';

  const icon = document.createElement('div');
  icon.className = 'download-file-visual';
  icon.appendChild(createFileIcon(file.extension));

  const info = document.createElement('div');
  info.className = 'download-file-info';
  const name = document.createElement('div');
  name.className = 'download-file-name';
  name.textContent = file.name;
  name.title = file.name;
  const meta = document.createElement('div');
  meta.className = 'download-file-meta';
  meta.textContent = `${formatSize(file.size)} • ${(file.extension || 'FILE').toUpperCase()}`;
  info.append(name, meta);

  const action = document.createElement('button');
  action.className = 'download-action';
  action.type = 'button';
  action.dataset.tooltip = `Size: ${formatSize(file.size)}`;
  action.setAttribute('aria-label', `Tải xuống ${file.name}`);
  const wrapper = document.createElement('span');
  wrapper.className = 'download-action-wrapper';
  const text = document.createElement('span');
  text.className = 'download-action-text';
  text.textContent = 'Download';
  const actionIcon = document.createElement('span');
  actionIcon.className = 'download-action-icon';
  actionIcon.appendChild(createDownloadSvg());
  wrapper.append(text, actionIcon);
  action.appendChild(wrapper);

  const status = document.createElement('div');
  status.className = 'download-status';
  const percent = document.createElement('span');
  percent.className = 'download-percent';
  percent.textContent = '0%';
  const cancel = document.createElement('button');
  cancel.className = 'download-cancel';
  cancel.type = 'button';
  cancel.setAttribute('aria-label', `Hủy tải ${file.name}`);
  cancel.appendChild(createCloseSvg());
  status.append(percent, cancel);

  const progress = document.createElement('div');
  progress.className = 'download-progress';
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-label', `Tiến trình tải ${file.name}`);
  progress.setAttribute('aria-valuemin', '0');
  progress.setAttribute('aria-valuemax', '100');
  progress.setAttribute('aria-valuenow', '0');
  const progressValue = document.createElement('div');
  progressValue.className = 'download-progress-value';
  progress.appendChild(progressValue);

  action.addEventListener('click', () => startDownload(card, file));
  cancel.addEventListener('click', () => card._downloadController?.abort());
  card.append(icon, info, action, status, progress);
  return card;
}

export async function initDownloads() {
  const list = document.getElementById('download-list');
  if (!list || list.dataset.ready === '1') return;
  list.dataset.ready = '1';

  try {
    const response = await fetch('/api/downloads.php', { cache: 'no-store', headers: { Accept: 'application/json' } });
    const files = await response.json();
    if (!response.ok || !Array.isArray(files)) throw new Error('Cannot read download list');
    list.replaceChildren();
    if (files.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'download-list-message';
      empty.textContent = 'Chưa có file để tải.';
      list.appendChild(empty);
      return;
    }
    files.forEach(file => list.appendChild(createDownloadCard(file)));
  } catch (error) {
    console.warn('[Downloads]', error);
    list.innerHTML = '<div class="download-list-message">Không thể tải danh sách file.</div>';
  }
}
