export class Shelf {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = '#8b5a2b'; // Richer wood pattern color
        this.capacity = 9;
        this.currentBooks = 9;
    }

    takeBook() {
        if (this.currentBooks > 0) {
            this.currentBooks--;
            return true;
        }
        return false;
    }

    returnBook() {
        if (this.currentBooks < this.capacity) {
            this.currentBooks++;
            return true;
        }
        return false;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Add some shadow/shelf lines
        ctx.strokeStyle = '#5c3a21';
        ctx.lineWidth = 4;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Draw 3 shelves horizontally
        for (let r = 1; r < 3; r++) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + (this.height / 3) * r);
            ctx.lineTo(this.x + this.width, this.y + (this.height / 3) * r);
            ctx.stroke();
        }

        // Draw books in 3x3 grid
        const cols = 3;
        const rows = 3;
        const slotWidth = this.width / cols;
        const slotHeight = this.height / rows;

        for (let i = 0; i < this.capacity; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            
            const slotX = this.x + (col * slotWidth) + (slotWidth / 2);
            const slotY = this.y + (row * slotHeight) + (slotHeight / 2);

            if (i < this.currentBooks) {
                const bookColor = ['#ff6b6b', '#feca57', '#1dd1a1', '#5f27cd', '#0abde3', '#ff9f43', '#ee5253', '#01a3a4', '#c8d6e5'][i % 9];
                ctx.fillStyle = bookColor;
                ctx.fillRect(slotX - 15, slotY - 14, 30, 28); 
                ctx.strokeStyle = '#2b2b36';
                ctx.lineWidth = 1;
                ctx.strokeRect(slotX - 15, slotY - 14, 30, 28);
                
                // Binding/Pages line detail
                ctx.fillStyle = '#ecf0f1';
                ctx.fillRect(slotX - 13, slotY - 12, 26, 24);
                ctx.fillStyle = bookColor;
                ctx.fillRect(slotX - 15, slotY - 14, 5, 28); // Spine
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1;
                ctx.strokeRect(slotX - 10, slotY - 8, 20, 16);
            }
        }

        // Draw Capacity Text
        ctx.fillStyle = '#fff';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${this.currentBooks}/${this.capacity}`, this.x + this.width / 2, this.y + this.height + 10);
    }
}
