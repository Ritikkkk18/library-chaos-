import './style.css';
import { Game } from './engine/Game.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);

// Start game loop is now handled by Start button in Game.js
