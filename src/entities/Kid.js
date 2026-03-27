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
    }

    update(dt, player, mapWidth, mapHeight, shelves, books) {
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
            if (this.stealTimer >= 0.5) {
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
                        this.stealTimer = 0.5; // First drop nearly instantly
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
                    // Just run to a different shelf down the line
                    this.pickNewShelf(shelves, this.targetShelf);
                }
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
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.state === 'fleeing' ? '#ff9f43' : '#f2cc8f'; // Orange if fleeing
        ctx.fill();
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (this.carryingBook) {
            ctx.fillStyle = '#1dd1a1';
            ctx.fillRect(this.x - 8, this.y - 12, 16, 12);
        }

        // Draw little face
        ctx.fillStyle = '#1e272e';
        ctx.fillRect(this.x - 4, this.y - 4, 2, 2);
        ctx.fillRect(this.x + 2, this.y - 4, 2, 2);

        ctx.beginPath();
        ctx.arc(this.x, this.y + 4, 4, 0, Math.PI, false);
        ctx.stroke();
    }
}
