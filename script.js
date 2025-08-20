// Game constants
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const COLORS = {
  I: "#00f0f0",
  O: "#f0f000",
  T: "#a000f0",
  S: "#00f000",
  Z: "#f00000",
  J: "#0000f0",
  L: "#f0a000",
};

// Tetromino shapes
const SHAPES = {
  I: [[[1, 1, 1, 1]], [[1], [1], [1], [1]]],
  O: [
    [
      [1, 1],
      [1, 1],
    ],
  ],
  T: [
    [
      [0, 1, 0],
      [1, 1, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 0],
    ],
    [
      [1, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 1],
      [1, 1],
      [0, 1],
    ],
  ],
  S: [
    [
      [0, 1, 1],
      [1, 1, 0],
    ],
    [
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  ],
  Z: [
    [
      [1, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 0],
    ],
  ],
  J: [
    [
      [1, 0, 0],
      [1, 1, 1],
    ],
    [
      [1, 1],
      [1, 0],
      [1, 0],
    ],
    [
      [1, 1, 1],
      [0, 0, 1],
    ],
    [
      [0, 1],
      [0, 1],
      [1, 1],
    ],
  ],
  L: [
    [
      [0, 0, 1],
      [1, 1, 1],
    ],
    [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
    [
      [1, 1, 1],
      [1, 0, 0],
    ],
    [
      [1, 1],
      [0, 1],
      [0, 1],
    ],
  ],
};

// Game state
let board = [];
let currentPiece = null;
let currentX = 0;
let currentY = 0;
let currentRotation = 0;
let nextPieceType = null;
let score = 0;
let level = 1;
let lines = 0;
let dropTime = 1000;
let lastDrop = 0;
let gameRunning = true;
let paused = false;
let soundEnabled = true;
let audioContext = null;

// Initialize audio context
function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// Play sound effects
function playSound(type) {
  if (!soundEnabled || !audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  switch (type) {
    case "move":
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
      break;
    case "rotate":
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
      break;
    case "drop":
      oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      break;
    case "clear":
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      break;
    case "gameover":
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      break;
  }

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}

// Initialize game board
function initBoard() {
  const grid = document.getElementById("gameGrid");
  grid.innerHTML = "";
  board = [];

  for (let y = 0; y < BOARD_HEIGHT; y++) {
    board[y] = [];
    for (let x = 0; x < BOARD_WIDTH; x++) {
      board[y][x] = 0;
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.id = `cell-${x}-${y}`;
      grid.appendChild(cell);
    }
  }
}

// Initialize next piece display
function initNextPiece() {
  const nextPieceGrid = document.getElementById("nextPiece");
  nextPieceGrid.innerHTML = "";

  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const cell = document.createElement("div");
      cell.className = "next-cell";
      cell.id = `next-${x}-${y}`;
      nextPieceGrid.appendChild(cell);
    }
  }
}

// Get random piece type
function getRandomPiece() {
  const pieces = Object.keys(SHAPES);
  return pieces[Math.floor(Math.random() * pieces.length)];
}

// Create new piece
function createPiece() {
  if (!nextPieceType) {
    nextPieceType = getRandomPiece();
  }

  currentPieceType = nextPieceType;
  nextPieceType = getRandomPiece();

  currentPiece = SHAPES[currentPieceType][0];
  currentRotation = 0;
  currentX = Math.floor(BOARD_WIDTH / 2) - Math.floor(currentPiece[0].length / 2);
  currentY = 0;

  updateNextPieceDisplay();

  if (!isValidPosition(currentPiece, currentX, currentY)) {
    gameOver();
  }
}

// Update next piece display
function updateNextPieceDisplay() {
  // Clear next piece display
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const cell = document.getElementById(`next-${x}-${y}`);
      cell.classList.remove("filled");
      cell.style.setProperty("--color", "");
    }
  }

  // Show next piece
  const nextPiece = SHAPES[nextPieceType][0];
  const offsetX = Math.floor((4 - nextPiece[0].length) / 2);
  const offsetY = Math.floor((4 - nextPiece.length) / 2);

  for (let y = 0; y < nextPiece.length; y++) {
    for (let x = 0; x < nextPiece[y].length; x++) {
      if (nextPiece[y][x]) {
        const cell = document.getElementById(`next-${x + offsetX}-${y + offsetY}`);
        cell.classList.add("filled");
        cell.style.setProperty("--color", COLORS[nextPieceType]);
      }
    }
  }
}

// Check if position is valid
function isValidPosition(piece, x, y) {
  for (let py = 0; py < piece.length; py++) {
    for (let px = 0; px < piece[py].length; px++) {
      if (piece[py][px]) {
        const newX = x + px;
        const newY = y + py;

        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
          return false;
        }

        if (newY >= 0 && board[newY][newX]) {
          return false;
        }
      }
    }
  }
  return true;
}

// Place piece on board
function placePiece() {
  for (let y = 0; y < currentPiece.length; y++) {
    for (let x = 0; x < currentPiece[y].length; x++) {
      if (currentPiece[y][x]) {
        board[currentY + y][currentX + x] = currentPieceType;
      }
    }
  }

  playSound("drop");
  clearLines();
  createPiece();
}

