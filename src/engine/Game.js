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

        // Audio Setup
        this.bgMusic = new Audio('./game_background.mp3');
        this.bgMusic.loop = true;
        this.bgMusic.volume = 0.5; // Adjust volume as needed
        this.bgMusic.addEventListener('ended', () => {
            this.bgMusic.currentTime = 0;
            this.bgMusic.play().catch(e => console.log('Loop play failed:', e));
        });

        this.menuMusic = new Audio('./menu_background.mp3');
        this.menuMusic.loop = true;
        this.menuMusic.volume = 0.5;
        this.menuMusic.addEventListener('ended', () => {
            this.menuMusic.currentTime = 0;
            this.menuMusic.play().catch(e => console.log('Menu audio loop failed', e));
        });

        // Sound Effects
        this.pickupSound = new Audio('./pickup_sound.mp3');
        this.pickupSound.volume = 0.7; // Crisp SFX volume

        // Attempt autoplay for menu music (requires interaction in most browsers)
        this.menuMusic.play().catch(() => {
            const startMenuMusic = () => {
                if (!this.isRunning && !document.getElementById('main-menu').classList.contains('hidden')) {
                    this.menuMusic.play().catch(e => console.log('Audio play failed:', e));
                }
                ['click', 'keydown', 'pointerdown'].forEach(evt => document.removeEventListener(evt, startMenuMusic));
            };
            ['click', 'keydown', 'pointerdown'].forEach(evt => document.addEventListener(evt, startMenuMusic, { once: true }));
        });

        // Generate new floor layout
        this.createFloorCanvas();

        // Entities
        this.player = new Player(this.mapWidth / 2, this.mapHeight / 2);
        this.shelves = [];
        this.books = [];
        this.kids = []; // Add kids array

        // Listen for chaos events
        document.addEventListener('increaseChaos', () => {
            // Difficulty scales with level, base 1.5 + 0.5 per level
            const chaosAmount = 1.0 + (this.level * 0.5); 
            this.chaos = Math.min(100, this.chaos + chaosAmount);
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
            this.menuMusic.pause();
            this.menuMusic.currentTime = 0;
            this.start();
        });

        document.getElementById('btn-music').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent document click from interfering
            if (this.menuMusic.paused) {
                this.menuMusic.play();
                document.getElementById('btn-music').innerText = 'Pause Menu Music ⏸️';
            } else {
                this.menuMusic.pause();
                document.getElementById('btn-music').innerText = 'Play Menu Music 🎵';
            }
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

    createFloorCanvas() {
        this.floorCanvas = document.createElement('canvas');
        this.floorCanvas.width = this.mapWidth;
        this.floorCanvas.height = this.mapHeight;
        const ctx = this.floorCanvas.getContext('2d');
        const w = this.mapWidth;
        const h = this.mapHeight;
        const colW = w / 4;
        const rowH = h / 2;

        // Base wall color
        ctx.fillStyle = '#4e2f1d';
        ctx.fillRect(0, 0, w, h);

        const pad = 20; // Wall thickness

        const drawRoom = (col, row, fillFunc) => {
            const rx = col * colW + pad;
            const ry = row * rowH + pad;
            const rw = colW - pad * (col === 3 ? 2 : 1);
            const rh = rowH - pad * (row === 1 ? 2 : 1);
            ctx.save();
            ctx.translate(rx, ry);
            ctx.beginPath();
            ctx.rect(0, 0, rw, rh);
            ctx.clip();
            fillFunc(ctx, rw, rh);
            ctx.restore();
        };

        // R0C0: Green carpet
        drawRoom(0, 0, (c, rw, rh) => {
            c.fillStyle = '#6b702b';
            c.fillRect(0, 0, rw, rh);
        });

        // R1C0: Horizontal wood planks
        drawRoom(0, 1, (c, rw, rh) => {
            c.fillStyle = '#b86d42';
            c.fillRect(0, 0, rw, rh);
            c.fillStyle = '#965430';
            for (let y = 0; y < rh; y += 40) c.fillRect(0, y, rw, 2);
        });

        // R0C1: Orange top, brown vertical bottom
        drawRoom(1, 0, (c, rw, rh) => {
            const split = rh * 0.55;
            c.fillStyle = '#c45d1a';
            c.fillRect(0, 0, rw, split);
            c.fillStyle = '#6b3e34';
            c.fillRect(0, split, rw, rh - split);
            c.fillStyle = '#522b22';
            for (let x = 0; x < rw; x += rw / 4) c.fillRect(x, split, 2, rh - split);
        });

        // R1C1: Beige Diamond tiles
        drawRoom(1, 1, (c, rw, rh) => {
            c.fillStyle = '#debe8e';
            c.fillRect(0, 0, rw, rh);
            c.strokeStyle = '#d1b181';
            c.lineWidth = 2;
            c.beginPath();
            for (let i = -rw; i < rw * 2; i += 60) {
                c.moveTo(i, 0); c.lineTo(i + rh, rh);
                c.moveTo(i, 0); c.lineTo(i - rh, rh);
            }
            c.stroke();
        });

        // R0C2: Vertical beige stripes
        drawRoom(2, 0, (c, rw, rh) => {
            c.fillStyle = '#ebd5ad';
            c.fillRect(0, 0, rw, rh);
            c.fillStyle = '#e3cb9f';
            for (let x = 0; x < rw; x += 60) c.fillRect(x, 0, 30, rh);
        });

        // R1C2: Light Wood horizontal
        drawRoom(2, 1, (c, rw, rh) => {
            c.fillStyle = '#c47e54';
            c.fillRect(0, 0, rw, rh);
            c.fillStyle = '#a36743';
            for (let y = 0; y < rh; y += 40) c.fillRect(0, y, rw, 2);
        });

        // R0C3: Light tan top, orange grid bottom
        drawRoom(3, 0, (c, rw, rh) => {
            const split = rh * 0.35;
            c.fillStyle = '#eabf90';
            c.fillRect(0, 0, rw, split);
            c.fillStyle = '#d16c21';
            c.fillRect(0, split, rw, rh - split);
            c.fillStyle = '#bb5715';
            for (let x = 0; x < rw; x += 30) c.fillRect(x, split, 2, rh - split);
            for (let y = split; y < rh; y += 30) c.fillRect(0, y, rw, 2);
        });

        // R1C3: Orange grid with grate
        drawRoom(3, 1, (c, rw, rh) => {
            c.fillStyle = '#d16c21';
            c.fillRect(0, 0, rw, rh);
            c.fillStyle = '#bb5715';
            for (let x = 0; x < rw; x += 30) c.fillRect(x, 0, 2, rh);
            for (let y = 0; y < rh; y += 30) c.fillRect(0, y, rw, 2);
            // Grate
            c.fillStyle = '#7c7885'; // Grey base
            c.fillRect(rw / 2, rh / 2 - 30, 80, 50);
            c.fillStyle = '#555'; // Dark lines
            for (let x = rw / 2 + 10; x < rw / 2 + 70; x += 15) {
                c.fillRect(x, rh / 2 - 20, 5, 30);
            }
        });

        // Draw Windows (blue)
        ctx.fillStyle = '#a3afdb';
        ctx.fillRect(0, rowH - 200, pad, 400); // left middle
        ctx.fillRect(colW - 100, h - pad, 200, pad); // bottom room 1
        ctx.fillRect(colW * 2 - 150, h - pad, 300, pad); // bottom room 2
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

        // Stop game music
        this.bgMusic.pause();
        this.bgMusic.currentTime = 0;

        // Restart menu music
        this.menuMusic.currentTime = 0;
        this.menuMusic.play().catch(e => console.log('Menu music play failed', e));

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
            this.bgMusic.pause();
        } else {
            document.getElementById('pause-menu').classList.add('hidden');
            this.bgMusic.play().catch(e => console.log('Audio play failed:', e));
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

        // Spawn 5 initial kids to keep Level 1 manageable
        for (let i = 0; i < 5; i++) {
            let initialKid = new Kid(
                100 + Math.random() * (this.mapWidth - 200),
                100 + Math.random() * (this.mapHeight - 200)
            );
            initialKid.speed = 150 + (this.level * 15);
            this.kids.push(initialKid);
        }
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    start() {
        this.isRunning = true;
        this.bgMusic.play().catch(e => console.log('Audio autoplay prevented by browser. Interaction required.', e));
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
            kid.update(dt, this.player, this.mapWidth, this.mapHeight, this.shelves, this.books, this.level);
        }

        // Kid Spawner
        if (this.kids.length < this.maxKids) {
            this.kidSpawnTimer += dt;
            // Spawn rate gets faster as level increases (starts at 10 seconds, drops slowly)
            const spawnRate = Math.max(2, 12 - this.level);
            if (this.kidSpawnTimer >= spawnRate) {
                this.kidSpawnTimer = 0;
                let newKid = new Kid(
                    100 + Math.random() * (this.mapWidth - 200),
                    100 + Math.random() * (this.mapHeight - 200)
                );
                // Kids get faster every level
                newKid.speed = 150 + (this.level * 15);
                this.kids.push(newKid);
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
                    
                    // Play pickup sound effect (cloned so rapid pickups overlap cleanly)
                    const sfx = this.pickupSound.cloneNode();
                    sfx.volume = this.pickupSound.volume;
                    sfx.play().catch(() => {});
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

        this.bgMusic.pause(); // Stop music on Win

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

        this.bgMusic.pause(); // Stop music on loss

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

        // Setup upgrade text to show before -> after
        document.getElementById('btn-upgrade-1').innerText = `Speed (${this.player.walkSpeed.toFixed(0)} => ${(this.player.walkSpeed + 100).toFixed(0)})`;
        document.getElementById('btn-upgrade-2').innerText = `Carry (${this.player.maxCarryCapacity} => ${this.player.maxCarryCapacity + 5})`;
        document.getElementById('btn-upgrade-3').innerText = `Radius (${this.player.pickupRadius.toFixed(0)} => ${(this.player.pickupRadius + 50).toFixed(0)})`;
    }

    applyUpgrade(type) {
        if (type === 1) {
            this.player.walkSpeed += 100;
            this.player.runSpeed += 150;
        }
        if (type === 2) this.player.maxCarryCapacity += 5;
        if (type === 3) this.player.pickupRadius += 50;

        this.isPaused = false;
        document.getElementById('overlay').classList.add('hidden');
        document.getElementById('upgrade-options').classList.add('hidden');
        this.lastTime = performance.now(); // Avoid huge delta jump
    }

    draw() {
        // Clear screen with dark background outside the map
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(-this.cameraX, -this.cameraY);

        // Draw the cached floor map
        if (this.floorCanvas) {
            this.ctx.drawImage(this.floorCanvas, 0, 0);
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

        // Draw pickup radius darker and more prominent
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.pickupRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 2;
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
