const STATIONS_PER_DOOR = 3;
const DOORS_PER_ROOM = 1;
const TOTAL_ROOMS = 10;

const progressEl = document.getElementById("progress");
const objectiveEl = document.getElementById("objective");
const roomLabelEl = document.getElementById("room-label");
const statsEl = document.getElementById("stats");
const perksEl = document.getElementById("perks");
const hintEl = document.getElementById("hint");
const studentNameEl = document.getElementById("student-name");
const startOverlay = document.getElementById("start-overlay");
const questionOverlay = document.getElementById("question-overlay");
const roomOverlay = document.getElementById("room-overlay");
const winOverlay = document.getElementById("win-overlay");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const closeQuestionBtn = document.getElementById("close-question");
const anotherQuestionBtn = document.getElementById("another-question");
const questionTitle = document.getElementById("question-title");
const questionText = document.getElementById("question-text");
const choicesEl = document.getElementById("choices");
const feedbackEl = document.getElementById("feedback");
const roomOverlayTitleEl = document.getElementById("room-overlay-title");
const roomOverlayTextEl = document.getElementById("room-overlay-text");
const roomOverlayBtn = document.getElementById("room-overlay-btn");
const finalSummaryEl = document.getElementById("final-summary");
const engineStatusEl = document.getElementById("engine-status");
const joystickAreaEl = document.getElementById("joystick-area");
const joystickKnobEl = document.getElementById("joystick-knob");
const mobileInteractBtn = document.getElementById("mobile-interact");
const mobileJumpBtn = document.getElementById("mobile-jump");
const mobileSprintBtn = document.getElementById("mobile-sprint");
const soundToggleBtn = document.getElementById("sound-toggle");
const lookSensitivityInput = document.getElementById("look-sensitivity");
const lookSensitivityValueEl = document.getElementById("look-sensitivity-value");

const studentName = (localStorage.getItem("escape_student_name") || "").trim();
if (!studentName) {
  window.location.href = "dashboard.html";
  throw new Error("Student name required");
}
const sessionSeed = (localStorage.getItem("escape_session_seed") || `${Date.now()}`);
const selectedCourse = (localStorage.getItem("escape_course") || "algebra1").toLowerCase();

const canvas = document.createElement("canvas");
canvas.style.position = "fixed";
canvas.style.inset = "0";
canvas.style.zIndex = "1";
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");

const gameState = {
  currentRoom: 0,
  currentDoor: 0,
  stations: [],
  attempts: 0,
  correctAnswers: 0,
  score: 0,
  startTimeMs: 0,
  elapsedBeforePauseMs: 0,
  timerActive: false,
  isPlaying: false,
  gameWon: false,
  doorUnlocked: false,
  treasureUnlocked: false,
  treasureCollected: false,
  levelAdvancePending: false,
  endCyclePending: false,
  treasurePos: { x: 6.0, y: 8.9 },
  currentTreasureName: "Ruby of Roots",
  unlockedTreasures: [],
  activeCourse: selectedCourse === "precalculus" ? "precalculus" : "algebra1",
  generatedPool: null,
  levelStartSnapshot: null,
  unlockedRewards: [],
  perks: {
    speedMul: 1,
    jumpMul: 1,
    scoreMul: 1,
    wrongPenalty: 20,
    sprintUnlocked: false
  }
};

const player = {
  x: 2.0,
  y: 2.0,
  angle: 0,
  moveSpeed: 2.8,
  rotSpeed: 2.2,
  z: 0,
  vz: 0
};

const input = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
  ShiftLeft: false,
  ShiftRight: false,
  ArrowLeft: false,
  ArrowRight: false
};

const isTouchDevice =
  window.matchMedia("(pointer: coarse)").matches ||
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0;

const mobileInput = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  sprint: false
};
let touchLookSensitivity = Number(localStorage.getItem("escape_touch_look_sensitivity") || "1.2");
let soundEnabled = localStorage.getItem("escape_sound_enabled") === "1";
let audioCtx = null;
let ambientNodes = null;

const FOV = Math.PI / 3;
const MAX_VIEW_DIST = 20;
const PLAYER_RADIUS = 0.2;
const GRAVITY = 18;
const JUMP_SPEED = 5.8;

const rewardCatalog = [
  { id: "speed", name: "Turbo Shoes", desc: "+10% movement speed" },
  { id: "jump", name: "Spring Boots", desc: "+12% jump height" },
  { id: "score", name: "Scholar Badge", desc: "+10% score on correct answers" },
  { id: "shield", name: "Focus Shield", desc: "-5 wrong-answer penalty" },
  { id: "sprint", name: "Dash Module", desc: "Unlock sprint with Shift" }
];

const roomNames = [
  "Gateway Chamber",
  "Fractal Hall",
  "Compass Vault",
  "Aurora Lab",
  "Vertex Atrium",
  "Tangent Forge",
  "Sigma Gallery",
  "Polar Engine",
  "Nexus Archive",
  "Infinity Core"
];

const treasureNames = [
  "Ruby of Roots",
  "Emerald Matrix",
  "Sapphire Arc",
  "Topaz Prism",
  "Opal Sequence",
  "Onyx Vector",
  "Pearl Integral",
  "Quartz Orbit",
  "Cobalt Cipher",
  "Crown of Infinity"
];

const levelStationLayouts = [
  [{ x: 3.5, y: 3.5 }, { x: 8.5, y: 3.0 }, { x: 6.0, y: 7.5 }],
  [{ x: 2.8, y: 2.8 }, { x: 9.0, y: 3.3 }, { x: 7.6, y: 8.2 }],
  [{ x: 2.8, y: 7.8 }, { x: 8.8, y: 2.9 }, { x: 5.6, y: 5.4 }],
  [{ x: 3.2, y: 4.5 }, { x: 9.1, y: 6.2 }, { x: 5.2, y: 2.9 }],
  [{ x: 3.1, y: 8.4 }, { x: 8.3, y: 8.2 }, { x: 7.0, y: 3.1 }],
  [{ x: 2.4, y: 3.4 }, { x: 7.2, y: 2.5 }, { x: 9.1, y: 6.6 }],
  [{ x: 3.9, y: 7.4 }, { x: 8.9, y: 4.1 }, { x: 5.0, y: 2.8 }],
  [{ x: 2.7, y: 5.2 }, { x: 7.8, y: 8.3 }, { x: 9.1, y: 2.8 }],
  [{ x: 3.6, y: 2.9 }, { x: 8.4, y: 7.9 }, { x: 6.2, y: 5.6 }],
  [{ x: 2.9, y: 8.1 }, { x: 8.7, y: 3.4 }, { x: 6.1, y: 2.6 }]
];

const treasureLayouts = [
  { x: 9.2, y: 8.8 },
  { x: 2.5, y: 8.8 },
  { x: 9.3, y: 2.4 },
  { x: 2.6, y: 2.5 },
  { x: 6.0, y: 8.9 },
  { x: 8.9, y: 6.8 },
  { x: 2.8, y: 6.9 },
  { x: 7.9, y: 2.6 },
  { x: 4.0, y: 8.2 },
  { x: 8.4, y: 8.5 }
];

const mapRows = [
  "############",
  "#..........#",
  "#..........#",
  "#..........#",
  "#..........#",
  "#..........#",
  "#..........#",
  "#..........#",
  "#..........#",
  "#..........#",
  "#.........D#",
  "############"
];

const roomMeta = {
  width: mapRows[0].length,
  height: mapRows.length,
  doorX: 10.5,
  doorY: 10.5,
  robotX: 9.4,
  robotY: 9.8
};

const levelRoomAnchors = [
  { doorX: 10.5, doorY: 10.5, robotX: 9.4, robotY: 9.8, spawnX: 2.0, spawnY: 2.0 },
  { doorX: 10.5, doorY: 9.5, robotX: 9.2, robotY: 8.8, spawnX: 2.4, spawnY: 2.2 },
  { doorX: 9.7, doorY: 10.5, robotX: 8.7, robotY: 9.7, spawnX: 2.1, spawnY: 3.0 },
  { doorX: 10.5, doorY: 8.8, robotX: 9.1, robotY: 8.1, spawnX: 3.0, spawnY: 2.3 },
  { doorX: 9.3, doorY: 10.2, robotX: 8.6, robotY: 9.5, spawnX: 2.2, spawnY: 3.4 },
  { doorX: 10.1, doorY: 9.7, robotX: 9.0, robotY: 9.0, spawnX: 3.1, spawnY: 2.6 },
  { doorX: 9.8, doorY: 10.4, robotX: 8.7, robotY: 9.8, spawnX: 2.5, spawnY: 2.7 },
  { doorX: 10.4, doorY: 9.2, robotX: 9.3, robotY: 8.5, spawnX: 3.2, spawnY: 3.0 },
  { doorX: 9.6, doorY: 10.3, robotX: 8.5, robotY: 9.4, spawnX: 2.6, spawnY: 2.8 },
  { doorX: 10.2, doorY: 10.1, robotX: 9.1, robotY: 9.3, spawnX: 3.3, spawnY: 3.1 }
];

