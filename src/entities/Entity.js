export class Entity {
    constructor(x, y, radius = 10) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.vx = 0;
        this.vy = 0;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    draw(ctx) {
        // Override in subclasses
    }

    // AABB collision helper with optional margin check
    collidesWithRect(rect, margin = 0) {
        return this.x + this.radius + margin >= rect.x &&
            this.x - this.radius - margin <= rect.x + rect.width &&
            this.y + this.radius + margin >= rect.y &&
            this.y - this.radius - margin <= rect.y + rect.height;
    }

    // Circle collision helper
    distanceTo(otherEntity) {
        const dx = this.x - otherEntity.x;
        const dy = this.y - otherEntity.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
