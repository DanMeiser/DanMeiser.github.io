/**
 * Bird class - handles character physics and rendering
 */
class Bird {
    constructor(x, y, character = 'calvin') {
        this.x = x;
        this.y = y;
        this.character = character;
        this.width = 34;
        this.height = 24;
        this.velocity = 0;
        this.gravity = 0.6;
        this.jumpPower = -12;
        this.maxVelocity = 10;
        
        // Animation
        this.angle = 0;
        this.frameIndex = 0;
        this.animationSpeed = 0.15;
        this.frames = this.getCharacterFrames();
    }

    getCharacterFrames() {
        // Character-specific emoji or Unicode representations
        const characters = {
            calvin: ['🦁'],
            bailey: ['🦊']
        };
        return characters[this.character] || ['🦁'];
    }

    update() {
        // Apply gravity
        this.velocity += this.gravity;
        this.velocity = Math.min(this.velocity, this.maxVelocity);
        this.y += this.velocity;

        // Update rotation based on velocity
        this.angle = Math.min(this.velocity * 2, Math.PI / 2.5);

        // Update animation frame
        this.frameIndex += this.animationSpeed;
    }

    flap() {
        this.velocity = this.jumpPower;
        // Play flap sound
        AssetLoader.playSound('flap');
    }

    draw(ctx) {
        ctx.save();

        // Translate to bird position
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        
        // Rotate based on velocity
        ctx.rotate(this.angle);
        
        // Draw character (emoji/unicode)
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.frames[0], 0, 0);

        ctx.restore();
    }

    isAlive(canvasWidth, canvasHeight, groundHeight) {
        // Check ground collision
        if (this.y + this.height >= canvasHeight - groundHeight) {
            return false;
        }

        // Check ceiling collision
        if (this.y <= 0) {
            return false;
        }

        return true;
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    collidesWith(rect) {
        const bounds = this.getBounds();
        return !(
            bounds.x + bounds.width < rect.x ||
            bounds.x > rect.x + rect.width ||
            bounds.y + bounds.height < rect.y ||
            bounds.y > rect.y + rect.height
        );
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.velocity = 0;
        this.angle = 0;
        this.frameIndex = 0;
    }
}
