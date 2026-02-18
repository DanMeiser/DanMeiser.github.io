/**
 * Pipe class - handles obstacle rendering and collision
 */
class Pipe {
    constructor(x, canvasHeight, groundHeight, gapSize = 130) {
        this.x = x;
        this.width = 52;
        this.gapSize = gapSize;
        this.groundHeight = groundHeight;
        this.canvasHeight = canvasHeight;
        this.scored = false;

        // Random gap position
        const maxY = canvasHeight - groundHeight - this.gapSize - 50;
        const minY = 50;
        this.gapY = getRandomInt(minY, maxY);

        // Pipe colors
        this.color = '#2d8659';
        this.highlightColor = '#3aa66d';
    }

    update(scrollSpeed) {
        this.x -= scrollSpeed;
    }

    draw(ctx) {
        // Top pipe
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, 0, this.width, this.gapY);

        // Top pipe highlight
        ctx.fillStyle = this.highlightColor;
        ctx.fillRect(this.x + 2, this.gapY - 8, this.width - 4, 8);

        // Bottom pipe
        const bottomPipeY = this.gapY + this.gapSize;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, bottomPipeY, this.width, this.canvasHeight - this.groundHeight - bottomPipeY);

        // Bottom pipe highlight
        ctx.fillStyle = this.highlightColor;
        ctx.fillRect(this.x + 2, bottomPipeY, this.width - 4, 8);
    }

    isOffScreen() {
        return this.x + this.width < 0;
    }

    getCollisionRects() {
        return [
            // Top pipe
            {
                x: this.x,
                y: 0,
                width: this.width,
                height: this.gapY
            },
            // Bottom pipe
            {
                x: this.x,
                y: this.gapY + this.gapSize,
                width: this.width,
                height: this.canvasHeight - this.groundHeight - (this.gapY + this.gapSize)
            }
        ];
    }

    checkCollision(bird) {
        const rects = this.getCollisionRects();
        return rects.some(rect => bird.collidesWith(rect));
    }

    canScore(bird) {
        return !this.scored && bird.x > this.x + this.width;
    }
}
