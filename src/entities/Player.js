import { Entity } from './Entity.js';

export class Player extends Entity {
    constructor(x, y) {
        super(x, y, 20); // Player radius 20
        this.walkSpeed = 250;
        this.runSpeed = 450;
        this.speed = this.walkSpeed;
        this.carriedBooks = 0;
        this.maxCarryCapacity = 5;
        this.pickupRadius = 60;
        
        this.stamina = 8;
        this.maxStamina = 8;
        this.staminaCooldown = 0;
    }

    update(dt, input, mapWidth, mapHeight, shelves) {
        let dx = 0;
        let dy = 0;

        if (this.staminaCooldown <= 0) {
            if (input.isDown('ArrowUp') || input.isDown('KeyW')) dy -= 1;
            if (input.isDown('ArrowDown') || input.isDown('KeyS')) dy += 1;
            if (input.isDown('ArrowLeft') || input.isDown('KeyA')) dx -= 1;
            if (input.isDown('ArrowRight') || input.isDown('KeyD')) dx += 1;
        }

        let wantsToSprint = (input.isDown('ShiftLeft') || input.isDown('ShiftRight')) && this.staminaCooldown <= 0 && this.stamina > 0;
        let isMoving = dx !== 0 || dy !== 0;
        let isRunning = wantsToSprint && isMoving;
        
        if (this.staminaCooldown > 0) {
            this.speed = 0; // Completely immobilized
            this.staminaCooldown -= dt;
            if (this.staminaCooldown <= 0) {
                this.staminaCooldown = 0;
                this.stamina = this.maxStamina; // instantly refill
            }
        } else if (isRunning) {
            this.speed = this.runSpeed;
            this.stamina -= dt;
            if (this.stamina <= 0) {
                this.stamina = 0;
                this.staminaCooldown = 3;
            }
        } else {
            this.speed = this.walkSpeed;
            this.stamina += dt * (this.maxStamina / 3); // 3 seconds to normally refill
            if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
        }

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }

        let targetX = this.x + dx * this.speed * dt;
        let targetY = this.y + dy * this.speed * dt;

        // Basic collision with boundary
        targetX = Math.max(this.radius, Math.min(mapWidth - this.radius, targetX));
        targetY = Math.max(this.radius, Math.min(mapHeight - this.radius, targetY));

        // Collision with shelves (simplified block AABB collision)
        // For a circle, checking bound box overlap with rect:
        for (const shelf of shelves) {
            if (
                targetX + this.radius > shelf.x &&
                targetX - this.radius < shelf.x + shelf.width &&
                targetY + this.radius > shelf.y &&
                targetY - this.radius < shelf.y + shelf.height
            ) {
                // Resolve collision by blocking movement
                // A simple approach: revert axis that caused overlap
                const fromLeft = this.x + this.radius <= shelf.x;
                const fromRight = this.x - this.radius >= shelf.x + shelf.width;
                const fromTop = this.y + this.radius <= shelf.y;
                const fromBottom = this.y - this.radius >= shelf.y + shelf.height;

                if (fromLeft || fromRight) targetX = this.x;
                if (fromTop || fromBottom) targetY = this.y;
            }
        }

        this.x = targetX;
        this.y = targetY;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#4facfe'; // Cyan
        ctx.fill();
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw carry indicator (small circle inside or stack)
        if (this.carriedBooks > 0) {
            ctx.fillStyle = '#ffdf00'; // Yellow
            ctx.font = '16px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.carriedBooks, this.x, this.y);
        }
    }
}
