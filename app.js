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

// Available soundfonts
let soundfonts = null;

// Current values
let soundfont = DEFAULT_SOUNDFONT;
let drumkit = DEFAULT_DRUMKIT;
let buttons = JSON.parse(DEFAULT_BUTTONS);
let drums = null;
let storage = null;

async function loadSoundFonts() {
  if (!soundfonts) {
    soundfonts = await fetch('soundfonts.json')
      .then(data => data.json())
      .then(json => json)
  }
}

async function loadDrumkit() {
  return new Promise((resolve, reject) => {
    Soundfont.instrument(new AudioContext(), drumkit, { soundfont, nameToUrl: function(name, sf, format) {
      format = format || 'mp3';
      return `sounds/${sf}/${name}-${format}.js`;
    }})
    .then(drumkit => {
      resolve(drumkit);
    });
  });
}

async function playButton(button) {
  if (!drums) {
    drums = await loadDrumkit();
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
    removeSoundSelect();
  }
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

window.addEventListener('DOMContentLoaded', async () => {
  // Initialization.
  setViewportHeight();
  setStorage('localStorage');

  // Load up the sounds.
  await loadSoundFonts();
  restoreSettings();

  // Activate the UI.
  window.addEventListener('resize', () => {
    setTimeout(setViewportHeight, 100);
  });

  const drumkit = document.getElementById('drumkit');
  drumkit.addEventListener('mousedown', playDrum);
  drumkit.addEventListener('touchstart', playDrum);
  const hammer = new Hammer(drumkit, {
    recognizers: [[Hammer.Press, { time: 1500 }]]
  });
  hammer.on('press', selectDrum);
  document.addEventListener('keydown', playKey);
});
