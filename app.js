const DEFAULT_SOUNDFONT = 'Doumbek-Faisal';
const DEFAULT_DRUMKIT = 'doumbek';
const DEFAULT_BUTTONS = JSON.stringify({
  'b1': 60,
  'b2': 61,
  'b3': 62,
  'b4': 63,
  'b5': 64,
  'b6': 65
});
const LOOPER_INTERVAL_MSEC = 25;
const LOOPER_AHEAD_TIME_SEC = 0.5;
const LOOPER_COUNTDOWN_SEC = 4.0;
const MODE_IDLE = 'idle';
const MODE_RECORDING = 'rec';
const MODE_PLAYING = 'play';
const MODE_COUNTING = 'count';
const EVENT_USER = 'user';
const EVENT_COUNTER = 'counter';

let drums = null;
let storage = null;
let soundfonts = null;
let soundfont = DEFAULT_SOUNDFONT;
let drumkit = DEFAULT_DRUMKIT;
let buttons = JSON.parse(DEFAULT_BUTTONS);
let ac = null;
let loop = [];
let loopMode = MODE_IDLE;
let loopStartTime = null;
let loopNextTime = null;
let loopDuration = null;

async function loadSoundFonts() {
  if (!soundfonts) {
    soundfonts = await fetch('soundfonts.json')
      .then(data => data.json())
      .then(json => json)
  }
}

async function loadDrumkit() {
  return new Promise((resolve, reject) => {
    ac = new AudioContext();
    Soundfont.instrument(ac, drumkit, { soundfont, nameToUrl: function(name, sf, format) {
      format = format || 'mp3';
      return `sounds/${sf}/${name}-${format}.js`;
    }})
    .then(drumkit => {
      resolve(drumkit);
    });
  });
}

async function playButton(button) {
  if (loopMode === MODE_RECORDING) {
    loop.push({ button, when: ac.currentTime - loopStartTime });
  }
  drums.play(buttons[button], 0, { gain: 10 });
}

async function playDrum(event) {
  if (event.target.classList.contains('pad')) {
    event.preventDefault();
    removeSoundSelect();
    playButton(event.target.dataset.button);
  }
}

function removeSoundSelect() {
  document.querySelectorAll('select.sound').forEach(e => e.remove());
  document.querySelectorAll('img.icon').forEach(e => e.hidden = false);
}

async function playKey(event) {
  const keys = {
    'Digit1': 'b1',
    'Digit2': 'b2',
    'Digit3': 'b3',
    'Digit4': 'b4',
    'Digit5': 'b5',
    'Digit6': 'b6'
  }
  if (event.code in keys) {
    event.preventDefault();
    playButton(keys[event.code]);
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    removeSoundSelect();
  }
  if (event.key === ' ') {
    event.preventDefault();
    transitionMode();
  }
}

async function clickMode(event) {
  event.preventDefault();
  transitionMode();
}

async function clickPlay(event) {
  event.preventDefault();

  // Force playing.
  loopStartTime = loopNextTime = ac.currentTime;
  loopMode = MODE_PLAYING;
  displayMode();
}

function counter() {
  displayMode();
  if (loopMode !== MODE_COUNTING) {
    return;
  }
  else if (ac.currentTime - loopStartTime >= LOOPER_COUNTDOWN_SEC) {
    transitionMode(EVENT_COUNTER);
  }
  else {
    window.setTimeout(counter, LOOPER_INTERVAL_MSEC);
  }
}

// Looper state machine.
function transitionMode(event = EVENT_USER) {
  if (event === EVENT_COUNTER && loopMode === MODE_COUNTING) {
    // Done countdown, do record.
    loop = [];
    loopMode = MODE_RECORDING;
    loopStartTime = ac.currentTime;
  }
  else if (event === EVENT_USER && loopMode === MODE_COUNTING) {
    // Abort countdown, go back to idle.
    loopMode = MODE_IDLE;
  }
  else if (loopMode === MODE_RECORDING) {
    // Done recording, do playback.
    loopDuration = ac.currentTime - loopStartTime;
    loopStartTime = loopNextTime = ac.currentTime;
    loopMode = MODE_PLAYING;
  }
  else if (loopMode === MODE_PLAYING) {
    // Done playing, go back to idle.
    loopMode = MODE_IDLE;
  }
  else if (loopMode === MODE_IDLE) {
    // Start countdown.
    loopMode = MODE_COUNTING;
    loopStartTime = ac.currentTime;
    window.setTimeout(counter, LOOPER_INTERVAL_MSEC);
  }
  displayMode();
}

