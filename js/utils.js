/**
 * Utility functions for the Flappy Family game
 */

// Asset loading and error handling
const AssetLoader = {
    images: {},
    sounds: {},
    audioContext: null,
    audioUnlocked: false,

    _getAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    },

    // Call this on the first user interaction (touch/click) to unlock audio on mobile
    unlockAudio() {
        if (this.audioUnlocked) return;
        const ctx = this._getAudioContext();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        // Create and play a short silent buffer to unlock on iOS
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        this.audioUnlocked = true;
    },

    loadImage(name, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images[name] = img;
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`Failed to load image: ${path}`);
                // Create placeholder if asset fails to load
                const canvas = document.createElement('canvas');
                canvas.width = 100;
                canvas.height = 100;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ccc';
                ctx.fillRect(0, 0, 100, 100);
                ctx.fillStyle = '#666';
                ctx.font = '12px Arial';
                ctx.fillText('Missing', 10, 50);
                this.images[name] = canvas;
                resolve(canvas);
            };
            img.src = path;
        });
    },

    loadSound(name, path) {
        return new Promise((resolve) => {
            try {
                const ctx = this._getAudioContext();
                fetch(path)
                    .then(response => response.arrayBuffer())
                    .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
                    .then(audioBuffer => {
                        this.sounds[name] = audioBuffer;
                        resolve(audioBuffer);
                    })
                    .catch(error => {
                        console.warn(`Failed to load sound: ${path}`, error);
                        resolve(null);
                    });
            } catch (error) {
                console.warn(`Sound error: ${error}`);
                resolve(null);
            }
        });
    },

    getImage(name) {
        return this.images[name];
    },

    getSound(name) {
        return this.sounds[name];
    },

    playSound(name) {
        const buffer = this.sounds[name];
        if (buffer && this.audioContext) {
            try {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                const source = this.audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(this.audioContext.destination);
                source.start(0);
            } catch (e) {
                console.log('Sound play error:', e);
            }
        }
    }
};

// Local storage for per-character high scores
const ScoreManager = {
    STORAGE_KEY_PREFIX: 'flappyFamily_highScore_',

    _key(character) {
        return this.STORAGE_KEY_PREFIX + (character || 'default');
    },

    getHighScore(character) {
        try {
            const score = localStorage.getItem(this._key(character));
            return score ? parseInt(score, 10) : 0;
        } catch (error) {
            console.warn('LocalStorage error:', error);
            return 0;
        }
    },

    setHighScore(score, character) {
        try {
            localStorage.setItem(this._key(character), score.toString());
        } catch (error) {
            console.warn('LocalStorage error:', error);
        }
    },

    updateHighScore(currentScore, character) {
        const high = this.getHighScore(character);
        if (currentScore > high) {
            this.setHighScore(currentScore, character);
            return true;
        }
        return false;
    }
};

// Random number generator
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

// Throttle function for input handling
function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Debug logging (toggle with DEBUG_MODE)
const DEBUG_MODE = false;

function debug(...args) {
    if (DEBUG_MODE) {
        console.log('[DEBUG]', ...args);
    }
}
