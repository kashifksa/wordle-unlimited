class SoundManager {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            this.ctx = new AudioContext();
        }
    }

    playTone(freq, type, duration, volume = 0.1, delay = 0) {
        try {
            this.init();
            if (!this.ctx) return;
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }

            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);

            gainNode.gain.setValueAtTime(volume, this.ctx.currentTime + delay);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + delay + duration);

            osc.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            osc.start(this.ctx.currentTime + delay);
            osc.stop(this.ctx.currentTime + delay + duration);
        } catch (e) {
            console.warn("SoundManager: failed to play tone:", e);
        }
    }

    playKeyClick() {
        if (!this.isEnabled()) return;
        this.playTone(800, 'sine', 0.05, 0.04);
    }

    playTileFlip(index = 0) {
        if (!this.isEnabled()) return;
        // Synthesizes a sequential tick/pop sound per tile flip
        const delay = index * 0.15;
        this.playTone(150 + index * 50, 'triangle', 0.1, 0.06, delay);
    }

    playWin() {
        if (!this.isEnabled()) return;
        // Synthesizes an ascending major chord jingle
        this.playTone(261.63, 'sine', 0.3, 0.08, 0);    // C4
        this.playTone(329.63, 'sine', 0.3, 0.08, 0.10); // E4
        this.playTone(392.00, 'sine', 0.3, 0.08, 0.20); // G4
        this.playTone(523.25, 'sine', 0.5, 0.08, 0.30); // C5
    }

    playError() {
        if (!this.isEnabled()) return;
        // Synthesizes a low buzzy buzzer sound
        this.playTone(120, 'sawtooth', 0.2, 0.06);
    }

    isEnabled() {
        return window.game && game.settings && game.settings.soundEnabled;
    }
}

window.sounds = new SoundManager();