const questionTiers = [
  {
    title: "Foundations",
    description: "Solve basic SOH-CAH-TOA values and right-triangle ratios.",
    questions: [
      { question: "sin(30 deg) = ?", choices: ["1/2", "sqrt(3)/2", "0", "2"], answer: "1/2" },
      { question: "cos(60 deg) = ?", choices: ["1/2", "sqrt(3)/2", "1", "0"], answer: "1/2" },
      { question: "tan(45 deg) = ?", choices: ["1", "sqrt(3)", "1/2", "0"], answer: "1" },
      { question: "If opposite=3 and adjacent=4, tan(theta) = ?", choices: ["3/4", "4/3", "1", "5/4"], answer: "3/4" },
      { question: "If opposite=5 and hypotenuse=13, sin(theta) = ?", choices: ["5/13", "12/13", "5/12", "13/5"], answer: "5/13" },
      { question: "If adjacent=8 and hypotenuse=10, cos(theta) = ?", choices: ["4/5", "5/4", "3/5", "1/2"], answer: "4/5" }
    ]
  },
  {
    title: "Right Triangles",
    description: "Use triangle side relationships and trig ratios together.",
    questions: [
      { question: "If tan(theta)=4/3 and opposite=12, adjacent = ?", choices: ["9", "16", "8", "15"], answer: "9" },
      { question: "If sin(theta)=8/17, opposite = 8, hypotenuse = ?", choices: ["17", "15", "9", "8"], answer: "17" },
      { question: "If cos(theta)=5/13, adjacent = 10, hypotenuse = ?", choices: ["26", "13", "20", "15"], answer: "26" },
      { question: "In a 5-12-13 triangle, tan(theta) for angle opposite 5 is:", choices: ["5/12", "12/5", "5/13", "12/13"], answer: "5/12" },
      { question: "If opposite=9 and hypotenuse=15, sin(theta) = ?", choices: ["3/5", "5/3", "4/5", "9/15"], answer: "3/5" },
      { question: "If adjacent=7 and opposite=24, hypotenuse = ?", choices: ["25", "31", "26", "17"], answer: "25" }
    ]
  },
  {
    title: "Unit Circle",
    description: "Evaluate exact values at standard unit-circle angles.",
    questions: [
      { question: "sin(150 deg) = ?", choices: ["1/2", "-1/2", "sqrt(3)/2", "-sqrt(3)/2"], answer: "1/2" },
      { question: "cos(120 deg) = ?", choices: ["-1/2", "1/2", "-sqrt(3)/2", "sqrt(3)/2"], answer: "-1/2" },
      { question: "tan(135 deg) = ?", choices: ["-1", "1", "0", "-sqrt(3)"], answer: "-1" },
      { question: "sin(0 deg) = ?", choices: ["0", "1", "-1", "1/2"], answer: "0" },
      { question: "cos(180 deg) = ?", choices: ["-1", "1", "0", "-1/2"], answer: "-1" },
      { question: "sin(60 deg) = ?", choices: ["sqrt(3)/2", "1/2", "-sqrt(3)/2", "0"], answer: "sqrt(3)/2" }
    ]
  },
  {
    title: "Identities",
    description: "Apply trig identities and reciprocal functions.",
    questions: [
      { question: "sin^2(theta) + cos^2(theta) = ?", choices: ["1", "0", "sin(theta)", "cos(theta)"], answer: "1" },
      { question: "sec(theta) is reciprocal of:", choices: ["cos(theta)", "sin(theta)", "tan(theta)", "csc(theta)"], answer: "cos(theta)" },
      { question: "csc(theta) is reciprocal of:", choices: ["sin(theta)", "cos(theta)", "tan(theta)", "sec(theta)"], answer: "sin(theta)" },
      { question: "If sin(theta)=3/5 and theta acute, cos(theta) = ?", choices: ["4/5", "3/5", "2/5", "5/4"], answer: "4/5" },
      { question: "If tan(theta)=3/4 and theta acute, sin(theta) = ?", choices: ["3/5", "4/5", "3/4", "4/3"], answer: "3/5" },
      { question: "1 + tan^2(theta) = ?", choices: ["sec^2(theta)", "csc^2(theta)", "sin^2(theta)", "cos^2(theta)"], answer: "sec^2(theta)" }
    ]
  },
  {
    title: "Inverse and Mixed",
    description: "Solve inverse trig and mixed conceptual questions.",
    questions: [
      { question: "arctan(1) in degrees = ?", choices: ["45", "30", "60", "90"], answer: "45" },
      { question: "arcsin(1/2) in degrees = ?", choices: ["30", "45", "60", "90"], answer: "30" },
      { question: "arccos(0) in degrees = ?", choices: ["90", "0", "180", "45"], answer: "90" },
      { question: "If sin(theta)=0 and 0<=theta<=360, one valid theta is:", choices: ["180", "45", "60", "30"], answer: "180" },
      { question: "If cos(theta)=1 and 0<=theta<=360, theta is:", choices: ["0", "90", "180", "270"], answer: "0" },
      { question: "tan(theta)=0 for theta:", choices: ["0 deg", "90 deg", "45 deg", "60 deg"], answer: "0 deg" }
    ]
  }
];

function buildChoices(correct, rand, createWrong) {
  const values = [correct];
  while (values.length < 4) {
    const candidate = createWrong();
    if (!values.includes(candidate)) values.push(candidate);
  }
  shuffleInPlace(values);
  return values;
}

function getTopicCategory(topicRaw) {
  const topic = topicRaw.toLowerCase();
  if (topic.includes("poly")) return "polynomial";
  if (topic.includes("trig")) return "trigonometry";
  if (topic.includes("algebra") || topic.includes("linear") || topic.includes("equation")) return "algebra";
  if (topic.includes("geometry") || topic.includes("area") || topic.includes("volume") || topic.includes("circle")) return "geometry";
  if (topic.includes("calculus") || topic.includes("derivative") || topic.includes("integral") || topic.includes("limit")) return "calculus";
  if (topic.includes("stat") || topic.includes("mean") || topic.includes("median") || topic.includes("deviation")) return "statistics";
  if (topic.includes("probability") || topic.includes("combinatorics") || topic.includes("permutation") || topic.includes("combination")) return "probability";
  if (topic.includes("log") || topic.includes("exponent") || topic.includes("power") || topic.includes("scientific notation")) return "exp_log";
  if (topic.includes("sequence") || topic.includes("series") || topic.includes("arithmetic sequence") || topic.includes("geometric sequence")) return "sequences";
  return "highschool_mixed";
}

function generateTrigQuestion(topic, rand, level = 1) {
  const s = 1 + Math.floor(level / 3);
  const mode = randint(rand, 0, 4);
  if (mode === 0) {
    const opposite = randint(rand, 3, 10 + 4 * s);
    const adjacent = randint(rand, 3, 10 + 4 * s);
    const correct = `${opposite}/${adjacent}`;
    return {
      question: `[${topic}] If opposite=${opposite} and adjacent=${adjacent}, tan(theta)=?`,
      answer: correct,
      choices: buildChoices(correct, rand, () => `${randint(rand, 1, 20)}/${randint(rand, 1, 20)}`)
    };
  }
  if (mode === 1) {
    const hyp = randint(rand, 10 + 2 * s, 24 + 4 * s);
    const adj = randint(rand, 3, hyp - 1);
    const correct = `${adj}/${hyp}`;
    return {
      question: `[${topic}] If adjacent=${adj} and hypotenuse=${hyp}, cos(theta)=?`,
      answer: correct,
      choices: buildChoices(correct, rand, () => `${randint(rand, 1, hyp)}/${hyp}`)
    };
  }
  if (mode === 2) {
    const angleSet = [0, 30, 45, 60, 90, 120, 135, 150, 180];
    const angle = angleSet[randint(rand, 0, angleSet.length - 1)];
    const exactMap = { 0: "0", 30: "1/2", 45: "sqrt(2)/2", 60: "sqrt(3)/2", 90: "1", 120: "-1/2", 135: "-sqrt(2)/2", 150: "1/2", 180: "0" };
    const correct = exactMap[angle];
    return {
      question: `[${topic}] Evaluate sin(${angle} deg).`,
      answer: correct,
      choices: buildChoices(correct, rand, () => ["0", "1", "1/2", "-1/2", "sqrt(2)/2", "sqrt(3)/2", "-sqrt(2)/2"][randint(rand, 0, 6)])
    };
  }
  if (mode === 3) {
    const picked = [
      { q: `[${topic}] 1 + tan^2(theta) = ?`, a: "sec^2(theta)" },
      { q: `[${topic}] sin^2(theta) + cos^2(theta) = ?`, a: "1" },
      { q: `[${topic}] Reciprocal of sin(theta) is ?`, a: "csc(theta)" },
      { q: `[${topic}] Reciprocal of cos(theta) is ?`, a: "sec(theta)" }
    ][randint(rand, 0, 3)];
    return {
      question: picked.q,
      answer: picked.a,
      choices: buildChoices(picked.a, rand, () => ["0", "sin(theta)", "cos(theta)", "tan(theta)", "cot(theta)", "1"][randint(rand, 0, 5)])
    };
  }
  const a = randint(rand, 3, 8 + 2 * s);
  const b = randint(rand, 4, 10 + 3 * s);
  const h = Math.round(Math.sqrt(a * a + b * b));
  const correct = `${a}/${h}`;
  return {
    question: `[${topic}] Right triangle with opposite=${a}, adjacent=${b}. Approx sin(theta)=?`,
    answer: correct,
    choices: buildChoices(correct, rand, () => `${randint(rand, 1, h)}/${h}`)
  };
}

