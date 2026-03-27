import { Input } from './Input.js';
import { Player } from '../entities/Player.js';
import { Shelf } from '../entities/Shelf.js';
import { Book } from '../entities/Book.js';
import { Kid } from '../entities/Kid.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Fit canvas to container
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.input = new Input();
        this.lastTime = 0;
        this.isRunning = false;

        this.mapWidth = 3000;
        this.mapHeight = 3000;
        this.cameraX = 0;
        this.cameraY = 0;

        // Entities
        this.player = new Player(this.mapWidth / 2, this.mapHeight / 2);
        this.shelves = [];
        this.books = [];
        this.kids = []; // Add kids array

        // Listen for chaos events
        document.addEventListener('increaseChaos', () => {
            this.chaos = Math.min(100, this.chaos + 3); // Reduced from 5 to 3
        });

        // System State
        this.chaos = 0;
        this.xp = 0;
        this.xpMax = 100;
        this.level = 1;
        this.timeRemaining = 1590; // 26.5 minutes
        this.timePlayed = 0;
        this.totalBooksShelved = 0;
        this.maxKids = 50;
        this.kidSpawnTimer = 0;
        this.isGameOver = false;
        this.isPaused = false;

        // Setup UI buttons
        document.getElementById('btn-start').addEventListener('click', () => {
            document.getElementById('main-menu').classList.add('hidden');
            document.getElementById('hud').classList.remove('hidden');
            this.start();
        });

        document.getElementById('btn-guide').addEventListener('click', () => {
            document.getElementById('guide').classList.remove('hidden');
        });
        document.getElementById('btn-close-guide').addEventListener('click', () => {
            document.getElementById('guide').classList.add('hidden');
        });

        document.getElementById('btn-settings').addEventListener('click', () => {
            document.getElementById('settings').classList.remove('hidden');
        });
        document.getElementById('btn-close-settings').addEventListener('click', () => {
            document.getElementById('settings').classList.add('hidden');
        });

        document.getElementById('btn-quit').addEventListener('click', () => {
            this.resetGame();
        });

        document.getElementById('btn-upgrade-1').addEventListener('click', () => this.applyUpgrade(1));
        document.getElementById('btn-upgrade-2').addEventListener('click', () => this.applyUpgrade(2));
        document.getElementById('btn-upgrade-3').addEventListener('click', () => this.applyUpgrade(3));
        document.getElementById('btn-restart').addEventListener('click', () => {
            this.resetGame();
            document.getElementById('main-menu').classList.add('hidden');
            document.getElementById('hud').classList.remove('hidden');
            this.start();
        });

        // Pause menu event listeners
        document.getElementById('btn-pause-resume').addEventListener('click', () => {
            this.togglePause();
        });
        document.getElementById('btn-pause-restart').addEventListener('click', () => {
            document.getElementById('pause-menu').classList.add('hidden');
            this.resetGame();
            document.getElementById('main-menu').classList.add('hidden');
            document.getElementById('hud').classList.remove('hidden');
            this.start();
        });
        document.getElementById('btn-pause-quit').addEventListener('click', () => {
            document.getElementById('pause-menu').classList.add('hidden');
            this.resetGame();
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isRunning && !this.isGameOver) {
                this.togglePause();
            }
        });

        this.initMap();
    }

    resetGame() {
        this.isRunning = false;
        this.isGameOver = false;
        this.isPaused = false;
        this.chaos = 0;
        this.xp = 0;
        this.level = 1;
        this.xpMax = 100;
        this.timeRemaining = 1590;
        this.timePlayed = 0;
        this.totalBooksShelved = 0;
        this.kidSpawnTimer = 0;
        this.lastTime = 0;

        document.getElementById('overlay').classList.add('hidden');
        document.getElementById('score-card').classList.add('hidden');
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        document.getElementById('btn-restart').classList.add('hidden');
        document.getElementById('btn-quit').classList.add('hidden');

        this.player = new Player(this.mapWidth / 2, this.mapHeight / 2);
        this.initMap();
        this.updateUI();
    }

    togglePause() {
        if (!document.getElementById('upgrade-options').classList.contains('hidden')) {
            return; // Cannot pause during an upgrade
        }
        
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            document.getElementById('pause-menu').classList.remove('hidden');
        } else {
            document.getElementById('pause-menu').classList.add('hidden');
            this.lastTime = performance.now();
        }
    }

    initMap() {
        this.shelves = [];
        this.books = [];
        this.kids = [];

        const rowSpacing = 350;
        const colSpacing = 450;

        for (let r = 200; r < this.mapHeight - 200; r += rowSpacing) {
            for (let c = 200; c < this.mapWidth - 200; c += colSpacing) {
                // Skip middle center area for player spawn
                if (Math.abs(c - this.mapWidth / 2) < 400 && Math.abs(r - this.mapHeight / 2) < 400) continue;
                this.shelves.push(new Shelf(c, r, 180, 120)); // larger shelf for 3x3
            }
        }

        // Spawn 4 initial kids
        for (let i = 0; i < 4; i++) {
            this.kids.push(new Kid(
                100 + Math.random() * (this.mapWidth - 200),
                100 + Math.random() * (this.mapHeight - 200)
            ));
        }
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    start() {
        this.isRunning = true;
        requestAnimationFrame((time) => this.loop(time));
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        if (!this.isGameOver && !this.isPaused) {
            this.update(deltaTime);
        }
        this.draw();

        requestAnimationFrame((time) => this.loop(time));
    }

    update(dt) {
        this.timeRemaining -= dt;
        this.timePlayed += dt;
        
        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this.triggerWin();
            return;
        }

        if (this.chaos >= 100) {
            this.chaos = 100;
            this.triggerLose();
            return;
        }

        this.player.update(dt, this.input, this.mapWidth, this.mapHeight, this.shelves);

        // Update Kids
        for (const kid of this.kids) {
            kid.update(dt, this.player, this.mapWidth, this.mapHeight, this.shelves, this.books);
        }

        // Kid Spawner
        if (this.kids.length < this.maxKids) {
            this.kidSpawnTimer += dt;
            if (this.kidSpawnTimer >= 5) {
                this.kidSpawnTimer = 0;
                this.kids.push(new Kid(
                    100 + Math.random() * (this.mapWidth - 200),
                    100 + Math.random() * (this.mapHeight - 200)
                ));
            }
        }

        // Camera Logic (Ease towards player)
        let targetCameraX = this.player.x - this.canvas.width / 2;
        let targetCameraY = this.player.y - this.canvas.height / 2;
        targetCameraX = Math.max(0, Math.min(this.mapWidth - this.canvas.width, targetCameraX));
        targetCameraY = Math.max(0, Math.min(this.mapHeight - this.canvas.height, targetCameraY));
        
        this.cameraX += (targetCameraX - this.cameraX) * 5 * dt;
        this.cameraY += (targetCameraY - this.cameraY) * 5 * dt;

        // Book Collection Logic
        for (let i = this.books.length - 1; i >= 0; i--) {
            const book = this.books[i];
            if (this.player.distanceTo(book) < this.player.pickupRadius) {
                if (this.player.carriedBooks < this.player.maxCarryCapacity) {
                    this.player.carriedBooks++;
                    this.books.splice(i, 1);
                    // Update Chaos (more rewarding pickup)
                    this.chaos = Math.max(0, this.chaos - 2);
                }
            }
        }

        // Shelving Logic
        if (this.player.carriedBooks > 0) {
            let activeShelf = null;
            for (const shelf of this.shelves) {
                if (this.player.collidesWithRect(shelf, 20)) {
                    activeShelf = shelf;
                    break;
                }
            }

            if (activeShelf) {
                let deposited = false;
                while (this.player.carriedBooks > 0 && activeShelf.returnBook()) {
                    this.player.carriedBooks--;
                    this.totalBooksShelved++;
                    this.chaos = Math.max(0, this.chaos - 5); // Huge chaos reduction on return
                    this.xp += 10;
                    deposited = true;
                }

                // Basic level up logic
                if (deposited && this.xp >= this.xpMax) {
                    this.level++;
                    this.xp -= this.xpMax;
                    this.xpMax = Math.floor(this.xpMax * 1.5);
                    this.triggerUpgrade();
                }
            }
        }

        this.updateUI();
    }

    updateUI() {
        document.getElementById('chaos-meter').innerText = this.chaos.toFixed(0);
        document.getElementById('level-display').innerText = this.level;
        document.getElementById('xp-display').innerText = this.xp;
        document.getElementById('xp-max').innerText = this.xpMax;
        document.getElementById('kids-display').innerText = this.kids.length;
        document.getElementById('carry-display').innerText = this.player.carriedBooks;
        document.getElementById('carry-max').innerText = this.player.maxCarryCapacity;

        let staminaPct = (this.player.stamina / this.player.maxStamina) * 100;
        let fillEl = document.getElementById('stamina-fill');
        if (fillEl) {
            fillEl.style.width = staminaPct + '%';
            fillEl.style.background = this.player.staminaCooldown > 0 ? '#ff6b6b' : '#1dd1a1';
        }

        const mins = Math.floor(this.timeRemaining / 60);
        const secs = Math.floor(this.timeRemaining % 60).toString().padStart(2, '0');
        document.getElementById('time-display').innerText = `${mins}:${secs}`;
    }

    triggerWin() {
        this.isGameOver = true;
        document.getElementById('overlay').classList.remove('hidden');
        document.getElementById('overlay-title').innerText = 'You Survived!';
        document.getElementById('overlay-title').style.color = '#1dd1a1';
        document.getElementById('overlay-desc').innerText = 'You kept the library quiet for 26.5 minutes.';
        
        this.showScoreCard();

        document.getElementById('btn-restart').classList.remove('hidden');
        document.getElementById('btn-quit').classList.remove('hidden');
    }

    triggerLose() {
        this.isGameOver = true;
        document.getElementById('overlay').classList.remove('hidden');
        document.getElementById('overlay-title').innerText = 'Game Over';
        document.getElementById('overlay-title').style.color = '#ff6b6b';
        document.getElementById('overlay-desc').innerText = 'The library has fallen to chaos.';
        
        this.showScoreCard();

        document.getElementById('btn-restart').classList.remove('hidden');
        document.getElementById('btn-quit').classList.remove('hidden');
    }
    
    showScoreCard() {
        document.getElementById('score-card').classList.remove('hidden');
        const mins = Math.floor(this.timePlayed / 60);
        const secs = Math.floor(this.timePlayed % 60).toString().padStart(2, '0');
        document.getElementById('score-time').innerText = `${mins}:${secs}`;
        document.getElementById('score-books').innerText = this.totalBooksShelved;
        document.getElementById('score-level').innerText = this.level;
    }

    triggerUpgrade() {
        this.isPaused = true;
        document.getElementById('overlay').classList.remove('hidden');
        document.getElementById('overlay-title').innerText = 'Level Up!';
        document.getElementById('overlay-title').style.color = '#feca57';
        document.getElementById('overlay-desc').innerText = 'Choose an upgrade:';
        document.getElementById('upgrade-options').classList.remove('hidden');

        // Setup upgrade text
        document.getElementById('btn-upgrade-1').innerText = `Speed + (${this.player.walkSpeed.toFixed(0)})`;
        document.getElementById('btn-upgrade-2').innerText = `Carry + (${this.player.maxCarryCapacity})`;
        document.getElementById('btn-upgrade-3').innerText = `Radius + (${this.player.pickupRadius.toFixed(0)})`;
    }

    applyUpgrade(type) {
        if (type === 1) {
            this.player.walkSpeed += 50;
            this.player.runSpeed += 50;
        }
        if (type === 2) this.player.maxCarryCapacity += 2;
        if (type === 3) this.player.pickupRadius += 20;

        this.isPaused = false;
        document.getElementById('overlay').classList.add('hidden');
        document.getElementById('upgrade-options').classList.add('hidden');
        this.lastTime = performance.now(); // Avoid huge delta jump
    }

    draw() {
        // Clear screen with new wheat/tan pattern base color
        this.ctx.fillStyle = '#f5deb3'; // Wheat
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(-this.cameraX, -this.cameraY);

        // Draw floor tiles checkerboard
        this.ctx.fillStyle = '#d2b48c'; // Tan
        const tileSize = 60;
        
        const startX = Math.max(0, Math.floor(this.cameraX / tileSize) * tileSize);
        const startY = Math.max(0, Math.floor(this.cameraY / tileSize) * tileSize);
        const endX = Math.min(this.mapWidth, startX + this.canvas.width + tileSize);
        const endY = Math.min(this.mapHeight, startY + this.canvas.height + tileSize);

        for (let x = startX; x <= endX; x += tileSize) {
            for (let y = startY; y <= endY; y += tileSize) {
                if ((Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0) {
                    this.ctx.fillRect(x, y, tileSize, tileSize);
                }
            }
        }

        for (const shelf of this.shelves) {
            shelf.draw(this.ctx);
        }

        for (const book of this.books) {
            book.draw(this.ctx);
        }

        for (const kid of this.kids) {
            kid.draw(this.ctx);
        }

        this.player.draw(this.ctx);

        // Draw pickup radius for debug/visual clarity
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.pickupRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        this.ctx.restore();
        
        // Radar for Books
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        
        for (const book of this.books) {
            const screenX = book.x - this.cameraX;
            const screenY = book.y - this.cameraY;
            
            // Check if off-screen
            if (screenX < 0 || screenX > this.canvas.width || screenY < 0 || screenY > this.canvas.height) {
                const angle = Math.atan2(screenY - cy, screenX - cx);
                const radius = Math.min(cx, cy) - 40;
                
                const arrowX = cx + Math.cos(angle) * radius;
                const arrowY = cy + Math.sin(angle) * radius;
                
                this.ctx.save();
                this.ctx.translate(arrowX, arrowY);
                this.ctx.rotate(angle);
                
                this.ctx.fillStyle = book.color;
                this.ctx.beginPath();
                this.ctx.moveTo(12, 0);
                this.ctx.lineTo(-10, -8);
                this.ctx.lineTo(-6, 0);
                this.ctx.lineTo(-10, 8);
                this.ctx.fill();
                
                this.ctx.strokeStyle = '#2b2b36';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
                
                this.ctx.restore();
            }
        }
    }
}
