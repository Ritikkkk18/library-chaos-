import { Entity } from './Entity.js';

export class Player extends Entity {
    constructor(x, y) {
        super(x, y, 28); // Player radius 28 for collisions
        this.walkSpeed = 250;
        this.runSpeed = 450;

        // Visuals
        this.walkAnimTimer = 0;
        this.facingRight = false; // Sprite natively faces left

        this.speed = this.walkSpeed;
        this.carriedBooks = 0;
        this.maxCarryCapacity = 5;
        this.pickupRadius = 60;
        
        this.stamina = 8;
        this.maxStamina = 8;
        this.staminaCooldown = 0;

        // Custom Player Image
        this.playerImage = new Image();
        this.playerImage.src = './player.png';
        this.processedImage = null;

        this.playerImage.onload = () => {
            this.processImageBackground();
        };
    }

    processImageBackground() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.playerImage.width;
        tempCanvas.height = this.playerImage.height;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(this.playerImage, 0, 0);

        try {
            const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;
            
            // Assume the top-left pixel is the background color
            const bgR = data[0];
            const bgG = data[1];
            const bgB = data[2];

            for (let y = 0; y < tempCanvas.height; y++) {
                for (let x = 0; x < tempCanvas.width; x++) {
                    const i = (y * tempCanvas.width + x) * 4;
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    // White background color distance
                    const distFromBg = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
                    
                    // Detect grey shadow at the bottom of the image
                    // The shadow is light grey, so R, G, B are similar.
                    const isBottomRatio = y / tempCanvas.height;
                    const isGreyShadow = isBottomRatio > 0.8 && 
                                         Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && 
                                         Math.abs(r - b) < 20 && r > 100 && r < 240;
                    
                    // Pure white/grey under her feet (sometimes not exactly bg color)
                    const isWhiteFloor = isBottomRatio > 0.8 && r > 240 && g > 240 && b > 240;

                    if (distFromBg < 50 || isGreyShadow || isWhiteFloor) {
                        data[i + 3] = 0; // Make transparent
                    }
                }
            }
            ctx.putImageData(imageData, 0, 0);
            this.processedImage = tempCanvas;
        } catch (e) {
            // Tainted canvas fallback
            this.processedImage = this.playerImage;
        }
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

        // Animation logic
        if (isMoving && this.staminaCooldown <= 0) {
            this.walkAnimTimer += dt * (isRunning ? 18 : 12);
            if (dx > 0) this.facingRight = true;
            if (dx < 0) this.facingRight = false;
        } else {
            // Return to resting position smoothly
            this.walkAnimTimer += (0 - this.walkAnimTimer) * 10 * dt;
            if (Math.abs(this.walkAnimTimer) < 0.1) this.walkAnimTimer = 0;
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
        if (this.processedImage) {
            // Draw custom player sprite
            ctx.save();
            ctx.translate(this.x, this.y);

            // Enhanced Walking bob & wobble animation
            const walkCycle = Math.sin(this.walkAnimTimer); // Fast cycle up and down
            const wobbleCycle = Math.cos(this.walkAnimTimer / 2); // Slower cycle left and right (like legs shifting weight)
            
            const bobOffset = Math.abs(walkCycle) * 8; // Bounces up by 8 pixels max
            // Wobble rotation to simulate steps
            const rotOffset = wobbleCycle * 0.12; 

            ctx.translate(0, -bobOffset);
            ctx.rotate(rotOffset);

            if (this.facingRight) {
                // Flip if facing right since original sprite faces left
                ctx.scale(-1, 1);
            }

            // Target drawing height/width to make her height visible but nicely scaled to the radius
            const drawHeight = 120; // Nice and appropriate size
            const drawWidth = (this.processedImage.width / this.processedImage.height) * drawHeight;

            // Offset to draw centered horizontally and anchored near the bottom
            ctx.drawImage(this.processedImage, -drawWidth / 2, -drawHeight + this.radius + 10, drawWidth, drawHeight);

            ctx.restore();
        } else {
            // Fallback while loading
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#4facfe'; // Cyan
            ctx.fill();
            ctx.strokeStyle = '#00f2fe';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Draw carry indicator (small stack above head)
        if (this.carriedBooks > 0) {
            ctx.fillStyle = '#ffdf00'; // Yellow
            ctx.font = 'bold 16px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Show above her head
            ctx.fillText(`📦 ${this.carriedBooks}`, this.x, this.y - 110);
        }
    }
}
