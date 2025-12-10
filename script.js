// --- DOM refs ---
const dialogueModal = document.getElementById("dialogueModal");
const dialogueImg = document.getElementById("dialogueImg");
const dialogueText = document.getElementById("dialogueText");

const leftModal = document.getElementById("leftModal");
const doorModal = document.getElementById("doorModal");
const bookModalEl = document.getElementById("bookModal");
const keypadModal = document.getElementById("keypadModal");
const lockModalEl = document.getElementById("lockModal");
const tvModalEl = document.getElementById("tvModal");
const tvStaticAudio = document.getElementById("tvStatic");
const ambianceAudio = document.getElementById("ambianceAudio");
const tensionAudio = document.getElementById("tensionAudio");
const body = document.body;

// Instantiate the small sfx as New Audio for easier calls
const stepAudio = new Audio("sounds/footsteps-1.wav");
const jumpscareAudio = new Audio("sounds/deathsound.mp3");
const metalSfx = new Audio("sounds/metalthing.wav");
const clickSfx = new Audio("sounds/click.wav");

document.addEventListener("click", startAmbianceOnce);

// Game State Variables
const TENSION_DURATION_MS = 20000; // 20s heartbeat
const MAX_DEGRADATION = 100; // For visual/audio tension ramp
const PLAYER_TIME_MS = 90000; // 90 seconds total time to escape

let degradationLevel = 0;
let degradationTimer = null;
let tensionVolume = 0.0;
let isDead = false;
let boxSolved = false;
let typeTimeout = null;
let closeTimeout = null;
let currentIndex = 0;

let gameStarted = false;

document.addEventListener("DOMContentLoaded", () => {
  refreshAllLockImages();

  // Show left room as starting room
  show(leftModal);

  // Optionally hide the main room elements if needed
  // (Depends on whether main room content is separate or just the background)
});


/* Slowly increases the tension audio volume and checks for the time-up condition. */
function updateDegradation() {
  degradationLevel++;

  if (degradationLevel <= MAX_DEGRADATION) {
    // 1. ESCALATE AUDIO VOLUME & VISUAL TENSION
    tensionVolume += 0.01;
    tensionAudio.volume = tensionVolume;

    // --- NEW VISUAL EFFECT LOGIC ---
    // A. Apply BASE TENSION (slowly builds)
    const sepiaVal = tensionVolume * 0.5; // Max 50% sepia
    const hueRotateVal = tensionVolume * 36; // Max 36 degrees rotation
    const baseFilter = `grayscale(100%) sepia(${sepiaVal}) hue-rotate(${hueRotateVal}deg)`;
    body.style.filter = baseFilter;

    // B. Apply RHYTHMIC PULSE (flashes with every 'beat')
    // We pulse the filter/transform briefly to simulate a visual shockwave.
    // Using a separate class/style for the pulse can be cleaner, but here we manually pulse and revert.
    // For a heartbeat pulse, you want the pulse to happen *at the moment* the sound plays.
    // Since this function runs every 600ms, and the sound is 2000ms, this timing is off.
    // The pulse should be triggered by the `seamlessLoop` below, but for now we keep the existing logic.

    // NOTE: This visual pulse is timed incorrectly relative to the 2.0s heartbeat loop.
    // To fix, you'd need to coordinate this logic with the `seamlessLoop` function.

    // Pulse effect

    // Revert transform and pulse state after 50ms

    // console.log(`Degradation Level: ${degradationLevel}, Tension Volume: ${tensionVolume.toFixed(2)}`);
  }

  // 2. CHECK FOR DEATH CONDITION
  if (degradationLevel >= MAX_DEGRADATION) {
    clearInterval(degradationTimer);
    handleEnvironmentalDeath();
  }
}

/** Starts the hidden, sound-based time limit. */
function startEnvironmentalTimer() {
  // Degradation runs every 600 milliseconds (0.6 seconds)
  if (!degradationTimer) {
    degradationTimer = setInterval(updateDegradation, 600);
  }
}

/** Stops the timer (call this when the player wins). */
function stopEnvironmentalTimer() {
  clearInterval(degradationTimer);
  degradationTimer = null;
  tensionAudio.pause();
}

/** Handles the game-over state when the sound timer runs out. */
function handleEnvironmentalDeath() {
  isDead = true;
  jumpscare();
}

function playQuickStep() {
  stepAudio.currentTime = 0;
  stepAudio.volume = 1;
  stepAudio.play();
}