// Clear completed lines
function clearLines() {
  let linesCleared = 0;

  for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
    if (board[y].every((cell) => cell !== 0)) {
      // Mark line for clearing animation
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = document.getElementById(`cell-${x}-${y}`);
        cell.classList.add("clearing");
        cell.style.setProperty("--color", COLORS[board[y][x]]);
      }

      // Remove line after animation
      setTimeout(() => {
        board.splice(y, 1);
        board.unshift(new Array(BOARD_WIDTH).fill(0));
        y++; // Check the same line again
        updateBoard();
      }, 500);

      linesCleared++;
    }
  }

  if (linesCleared > 0) {
    playSound("clear");
    lines += linesCleared;
    score += linesCleared * 100 * level;

    // Level up every 10 lines
    if (lines >= level * 10) {
      level++;
      dropTime = Math.max(100, 1000 - (level - 1) * 100);
    }

    updateScore();
  }
}

// Update board display
function updateBoard() {
  // Clear board display
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const cell = document.getElementById(`cell-${x}-${y}`);
      cell.classList.remove("filled");
      cell.style.setProperty("--color", "");
    }
  }

  // Draw placed pieces
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      if (board[y][x]) {
        const cell = document.getElementById(`cell-${x}-${y}`);
        cell.classList.add("filled");
        cell.style.setProperty("--color", COLORS[board[y][x]]);
      }
    }
  }

  // Draw current piece
  if (currentPiece) {
    for (let y = 0; y < currentPiece.length; y++) {
      for (let x = 0; x < currentPiece[y].length; x++) {
        if (currentPiece[y][x]) {
          const cell = document.getElementById(`cell-${currentX + x}-${currentY + y}`);
          cell.classList.add("filled");
          cell.style.setProperty("--color", COLORS[currentPieceType]);
        }
      }
    }
  }
}

// Move piece
function movePiece(dx, dy) {
  if (!isValidPosition(currentPiece, currentX + dx, currentY + dy)) {
    return false;
  }

  currentX += dx;
  currentY += dy;

  if (dx !== 0) playSound("move");

  updateBoard();
  return true;
}

// Rotate piece
function rotatePiece() {
  const rotations = SHAPES[currentPieceType];
  const nextRotation = (currentRotation + 1) % rotations.length;
  const rotatedPiece = rotations[nextRotation];

  if (isValidPosition(rotatedPiece, currentX, currentY)) {
    currentPiece = rotatedPiece;
    currentRotation = nextRotation;
    playSound("rotate");
    updateBoard();
  }
}

// Hard drop
function hardDrop() {
  while (movePiece(0, 1)) {
    score += 2;
  }
  updateScore();
  placePiece();
}

// Update score display
function updateScore() {
  document.getElementById("scoreDisplay").textContent = score;
  document.getElementById("levelDisplay").textContent = level;
  document.getElementById("linesDisplay").textContent = lines;
}

// Game over
function gameOver() {
  gameRunning = false;
  playSound("gameover");
  document.getElementById("gameOverOverlay").classList.add("show");
}

// Reset game
function resetGame() {
  score = 0;
  level = 1;
  lines = 0;
  dropTime = 1000;
  gameRunning = true;
  paused = false;
  nextPieceType = null;

  document.getElementById("gameOverOverlay").classList.remove("show");

  initBoard();
  createPiece();
  updateScore();
  updateBoard();
}

// Toggle pause
function togglePause() {
  if (!gameRunning) return;

  paused = !paused;
  document.querySelector('button[onclick="togglePause()"]').textContent = paused ? "Resume Game" : "Pause Game";
}

// Toggle sound
function toggleSound() {
  soundEnabled = !soundEnabled;
  document.getElementById("soundToggle").textContent = soundEnabled ? "🔊" : "🔇";
}

// Game loop
function gameLoop(timestamp) {
  if (!gameRunning || paused) {
    requestAnimationFrame(gameLoop);
    return;
  }

  if (timestamp - lastDrop > dropTime) {
    if (!movePiece(0, 1)) {
      placePiece();
    }
    lastDrop = timestamp;
  }

  requestAnimationFrame(gameLoop);
}

// Keyboard controls
document.addEventListener("keydown", (e) => {
  if (!gameRunning || paused) return;

  initAudio();

  switch (e.key) {
    case "ArrowLeft":
      e.preventDefault();
      movePiece(-1, 0);
      break;
    case "ArrowRight":
      e.preventDefault();
      movePiece(1, 0);
      break;
    case "ArrowDown":
      e.preventDefault();
      if (movePiece(0, 1)) {
        score += 1;
        updateScore();
      }
      break;
    case "ArrowUp":
      e.preventDefault();
      rotatePiece();
      break;
    case " ":
      e.preventDefault();
      hardDrop();
      break;
    case "p":
    case "P":
      togglePause();
      break;
  }
});

// Initialize game
window.addEventListener("load", () => {
  initBoard();
  initNextPiece();
  createPiece();
  updateBoard();
  updateScore();
  requestAnimationFrame(gameLoop);
});
