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
        this.gravity = 0.4;
        this.jumpPower = -10;
        this.maxVelocity = 8;
        
        // Animation
        this.angle = 0;
        this.frameIndex = 0;
        this.animationSpeed = 0.15;
        this.frames = this.getCharacterFrames();
    }

    getCharacterFrames() {
        // Load sprite images for each character
        const characters = {
            calvin: [
                AssetLoader.getImage('calvin1'),
                AssetLoader.getImage('calvin2'),
                AssetLoader.getImage('calvin3')
            ],
            bailey: [
                AssetLoader.getImage('bailey1'),
                AssetLoader.getImage('bailey2'),
                AssetLoader.getImage('bailey3')
            ]
        };
        return characters[this.character] || [AssetLoader.getImage('calvin1')];
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
        ctx.translate(this.x, this.y);
        
        // Rotate based on velocity
        ctx.rotate(this.angle);
        
        // Get current animation frame
        const currentFrame = Math.floor(this.frameIndex) % this.frames.length;
        const frame = this.frames[currentFrame];

        // Draw the sprite if available
        if (frame) {
            ctx.drawImage(frame, -this.width / 2, -this.height / 2, this.width, this.height);
        }

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