function generatePolynomialQuestion(topic, rand, level = 1) {
  const s = 1 + Math.floor(level / 3);
  const mode = randint(rand, 0, 3);
  if (mode === 0) {
    const a = randint(rand, 1, 4 + 2 * s);
    const b = randint(rand, -8 - 2 * s, 8 + 2 * s);
    const x = randint(rand, -4 - s, 5 + s);
    const correct = String(a * x + b);
    return {
      question: `[${topic}] Evaluate p(x)=${a}x${b >= 0 ? "+" : ""}${b} at x=${x}.`,
      answer: correct,
      choices: buildChoices(correct, rand, () => String(randint(rand, -40, 40)))
    };
  }
  if (mode === 1) {
    const r1 = randint(rand, -6 - s, 6 + s);
    let r2 = randint(rand, -6 - s, 6 + s);
    if (r2 === r1) r2 += 1;
    const b = -(r1 + r2);
    const c = r1 * r2;
    const correct = `(x${r1 < 0 ? "+" : "-"}${Math.abs(r1)})(x${r2 < 0 ? "+" : "-"}${Math.abs(r2)})`;
    return {
      question: `[${topic}] Factor x^2${b >= 0 ? "+" : ""}${b}x${c >= 0 ? "+" : ""}${c}.`,
      answer: correct,
      choices: buildChoices(correct, rand, () => {
        const w1 = randint(rand, -8, 8);
        const w2 = randint(rand, -8, 8);
        return `(x${w1 < 0 ? "+" : "-"}${Math.abs(w1)})(x${w2 < 0 ? "+" : "-"}${Math.abs(w2)})`;
      })
    };
  }
  if (mode === 2) {
    const a = randint(rand, 1, 4 + s);
    const b = randint(rand, -6 - s, 6 + s);
    const c = randint(rand, -6 - s, 6 + s);
    const correct = `${2 * a}x${b >= 0 ? "+" : ""}${b}`;
    return {
      question: `[${topic}] Derivative of ${a}x^2${b >= 0 ? "+" : ""}${b}x${c >= 0 ? "+" : ""}${c} is:`,
      answer: correct,
      choices: buildChoices(correct, rand, () => `${randint(rand, 1, 12)}x${randint(rand, -6, 6) >= 0 ? "+" : ""}${randint(rand, -6, 6)}`)
    };
  }
  const a = randint(rand, 1, 3 + s);
  const b = randint(rand, -5 - s, 5 + s);
  const c = randint(rand, -10 - 2 * s, 10 + 2 * s);
  const x = randint(rand, -3 - s, 4 + s);
  const correct = String(a * x * x + b * x + c);
  return {
    question: `[${topic}] Evaluate q(x)=${a}x^2${b >= 0 ? "+" : ""}${b}x${c >= 0 ? "+" : ""}${c} at x=${x}.`,
    answer: correct,
    choices: buildChoices(correct, rand, () => String(randint(rand, -50, 50)))
  };
}

function generateAlgebraQuestion(topic, rand, level = 1) {
  const s = 1 + Math.floor(level / 3);
  const mode = randint(rand, 0, 2);
  if (mode === 0) {
    const a = randint(rand, 1, 6 + s);
    const b = randint(rand, -8 - 2 * s, 8 + 2 * s);
    const c = randint(rand, -20 - 3 * s, 20 + 3 * s);
    const x = (c - b) / a;
    const correct = Number.isInteger(x) ? String(x) : x.toFixed(2);
    return {
      question: `[${topic}] Solve for x: ${a}x${b >= 0 ? "+" : ""}${b}=${c}.`,
      answer: correct,
      choices: buildChoices(correct, rand, () => String(randint(rand, -20, 20)))
    };
  }
  if (mode === 1) {
    const a = randint(rand, 2, 6 + s);
    const b = randint(rand, 2, 8 + s);
    const x = randint(rand, -4 - s, 6 + s);
    const correct = String(a * x + b * x);
    return {
      question: `[${topic}] Simplify: ${a}x + ${b}x when x=${x}.`,
      answer: correct,
      choices: buildChoices(correct, rand, () => String(randint(rand, -80, 80)))
    };
  }
  const m = randint(rand, -6 - s, 8 + s);
  const b = randint(rand, -10 - 2 * s, 10 + 2 * s);
  const x = randint(rand, -4 - s, 6 + s);
  const correct = String(m * x + b);
  return {
    question: `[${topic}] Evaluate y=${m}x${b >= 0 ? "+" : ""}${b} at x=${x}.`,
    answer: correct,
    choices: buildChoices(correct, rand, () => String(randint(rand, -80, 80)))
  };
}

function generateGeometryQuestion(topic, rand, level = 1) {
  const s = 1 + Math.floor(level / 3);
  const mode = randint(rand, 0, 3);
  if (mode === 0) {
    const w = randint(rand, 3, 14 + 3 * s);
    const h = randint(rand, 3, 14 + 3 * s);
    const correct = String(w * h);
    return {
      question: `[${topic}] Area of rectangle with width=${w}, height=${h}?`,
      answer: correct,
      choices: buildChoices(correct, rand, () => String(randint(rand, 10, 600)))
    };
  }
  if (mode === 1) {
    const r = randint(rand, 2, 8 + 2 * s);
    const correct = `${2 * r}pi`;
    return {
      question: `[${topic}] Circumference of a circle with radius ${r} (in terms of pi).`,
      answer: correct,
      choices: buildChoices(correct, rand, () => `${randint(rand, 2, 30)}pi`)
    };
  }
  if (mode === 2) {
    const b = randint(rand, 4, 14 + 3 * s);
    const h = randint(rand, 4, 14 + 3 * s);
    const correct = String((b * h) / 2);
    return {
      question: `[${topic}] Area of triangle with base=${b} and height=${h}?`,
      answer: correct,
      choices: buildChoices(correct, rand, () => String(randint(rand, 8, 250)))
    };
  }
  const l = randint(rand, 2, 10 + 2 * s);
  const w = randint(rand, 2, 10 + 2 * s);
  const h = randint(rand, 2, 10 + 2 * s);
  const correct = String(l * w * h);
  return {
    question: `[${topic}] Volume of rectangular prism ${l}x${w}x${h}?`,
    answer: correct,
    choices: buildChoices(correct, rand, () => String(randint(rand, 20, 4000)))
  };
}

function generateCalculusQuestion(topic, rand, level = 1) {
  const s = 1 + Math.floor(level / 3);
  const mode = randint(rand, 0, 2);
  if (mode === 0) {
    const a = randint(rand, 1, 5 + s);
    const b = randint(rand, -9 - s, 9 + s);
    const c = randint(rand, -9 - s, 9 + s);
    const correct = `${2 * a}x${b >= 0 ? "+" : ""}${b}`;
    return {
      question: `[${topic}] Derivative of ${a}x^2${b >= 0 ? "+" : ""}${b}x${c >= 0 ? "+" : ""}${c} is:`,
      answer: correct,
      choices: buildChoices(correct, rand, () => `${randint(rand, 1, 16)}x${randint(rand, -9, 9) >= 0 ? "+" : ""}${randint(rand, -9, 9)}`)
    };
  }
  if (mode === 1) {
    const n = randint(rand, 2, 5 + s);
    const correct = `${n}x^${n - 1}`;
    return {
      question: `[${topic}] Derivative of x^${n} is:`,
      answer: correct,
      choices: buildChoices(correct, rand, () => `${randint(rand, 1, 10)}x^${randint(rand, 0, 7)}`)
    };
  }
  const k = randint(rand, 2, 7 + s);
  const correct = `${k}x`;
  return {
    question: `[${topic}] Integral of ${k} (with respect to x) is:`,
    answer: correct,
    choices: buildChoices(correct, rand, () => `${randint(rand, 1, 14)}x`)
  };
}

function generateStatisticsQuestion(topic, rand, level = 1) {
  const s = 1 + Math.floor(level / 3);
  const mode = randint(rand, 0, 2);
  const maxV = 20 + 6 * s;
  const nums = [randint(rand, 1, maxV), randint(rand, 1, maxV), randint(rand, 1, maxV), randint(rand, 1, maxV), randint(rand, 1, maxV)];
  const sorted = [...nums].sort((a, b) => a - b);
  if (mode === 0) {
    const mean = nums.reduce((s, n) => s + n, 0) / nums.length;
    const correct = mean.toFixed(1);
    return {
      question: `[${topic}] Mean of {${nums.join(", ")}}?`,
      answer: correct,
      choices: buildChoices(correct, rand, () => (randint(rand, 10, 260) / 10).toFixed(1))
    };
  }
  if (mode === 1) {
    const correct = String(sorted[Math.floor(sorted.length / 2)]);
    return {
      question: `[${topic}] Median of {${nums.join(", ")}}?`,
      answer: correct,
      choices: buildChoices(correct, rand, () => String(randint(rand, 1, 30)))
    };
  }
  const freq = {};
  nums.forEach((n) => { freq[n] = (freq[n] || 0) + 1; });
  let modeValue = nums[0];
  Object.keys(freq).forEach((k) => {
    if (freq[k] > (freq[modeValue] || 0)) modeValue = Number(k);
  });
  const correct = String(modeValue);
  return {
    question: `[${topic}] Mode of {${nums.join(", ")}}?`,
    answer: correct,
    choices: buildChoices(correct, rand, () => String(randint(rand, 1, 30)))
  };
}