/** Starts ambiance and the heartbeat loop. */
function startAmbianceOnce() {
  // Ambiance setup

  if (gameStarted) {
        return; 
    }

  gameStarted = true
  ambianceAudio.muted = false;
  ambianceAudio
    .play()
    .catch((error) => console.error("Ambiance failed:", error));

  // --- Tension Audio Loop FIX (Seamless playback) ---
  tensionAudio.muted = false;
  function seamlessLoop() {
    tensionAudio.volume = tensionVolume;
    tensionAudio.currentTime = 0;
    tensionAudio
      .play()
      .catch((error) => console.error("Tension audio playback failed:", error));

    // Schedule next loop just before it ends
    setTimeout(() => {
      if (!isDead && degradationTimer) {
        seamlessLoop();
      }
    }, TENSION_DURATION_MS - 50); // 50ms early to hide any gap
  }

  // Start the heartbeat sound via the seamless loop
  tensionAudio.muted = false;
  seamlessLoop();
  startCountdown(); // visible countdown in top-right

  // Start the hidden, time-based degradation
  startEnvironmentalTimer();

  body.removeEventListener("click", startAmbianceOnce);
}
function playSFX(audioElement) {
  // Replay element from start if it's already playing
  audioElement.currentTime = 0;
  audioElement.play().catch((error) => {
    console.warn(`SFX playback failed for ${audioElement.id}:`, error);
  });
}

// --- modal helpers ---
// Using default "flex" for centering, which fixes the keypad issue
function show(el, display = "flex") {
  if (!el) return;
  el.style.display = display;
  el.setAttribute("aria-hidden", "false");
}
function hide(el) {
  if (!el) return;
  el.style.display = "none";
  el.setAttribute("aria-hidden", "true");
}

// --- navigation functions ---
function lookLeft() {
  show(leftModal);
  playQuickStep();
}
function lookRight() {
  hide(leftModal);
  playQuickStep();
}
function lookRightDoor() {
  show(doorModal);
  playQuickStep();
}
function lookLeftDoor() {
  hide(doorModal);
  playQuickStep();
}

// --- object interaction functions ---
function bookModal() {
  show(bookModalEl);
  playSFX(openBookAudio);
}
function openKeypadModal() {
  // Explicitly use "flex" to ensure centering
  show(keypadModal, "flex");
}
function lockModal() {
  show(lockModalEl);
}
function tvModal() {
  if (boxSolved) {
    show(tvModalEl);
    // Use playSFX on the TV static element (which is looped)
    tvStaticAudio.muted = false;
    tvStaticAudio.volume = 0.25;
    tvStaticAudio.play();
  } else {
    playSFX(clickSfx);
  }
}

function closeModal(id) {
  const modalEl = document.getElementById(id);
  hide(modalEl);

  if (id === "bookModal") {
    // Play the closing sound effect
    const closeBookAudio = document.getElementById("closeBookAudio");
    playSFX(closeBookAudio);
  } else if (id === "tvModal") {
    // Pause TV static when closing TV
    tvStaticAudio.pause();
    tvStaticAudio.currentTime = 0;
  }
}

// --- dialogue / riddles ---
const dialogues = [
  "Sixty seconds, that’s all. I will guide you… sometimes. Look under the bed. There is a book. Inside, a cipher. Read it carefully.",
  "The wall… it has numbers. The numbers from the cipher show the way. Open the lockbox. Inside… a remote. Use it. Wake the television.",
  "I told you once… memorize the numbers on the TV. They… they lead to the door. Hurry. Don’t make me repeat myself.",
  "Why do you keep asking? I’m… I’m running out of patience. Ask again and I will… you will see what happens when I get hungry.",
  "Do you enjoy testing me? Do you want to join them… or me? The door, the numbers… they will save you, if you can even remember them. Otherwise… I will find you. Always. I will eat you.",
];

function jumpscare() {
  const jumpscareScreen = document.getElementById("jumpscareScreen");
  const jumpscareImage = document.getElementById("jumpscareImage");

  jumpscareScreen.style.display = "block";
  jumpscareImage.style.transform = "translate(-50%, -50%) scale(1.1)";
  jumpscareAudio.play();
  jumpscareAudio.addEventListener("ended", () => {
    window.location.reload();
  });
}

document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    // Assuming Enter is your trigger for instant death/restart for debugging
    jumpscare();
  }
});

