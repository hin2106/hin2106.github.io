const PLAYLIST = [
  'Chạm Đáy Nỗi Đau (Piano Version).mp3',
  'Cung Bậc Sầu.mp3',
  'Gương Mặt Lạ Lẫm.mp3',
  'Lắng Nghe Nước Mắt (Piano Version).mp3',
  'Một Bước Yêu Vạn Dặm Đau.mp3',
  'Trái Tim Em Cũng Biết Đau (Piano Version).mp3',
  'Tự Lau Nước Mắt.mp3',
  'Yêu Một Người Vô Tâm (Piano Version).mp3'
].map(file => ({
  name: file.replace(/\.mp3$/i, ''),
  artist: 'Mr. Siro',
  file
}));

const elements = {};
let currentTrackIndex = 0;
let lastRenderedAt = 0;
let lastVolume = 0.5;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

function cacheElements() {
  elements.audio = document.getElementById('bg-music');
  elements.card = document.querySelector('.cover-player');
  elements.title = document.getElementById('player-track-name');
  elements.artist = document.getElementById('player-track-artist');
  elements.play = document.getElementById('player-play-pause');
  elements.playIcon = elements.play?.querySelector('.icon-play');
  elements.pauseIcon = elements.play?.querySelector('.icon-pause');
  elements.previous = document.getElementById('player-prev');
  elements.next = document.getElementById('player-next');
  elements.currentTime = document.getElementById('player-current-time');
  elements.duration = document.getElementById('player-duration');
  elements.progress = document.getElementById('player-progress-bar');
  elements.progressTrack = document.getElementById('player-progress-container');
  elements.mute = document.getElementById('player-mute');
  elements.volume = document.getElementById('player-volume');
  elements.volumeIcon = document.getElementById('vol-icon');
  elements.favorite = document.getElementById('player-favorite');
}

function updateUI() {
  const audio = elements.audio;
  if (!audio) return;
  const playing = !audio.paused;
  elements.card?.classList.toggle('is-playing', playing);
  if (elements.playIcon) elements.playIcon.style.display = playing ? 'none' : '';
  if (elements.pauseIcon) elements.pauseIcon.style.display = playing ? '' : 'none';
  if (elements.play) elements.play.setAttribute('aria-label', playing ? 'Tạm dừng' : 'Phát nhạc');
  if (elements.currentTime) elements.currentTime.textContent = formatTime(audio.currentTime);
  if (elements.duration) elements.duration.textContent = formatTime(audio.duration);
  if (elements.progress) {
    const percentage = audio.duration ? audio.currentTime / audio.duration * 100 : 0;
    elements.progress.style.width = `${percentage}%`;
  }
  if (elements.volume) elements.volume.value = String(audio.volume);
  if (elements.volumeIcon) elements.volumeIcon.style.opacity = audio.volume === 0 ? '.45' : '1';
}

function showTrack(track) {
  if (elements.title) elements.title.textContent = track.name;
  if (elements.artist) elements.artist.textContent = track.artist;
}

function getTrackUrl(file) {
  return new URL(`../../music/${encodeURIComponent(file)}`, import.meta.url).href;
}

function loadTrack(index, autoplay = false) {
  const audio = elements.audio;
  if (!audio || PLAYLIST.length === 0) return;
  currentTrackIndex = (index + PLAYLIST.length) % PLAYLIST.length;
  const track = PLAYLIST[currentTrackIndex];
  const currentFile = decodeURIComponent(audio.currentSrc.split('/').pop() || '');
  showTrack(track);
  localStorage.setItem('music_file', track.file);

  if (currentFile !== track.file) {
    audio.src = getTrackUrl(track.file);
    audio.load();
  } else if (audio.ended) {
    audio.currentTime = 0;
  }

  localStorage.setItem('music_time', '0');
  if (autoplay) audio.play().catch(() => {});
  updateUI();
}

