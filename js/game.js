/**
 * Main game loop and logic for Flappy Family
 */

// Game constants
const GAME_STATE = {
    MENU: 'menu',
    CHARACTER_SELECT: 'characterSelect',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
};

const GAME_SETTINGS = {
    BIRD_START_X: 60,
    BIRD_START_Y: 150,
    GROUND_HEIGHT: 120,
    PIPE_WIDTH: 52,
    PIPE_GAP_START: 240,      // Starting gap (easy)
    PIPE_GAP_MIN: 160,        // Minimum gap (hardest)
    PIPE_SPAWN_INTERVAL: 2500, // ms
    SCROLL_SPEED_START: 3,    // Starting speed (easy)
    SCROLL_SPEED_MAX: 6,      // Max speed (hardest)
    DIFFICULTY_RAMP_SCORE: 30, // Score at which difficulty is fully ramped
    CANVAS_PADDING: 0
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setCanvasSize();

        this.state = GAME_STATE.MENU;
        this.selectedCharacter = 'calvin';
        this.bird = null;
        this.pipes = [];
        this.score = 0;
        this.highScore = ScoreManager.getHighScore('calvin');
        this.gameStartTime = 0;
        this.lastPipeSpawnTime = 0;
        this.isRunning = false;

        this.setupEventListeners();
        this.loadAssets();
    }

    setCanvasSize() {
        // Use container dimensions
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    setupEventListeners() {
        // Unlock audio on first user interaction (required for mobile)
        const unlockHandler = () => {
            AssetLoader.unlockAudio();
            document.removeEventListener('touchstart', unlockHandler);
            document.removeEventListener('touchend', unlockHandler);
            document.removeEventListener('click', unlockHandler);
            document.removeEventListener('keydown', unlockHandler);
        };
        document.addEventListener('touchstart', unlockHandler);
        document.addEventListener('touchend', unlockHandler);
        document.addEventListener('click', unlockHandler);
        document.addEventListener('keydown', unlockHandler);

        // Input handling
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        this.canvas.addEventListener('click', () => this.handleCanvasClick());
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleCanvasClick();
        });

        // Button clicks
        const menuCharBtns = document.querySelectorAll('.menu-character-btn');
        menuCharBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectedCharacter = e.currentTarget.dataset.character;
                this.startGame();
            });
        });

        document.getElementById('backBtn').addEventListener('click', () => {
            this.showMenu();
        });

        const characterBtns = document.querySelectorAll('.character-btn');
        characterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectedCharacter = e.currentTarget.dataset.character;
                this.startGame();
            });
        });

        document.getElementById('restartBtn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('menuBtn').addEventListener('click', () => {
            this.showMenu();
        });

        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('quitBtn').addEventListener('click', () => {
            this.togglePause(); // Unpause first
            this.showMenu();
        });

        // Window resize
        window.addEventListener('resize', () => this.setCanvasSize());
    }

    async loadAssets() {
        try {
            // Load character sprites
            await Promise.all([
                AssetLoader.loadImage('calvin1', 'assets/calvin1.png'),
                AssetLoader.loadImage('calvin2', 'assets/calvin2.png'),
                AssetLoader.loadImage('calvin3', 'assets/calvin3.png'),
                AssetLoader.loadImage('bailey1', 'assets/bailey1.png'),
                AssetLoader.loadImage('bailey2', 'assets/bailey2.png'),
                AssetLoader.loadImage('bailey3', 'assets/bailey3.png'),
                AssetLoader.loadImage('bg', 'assets/bg.png'),
                AssetLoader.loadImage('ground', 'assets/ground.png')
            ]);
            
            // Load sounds (non-blocking errors)
            await Promise.all([
                AssetLoader.loadSound('flap', 'assets/flap.mp3'),
                AssetLoader.loadSound('hit', 'assets/hit.mp3'),
                AssetLoader.loadSound('point', 'assets/point.mp3')
            ]).catch(e => console.log('Asset loading note:', e));
        } catch (error) {
            console.log('Assets may not be available:', error);
        }
    }

    handleKeyDown(e) {
        if (e.key === ' ') {
            e.preventDefault();
            this.handleCanvasClick();
        } else if (e.key === 'p' || e.key === 'P') {
            if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.PAUSED) {
                this.togglePause();
            }
        } else if (e.key === 'q' || e.key === 'Q') {
            if (this.state === GAME_STATE.GAME_OVER) {
                this.showMenu();
            }
        } else if (e.key === '1') {
            if (this.state === GAME_STATE.MENU) {
                this.selectedCharacter = 'calvin';
                this.startGame();
            }
        } else if (e.key === '2') {
            if (this.state === GAME_STATE.MENU) {
                this.selectedCharacter = 'bailey';
                this.startGame();
            }
        }
    }

    handleKeyUp(e) {
        // Reserved for future use
    }

    handleCanvasClick() {
        if (this.state === GAME_STATE.MENU) {
            // Character buttons handle starting — canvas click does nothing on menu
        } else if (this.state === GAME_STATE.CHARACTER_SELECT) {
            // Let buttons handle it
        } else if (this.state === GAME_STATE.PLAYING) {
            this.bird.flap();
        } else if (this.state === GAME_STATE.GAME_OVER) {
            this.startGame();
        }
    }

    showMenu() {
        this.state = GAME_STATE.MENU;
        this.updateScreens();
        this.isRunning = false;
    }

    showCharacterSelect() {
        this.state = GAME_STATE.CHARACTER_SELECT;
        this.updateScreens();
    }

    startGame() {
        this.state = GAME_STATE.PLAYING;
        this.score = 0;
        this.highScore = ScoreManager.getHighScore(this.selectedCharacter);
        this.pipes = [];
        this.bird = new Bird(
            GAME_SETTINGS.BIRD_START_X,
            GAME_SETTINGS.BIRD_START_Y,
            this.selectedCharacter
        );
        this.gameStartTime = Date.now();
        this.lastPipeSpawnTime = this.gameStartTime;
        this.isRunning = true;
        this.updateScreens();
        this.gameLoop();
    }

    togglePause() {
        if (this.state === GAME_STATE.PLAYING) {
            this.state = GAME_STATE.PAUSED;
        } else if (this.state === GAME_STATE.PAUSED) {
            this.state = GAME_STATE.PLAYING;
        }
        this.updateScreens();
    }

    getDifficulty() {
        // Returns 0 (easiest) to 1 (hardest) based on current score
        return Math.min(this.score / GAME_SETTINGS.DIFFICULTY_RAMP_SCORE, 1);
    }

    getCurrentGap() {
        const d = this.getDifficulty();
        return GAME_SETTINGS.PIPE_GAP_START - d * (GAME_SETTINGS.PIPE_GAP_START - GAME_SETTINGS.PIPE_GAP_MIN);
    }

    getCurrentSpeed() {
        const d = this.getDifficulty();
        return GAME_SETTINGS.SCROLL_SPEED_START + d * (GAME_SETTINGS.SCROLL_SPEED_MAX - GAME_SETTINGS.SCROLL_SPEED_START);
    }

    endGame() {
        this.state = GAME_STATE.GAME_OVER;
        this.isRunning = false;

        // Update high score for selected character
        const isNewHighScore = ScoreManager.updateHighScore(this.score, this.selectedCharacter);
        this.highScore = ScoreManager.getHighScore(this.selectedCharacter);

        // Play hit sound
        AssetLoader.playSound('hit');

        // Update UI
        const charName = this.selectedCharacter === 'calvin' ? 'Calvin' : 'Bailey';
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalHighScore').textContent = this.highScore;
        document.getElementById('gameOverCharacter').textContent = charName;
        document.getElementById('gameOverCharName').textContent = charName;
        document.getElementById('gameOverCalvinHigh').textContent = ScoreManager.getHighScore('calvin');
        document.getElementById('gameOverBaileyHigh').textContent = ScoreManager.getHighScore('bailey');

        this.updateScreens();
    }

    updateScreens() {
        const screens = {
            menu: document.getElementById('menu'),
            characterSelect: document.getElementById('characterSelect'),
            gameOverScreen: document.getElementById('gameOverScreen'),
            pauseScreen: document.getElementById('pauseScreen'),
            hud: document.getElementById('hud')
        };

        // Hide all screens
        Object.values(screens).forEach(screen => screen.classList.add('hidden'));

        // Show appropriate screen
        if (this.state === GAME_STATE.MENU) {
            screens.menu.classList.remove('hidden');
            // Update menu high scores
            document.getElementById('calvinHighScore').textContent = ScoreManager.getHighScore('calvin');
            document.getElementById('baileyHighScore').textContent = ScoreManager.getHighScore('bailey');
        } else if (this.state === GAME_STATE.CHARACTER_SELECT) {
            screens.characterSelect.classList.remove('hidden');
        } else if (this.state === GAME_STATE.PLAYING) {
            screens.hud.classList.remove('hidden');
        } else if (this.state === GAME_STATE.PAUSED) {
            screens.pauseScreen.classList.remove('hidden');
        } else if (this.state === GAME_STATE.GAME_OVER) {
            screens.gameOverScreen.classList.remove('hidden');
        }
    }

    updateScore(value = 1) {
        this.score += value;
        document.getElementById('score').textContent = this.score;
        AssetLoader.playSound('point');
    }

    update() {
        if (this.state !== GAME_STATE.PLAYING) {
            return;
        }

        const currentTime = Date.now();

        // Update bird
        this.bird.update();

        // Check ground/ceiling collision
        if (!this.bird.isAlive(this.canvas.width, this.canvas.height, GAME_SETTINGS.GROUND_HEIGHT)) {
            this.endGame();
            return;
        }

        // Spawn pipes with current difficulty gap
        if (currentTime - this.lastPipeSpawnTime > GAME_SETTINGS.PIPE_SPAWN_INTERVAL) {
            this.pipes.push(new Pipe(
                this.canvas.width,
                this.canvas.height,
                GAME_SETTINGS.GROUND_HEIGHT,
                this.getCurrentGap()
            ));
            this.lastPipeSpawnTime = currentTime;
        }

        // Update pipes and check collisions
        const currentSpeed = this.getCurrentSpeed();
        this.pipes = this.pipes.filter(pipe => !pipe.isOffScreen());

        for (let pipe of this.pipes) {
            pipe.update(currentSpeed);

            // Check pipe collision
            if (pipe.checkCollision(this.bird)) {
                this.endGame();
                return;
            }

            // Check scoring
            if (pipe.canScore(this.bird)) {
                pipe.scored = true;
                this.updateScore();
            }
        }
    }

    draw() {
        // Draw background image
        const bgImage = AssetLoader.getImage('bg');
        if (bgImage) {
            this.ctx.drawImage(bgImage, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            // Fallback if image not loaded
            this.ctx.fillStyle = '#87CEEB';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.PAUSED) {
            // Draw pipes
            for (let pipe of this.pipes) {
                pipe.draw(this.ctx);
            }

            // Draw ground
            this.ctx.fillStyle = '#8B7355';
            this.ctx.fillRect(0, this.canvas.height - GAME_SETTINGS.GROUND_HEIGHT, this.canvas.width, GAME_SETTINGS.GROUND_HEIGHT);

            // Draw ground pattern
            this.ctx.fillStyle = '#A0826D';
            for (let i = 0; i < this.canvas.width; i += 30) {
                this.ctx.fillRect(i, this.canvas.height - GAME_SETTINGS.GROUND_HEIGHT, 15, 10);
            }

            // Draw bird
            if (this.bird) {
                this.bird.draw(this.ctx);
            }

            // Draw pause overlay if paused
            if (this.state === GAME_STATE.PAUSED) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }
    }

    gameLoop = () => {
        this.update();
        this.draw();

        if (this.isRunning) {
            requestAnimationFrame(this.gameLoop);
        }
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
    // Show initial menu
    game.showMenu();
});