function generateProbabilityQuestion(topic, rand, level = 1) {
  const s = 1 + Math.floor(level / 3);
  const mode = randint(rand, 0, 2);
  if (mode === 0) {
    const red = randint(rand, 1, 6 + s);
    const blue = randint(rand, 1, 6 + s);
    const correct = `${red}/${red + blue}`;
    return {
      question: `[${topic}] Bag has ${red} red and ${blue} blue balls. P(red)?`,
      answer: correct,
      choices: buildChoices(correct, rand, () => `${randint(rand, 1, 12)}/${randint(rand, 2, 16)}`)
    };
  }
  if (mode === 1) {
    const n = randint(rand, 6, 10 + s);
    const correct = `1/${n}`;
    return {
      question: `[${topic}] Roll a fair die with sides 1..${n}. P(rolling 1)?`,
      answer: correct,
      choices: buildChoices(correct, rand, () => `1/${randint(rand, 2, 14)}`)
    };
  }
  const n = randint(rand, 4, 8 + s);
  const r = randint(rand, 2, n - 1);
  const correct = String(Math.round((factorial(n) / (factorial(r) * factorial(n - r)))));
  return {
    question: `[${topic}] How many combinations C(${n},${r})?`,
    answer: correct,
    choices: buildChoices(correct, rand, () => String(randint(rand, 5, 300)))
  };
}

function factorial(n) {
  let out = 1;
  for (let i = 2; i <= n; i += 1) out *= i;
  return out;
}

function generateExpLogQuestion(topic, rand, level = 1) {
  const s = 1 + Math.floor(level / 3);
  const mode = randint(rand, 0, 2);
  if (mode === 0) {
    const a = randint(rand, 2, 4 + Math.min(2, s));
    const b = randint(rand, 2, 4 + s);
    const correct = String(a ** b);
    return {
      question: `[${topic}] Evaluate ${a}^${b}.`,
      answer: correct,
      choices: buildChoices(correct, rand, () => String(randint(rand, 4, 1200)))
    };
  }
  if (mode === 1) {
    const base = randint(rand, 2, 4 + Math.min(2, s));
    const exp = randint(rand, 2, 4 + s);
    const val = base ** exp;
    const correct = String(exp);
    return {
      question: `[${topic}] log_${base}(${val}) = ?`,
      answer: correct,
      choices: buildChoices(correct, rand, () => String(randint(rand, 1, 8)))
    };
  }
  const coeff = randint(rand, 2, 9);
  const exp = randint(rand, 1, 3 + s);
  const correct = `${coeff}*10^${exp}`;
  return {
    question: `[${topic}] Write ${coeff}${"0".repeat(exp)} in scientific notation.`,
    answer: correct,
    choices: buildChoices(correct, rand, () => `${randint(rand, 1, 9)}*10^${randint(rand, 1, 6)}`)
  };
}

function generateSequenceQuestion(topic, rand, level = 1) {
  const s = 1 + Math.floor(level / 3);
  const mode = randint(rand, 0, 2);
  if (mode === 0) {
    const a1 = randint(rand, 1, 8 + s);
    const d = randint(rand, 2, 5 + s);
    const n = randint(rand, 4, 8 + s);
    const correct = String(a1 + (n - 1) * d);
    return {
      question: `[${topic}] Arithmetic sequence starts ${a1}, ${a1 + d}, ... Find term ${n}.`,
      answer: correct,
      choices: buildChoices(correct, rand, () => String(randint(rand, 5, 120)))
    };
  }
  if (mode === 1) {
    const a1 = randint(rand, 1, 4 + s);
    const r = randint(rand, 2, 3 + Math.min(2, s));
    const n = randint(rand, 4, 7 + s);
    const correct = String(a1 * (r ** (n - 1)));
    return {
      question: `[${topic}] Geometric sequence starts ${a1}, ${a1 * r}, ... Find term ${n}.`,
      answer: correct,
      choices: buildChoices(correct, rand, () => String(randint(rand, 4, 500)))
    };
  }
  const a1 = randint(rand, 2, 6 + s);
  const d = randint(rand, 1, 4 + s);
  const n = randint(rand, 5, 10 + s);
  const correct = String((n / 2) * (2 * a1 + (n - 1) * d));
  return {
    question: `[${topic}] Sum of first ${n} terms of arithmetic sequence with a1=${a1}, d=${d}?`,
    answer: correct,
    choices: buildChoices(correct, rand, () => String(randint(rand, 20, 500)))
  };
}

function generateGeneralQuestion(topic, rand, level = 1) {
  const s = 1 + Math.floor(level / 3);
  const a = randint(rand, 2, 12 + 3 * s);
  const b = randint(rand, 2, 12 + 3 * s);
  const c = randint(rand, -10 - 3 * s, 10 + 3 * s);
  const correct = String(a * b + c);
  return {
    question: `[${topic}] Compute ${a}*${b}${c >= 0 ? "+" : ""}${c}.`,
    answer: correct,
    choices: buildChoices(correct, rand, () => String(randint(rand, -20, 500)))
  };
}

function getCourseLabel(course) {
  return course === "precalculus" ? "Precalculus" : "Algebra 1";
}

