import { Entity } from './Entity.js';
import { Book } from './Book.js';

export class Kid extends Entity {
    constructor(x, y) {
        super(x, y, 15);
        this.speed = 180;
        this.targetShelf = null;
        this.state = 'seeking_shelf'; // seeking_shelf, fleeing, escaping_with_book, stealing
        this.repelRadius = 150;
        this.carryingBook = false;
        this.stealTimer = 0;
        this.escapeTimer = 0;
        
        // Visuals
        this.walkAnimTimer = 0;
        this.facingRight = false;

        // Custom Kid Images
        this.kidImage = new Image();
        const kidImages = ['./kid1.png', './kid2.png', './kid3.png'];
        this.kidImage.src = kidImages[Math.floor(Math.random() * kidImages.length)];
        this.processedImage = null;

        this.kidImage.onload = () => {
            this.processImageBackground();
        };
    }

    processImageBackground() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.kidImage.width;
        tempCanvas.height = this.kidImage.height;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(this.kidImage, 0, 0);

        try {
            const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;
            const bgR = data[0];
            const bgG = data[1];
            const bgB = data[2];

            for (let y = 0; y < tempCanvas.height; y++) {
                for (let x = 0; x < tempCanvas.width; x++) {
                    const i = (y * tempCanvas.width + x) * 4;
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    const distFromBg = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
                    const isBottomRatio = y / tempCanvas.height;
                    const isGreyShadow = isBottomRatio > 0.8 && 
                                         Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && 
                                         Math.abs(r - b) < 20 && r > 100 && r < 240;
                    const isWhiteFloor = isBottomRatio > 0.8 && r > 240 && g > 240 && b > 240;

                    if (distFromBg < 50 || isGreyShadow || isWhiteFloor) {
                        data[i + 3] = 0; // Make transparent
                    }
                }
            }
            ctx.putImageData(imageData, 0, 0);
            this.processedImage = tempCanvas;
        } catch (e) {
            this.processedImage = this.kidImage;
        }
    }

    update(dt, player, mapWidth, mapHeight, shelves, books, level = 1) {
        if (!this.targetShelf && shelves.length > 0) {
            this.pickNewShelf(shelves);
        }

        const distToPlayer = this.distanceTo(player);

        if (distToPlayer < this.repelRadius) {
            if (this.state !== 'fleeing') {
                this.state = 'fleeing';
                this.pickNewShelf(shelves, this.targetShelf);
            }
        } else if (this.state === 'fleeing') {
            this.state = this.carryingBook ? 'escaping_with_book' : 'seeking_shelf';
        }

        if (this.state === 'stealing' && this.targetShelf) {
            this.vx = 0;
            this.vy = 0;
            this.stealTimer += dt;
            
            // Stealing accelerates as Level increases! At Level 1, it takes 3 seconds.
            const requiredStealTime = Math.max(0.5, 3.5 - (level * 0.4));
            
            if (this.stealTimer >= requiredStealTime) {
                this.stealTimer = 0;
                if (this.targetShelf.takeBook()) {
                    books.push(new Book(this.x, this.y));
                    document.dispatchEvent(new CustomEvent('increaseChaos'));
                } else {
                    // Shelf is empty now, find another!
                    this.state = 'seeking_shelf';
                    this.pickNewShelf(shelves, this.targetShelf);
                }
            }
        } else if (this.targetShelf) {
            // Target the center of the shelf
            const targetX = this.targetShelf.x + this.targetShelf.width / 2;
            const targetY = this.targetShelf.y + this.targetShelf.height / 2;
            
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                if (this.state === 'fleeing') {
                    this.vx = (dx / dist) * this.speed * 1.5;
                    this.vy = (dy / dist) * this.speed * 1.5;
                } else {
                    this.vx = (dx / dist) * this.speed;
                    this.vy = (dy / dist) * this.speed;
                }
            }

            // Check if touched the shelf
            if (this.collidesWithRect(this.targetShelf, 5)) {
                if (this.state === 'seeking_shelf') {
                    // Decide to steal repeatedly or run with one (60% chance to stay and steal)
                    if (Math.random() < 0.6) {
                        this.state = 'stealing';
                        this.vx = 0;
                        this.vy = 0;
                        this.stealTimer = 1.0; // First drop slightly delayed
                    } else {
                        if (this.targetShelf.takeBook()) {
                            // Run away with it
                            this.carryingBook = true;
                            this.state = 'escaping_with_book';
                            this.pickNewShelf(shelves, this.targetShelf);
                        } else {
                            // Shelf is empty, go to another
                            this.pickNewShelf(shelves, this.targetShelf);
                        }
                    }
                } else if (this.state === 'escaping_with_book') {
                    // Drop the book near this shelf and find a new one to steal from
                    this.carryingBook = false;
                    books.push(new Book(this.x, this.y));
                    document.dispatchEvent(new CustomEvent('increaseChaos'));
                    this.state = 'seeking_shelf';
                    this.pickNewShelf(shelves, this.targetShelf);
                }
            }
        }

        if (this.state === 'escaping_with_book') {
            // Also chance to drop the book randomly while running
            this.escapeTimer += dt;
            
            // Drops are much slower on lower levels to prevent immediate chaos
            // Level 1: drops within 6-8 seconds. Higher Levels = rapid scatter.
            const dropTime = Math.max(1.0, 7.0 - (level * 0.6)) + Math.random() * 2;
            
            if (this.escapeTimer > dropTime) {
                this.carryingBook = false;
                this.escapeTimer = 0;
                books.push(new Book(this.x, this.y));
                document.dispatchEvent(new CustomEvent('increaseChaos'));
                this.state = 'seeking_shelf';
            }
        }

        let nextX = this.x + this.vx * dt;
        let nextY = this.y + this.vy * dt;

        // Boundary constraints
        if (nextX <= this.radius || nextX >= mapWidth - this.radius) {
            this.vx *= -1;
            nextX = this.x + this.vx * dt;
        }
        if (nextY <= this.radius || nextY >= mapHeight - this.radius) {
            this.vy *= -1;
            nextY = this.y + this.vy * dt;
        }

        // Run walk animation state based on velocity
        const isMoving = Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1;
        if (isMoving && this.state !== 'stealing') {
            this.walkAnimTimer += dt * 10;
            // Add a small deadzone to prevent rapid flipping when velocity is near zero
            if (this.vx > 10) this.facingRight = true;
            else if (this.vx < -10) this.facingRight = false;
        } else {
            this.walkAnimTimer += (0 - this.walkAnimTimer) * 10 * dt;
            if (Math.abs(this.walkAnimTimer) < 0.1) this.walkAnimTimer = 0;
        }

        this.x = nextX;
        this.y = nextY;
    }

    pickNewShelf(shelves, currentShelf = null) {
        if (shelves.length === 0) return;
        let available = shelves;
        if (currentShelf && shelves.length > 1) {
            available = shelves.filter(s => s !== currentShelf);
        }
        this.targetShelf = available[Math.floor(Math.random() * available.length)];
    }

    draw(ctx) {
        if (this.processedImage) {
            ctx.save();
            ctx.translate(this.x, this.y);

            const walkCycle = Math.sin(this.walkAnimTimer); 
            const wobbleCycle = Math.cos(this.walkAnimTimer / 2); 
            const bobOffset = Math.abs(walkCycle) * 4; 
            const rotOffset = wobbleCycle * 0.08; 

            ctx.translate(0, -bobOffset);
            ctx.rotate(rotOffset);

            if (this.facingRight) {
                // If the sprite inherently faces left, flipping it makes it face right
                ctx.scale(-1, 1);
            }

            const drawHeight = 100;
            const drawWidth = (this.processedImage.width / this.processedImage.height) * drawHeight;

            // Optional tint/filter if fleeing (make them flash red or semitransparent?)
            if (this.state === 'fleeing') {
                ctx.globalAlpha = 0.7; // Indicate they are panicked
            }

            ctx.drawImage(this.processedImage, -drawWidth / 2, -drawHeight + this.radius + 5, drawWidth, drawHeight);
            ctx.restore();
        } else {
            // Fallback while image loads
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.state === 'fleeing' ? '#ff9f43' : '#f2cc8f'; 
            ctx.fill();
        }

        // Draw carrying indicator clearly if they have a book
        if (this.carryingBook) {
            ctx.fillStyle = '#1dd1a1';
            ctx.fillRect(this.x - 12, this.y - 40, 24, 16);
            ctx.fillStyle = '#fff';
            ctx.font = '10px Inter';
            ctx.fillText('BOOK', this.x - 10, this.y - 28);
        }
    }
}
