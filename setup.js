// Setup: canvases, style block, level table, global state.
const canvas = document.getElementById('canvas1');
const ctx1 = canvas.getContext('2d');
canvas.width = 600;
canvas.height = 600;

const canvas2 = document.getElementById('canvas2');
const ctx2 = canvas2.getContext('2d');
canvas2.width = 600;
canvas2.height = 600;

const canvas3 = document.getElementById('canvas3');
const ctx3 = canvas3.getContext('2d');
canvas3.width = 600;
canvas3.height = 600;

const canvas4 = document.getElementById('canvas4');
const ctx4 = canvas4.getContext('2d');
canvas4.width = 600;
canvas4.height = 600;

const canvas5 = document.getElementById('canvas5');
const ctx5 = canvas5.getContext('2d');
canvas5.width = 600;
canvas5.height = 600;

// ---- Style block: single source of truth for palette + sizes ----
const STYLE = {
  outline: '#14281d',
  outlineWidth: 3,
  light: 'top-left',
  frog: '#4fc94f',
  frogDark: '#2e8b3a',
  pad: '#3fae5a',
  padDark: '#257a3c',
  homeGlow: '#ffe066',
  fly: '#ffd23f',
  water: '#2e6fd8',
  road: '#3a3f4a',
  textDark: '#10231a',
};
// Size table for entities.
const SIZES = { grid: 80, frog: 50, carW: 160, carH: 80, logW: 160, logH: 80 };

// ---- Global variables ----
const grid = SIZES.grid;
let keys = {};
let score = 0;
let best = 0;
let lives = 5;
let levelIndex = 0;
let streak = 0;
let frame = 0;
let gameSpeed = 1;
let safe = false;
let screen = 'title'; // title | help | playing | paused | levelclear | gameover
let gameoverReason = '';
let gameWon = false;
let deathTimer = 0;
let levelClearTimer = 0;
let hopCount = 0;
let homesCount = 0;

const particlesArray = [];
const maxParticles = 300;
const ripplesArray = [];
const carsArray = [];
const logsArray = [];
const floatersArray = [];
const weatherArray = [];
let homes = []; // {x,y,w,h,filled}
let fly = null; // {padIndex, until}
let flyTimer = 0;

function clearEffects() {
  particlesArray.length = 0;
  ripplesArray.length = 0;
  floatersArray.length = 0;
}

// ---- Level table: palette, speeds, density, weather ----
const LEVELS = [
  {
    name: 'Meadow Crossing',
    sub: 'Morning hop — learn the road',
    // Signed lane speeds: each lane's sign is its direction. Do NOT negate again.
    roadSpeeds: [0.8, -1.2, 0.7],
    carsPerLane: 2,
    carW: 120,
    waterSpeeds: [-1.1, 0.9],
    riverLogs: 3,
    riverTurtles: 4,
    diving: false,
    timeLimit: 45,
    flyEvery: 12,
    musicRoot: 110,
    musicBpm: 100,
    tint: 'rgba(80, 200, 120, 0.07)',
    sky: ['#bfe8ff', '#e8f9e8'],
    weather: 'fireflies',
    splash: 'Morning mist over the pond',
  },
  {
    name: 'Dusk Rapids',
    sub: 'Sinking turtles — time your ride',
    roadSpeeds: [-1.7, 2.4, -1.2],
    carsPerLane: 2,
    carW: 140,
    waterSpeeds: [1.8, -1.5],
    riverLogs: 2,
    riverTurtles: 3,
    diving: true,
    timeLimit: 40,
    flyEvery: 10,
    musicRoot: 98,
    musicBpm: 112,
    tint: 'rgba(150, 90, 220, 0.14)',
    sky: ['#3b2d5c', '#e08a5c'],
    weather: 'embers',
    splash: 'The river runs faster at dusk',
  },
  {
    name: 'Night Highway',
    sub: 'Neon rush — no second chances',
    roadSpeeds: [2.4, -3.4, 1.8],
    carsPerLane: 3,
    carW: 160,
    waterSpeeds: [-2.4, 2.0],
    riverLogs: 3,
    riverTurtles: 3,
    diving: true,
    timeLimit: 35,
    flyEvery: 9,
    musicRoot: 87.3,
    musicBpm: 124,
    tint: 'rgba(40, 120, 255, 0.16)',
    sky: ['#0b1026', '#274b73'],
    weather: 'rain',
    splash: 'Headlights. Wet road. Hop fast.',
  },
];

// Cached per-frame gradients (rebuilt on level change, never per frame).
let cachedTint = null, cachedVignette = null, cachedSky = null;
function cacheBackdrop() {
  const lvl = LEVELS[levelIndex];
  cachedTint = lvl.tint;
  cachedVignette = ctx5.createRadialGradient(300, 280, 220, 300, 300, 460);
  cachedVignette.addColorStop(0, 'rgba(0,0,0,0)');
  cachedVignette.addColorStop(1, 'rgba(5,10,20,0.42)');
  cachedSky = ctx5.createLinearGradient(0, 0, 0, 120);
  cachedSky.addColorStop(0, lvl.sky[0] + '55');
  cachedSky.addColorStop(1, 'rgba(255,255,255,0)');
}

// Crossing-attempt clock: seconds left for the current life/pad attempt.
let timeLeft = 60;
let lastTickSecond = -1;
function resetClock() {
  timeLeft = LEVELS[levelIndex].timeLimit;
  lastTickSecond = -1;
}

// ---- Images ----
const background_lvl2 = new Image();
background_lvl2.src = 'images/background_lvl2.png';

const grass = new Image();
grass.src = 'images/grass.png';

const collisions = new Image();
collisions.src = 'images/collisions.png';

const turtle = new Image();
turtle.src = 'images/turtles.png';

const log = new Image();
log.src = 'images/log.png';

const car = new Image();
car.src = 'images/cars.png';
let numberOfCars = 3;

const froggerSprite = new Image();
froggerSprite.src = 'images/frog_spritesheet.png';

// ---- Small helpers ----
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function rand(a, b) { return a + Math.random() * (b - a); }

try {
  best = parseInt(localStorage.getItem('knotzFrogHopBest') || '0', 10) || 0;
} catch (e) { best = 0; }
function saveBest() {
  try {
    if (score > best) {
      best = score;
      localStorage.setItem('knotzFrogHopBest', String(best));
    }
  } catch (e) { /* storage unavailable */ }
}