function changeTrack(direction) {
  loadTrack(currentTrackIndex + direction, true);
}

function startAutoplay(audio) {
  const removeFallback = () => {
    window.removeEventListener('pointerdown', resumeOnInteraction);
    window.removeEventListener('keydown', resumeOnInteraction);
  };
  const resumeOnInteraction = () => {
    audio.play().then(removeFallback).catch(() => {});
  };

  audio.play().then(removeFallback).catch(() => {
    window.addEventListener('pointerdown', resumeOnInteraction, { passive: true });
    window.addEventListener('keydown', resumeOnInteraction);
  });
}

export function initMusicPlayer() {
  cacheElements();
  const audio = elements.audio;
  if (!audio || audio.dataset.ready) return;
  audio.dataset.ready = 'true';

  const savedVolume = Number.parseFloat(localStorage.getItem('single_music_volume'));
  audio.volume = Number.isFinite(savedVolume) ? Math.min(1, Math.max(0, savedVolume)) : .5;
  lastVolume = audio.volume || .5;

  audio.addEventListener('timeupdate', () => {
    const now = performance.now();
    if (now - lastRenderedAt < 180) return;
    lastRenderedAt = now;
    localStorage.setItem('music_time', String(audio.currentTime));
    updateUI();
  });
  audio.addEventListener('loadedmetadata', updateUI);
  audio.addEventListener('play', updateUI);
  audio.addEventListener('pause', updateUI);
  audio.addEventListener('ended', () => changeTrack(1));

  elements.play?.addEventListener('click', () => {
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });
  elements.previous?.addEventListener('click', () => changeTrack(-1));
  elements.next?.addEventListener('click', () => changeTrack(1));

  elements.progressTrack?.addEventListener('pointerdown', event => {
    if (!audio.duration) return;
    const rect = elements.progressTrack.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    updateUI();
  });

  elements.mute?.addEventListener('click', () => {
    if (audio.volume > 0) {
      lastVolume = audio.volume;
      audio.volume = 0;
    } else {
      audio.volume = lastVolume || .5;
    }
    localStorage.setItem('single_music_volume', String(audio.volume));
    updateUI();
  });

  elements.volume?.addEventListener('input', event => {
    audio.volume = Number(event.currentTarget.value);
    if (audio.volume > 0) lastVolume = audio.volume;
    localStorage.setItem('single_music_volume', String(audio.volume));
    updateUI();
  });

  const favoriteKey = 'single_music_favorite';
  const setFavorite = isFavorite => {
    elements.favorite?.classList.toggle('active', isFavorite);
    elements.favorite?.setAttribute('aria-pressed', String(isFavorite));
  };
  setFavorite(localStorage.getItem(favoriteKey) === '1');
  elements.favorite?.addEventListener('click', () => {
    const isFavorite = !elements.favorite.classList.contains('active');
    localStorage.setItem(favoriteKey, isFavorite ? '1' : '0');
    setFavorite(isFavorite);
  });

  const savedFile = localStorage.getItem('music_file');
  const savedIndex = PLAYLIST.findIndex(track => track.file === savedFile);
  currentTrackIndex = savedIndex >= 0 ? savedIndex : 0;
  const track = PLAYLIST[currentTrackIndex];
  showTrack(track);

  const currentFile = decodeURIComponent(audio.currentSrc.split('/').pop() || '');
  if (currentFile !== track.file) {
    audio.src = getTrackUrl(track.file);
    audio.load();
  }

  const savedTime = Number.parseFloat(localStorage.getItem('music_time'));
  const restoreTime = () => {
    if (Number.isFinite(savedTime) && savedTime >= 0 && savedTime < audio.duration) audio.currentTime = savedTime;
    updateUI();
  };
  if (audio.readyState >= 1) restoreTime();
  else audio.addEventListener('loadedmetadata', restoreTime, { once: true });
  updateUI();
  startAutoplay(audio);
}