function displayMode() {
  const mode = document.getElementById('mode');
  switch (loopMode) {
    case MODE_IDLE:
      mode.innerText = '⏸'; break;
    case MODE_RECORDING:
      mode.innerText = '⏺'; break;
    case MODE_PLAYING:
      mode.innerText = '▶'; break;
    case MODE_COUNTING:
      const elapsed = ac.currentTime - loopStartTime;
      const seconds = Math.floor(elapsed);
      const quarters = '.'.repeat(Math.floor(4.0 * (elapsed - seconds)));
      mode.innerText = `${LOOPER_COUNTDOWN_SEC - seconds}${quarters}`;
  }
  const play = document.querySelector('#play button');
  play.style.visibility = loop.length > 0 && [MODE_IDLE, MODE_PLAYING].includes(loopMode) ? 'visible' : 'hidden';
}

function selectDrum(event) {
  if (event.target.classList.contains('pad')) {
    const select = document.createElement('select');
    select.classList.add('sound');
    select.addEventListener('change', () => {
      buttons[event.target.dataset.button] = Number(select.options[select.selectedIndex].value);
      if (storage) {
        storage.setItem('buttons', JSON.stringify(buttons));
      }
      removeSoundSelect();
    });
    const sounds = Object.values(buttons).filter(s => s !== buttons[event.target.dataset.button]);
    for (sound in soundfonts[soundfont][drumkit]['sounds']) {
      const option = document.createElement('option')
      option.value = sound;
      option.text = soundfonts[soundfont][drumkit]['sounds'][sound];
      option.disabled = sounds.includes(Number(sound));
      select.appendChild(option);
    }
    select.value = buttons[event.target.dataset.button];
    event.target.querySelectorAll('img.icon').forEach(e => e.hidden = true);
    event.target.appendChild(select);
  }
}

async function looper() {
  if (loopMode === MODE_PLAYING && loopNextTime < ac.currentTime + LOOPER_AHEAD_TIME_SEC) {
    // Advance cursor immediately to avoid duplicate beat scheduling.
    const thisTime = loopNextTime;
    loopNextTime += LOOPER_AHEAD_TIME_SEC;
    // Schedule all beats in current time slice.
    const beats = loop.filter(b => b.when >= thisTime - loopStartTime && b.when < thisTime + LOOPER_AHEAD_TIME_SEC - loopStartTime);
    beats.forEach(b => drums.play(buttons[b.button], loopStartTime + b.when, { gain: 10 }));
    if (loopNextTime - loopStartTime >= loopDuration) {
      // We're done scheduling all the beats, but we need to wait until they've all been played.
      const wait = (loopStartTime + loopDuration - ac.currentTime) * 1000 - LOOPER_INTERVAL_MSEC;
      await new Promise(resolve => window.setTimeout(resolve, wait));
      // Done waiting, restart loop.
      loopStartTime = loopNextTime = ac.currentTime;
    }
  }
  window.setTimeout(looper, LOOPER_INTERVAL_MSEC);
}

// https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
function setStorage(type) {
  try {
    storage = window[type];
    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
  }
  catch (e) {
    console.error(`Problem accessing localStorage: ${e.toString()}`)
    if (e instanceof DOMException && (
      // everything except Firefox
      e.code === 22 ||
      // Firefox
      e.code === 1014 ||
      // test name field too, because code might not be present
      // everything except Firefox
      e.name === 'QuotaExceededError' ||
      // Firefox
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
      // acknowledge QuotaExceededError only if there's something already stored
      (storage && storage.length !== 0)) {
        // Accept the storage.
      } else {
        storage = null;
      }
  }
}

function restoreSettings() {
  if (storage) {
    soundfont = storage.getItem('soundfont') ?? DEFAULT_SOUNDFONT;
    drumkit = storage.getItem('drumkit') ?? DEFAULT_DRUMKIT;
    buttons = JSON.parse(storage.getItem('buttons') ?? DEFAULT_BUTTONS);
  }
}

function setViewportHeight() {
  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

function audioContextEventWrapper(callback) {
  return async function(event) {
    ac.resume().then(() => callback(event));
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  // Initialization.
  setViewportHeight();
  setStorage('localStorage');

  // Load up the sounds.
  await loadSoundFonts();
  restoreSettings();
  drums = await loadDrumkit();

  // Activate the UI.
  displayMode();
  const mode = document.getElementById('mode');
  mode.addEventListener('mousedown', audioContextEventWrapper(clickMode));
  mode.addEventListener('touchstart', audioContextEventWrapper(clickMode));
  const play = document.querySelector('#play button');
  play.addEventListener('mousedown', audioContextEventWrapper(clickPlay));
  play.addEventListener('touchstart', audioContextEventWrapper(clickPlay));
  const drumkit = document.getElementById('drumkit');
  drumkit.addEventListener('mousedown', audioContextEventWrapper(playDrum));
  drumkit.addEventListener('touchstart', audioContextEventWrapper(playDrum));
  const hammer = new Hammer(drumkit, {
    recognizers: [[Hammer.Press, { time: 1500 }]]
  });
  hammer.on('press', selectDrum);
  document.addEventListener('keydown', audioContextEventWrapper(playKey));
  window.addEventListener('resize', () => setTimeout(setViewportHeight, 100));

  // Start the playback loop.
  window.setTimeout(looper, LOOPER_INTERVAL_MSEC);
});
