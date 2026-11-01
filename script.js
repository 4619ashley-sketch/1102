const playButton = document.getElementById('playButton');
const progressSlider = document.getElementById('trackProgress');
const trackTime = document.getElementById('trackTime');
const playerStatus = document.getElementById('playerStatus');
const trackDuration = 24;

let audioContext;
let trackBuffer;
let currentSource;
let isPlaying = false;
let playhead = 0;
let startedAt = 0;

function formatTime(seconds) {
  const safeSeconds = Math.floor(Math.max(0, Math.min(trackDuration, seconds)));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

function updatePlayer() {
  const currentTime = isPlaying
    ? Math.min(trackDuration, playhead + audioContext.currentTime - startedAt)
    : playhead;

  progressSlider.value = String(currentTime);
  trackTime.textContent = `${formatTime(currentTime)} / ${formatTime(trackDuration)}`;
}

function createDemoTrack(context) {
  const sampleRate = context.sampleRate;
  const buffer = context.createBuffer(1, sampleRate * trackDuration, sampleRate);
  const samples = buffer.getChannelData(0);
  const chords = [
    [130.81, 164.81, 196, 246.94],
    [98, 123.47, 146.83, 196],
    [110, 130.81, 164.81, 220],
    [87.31, 110, 130.81, 174.61]
  ];
  const melody = [
    523.25, 493.88, 392, 440,
    523.25, 587.33, 493.88, 392,
    440, 523.25, 392, 329.63,
    349.23, 392, 440, 523.25
  ];

  for (let index = 0; index < samples.length; index += 1) {
    const time = index / sampleRate;
    const chord = chords[Math.floor(time / 6)];
    const noteIndex = Math.min(melody.length - 1, Math.floor(time / 1.5));
    const noteTime = time % 1.5;
    const chordPulse = 0.78 + 0.22 * Math.sin((time / 6) * Math.PI);
    const noteEnvelope = Math.exp(-noteTime * 2.8);
    const fadeOut = Math.min(1, (trackDuration - time) / 0.8);
    let sample = 0;

    for (let chordIndex = 0; chordIndex < chord.length; chordIndex += 1) {
      const frequency = chord[chordIndex];
      sample += Math.sin(2 * Math.PI * frequency * time) * 0.028;
      sample += Math.sin(2 * Math.PI * frequency * 2 * time) * 0.006;
    }

    sample += Math.sin(2 * Math.PI * chord[0] * 0.5 * time) * 0.035;
    sample += Math.sin(2 * Math.PI * melody[noteIndex] * time) * 0.11 * noteEnvelope;
    samples[index] = sample * chordPulse * fadeOut;
  }

  return buffer;
}

function stopPlayback() {
  if (!isPlaying) {
    return;
  }

  playhead = Math.min(trackDuration, playhead + audioContext.currentTime - startedAt);
  isPlaying = false;
  currentSource.onended = null;
  currentSource.stop();
  currentSource.disconnect();
  currentSource = null;
  playButton.setAttribute('aria-pressed', 'false');
  playButton.setAttribute('aria-label', '播放新曲試聽');
  playButton.querySelector('.play-icon').textContent = '▶';
  playerStatus.textContent = '試聽已暫停';
  updatePlayer();
}

async function startPlayback() {
  if (!window.AudioContext) {
    playerStatus.textContent = '此瀏覽器不支援音訊播放，請改用最新版瀏覽器。';
    return;
  }

  try {
    audioContext ??= new window.AudioContext();
    await audioContext.resume();
  } catch (error) {
    playerStatus.textContent = '無法啟動音訊，請確認瀏覽器的播放權限後再試。';
    console.error('Unable to start the audio preview:', error);
    return;
  }

  if (!trackBuffer) {
    trackBuffer = createDemoTrack(audioContext);
  }

  if (playhead >= trackDuration) {
    playhead = 0;
  }

  currentSource = audioContext.createBufferSource();
  currentSource.buffer = trackBuffer;
  currentSource.connect(audioContext.destination);
  currentSource.onended = () => {
    if (isPlaying) {
      isPlaying = false;
      playhead = 0;
      currentSource = null;
      playButton.setAttribute('aria-pressed', 'false');
      playButton.setAttribute('aria-label', '播放新曲試聽');
      playButton.querySelector('.play-icon').textContent = '▶';
      playerStatus.textContent = '試聽結束，再聽一次沿著微光';
      updatePlayer();
    }
  };

  startedAt = audioContext.currentTime;
  currentSource.start(0, playhead);
  isPlaying = true;
  playButton.setAttribute('aria-pressed', 'true');
  playButton.setAttribute('aria-label', '暫停新曲試聽');
  playButton.querySelector('.play-icon').textContent = 'Ⅱ';
  playerStatus.textContent = '正在播放原創合成試聽旋律';
  updatePlayer();
}

playButton.addEventListener('click', () => {
  if (isPlaying) {
    stopPlayback();
  } else {
    startPlayback();
  }
});

progressSlider.addEventListener('input', () => {
  if (!isPlaying) {
    playhead = Number(progressSlider.value);
    updatePlayer();
  }
});

progressSlider.addEventListener('change', async () => {
  if (isPlaying) {
    const requestedPosition = Number(progressSlider.value);
    stopPlayback();
    playhead = requestedPosition;
    updatePlayer();
    await startPlayback();
  }
});

window.setInterval(updatePlayer, 150);
