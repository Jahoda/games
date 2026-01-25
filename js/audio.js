// Audio system for Counter-Strike Clone
// Uses Web Audio API to generate sounds procedurally

class AudioManager {
    constructor() {
        this.context = null;
        this.masterVolume = 0.5;
        this.sounds = {};
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.context.destination);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    setVolume(volume) {
        this.masterVolume = Utils.clamp(volume, 0, 1);
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }

    // Generate gunshot sound
    playGunshot(weaponType) {
        if (!this.initialized) return;

        const params = {
            pistol: { frequency: 150, duration: 0.15, noise: 0.8 },
            glock: { frequency: 180, duration: 0.12, noise: 0.7 },
            usp: { frequency: 160, duration: 0.14, noise: 0.75 },
            deagle: { frequency: 100, duration: 0.25, noise: 0.9 },
            ak47: { frequency: 80, duration: 0.2, noise: 0.95 },
            m4a1: { frequency: 120, duration: 0.15, noise: 0.85 },
            awp: { frequency: 50, duration: 0.4, noise: 1.0 },
            mp5: { frequency: 200, duration: 0.1, noise: 0.6 }
        };

        const p = params[weaponType] || params.pistol;
        this.generateGunshot(p.frequency, p.duration, p.noise);
    }

    generateGunshot(baseFreq, duration, noiseAmount) {
        const ctx = this.context;
        const now = ctx.currentTime;

        // Create noise buffer
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Fill with noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * noiseAmount;
        }

        // Noise source
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = buffer;

        // Low-pass filter for bass
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(baseFreq * 10, now);
        lowpass.frequency.exponentialRampToValueAtTime(baseFreq, now + duration);

        // High-pass to remove rumble
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 20;

        // Envelope
        const envelope = ctx.createGain();
        envelope.gain.setValueAtTime(1, now);
        envelope.gain.exponentialRampToValueAtTime(0.01, now + duration);

        // Oscillator for punch
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * 2, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq / 2, now + duration * 0.5);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.3);

        // Connect noise path
        noiseSource.connect(lowpass);
        lowpass.connect(highpass);
        highpass.connect(envelope);
        envelope.connect(this.masterGain);

        // Connect oscillator path
        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        // Play
        noiseSource.start(now);
        osc.start(now);
        noiseSource.stop(now + duration);
        osc.stop(now + duration);
    }

    // Reload sound
    playReload() {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        // Magazine out click
        setTimeout(() => this.playClick(800, 0.05), 100);
        // Magazine in click
        setTimeout(() => this.playClick(1000, 0.08), 400);
        // Chamber sound
        setTimeout(() => this.playClick(600, 0.1), 700);
    }

    playClick(freq, duration) {
        const ctx = this.context;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    // Footstep sound
    playFootstep(surface = 'concrete') {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        const freq = surface === 'metal' ? 400 : 200;
        const duration = 0.08;

        // Create noise
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = freq;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        source.start(now);
        source.stop(now + duration);
    }

    // Hit sound
    playHit(headshot = false) {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        const freq = headshot ? 1500 : 800;
        const duration = 0.1;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq / 2, now + duration);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    // Death sound
    playDeath() {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        // Low thud
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    // Empty gun click
    playEmpty() {
        if (!this.initialized) return;
        this.playClick(1500, 0.03);
    }

    // Buy sound
    playBuy() {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        [400, 600, 800].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now + i * 0.05);
            gain.gain.linearRampToValueAtTime(0.2, now + i * 0.05 + 0.02);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.05 + 0.1);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.1);
        });
    }

    // Round start sound
    playRoundStart() {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        [523, 659, 784].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.value = freq;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now + i * 0.15);
            gain.gain.linearRampToValueAtTime(0.2, now + i * 0.15 + 0.05);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.3);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.3);
        });
    }

    // Bomb plant/defuse beep
    playBeep(urgent = false) {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        const freq = urgent ? 1000 : 600;
        const duration = urgent ? 0.05 : 0.1;

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    // Explosion
    playExplosion() {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;
        const duration = 1.5;

        // Create noise buffer
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(500, now);
        lowpass.frequency.exponentialRampToValueAtTime(50, now + duration);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        source.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(this.masterGain);

        source.start(now);
        source.stop(now + duration);

        // Bass thump
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(1, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.5);
    }
}

const Audio = new AudioManager();