function generateCourseQuestionPool(course, student, session, level = 1, count = 80) {
  const courseLabel = getCourseLabel(course);
  const key = `${student.toLowerCase()}|${course}|${session}|L${level}`;
  const rand = makeSeededRandom(hashString(key));
  const pool = [];
  const algebra1Generators = [generateAlgebraQuestion, generatePolynomialQuestion, generateGeneralQuestion];
  const precalcGenerators = [
    generateTrigQuestion,
    generatePolynomialQuestion,
    generateExpLogQuestion,
    generateSequenceQuestion,
    generateGeometryQuestion
  ];

  for (let i = 0; i < count; i += 1) {
    const list = course === "precalculus" ? precalcGenerators : algebra1Generators;
    const picked = list[randint(rand, 0, list.length - 1)];
    pool.push(picked(courseLabel, rand, level));
  }
  return pool;
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function shuffleInPlace(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
}

function getThemeForLevel(levelIndex) {
  const hue = (levelIndex * 39) % 360;
  return {
    sky: `hsl(${hue}, 35%, 22%)`,
    floor: `hsl(${(hue + 18) % 360}, 28%, 18%)`,
    wallHue: (hue + 8) % 360
  };
}

function getStationLayoutForLevel(levelIndex) {
  const layout = levelStationLayouts[levelIndex % levelStationLayouts.length];
  return layout.map((p) => ({ x: p.x, y: p.y }));
}

function getTreasurePosForLevel(levelIndex) {
  const p = treasureLayouts[levelIndex % treasureLayouts.length];
  return { x: p.x, y: p.y };
}

function getTreasureNameForLevel(levelIndex) {
  return treasureNames[levelIndex % treasureNames.length];
}

function getRoomNameForLevel(levelIndex) {
  return roomNames[levelIndex % roomNames.length];
}

function hashString(input) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeSeededRandom(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randint(rand, minInclusive, maxInclusive) {
  return minInclusive + Math.floor(rand() * (maxInclusive - minInclusive + 1));
}

function getTierIndex(roomIndex) {
  return Math.min(questionTiers.length - 1, Math.floor(roomIndex / 2));
}

function getTierForRoom(roomIndex) {
  return questionTiers[getTierIndex(roomIndex)];
}

function getQuestionSourceForRoom(roomIndex) {
  if (gameState.generatedPool && gameState.generatedPool.length >= STATIONS_PER_DOOR) {
    const courseLabel = getCourseLabel(gameState.activeCourse);
    return {
      title: `${courseLabel} Track`,
      description: `Auto-generated ${courseLabel} questions for ${studentName}.`,
      questions: gameState.generatedPool
    };
  }
  const tier = getTierForRoom(roomIndex);
  return {
    title: tier.title,
    description: tier.description,
    questions: tier.questions
  };
}

function cloneQuestionWithShuffledChoices(template) {
  const choices = [...template.choices];
  shuffleInPlace(choices);
  return {
    question: template.question,
    choices,
    answer: template.answer
  };
}

function getRandomQuestionForRoom(roomIndex, excludedQuestion = "") {
  const source = getQuestionSourceForRoom(roomIndex);
  let candidates = source.questions.filter((q) => q.question !== excludedQuestion);
  if (!candidates.length) candidates = source.questions;
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return cloneQuestionWithShuffledChoices(chosen);
}

function assignQuestionToStation(station, question) {
  station.question = question.question;
  station.choices = question.choices;
  station.answer = question.answer;
}

function regenerateQuestionForStation(station) {
  assignQuestionToStation(station, getRandomQuestionForRoom(gameState.currentRoom, station.question));
}

function pickQuestions(roomIndex) {
  const source = getQuestionSourceForRoom(roomIndex);
  const positions = getStationLayoutForLevel(roomIndex);
  const pool = source.questions.map((q) => cloneQuestionWithShuffledChoices(q));
  shuffleInPlace(pool);
  return pool.slice(0, STATIONS_PER_DOOR).map((q, i) => ({
    id: `S${i + 1}`,
    title: `Station ${i + 1}`,
    question: q.question,
    choices: q.choices,
    answer: q.answer,
    solved: false,
    failedAttempts: 0,
    x: positions[i].x,
    y: positions[i].y
  }));
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getElapsedSeconds() {
  if (!gameState.timerActive) {
    return Math.floor(gameState.elapsedBeforePauseMs / 1000);
  }
  return Math.floor((gameState.elapsedBeforePauseMs + (performance.now() - gameState.startTimeMs)) / 1000);
}

function speakMessage(text) {
  if (!("speechSynthesis" in window)) return;
  const msg = new SpeechSynthesisUtterance(text);
  msg.rate = 1;
  msg.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(msg);
}

function beginLevelSnapshot() {
  gameState.levelStartSnapshot = {
    attempts: gameState.attempts,
    correctAnswers: gameState.correctAnswers,
    score: gameState.score,
    elapsedSeconds: getElapsedSeconds()
  };
}

function getLevelMetrics() {
  const s = gameState.levelStartSnapshot;
  if (!s) {
    return { attemptsDelta: 0, correctDelta: 0, scoreDelta: 0, timeDelta: 0, accuracy: 0 };
  }
  const attemptsDelta = gameState.attempts - s.attempts;
  const correctDelta = gameState.correctAnswers - s.correctAnswers;
  const scoreDelta = gameState.score - s.score;
  const timeDelta = Math.max(0, getElapsedSeconds() - s.elapsedSeconds);
  const accuracy = attemptsDelta > 0 ? Math.round((correctDelta / attemptsDelta) * 100) : 0;
  return { attemptsDelta, correctDelta, scoreDelta, timeDelta, accuracy };
}

function buildLevelSummary(levelNumber) {
  const { attemptsDelta, scoreDelta, timeDelta, accuracy } = getLevelMetrics();
  return `Level ${levelNumber} complete. Time ${formatTime(timeDelta)}, Score +${scoreDelta}, Attempts ${attemptsDelta}, Accuracy ${accuracy}%.`;
}

function recordLevelReport(levelNumber, reward) {
  const { attemptsDelta, scoreDelta, timeDelta, accuracy } = getLevelMetrics();
  let rows = [];
  try {
    rows = JSON.parse(localStorage.getItem("escape_teacher_reports") || "[]");
  } catch {
    rows = [];
  }
  rows.push({
    date: new Date().toISOString(),
    student: studentName,
    course: getCourseLabel(gameState.activeCourse),
    level: levelNumber,
    time: formatTime(timeDelta),
    score_gain: scoreDelta,
    attempts: attemptsDelta,
    accuracy,
    reward: reward.name,
    treasure: gameState.currentTreasureName
  });
  localStorage.setItem("escape_teacher_reports", JSON.stringify(rows));
}

function unlockRewardForLevel(levelNumber) {
  const reward = rewardCatalog[(levelNumber - 1) % rewardCatalog.length];
  gameState.unlockedRewards.push({ level: levelNumber, ...reward });
  if (reward.id === "speed") gameState.perks.speedMul += 0.1;
  if (reward.id === "jump") gameState.perks.jumpMul += 0.12;
  if (reward.id === "score") gameState.perks.scoreMul += 0.1;
  if (reward.id === "shield") gameState.perks.wrongPenalty = Math.max(5, gameState.perks.wrongPenalty - 5);
  if (reward.id === "sprint") gameState.perks.sprintUnlocked = true;
  return reward;
}

function pauseTimer() {
  if (!gameState.timerActive) return;
  gameState.elapsedBeforePauseMs += performance.now() - gameState.startTimeMs;
  gameState.timerActive = false;
}

function resumeTimer() {
  if (gameState.timerActive) return;
  gameState.startTimeMs = performance.now();
  gameState.timerActive = true;
}

function updateStatsHud() {
  const attempts = gameState.attempts;
  const accuracy = attempts > 0 ? Math.round((gameState.correctAnswers / attempts) * 100) : 0;
  statsEl.textContent =
    `Time: ${formatTime(getElapsedSeconds())} | ` +
    `Score: ${gameState.score} | Attempts: ${attempts} | Accuracy: ${accuracy}%`;
}

function updatePerksHud() {
  if (!perksEl) return;
  const perkLabels = gameState.unlockedRewards.map((r) => r.name);
  const treasureLabels = gameState.unlockedTreasures.map((t) => t.name);
  const perksText = perkLabels.length ? perkLabels.join(", ") : "none";
  const treasuresText = treasureLabels.length ? treasureLabels.join(", ") : "none";
  perksEl.textContent = `Perks: ${perksText} | Treasures: ${treasuresText}`;
}

function updateProgress() {
  const solvedCount = gameState.stations.filter((s) => s.solved).length;
  progressEl.textContent = `Solved: ${solvedCount} / ${gameState.stations.length}`;
  if (solvedCount === gameState.stations.length && !gameState.doorUnlocked) {
    gameState.doorUnlocked = true;
    gameState.treasureUnlocked = true;
    gameState.treasureCollected = true;
    gameState.levelAdvancePending = true;
    objectiveEl.textContent = `Level complete. Moving to next room...`;
    setTimeout(() => {
      if (!gameState.isPlaying || gameState.gameWon) return;
      advanceDoorOrRoom();
    }, 250);
  }
}

function isWallCell(mx, my) {
  if (mx < 0 || my < 0 || mx >= roomMeta.width || my >= roomMeta.height) return true;
  const cell = mapRows[my][mx];
  if (cell === "#") return true;
  if (cell === "D") return !gameState.doorUnlocked;
  return false;
}

function tryMove(nx, ny) {
  const left = nx - PLAYER_RADIUS;
  const right = nx + PLAYER_RADIUS;
  const top = ny - PLAYER_RADIUS;
  const bottom = ny + PLAYER_RADIUS;
  if (
    isWallCell(Math.floor(left), Math.floor(top)) ||
    isWallCell(Math.floor(right), Math.floor(top)) ||
    isWallCell(Math.floor(left), Math.floor(bottom)) ||
    isWallCell(Math.floor(right), Math.floor(bottom))
  ) {
    return false;
  }
  player.x = nx;
  player.y = ny;
  return true;
}

function normalizeAngle(a) {
  let angle = a;
  while (angle < -Math.PI) angle += Math.PI * 2;
  while (angle > Math.PI) angle -= Math.PI * 2;
  return angle;
}

function castRay(rayAngle) {
  const step = 0.02;
  let dist = 0;
  while (dist < MAX_VIEW_DIST) {
    const rx = player.x + Math.cos(rayAngle) * dist;
    const ry = player.y + Math.sin(rayAngle) * dist;
    if (isWallCell(Math.floor(rx), Math.floor(ry))) {
      return dist;
    }
    dist += step;
  }
  return MAX_VIEW_DIST;
}

function drawBackground(theme) {
  ctx.fillStyle = theme.sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
  ctx.fillStyle = theme.floor;
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
}

function render3D() {
  const theme = getThemeForLevel(gameState.currentRoom);
  drawBackground(theme);
  const cameraOffsetY = player.z * 120;

  const rayCount = Math.max(140, Math.floor(canvas.width / 4));
  const depthBuffer = new Array(rayCount);
  const sliceWidth = canvas.width / rayCount;

  for (let i = 0; i < rayCount; i += 1) {
    const rayAngle = player.angle - FOV / 2 + (i / rayCount) * FOV;
    const rawDist = castRay(rayAngle);
    const correctedDist = rawDist * Math.cos(rayAngle - player.angle);
    depthBuffer[i] = correctedDist;

    const wallHeight = Math.min(canvas.height, (canvas.height * 0.82) / Math.max(0.0001, correctedDist));
    const y = (canvas.height - wallHeight) / 2 + cameraOffsetY;
    const lightness = Math.max(16, 64 - correctedDist * 3.2);
    ctx.fillStyle = `hsl(${theme.wallHue}, 30%, ${lightness}%)`;
    ctx.fillRect(i * sliceWidth, y, sliceWidth + 1, wallHeight);
  }

  const sortedStations = [...gameState.stations]
    .map((s) => ({ ...s, dist: Math.hypot(s.x - player.x, s.y - player.y) }))
    .sort((a, b) => b.dist - a.dist);

  sortedStations.forEach((s) => {
    const dx = s.x - player.x;
    const dy = s.y - player.y;
    const angleToStation = normalizeAngle(Math.atan2(dy, dx) - player.angle);
    if (Math.abs(angleToStation) > FOV / 2) return;
    if (s.dist < 0.2) return;

    const sx = (angleToStation / (FOV / 2)) * (canvas.width / 2) + canvas.width / 2;
    const screenCol = Math.floor((sx / canvas.width) * depthBuffer.length);
    if (screenCol >= 0 && screenCol < depthBuffer.length && depthBuffer[screenCol] < s.dist) return;

    const doorW = Math.min(canvas.width * 0.18, (canvas.height * 0.24) / s.dist);
    const doorH = doorW * 1.45;
    const sy = canvas.height / 2 + cameraOffsetY + 24;
    const x = sx - doorW / 2;
    const y = sy - doorH / 2;

    ctx.fillStyle = s.solved ? "#2f8b55" : "#3a4d6a";
    ctx.fillRect(x, y, doorW, doorH);
    ctx.fillStyle = "rgba(230,240,255,0.65)";
    ctx.fillRect(x + doorW * 0.12, y + doorH * 0.08, doorW * 0.76, doorH * 0.08);
    ctx.fillStyle = s.solved ? "#8cff8a" : "#ffc46b";
    ctx.beginPath();
    ctx.arc(x + doorW * 0.84, y + doorH * 0.56, Math.max(2, doorW * 0.04), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#eaf2ff";
    ctx.font = "bold 13px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(s.id, sx, y - 8);
  });

  drawDoorAndRobot(depthBuffer, cameraOffsetY);
  drawTreasure(depthBuffer, cameraOffsetY);
}

function projectSprite(wx, wy, depthBuffer) {
  const dx = wx - player.x;
  const dy = wy - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.2) return null;
  const relAngle = normalizeAngle(Math.atan2(dy, dx) - player.angle);
  if (Math.abs(relAngle) > FOV / 2) return null;
  const sx = (relAngle / (FOV / 2)) * (canvas.width / 2) + canvas.width / 2;
  const col = Math.floor((sx / canvas.width) * depthBuffer.length);
  if (col >= 0 && col < depthBuffer.length && depthBuffer[col] < dist) return null;
  return { sx, dist };
}

function drawDoorAndRobot(depthBuffer, cameraOffsetY) {
  const doorProj = projectSprite(roomMeta.doorX, roomMeta.doorY, depthBuffer);
  if (doorProj) {
    const doorW = Math.min(canvas.width * 0.32, (canvas.height * 0.62) / doorProj.dist);
    const doorH = doorW * 1.35;
    const doorX = doorProj.sx - doorW / 2;
    const doorY = canvas.height / 2 - doorH / 2 + cameraOffsetY + 12;

    ctx.fillStyle = gameState.doorUnlocked ? "#3ea95f" : "#6b3b2a";
    ctx.fillRect(doorX, doorY, doorW, doorH);
    ctx.fillStyle = "#d5dee9";
    ctx.fillRect(doorX + doorW * 0.12, doorY + doorH * 0.08, doorW * 0.76, doorH * 0.08);
    ctx.fillStyle = gameState.doorUnlocked ? "#8cff8a" : "#ff7f7f";
    ctx.font = `bold ${Math.max(12, Math.floor(doorW * 0.12))}px Segoe UI`;
    ctx.textAlign = "center";
    ctx.fillText(gameState.doorUnlocked ? "UNLOCKED" : "LOCKED", doorProj.sx, doorY - 8);
  }

  const robotProj = projectSprite(roomMeta.robotX, roomMeta.robotY, depthBuffer);
  if (robotProj) {
    const robotSize = Math.min(canvas.width * 0.24, (canvas.height * 0.42) / robotProj.dist);
    const cx = robotProj.sx;
    const cy = canvas.height / 2 + cameraOffsetY + 26;
    const bodyW = robotSize * 0.52;
    const bodyH = robotSize * 0.62;
    const head = robotSize * 0.24;

    ctx.fillStyle = "#8ba5c7";
    ctx.fillRect(cx - bodyW / 2, cy - bodyH / 2, bodyW, bodyH);
    ctx.fillStyle = "#a8c8f2";
    ctx.fillRect(cx - head / 2, cy - bodyH / 2 - head * 0.95, head, head * 0.78);
    ctx.fillStyle = "#12243a";
    ctx.fillRect(cx - head * 0.3, cy - bodyH / 2 - head * 0.72, head * 0.18, head * 0.18);
    ctx.fillRect(cx + head * 0.12, cy - bodyH / 2 - head * 0.72, head * 0.18, head * 0.18);
    ctx.fillStyle = "#4f6987";
    ctx.fillRect(cx - bodyW * 0.75, cy - bodyH * 0.3, bodyW * 0.22, bodyH * 0.58);
    ctx.fillRect(cx + bodyW * 0.53, cy - bodyH * 0.3, bodyW * 0.22, bodyH * 0.58);
    ctx.fillRect(cx - bodyW * 0.25, cy + bodyH * 0.5, bodyW * 0.22, bodyH * 0.4);
    ctx.fillRect(cx + bodyW * 0.03, cy + bodyH * 0.5, bodyW * 0.22, bodyH * 0.4);

    ctx.fillStyle = gameState.doorUnlocked ? "#8cff8a" : "#ffd966";
    ctx.font = `bold ${Math.max(11, Math.floor(robotSize * 0.12))}px Segoe UI`;
    ctx.textAlign = "center";
    ctx.fillText(gameState.doorUnlocked ? "Robot: Find the treasure chest" : "Robot: Solve 3 questions", cx, cy - bodyH * 0.95);
  }
}

function drawTreasure(depthBuffer, cameraOffsetY) {
  const treasureProj = projectSprite(gameState.treasurePos.x, gameState.treasurePos.y, depthBuffer);
  if (!treasureProj) return;

  const chestW = Math.min(canvas.width * 0.22, (canvas.height * 0.26) / treasureProj.dist);
  const chestH = chestW * 0.72;
  const x = treasureProj.sx - chestW / 2;
  const y = canvas.height / 2 + cameraOffsetY + 36 - chestH / 2;

  const chestColor = gameState.treasureCollected ? "#2f8b55" : (gameState.treasureUnlocked ? "#a3742b" : "#4b3f2f");
  ctx.fillStyle = chestColor;
  ctx.fillRect(x, y, chestW, chestH);
  ctx.fillStyle = "rgba(255,215,130,0.9)";
  ctx.fillRect(x, y + chestH * 0.34, chestW, chestH * 0.12);
  ctx.fillStyle = "#2a2220";
  ctx.fillRect(x + chestW * 0.45, y + chestH * 0.3, chestW * 0.1, chestH * 0.28);

  ctx.textAlign = "center";
  if (gameState.treasureCollected) {
    ctx.fillStyle = "#8cff8a";
    ctx.font = `bold ${Math.max(11, Math.floor(chestW * 0.12))}px Segoe UI`;
    ctx.fillText(`${gameState.currentTreasureName} COLLECTED`, treasureProj.sx, y - 10);
  } else if (gameState.treasureUnlocked) {
    ctx.fillStyle = "#ffe7a1";
    ctx.font = `bold ${Math.max(11, Math.floor(chestW * 0.12))}px Segoe UI`;
    ctx.fillText(`${gameState.currentTreasureName} UNLOCKED`, treasureProj.sx, y - 10);
  }
}

function updatePlayer(dt) {
  const lookInput = (Number(input.ArrowRight) - Number(input.ArrowLeft)) + mobileInput.lookX;
  const rot = lookInput * player.rotSpeed * dt;
  player.angle = normalizeAngle(player.angle + rot);
  mobileInput.lookX = 0;

  let moveX = 0;
  let moveY = 0;
  const forward = Math.max(-1, Math.min(1, (Number(input.KeyW) - Number(input.KeyS)) + mobileInput.moveY));
  const strafe = Math.max(-1, Math.min(1, (Number(input.KeyD) - Number(input.KeyA)) + mobileInput.moveX));

  if (forward !== 0) {
    moveX += Math.cos(player.angle) * forward;
    moveY += Math.sin(player.angle) * forward;
  }
  if (strafe !== 0) {
    moveX += Math.cos(player.angle + Math.PI / 2) * strafe;
    moveY += Math.sin(player.angle + Math.PI / 2) * strafe;
  }

  player.vz -= GRAVITY * dt;
  player.z += player.vz * dt;
  if (player.z < 0) {
    player.z = 0;
    player.vz = 0;
  }

  const len = Math.hypot(moveX, moveY);
  if (len > 0) {
    moveX /= len;
    moveY /= len;
    const isSprinting = gameState.perks.sprintUnlocked && (input.ShiftLeft || input.ShiftRight || mobileInput.sprint);
    const sprintMul = isSprinting ? 1.6 : 1;
    const step = player.moveSpeed * gameState.perks.speedMul * sprintMul * dt;
    tryMove(player.x + moveX * step, player.y);
    tryMove(player.x, player.y + moveY * step);
  }
}

function getInteractStation() {
  let best = null;
  let bestDist = 4.2;
  for (const s of gameState.stations) {
    if (s.solved) continue;
    const dx = s.x - player.x;
    const dy = s.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  if (best) return best;
  return gameState.stations.find((s) => !s.solved) || null;
}

function isNearTreasure() {
  const d = Math.hypot(player.x - gameState.treasurePos.x, player.y - gameState.treasurePos.y);
  return d < 2.0;
}

function collectTreasure() {
  if (!gameState.treasureUnlocked || gameState.treasureCollected || gameState.levelAdvancePending) return false;
  if (!isNearTreasure()) return false;
  gameState.levelAdvancePending = true;
  gameState.treasureCollected = true;
  gameState.unlockedTreasures.push({ level: gameState.currentRoom + 1, name: gameState.currentTreasureName });
  objectiveEl.textContent = `Treasure "${gameState.currentTreasureName}" collected. Advancing to next level...`;
  speakMessage(`Excellent ${studentName}. You collected ${gameState.currentTreasureName}.`);
  // Force transition immediately to avoid getting stuck in the same room.
  advanceDoorOrRoom();
  return true;
}

function showQuestion(station) {
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  function renderQuestionBody(feedbackMessage = "") {
    questionTitle.textContent = station.title;
    questionText.textContent = station.question;
    feedbackEl.textContent = feedbackMessage;
    choicesEl.innerHTML = "";

    station.choices.forEach((choice) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.type = "button";
      btn.textContent = choice;
      btn.addEventListener("click", () => {
        if (station.solved) return;
        gameState.attempts += 1;
        if (choice === station.answer) {
          gameState.correctAnswers += 1;
          station.solved = true;
          const bonus = (gameState.currentRoom + 1) * 15;
          const penalty = station.failedAttempts * 10;
          gameState.score += Math.round(Math.max(40, 100 + bonus - penalty) * gameState.perks.scoreMul);
          btn.classList.add("correct");
          feedbackEl.textContent = "Correct. Station solved.";
          updateProgress();
        } else {
          station.failedAttempts += 1;
          gameState.score = Math.max(0, gameState.score - gameState.perks.wrongPenalty);
          regenerateQuestionForStation(station);
          renderQuestionBody("Incorrect. New question generated.");
        }
        updateStatsHud();
      });
      choicesEl.appendChild(btn);
    });
  }

  renderQuestionBody();
  if (anotherQuestionBtn) {
    anotherQuestionBtn.onclick = () => {
      if (station.solved) return;
      regenerateQuestionForStation(station);
      renderQuestionBody("New question generated.");
    };
  }

  pauseTimer();
  questionOverlay.classList.add("visible");
}

function closeQuestion() {
  questionOverlay.classList.remove("visible");
  if (gameState.isPlaying && !gameState.gameWon) resumeTimer();
}

function applyDoorSetup(roomIndex, doorIndex) {
  gameState.generatedPool = generateCourseQuestionPool(gameState.activeCourse, studentName, sessionSeed, roomIndex + 1, 100);
  const anchors = levelRoomAnchors[roomIndex % levelRoomAnchors.length];
  roomMeta.doorX = anchors.doorX;
  roomMeta.doorY = anchors.doorY;
  roomMeta.robotX = anchors.robotX;
  roomMeta.robotY = anchors.robotY;

  const source = getQuestionSourceForRoom(roomIndex);
  gameState.currentRoom = roomIndex;
  gameState.currentDoor = doorIndex;
  gameState.stations = pickQuestions(roomIndex);
  gameState.doorUnlocked = false;
  gameState.treasureUnlocked = false;
  gameState.treasureCollected = false;
  gameState.levelAdvancePending = false;
  gameState.treasurePos = getTreasurePosForLevel(roomIndex);
  gameState.currentTreasureName = getTreasureNameForLevel(roomIndex);
  player.x = anchors.spawnX;
  player.y = anchors.spawnY;
  player.angle = 0;
  player.z = 0;
  player.vz = 0;

  roomLabelEl.textContent = `Level: ${roomIndex + 1} / ${TOTAL_ROOMS} | Room: ${getRoomNameForLevel(roomIndex)}`;
  objectiveEl.textContent = `${source.description} Solve 3 questions to unlock treasure "${gameState.currentTreasureName}" (difficulty level ${roomIndex + 1}).`;
  if (hintEl) {
    hintEl.textContent = gameState.perks.sprintUnlocked
      ? "Move: WASD/touch joystick | Look: Mouse/Arrows or touch | Sprint: Shift/button | Interact: E/button | Jump: Space/button"
      : "Move: WASD/touch joystick | Look: Mouse/Arrows or touch | Interact: E/button | Jump: Space/button";
  }
  updateProgress();
  updateStatsHud();
  updatePerksHud();
  beginLevelSnapshot();
}

function showDoorTransition(roomIndex, doorIndex, buttonText, extraText = "", autoProceed = false) {
  const source = getQuestionSourceForRoom(roomIndex);
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  const roomName = getRoomNameForLevel(roomIndex);
  const treasureName = getTreasureNameForLevel(roomIndex);
  roomOverlayTitleEl.textContent = `Level ${roomIndex + 1} - ${roomName}`;
  roomOverlayTextEl.textContent = `${source.title}. Solve 3 questions, then collect treasure "${treasureName}" to reach next level.${extraText ? ` ${extraText}` : ""}`;
  roomOverlayBtn.textContent = buttonText;
  roomOverlay.classList.add("visible");
  pauseTimer();
  if (autoProceed) {
    setTimeout(() => {
      if (!roomOverlay.classList.contains("visible")) return;
      roomOverlay.classList.remove("visible");
      resumeTimer();
    }, 1400);
  }
}

function completeGame() {
  if (gameState.endCyclePending) return;
  gameState.endCyclePending = true;
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  gameState.gameWon = false;
  gameState.isPlaying = true;
  pauseTimer();
  const accuracy = gameState.attempts > 0 ? Math.round((gameState.correctAnswers / gameState.attempts) * 100) : 0;
  const summary = `Shout out to ${studentName}! Cleared all 10 levels. Score ${gameState.score}, Time ${formatTime(getElapsedSeconds())}, Attempts ${gameState.attempts}, Accuracy ${accuracy}%. Restarting at Level 1.`;
  finalSummaryEl.textContent = summary;
  speakMessage(`Shout out to ${studentName}. You completed all 10 levels. Restarting at level 1.`);
  winOverlay.classList.add("visible");
  setTimeout(() => {
    winOverlay.classList.remove("visible");
    gameState.endCyclePending = false;
    startSession();
  }, 3200);
}

function advanceDoorOrRoom() {
  if (gameState.endCyclePending) return;
  const clearedLevel = gameState.currentRoom + 1;
  const collectedTreasure = gameState.currentTreasureName;
  const levelSummary = buildLevelSummary(clearedLevel);
  const reward = unlockRewardForLevel(clearedLevel);
  const rewardText = `Treasure collected: ${collectedTreasure}. Unlocked reward: ${reward.name} (${reward.desc}).`;
  try {
    recordLevelReport(clearedLevel, reward);
  } catch {}
  updatePerksHud();
  try {
    speakMessage(`Shout out to ${studentName} for clearing level ${clearedLevel}. ${collectedTreasure} and ${reward.name} unlocked.`);
  } catch {}

  // Single-door-per-level flow: always advance to next room/level.
  const nextRoom = gameState.currentRoom + 1;
  if (nextRoom >= TOTAL_ROOMS) {
    completeGame();
    return;
  }
  applyDoorSetup(nextRoom, 0);
  showDoorTransition(nextRoom, 0, "Enter Next Room", `${levelSummary} ${rewardText}`, true);
  speakMessage(`Shout out to ${studentName}. Welcome to level ${nextRoom + 1} in ${getRoomNameForLevel(nextRoom)}.`);
}

function checkExit() {
  if (gameState.treasureUnlocked && !gameState.treasureCollected && !gameState.levelAdvancePending) {
    // Fail-safe: auto-collect when player reaches chest even if E key misses.
    if (isNearTreasure()) {
      collectTreasure();
      return;
    }
  }
  if (!gameState.doorUnlocked || !gameState.treasureCollected || gameState.levelAdvancePending) return;
  const d = Math.hypot(player.x - roomMeta.doorX, player.y - roomMeta.doorY);
  if (d < 0.7) advanceDoorOrRoom();
}

function startSession() {
  gameState.gameWon = false;
  gameState.isPlaying = true;
  gameState.attempts = 0;
  gameState.correctAnswers = 0;
  gameState.score = 0;
  gameState.elapsedBeforePauseMs = 0;
  gameState.startTimeMs = 0;
  gameState.timerActive = false;
  gameState.unlockedRewards = [];
  gameState.levelStartSnapshot = null;
  gameState.endCyclePending = false;
  gameState.perks = {
    speedMul: 1,
    jumpMul: 1,
    scoreMul: 1,
    wrongPenalty: 20,
    sprintUnlocked: false
  };
  gameState.unlockedTreasures = [];
  updatePerksHud();
  winOverlay.classList.remove("visible");
  questionOverlay.classList.remove("visible");
  applyDoorSetup(0, 0);
  showDoorTransition(0, 0, "Begin Door");
}

function gameLoop(ts) {
  if (!gameLoop.lastTs) gameLoop.lastTs = ts;
  const dt = Math.min(0.05, (ts - gameLoop.lastTs) / 1000);
  gameLoop.lastTs = ts;

  if (gameState.isPlaying && !gameState.gameWon && !questionOverlay.classList.contains("visible") && !roomOverlay.classList.contains("visible")) {
    updatePlayer(dt);
    checkExit();
  }

  render3D();
  if (gameState.isPlaying) updateStatsHud();
  requestAnimationFrame(gameLoop);
}

function handleStartClick() {
  startOverlay.classList.remove("visible");
  if (soundEnabled) {
    setAmbientSound(true);
  }
  startSession();
}

function handleRestartClick() {
  winOverlay.classList.remove("visible");
  startSession();
}

function updateSoundToggleText() {
  if (!soundToggleBtn) return;
  soundToggleBtn.textContent = `Sound: ${soundEnabled ? "On" : "Off"}`;
}

function createAmbientSoundGraph() {
  if (!audioCtx) return null;
  const master = audioCtx.createGain();
  master.gain.value = 0.0001;
  master.connect(audioCtx.destination);

  const bass = audioCtx.createOscillator();
  bass.type = "triangle";
  bass.frequency.value = 110;
  const bassGain = audioCtx.createGain();
  bassGain.gain.value = 0.16;
  bass.connect(bassGain);
  bassGain.connect(master);
  bass.start();

  const kickTone = audioCtx.createOscillator();
  kickTone.type = "sine";
  kickTone.frequency.value = 46;
  const kickGain = audioCtx.createGain();
  kickGain.gain.value = 0.0;
  kickTone.connect(kickGain);
  kickGain.connect(master);
  kickTone.start();

  const melodyGain = audioCtx.createGain();
  melodyGain.gain.value = 0.22;
  melodyGain.connect(master);

  const melody = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 349.23];
  const bassLine = [110.0, 98.0, 123.47, 130.81];
  let step = 0;
  let timer = null;

  const playPluck = (freq, lengthMs = 220, wave = "sawtooth", gainAmount = 0.18) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    g.gain.value = 0.0001;
    osc.connect(g);
    g.connect(melodyGain);
    const now = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gainAmount, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + lengthMs / 1000);
    osc.start(now);
    osc.stop(now + lengthMs / 1000 + 0.05);
  };

  const pulseKick = () => {
    const now = audioCtx.currentTime;
    kickGain.gain.cancelScheduledValues(now);
    kickGain.gain.setValueAtTime(0.0001, now);
    kickGain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
    kickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
  };

  const startMusic = () => {
    if (timer !== null) return;
    timer = setInterval(() => {
      const m = melody[step % melody.length];
      playPluck(m, 220, "triangle", 0.17);
      if (step % 2 === 0) playPluck(m * 2, 140, "sine", 0.08);
      if (step % 4 === 0) pulseKick();
      bass.frequency.setValueAtTime(bassLine[Math.floor(step / 2) % bassLine.length], audioCtx.currentTime);
      step += 1;
    }, 260);
  };

  const stopMusic = () => {
    if (timer === null) return;
    clearInterval(timer);
    timer = null;
  };

  return { master, bass, bassGain, kickTone, kickGain, melodyGain, startMusic, stopMusic };
}