function showDialogue() {
  // block interactions
  const blocker = document.getElementById("dialogueBlocker");
  blocker.style.display = "block";

  if (currentIndex < dialogues.length) {
    typeText(dialogues[currentIndex], 20);
    currentIndex++;
  } else {
    isDead = true;
    jumpscare();
  }
}
function hideDialogue() {
  hide(dialogueModal);
  document.getElementById("dialogueBlocker").style.display = "none";
}

function typeText(text, speed = 25) {
  // clear timers
  clearTimeout(typeTimeout);
  clearTimeout(closeTimeout);

  dialogueText.textContent = "";
  show(dialogueModal); // Use show helper

  let i = 0;

  function type() {
    if (i < text.length) {
      dialogueText.textContent += text.charAt(i);
      i++;
      typeTimeout = setTimeout(type, speed);
    } else if (!isDead) {
      closeTimeout = setTimeout(() => hideDialogue(), 1000);
    }
  }

  type();
}

// --- LOCK MECHANISM ---
const correctCode = [6, 7, 4, 1];
let currentDigits = [0, 0, 0, 0];

function cycleDigit(index) {
  playSFX(metalSfx); // Use the metal sfx for the click
  currentDigits[index] = (currentDigits[index] + 1) % 10;

  updateLockImageAt(index);

  // Check if code is correct
  if (currentDigits.join("") === correctCode.join("")) {
    boxSolved = true;
    hide(lockModalEl);

    // Reward: Turn on the TV and start the static
    document.getElementById("tvTv").src = "images/tvOn.png";
    tvStaticAudio.muted = false;
    tvStaticAudio.volume = 0.25;
    tvStaticAudio.play();
  }
}

