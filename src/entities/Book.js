import { Entity } from './Entity.js';

export class Book extends Entity {
    constructor(x, y) {
        super(x, y, 12); // Books are small
        this.width = 20;
        this.height = 26;
        this.color = ['#ff6b6b', '#feca57', '#1dd1a1', '#5f27cd', '#0abde3', '#ff9f43'][Math.floor(Math.random() * 6)];
        this.angle = Math.random() * Math.PI * 2;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Draw the book shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(-this.width / 2 + 3, -this.height / 2 + 3, this.width, this.height);

        // Book back cover showing slightly
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Book pages stack (thick middle)
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(-this.width / 2 + 2, -this.height / 2 + 1, this.width - 2, this.height - 2);

        // Draw individual page lines (texture)
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 0.5;
        for (let i = -this.height / 2 + 3; i < this.height / 2 - 2; i += 3) {
            ctx.beginPath();
            ctx.moveTo(-this.width / 2 + 2, i);
            ctx.lineTo(this.width / 2, i);
            ctx.stroke();
        }

        // Spine and front cover (partially open or thick)
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, 7, this.height);
        
        // Ribbon bookmark
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.width / 2 - 4, -this.height / 2 - 2, 3, 10);

        // Draw book outline
        ctx.strokeStyle = '#2b2b36'; // Dark background outline
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        ctx.restore();
    }
}