function ensureAudioContext() {
  if (audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = new Ctx();
}

async function setAmbientSound(enabled) {
  soundEnabled = enabled;
  localStorage.setItem("escape_sound_enabled", enabled ? "1" : "0");
  updateSoundToggleText();

  ensureAudioContext();
  if (!audioCtx) return;
  try {
    await audioCtx.resume();
  } catch {}

  if (!ambientNodes) {
    ambientNodes = createAmbientSoundGraph();
  }
  if (!ambientNodes) return;

  const now = audioCtx.currentTime;
  ambientNodes.master.gain.cancelScheduledValues(now);
  ambientNodes.master.gain.setValueAtTime(ambientNodes.master.gain.value, now);
  ambientNodes.master.gain.linearRampToValueAtTime(enabled ? 0.09 : 0.0001, now + 0.3);
  if (enabled) ambientNodes.startMusic();
  else ambientNodes.stopMusic();
}

function tryInteractAction() {
  if (questionOverlay.classList.contains("visible") || roomOverlay.classList.contains("visible")) return;
  if (collectTreasure()) return;
  const station = getInteractStation();
  if (station) {
    if (hintEl) {
      hintEl.textContent = gameState.perks.sprintUnlocked
        ? "Move: WASD | Look: Mouse/Arrows or touch | Sprint: Shift | Interact: E | Jump: Space"
        : "Move: WASD | Look: Mouse/Arrows or touch | Interact: E | Jump: Space";
    }
    showQuestion(station);
  } else if (hintEl) {
    hintEl.textContent = gameState.treasureUnlocked
      ? "Treasure is unlocked. Move near the chest and interact."
      : "No station nearby. Move closer to a question door, then interact.";
  }
}

function handleKeyDown(event) {
  if (event.code === "Space") {
    event.preventDefault();
    if (player.z === 0) player.vz = JUMP_SPEED * gameState.perks.jumpMul;
    return;
  }
  if (event.code in input) input[event.code] = true;
  if (event.code === "KeyE") {
    tryInteractAction();
  }
}

function handleKeyUp(event) {
  if (event.code in input) input[event.code] = false;
}

function handleMouseMove(event) {
  if (!gameState.isPlaying || questionOverlay.classList.contains("visible") || roomOverlay.classList.contains("visible")) return;
  if (isTouchDevice) return;
  if (document.pointerLockElement !== canvas) return;
  player.angle = normalizeAngle(player.angle + event.movementX * 0.0025);
}

function setupMobileControls() {
  if (!isTouchDevice) return;

  if (lookSensitivityInput && lookSensitivityValueEl) {
    lookSensitivityInput.value = String(touchLookSensitivity);
    lookSensitivityValueEl.textContent = `${touchLookSensitivity.toFixed(1)}x`;
    lookSensitivityInput.addEventListener("input", () => {
      touchLookSensitivity = Number(lookSensitivityInput.value);
      lookSensitivityValueEl.textContent = `${touchLookSensitivity.toFixed(1)}x`;
      localStorage.setItem("escape_touch_look_sensitivity", String(touchLookSensitivity));
    });
  }

  let joyTouchId = null;
  let lookTouchId = null;
  let lookLastX = 0;
  const joyRadius = 40;

  const centerKnob = () => {
    if (!joystickKnobEl) return;
    joystickKnobEl.style.transform = "translate(0px, 0px)";
  };
  centerKnob();

  const updateJoystickFromTouch = (touch) => {
    if (!joystickAreaEl || !joystickKnobEl) return;
    const rect = joystickAreaEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const mag = Math.hypot(dx, dy);
    if (mag > joyRadius) {
      dx = (dx / mag) * joyRadius;
      dy = (dy / mag) * joyRadius;
    }
    mobileInput.moveX = dx / joyRadius;
    mobileInput.moveY = -dy / joyRadius;
    joystickKnobEl.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  joystickAreaEl?.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      joyTouchId = t.identifier;
      updateJoystickFromTouch(t);
    },
    { passive: true }
  );

  joystickAreaEl?.addEventListener(
    "touchmove",
    (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== joyTouchId) continue;
        updateJoystickFromTouch(t);
      }
    },
    { passive: true }
  );

  joystickAreaEl?.addEventListener(
    "touchend",
    (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== joyTouchId) continue;
        joyTouchId = null;
        mobileInput.moveX = 0;
        mobileInput.moveY = 0;
        centerKnob();
      }
    },
    { passive: true }
  );

  const startJump = () => {
    if (player.z === 0) player.vz = JUMP_SPEED * gameState.perks.jumpMul;
  };

  mobileInteractBtn?.addEventListener("click", () => tryInteractAction());
  mobileJumpBtn?.addEventListener("click", startJump);

  mobileSprintBtn?.addEventListener("touchstart", () => {
    mobileInput.sprint = true;
  });
  mobileSprintBtn?.addEventListener("touchend", () => {
    mobileInput.sprint = false;
  });
  mobileSprintBtn?.addEventListener("touchcancel", () => {
    mobileInput.sprint = false;
  });
  mobileSprintBtn?.addEventListener("click", () => {
    mobileInput.sprint = !mobileInput.sprint;
  });

  canvas.addEventListener(
    "touchstart",
    (e) => {
      if (!gameState.isPlaying || questionOverlay.classList.contains("visible") || roomOverlay.classList.contains("visible")) return;
      for (const t of Array.from(e.changedTouches)) {
        if (joyTouchId !== null && t.identifier === joyTouchId) continue;
        if (t.clientX < window.innerWidth * 0.45) continue;
        if (lookTouchId === null) {
          lookTouchId = t.identifier;
          lookLastX = t.clientX;
        }
      }
    },
    { passive: true }
  );

  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (lookTouchId === null) return;
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== lookTouchId) continue;
        const dx = t.clientX - lookLastX;
        lookLastX = t.clientX;
        mobileInput.lookX += Math.max(-1.6, Math.min(1.6, (dx / 35) * touchLookSensitivity));
      }
    },
    { passive: true }
  );

  canvas.addEventListener(
    "touchend",
    (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === lookTouchId) {
          lookTouchId = null;
          lookLastX = 0;
        }
      }
    },
    { passive: true }
  );
}