/* ---------- SVG digit generator (data-URI) - Kept original logic ---------- */
function createDigitDataURI(digit, size = 256) {
  // ... (Original function logic is kept here) ...
  const d = String(digit).slice(0, 1);
  const radius = size / 2;
  const stroke = Math.round(size * 0.03);
  const innerRing = Math.round(size * 0.66);

  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}' preserveAspectRatio='xMidYMid meet'>
    <defs>
      <radialGradient id='g1' cx='50%' cy='40%' r='80%'>
        <stop offset='0%' stop-color='#f7f7f7' />
        <stop offset='35%' stop-color='#e3e3e3' />
        <stop offset='70%' stop-color='#9e9e9e' />
        <stop offset='100%' stop-color='#6a6a6a' />
      </radialGradient>
      <linearGradient id='g2' x1='0' x2='1'>
        <stop offset='0%' stop-color='rgba(255,255,255,0.06)' />
        <stop offset='100%' stop-color='rgba(0,0,0,0.08)' />
      </linearGradient>
      <filter id='grain'>
        <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' stitchTiles='stitch'/>
        <feColorMatrix type='saturate' values='0' />
        <feBlend mode='overlay'/>
      </filter>
    </defs>

    <rect width='100%' height='100%' rx='24' ry='24' fill='url(#g1)'/>
    <rect width='100%' height='100%' rx='24' ry='24' fill='url(#g2)' opacity='0.25'/>

    <circle cx='${radius}' cy='${radius}' r='${
    innerRing / 2
  }' fill='#222' stroke='#111' stroke-width='${stroke / 2}' />
    <circle cx='${radius}' cy='${radius}' r='${
    innerRing / 2 - stroke * 2
  }' fill='#0b0b0b' stroke='#333' stroke-width='${stroke / 3}' />

    <g stroke='#444' stroke-width='1' opacity='0.28'>
      ${Array.from({ length: 12 })
        .map((_, i) => {
          const angle = (i / 12) * 360;
          const x1 =
            radius +
            Math.cos(((angle - 90) * Math.PI) / 180) * (innerRing / 2 - stroke);
          const y1 =
            radius +
            Math.sin(((angle - 90) * Math.PI) / 180) * (innerRing / 2 - stroke);
          const x2 =
            radius +
            Math.cos(((angle - 90) * Math.PI) / 180) *
              (innerRing / 2 - stroke - 8);
          const y2 =
            radius +
            Math.sin(((angle - 90) * Math.PI) / 180) *
              (innerRing / 2 - stroke - 8);
          return `<line x1='${x1}' y1='${y1}' x2='${x2}' y2='${y2}' />`;
        })
        .join("")}
    </g>

    <text x='50%' y='50%' text-anchor='middle' dominant-baseline='central'
      font-family='Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif'
      font-size='${Math.round(size * 0.48)}'
      font-weight='700'
      fill='white'
      style='paint-order:stroke; stroke:#000; stroke-width:${Math.round(
        size * 0.012
      )};'>
      ${d}
    </text>
  </svg>`.trim();

  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");

  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

function updateLockImageAt(index) {
  const imgEl = document.getElementById(`numImg${index + 1}`);
  if (!imgEl) return;
  const digit = currentDigits[index] ?? 0;
  const dataUri = createDigitDataURI(digit, 280);
  imgEl.src = dataUri;
  imgEl.alt = `Digit ${index + 1}: ${digit}`;
}

function refreshAllLockImages() {
  for (let i = 0; i < 4; i++) updateLockImageAt(i);
}

document.addEventListener("DOMContentLoaded", () => {
  refreshAllLockImages();
});

// --- KEYPAD LOGIC ---
const keypadDisplay = document.getElementById("keypadDisplay");
const keypadButtons = Array.from(document.querySelectorAll(".keyBtn"));
const correctKeypadCode = "538927";
let enteredCode = "";

function updateDisplay() {
  const remaining = correctKeypadCode.length - enteredCode.length;
  keypadDisplay.textContent = enteredCode + "-".repeat(remaining);
}

function handleButtonClick(value) {
  playSFX(metalSfx); // Use the metal sfx for the keypad click

  if (value === "C") {
    enteredCode = "";
    updateDisplay();
    return;
  }

  if (value === "E") {
    if (enteredCode === correctKeypadCode) {
      window.location.href = "https://swankye.github.io/pinkie-pie-room-2/";
    } else {
    }
    return;
  }

  // add number if not full
  if (enteredCode.length < correctKeypadCode.length) {
    enteredCode += value;
    updateDisplay();
  }
}

// Attach events
keypadButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = btn.textContent;
    handleButtonClick(value);
  });
});

// Initialize display
updateDisplay();

// -------------------- PRELOADER -------------------- //
// Kept original preloader logic as it was efficient

function hidePreloader() {
  const preloader = document.getElementById("preloader");
  preloader.classList.add("hidden");
  setTimeout(() => preloader.remove(), 800); // fully remove after fade-out
}

function preloadAssets(assetList, onDone) {
  let loaded = 0;

  if (assetList.length === 0) {
    onDone();
    return;
  }

  function checkDone() {
    loaded++;
    if (loaded >= assetList.length) {
      onDone();
    }
  }

  assetList.forEach((src) => {
    if (
      src.endsWith(".png") ||
      src.endsWith(".jpg") ||
      src.endsWith(".jpeg") ||
      src.endsWith(".svg") ||
      src.endsWith(".gif") // Added GIF support
    ) {
      const img = new Image();
      img.onload = checkDone;
      img.onerror = checkDone;
      img.src = src;
    } else if (
      src.endsWith(".mp3") ||
      src.endsWith(".wav") ||
      src.endsWith(".ogg")
    ) {
      const audio = new Audio();
      audio.oncanplaythrough = checkDone;
      audio.onerror = checkDone;
      audio.src = src;
    } else {
      checkDone();
    }
  });
}

const assetsToPreload = [
  // --- Core Images ---
  "images/BackgroundImage.png", // Main room background
  "images/LeftRoom.png", // Left room view background
  "images/EscapeDoor.jpg", // Door view background
  "images/tv.png", // TV off state
  "images/tvOn.png", // TV on state (for boxSolved)
  "images/lockBox.png", // Lock box image
  "images/book.png", // Book image
  "images/XIJINPINGBOOK.png", // Book modal background
  "images/HintGuy.png", // Hint character
  "images/HintFace.png", // Dialogue face
  "images/DialogueBox.png", // Dialogue box background
  "images/leftarrow.png", // Navigation arrows (used for both directions)
  "images/jumpscareImageHOORAY.jpg", // Jumpscare image
  "images/UntitledFast.gif", // TV static/on background GIF
  "images/VHS.gif", // Overlay VHS effect

  // --- Audio Files ---
  "sounds/wind_elevated_area.wav", // ambianceAudio
  "sounds/metalthing.wav", // clickAudio / metalSfx
  "sounds/heartbeat.wav", // tensionAudio
  "sounds/televison-static.mp3", // tvStatic
  "sounds/bookOpen.wav", // openBookAudio
  "sounds/bookClose.wav", // closeBookAudio
  "sounds/footsteps-1.wav", // stepAudio
  "sounds/deathsound.mp3", // jumpscareAudio

  // Note: The digit images are generated dynamically as SVG Data URIs,
  // so they cannot be preloaded like traditional image files.
];

document.addEventListener("DOMContentLoaded", () => {
  preloadAssets(assetsToPreload, hidePreloader);
});



