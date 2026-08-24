const SVG_NS = 'http://www.w3.org/2000/svg';
const QR_VALUE = 'https://zaloapp.com/qr/p/1de36oszwkviw';
const QR_DARK = '#160e22';
const QR_PAPER = '#ded2ee';
const ZALO_QR_WORD_PATH = 'M0 1H4L0 7H4 M5 5A2 2 0 1 0 9 5A2 2 0 1 0 5 5M9 3V7 M12 1V7 M15 5A2 2 0 1 0 19 5A2 2 0 1 0 15 5';
const QR_MATRIX = [
  '1111111011000010011101000110001111111',
  '1000001001100111111011101100101000001',
  '1011101010110111001100000010101011101',
  '1011101000001000100101000111101011101',
  '1011101011111101011010101110001011101',
  '1000001000010001101011010110101000001',
  '1111111010101010101010101010101111111',
  '0000000010010111110111010101100000000',
  '0000011000011000111100011010101010101',
  '0010010100010100110101010110110111100',
  '0011001110001100111000111111101100101',
  '1000100110010011100100101010001011000',
  '0000001100010110000100111001001001011',
  '0010100011011001100000011111010000100',
  '1100001100010011000000110011101111011',
  '0110000111110111001100000000001101101',
  '0001011111000000111011100101001110110',
  '0001000001011110101001110001100101100',
  '0111101011000111011001110001011110001',
  '1010110101101101011011110001011001000',
  '1011001110011111100010000111011111111',
  '0001010000010101101100101011100111010',
  '0011111010111001000100111001011000111',
  '0100110100100010110111011011010101000',
  '0101101001011101011111000110111100010',
  '1000110110110101101100001110101100110',
  '1001101111110011100001100100001010111',
  '1001010000100101001011101011010111111',
  '1001011101001110011100100110111110101',
  '0000000010010010011101110100100011000',
  '1111111001000111001111010000101011101',
  '1000001011001011000110011011100011011',
  '1011101001100101110010101111111110101',
  '1011101001000111000111000100101000100',
  '1011101000111110010111111110010000001',
  '1000001000100110111111110010110001001',
  '1111111000011100010000100000110110001',
];

function svgNode(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function circlePath(cx, cy, radius) {
  return `M ${cx - radius} ${cy}a ${radius} ${radius} 0 1 0 ${radius * 2} 0a ${radius} ${radius} 0 1 0 ${-radius * 2} 0Z`;
}

function roundedRectPath(x, y, width, height, radius = 0) {
  const r = Math.min(radius, width / 2, height / 2);
  return `M ${x + r} ${y}H ${x + width - r}A ${r} ${r} 0 0 1 ${x + width} ${y + r}V ${y + height - r}A ${r} ${r} 0 0 1 ${x + width - r} ${y + height}H ${x + r}A ${r} ${r} 0 0 1 ${x} ${y + height - r}V ${y + r}A ${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

function insideFinder(row, column) {
  return (row < 7 && column < 7)
    || (row < 7 && column >= QR_MATRIX.length - 7)
    || (row >= QR_MATRIX.length - 7 && column < 7);
}

function addFinder(svg, x, y) {
  svg.appendChild(svgNode('path', { d: roundedRectPath(x, y, 7, 7, 1.45), fill: QR_DARK }));
  svg.appendChild(svgNode('path', { d: roundedRectPath(x + 1.15, y + 1.15, 4.7, 4.7, 0.95), fill: QR_PAPER }));
  svg.appendChild(svgNode('path', { d: roundedRectPath(x + 2.18, y + 2.18, 2.64, 2.64, 0.58), fill: QR_DARK }));
}

function addZaloMark(svg, centerX, centerY) {
  svg.appendChild(svgNode('path', {
    d: ZALO_QR_WORD_PATH,
    transform: `translate(${centerX - 3.99} ${centerY - 1.68}) scale(0.42)`,
    fill: 'none',
    stroke: QR_DARK,
    'stroke-width': 1.35,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  }));
}

export function drawZaloQr(svg) {
  if (!svg || svg.dataset.rendered === QR_VALUE) return;
  svg.replaceChildren();
  svg.dataset.rendered = QR_VALUE;
  svg.setAttribute('shape-rendering', 'geometricPrecision');

  svg.appendChild(svgNode('path', { d: roundedRectPath(0, 0, 45, 45, 3.2), fill: QR_PAPER }));
  const quietZone = 4;
  const center = 22.5;

  QR_MATRIX.forEach((row, rowIndex) => {
    [...row].forEach((module, columnIndex) => {
      if (module !== '1' || insideFinder(rowIndex, columnIndex)) return;
      const x = quietZone + columnIndex + 0.5;
      const y = quietZone + rowIndex + 0.5;
      if (Math.hypot(x - center, y - center) < 5.65) return;
      svg.appendChild(svgNode('path', { d: circlePath(x, y, 0.43), fill: QR_DARK }));
    });
  });

  addFinder(svg, quietZone, quietZone);
  addFinder(svg, quietZone + 30, quietZone);
  addFinder(svg, quietZone, quietZone + 30);

  svg.appendChild(svgNode('path', {
    d: circlePath(center, center, 5.65),
    fill: QR_PAPER,
    stroke: QR_DARK,
    'stroke-width': 0.48,
  }));
  addZaloMark(svg, center, center);
}

export function initZaloQr() {
  if (document.documentElement.dataset.zaloQrReady === '1') return;
  document.documentElement.dataset.zaloQrReady = '1';

  const setQrState = (sidebar, isOpen) => {
    const button = sidebar?.querySelector('#zalo-qr-toggle');
    const panel = sidebar?.querySelector('#zalo-qr-panel');
    const svg = panel?.querySelector('#zalo-qr-svg');
    if (!sidebar || !button || !panel || !svg) return;

    if (isOpen) drawZaloQr(svg);
    sidebar.classList.toggle('zalo-qr-open', isOpen);
    button.classList.toggle('active', isOpen);
    button.setAttribute('aria-expanded', String(isOpen));
    button.setAttribute('aria-label', isOpen ? 'Đóng mã QR Zalo' : 'Mở mã QR Zalo');
    panel.setAttribute('aria-hidden', String(!isOpen));
  };

  document.addEventListener('click', event => {
    const button = event.target.closest('#zalo-qr-toggle');
    if (button) {
      const sidebar = button.closest('.sidebar-section');
      if (!sidebar) return;
      setQrState(sidebar, !sidebar.classList.contains('zalo-qr-open'));
      return;
    }

    const openSidebar = document.querySelector('.sidebar-section.zalo-qr-open');
    if (!openSidebar || event.target.closest('#zalo-qr-panel')) return;
    setQrState(openSidebar, false);
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const openSidebar = document.querySelector('.sidebar-section.zalo-qr-open');
    if (openSidebar) setQrState(openSidebar, false);
  });

  drawZaloQr(document.querySelector('#zalo-qr-svg'));
}