window.__startGame = handleStartClick;
window.__restartGame = handleRestartClick;
window.__engineLoaded = true;
if (engineStatusEl) engineStatusEl.textContent = "Engine status: ready.";
if (studentNameEl) studentNameEl.textContent = `Student: ${studentName} | Course: ${getCourseLabel(gameState.activeCourse)}`;

startBtn.addEventListener("click", handleStartClick);
restartBtn.addEventListener("click", handleRestartClick);
closeQuestionBtn.addEventListener("click", closeQuestion);
soundToggleBtn?.addEventListener("click", () => {
  setAmbientSound(!soundEnabled);
});
roomOverlayBtn.addEventListener("click", () => {
  roomOverlay.classList.remove("visible");
  resumeTimer();
});

canvas.addEventListener("click", () => {
  if (!gameState.isPlaying) return;
  if (isTouchDevice) return;
  if (document.pointerLockElement !== canvas && !questionOverlay.classList.contains("visible") && !roomOverlay.classList.contains("visible")) {
    canvas.requestPointerLock();
  }
});

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);
document.addEventListener("mousemove", handleMouseMove);
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
setupMobileControls();
updateSoundToggleText();
if (!isTouchDevice && lookSensitivityInput && lookSensitivityValueEl) {
  lookSensitivityInput.disabled = true;
  lookSensitivityValueEl.textContent = "N/A";
}
gameState.generatedPool = generateCourseQuestionPool(gameState.activeCourse, studentName, sessionSeed, 1, 100);
applyDoorSetup(0, 0);
requestAnimationFrame(gameLoop);
