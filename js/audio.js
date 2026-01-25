// Audio system for RC Revolt
// Uses Web Audio API to generate sounds procedurally

class AudioManager {
    constructor() {
        this.context = null;
        this.masterVolume = 0.7;
        this.sfxVolume = 0.7;
        this.musicVolume = 0.5;
        this.initialized = false;
        this.engineOscillators = new Map();
        this.musicNodes = null;
    }

    init() {
        if (this.initialized) return;

        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.context.destination);

            this.sfxGain = this.context.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);

            this.musicGain = this.context.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);

            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    setMasterVolume(volume) {
        this.masterVolume = Utils.clamp(volume, 0, 1);
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }

    setSfxVolume(volume) {
        this.sfxVolume = Utils.clamp(volume, 0, 1);
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxVolume;
        }
    }

    setMusicVolume(volume) {
        this.musicVolume = Utils.clamp(volume, 0, 1);
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicVolume;
        }
    }

    // Engine sound for RC cars
    startEngine(carId, baseRpm = 2000) {
        if (!this.initialized) return;

        const ctx = this.context;

        // Main engine oscillator
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.value = baseRpm / 60;

        const osc2 = ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.value = baseRpm / 30;

        // Filters
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 800;
        lowpass.Q.value = 5;

        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 50;

        // Gain nodes
        const gain1 = ctx.createGain();
        gain1.gain.value = 0.15;

        const gain2 = ctx.createGain();
        gain2.gain.value = 0.08;

        const masterEngineGain = ctx.createGain();
        masterEngineGain.gain.value = 0;

        // Connect
        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(lowpass);
        gain2.connect(lowpass);
        lowpass.connect(highpass);
        highpass.connect(masterEngineGain);
        masterEngineGain.connect(this.sfxGain);

        // Start
        osc1.start();
        osc2.start();

        // Fade in
        masterEngineGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.3);

        this.engineOscillators.set(carId, {
            osc1, osc2, gain1, gain2, lowpass, masterEngineGain, baseRpm
        });
    }

    updateEngine(carId, rpm, throttle) {
        if (!this.initialized) return;

        const engine = this.engineOscillators.get(carId);
        if (!engine) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        // Update frequency based on RPM
        const freq1 = (rpm / 60) * 1.5;
        const freq2 = (rpm / 30);

        engine.osc1.frequency.setTargetAtTime(freq1, now, 0.05);
        engine.osc2.frequency.setTargetAtTime(freq2, now, 0.05);

        // Update filter based on throttle
        const filterFreq = 400 + throttle * 1200;
        engine.lowpass.frequency.setTargetAtTime(filterFreq, now, 0.1);

        // Update volume based on throttle
        const volume = 0.5 + throttle * 0.5;
        engine.masterEngineGain.gain.setTargetAtTime(volume, now, 0.1);
    }

    stopEngine(carId) {
        const engine = this.engineOscillators.get(carId);
        if (!engine) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        // Fade out
        engine.masterEngineGain.gain.setTargetAtTime(0, now, 0.2);

        // Stop after fade
        setTimeout(() => {
            try {
                engine.osc1.stop();
                engine.osc2.stop();
            } catch (e) {}
            this.engineOscillators.delete(carId);
        }, 500);
    }

    stopAllEngines() {
        for (const carId of this.engineOscillators.keys()) {
            this.stopEngine(carId);
        }
    }

    // Tire screech
    playTireScreech(intensity = 0.5, duration = 0.3) {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        // White noise for screech
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * intensity;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        // Bandpass filter for screech character
        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 2000 + Math.random() * 1000;
        bandpass.Q.value = 5;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(intensity * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        source.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(this.sfxGain);

        source.start(now);
        source.stop(now + duration);
    }

    // Collision sound
    playCollision(intensity = 1) {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;
        const duration = 0.2 + intensity * 0.2;

        // Impact noise
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(1000 * intensity, now);
        lowpass.frequency.exponentialRampToValueAtTime(100, now + duration);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5 * intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        source.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(this.sfxGain);

        source.start(now);
        source.stop(now + duration);

        // Metal clank
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400 + Math.random() * 200, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.3 * intensity, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    // Power-up pickup
    playPowerupPickup() {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        // Ascending arpeggio
        [523, 659, 784, 1047].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now + i * 0.05);
            gain.gain.linearRampToValueAtTime(0.3, now + i * 0.05 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.15);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.15);
        });
    }

    // Power-up use
    playPowerupUse(type) {
        if (!this.initialized) return;

        switch (type) {
            case 'rocket':
            case 'missile':
                this.playRocketLaunch();
                break;
            case 'bomb':
            case 'waterbomb':
                this.playBombDrop();
                break;
            case 'boost':
            case 'battery':
                this.playBoost();
                break;
            case 'shockwave':
                this.playShockwave();
                break;
            case 'oil':
                this.playOilDrop();
                break;
            default:
                this.playGenericPowerup();
        }
    }

    playRocketLaunch() {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;
        const duration = 0.5;

        // Whoosh
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(500, now);
        bandpass.frequency.exponentialRampToValueAtTime(2000, now + duration);
        bandpass.Q.value = 2;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        source.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(this.sfxGain);

        source.start(now);
        source.stop(now + duration);
    }

    playExplosion(size = 1) {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;
        const duration = 0.8 * size;

        // Explosion noise
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
        lowpass.frequency.setValueAtTime(1000 * size, now);
        lowpass.frequency.exponentialRampToValueAtTime(50, now + duration);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.7 * size, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        source.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(this.sfxGain);

        source.start(now);
        source.stop(now + duration);

        // Bass thump
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80 * size, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.8 * size, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    playBombDrop() {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    playBoost() {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;
        const duration = 0.4;

        // Whoosh rising
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(200, now);
        bandpass.frequency.exponentialRampToValueAtTime(3000, now + duration);
        bandpass.Q.value = 1;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.4, now + duration * 0.3);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        source.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(this.sfxGain);

        source.start(now);
        source.stop(now + duration);
    }

    playShockwave() {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.5);
    }

    playOilDrop() {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        // Splat sound
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 500;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        source.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(this.sfxGain);

        source.start(now);
        source.stop(now + 0.15);
    }

    playGenericPowerup() {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 440;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    // Countdown beeps
    playCountdown(number) {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        const freq = number > 0 ? 440 : 880;
        const duration = number > 0 ? 0.2 : 0.5;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    // Lap complete
    playLapComplete() {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        [523, 659, 784].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.3, now + i * 0.1 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.3);
        });
    }

    // Race finish
    playRaceFinish(position) {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        const notes = position === 1
            ? [523, 659, 784, 1047]
            : [392, 440, 523];

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now + i * 0.15);
            gain.gain.linearRampToValueAtTime(0.4, now + i * 0.15 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.5);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.5);
        });
    }

    // Menu click
    playMenuClick() {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 1000;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    // Menu select
    playMenuSelect() {
        if (!this.initialized) return;

        const ctx = this.context;
        const now = ctx.currentTime;

        [600, 900].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now + i * 0.05);
            gain.gain.linearRampToValueAtTime(0.25, now + i * 0.05 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.1);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.1);
        });
    }

    // Start background music (procedural)
    startMusic() {
        if (!this.initialized || this.musicNodes) return;

        const ctx = this.context;

        // Simple procedural racing music with bass and drums
        const bassOsc = ctx.createOscillator();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.value = 55;

        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowpass';
        bassFilter.frequency.value = 200;

        const bassGain = ctx.createGain();
        bassGain.gain.value = 0.15;

        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(this.musicGain);

        bassOsc.start();

        this.musicNodes = { bassOsc, bassGain };

        // Simple beat pattern
        this.musicBeat();
    }

    musicBeat() {
        if (!this.initialized || !this.musicNodes) return;

        const ctx = this.context;
        const now = ctx.currentTime;
        const bpm = 140;
        const beatTime = 60 / bpm;

        // Kick drum
        const kickOsc = ctx.createOscillator();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(150, now);
        kickOsc.frequency.exponentialRampToValueAtTime(30, now + 0.1);

        const kickGain = ctx.createGain();
        kickGain.gain.setValueAtTime(0.5, now);
        kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain);

        kickOsc.start(now);
        kickOsc.stop(now + 0.1);

        // Hi-hat on off-beats
        setTimeout(() => {
            if (!this.musicNodes) return;

            const hihatBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
            const data = hihatBuffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
            }

            const hihat = ctx.createBufferSource();
            hihat.buffer = hihatBuffer;

            const hihatFilter = ctx.createBiquadFilter();
            hihatFilter.type = 'highpass';
            hihatFilter.frequency.value = 5000;

            const hihatGain = ctx.createGain();
            hihatGain.gain.value = 0.1;

            hihat.connect(hihatFilter);
            hihatFilter.connect(hihatGain);
            hihatGain.connect(this.musicGain);

            hihat.start();
        }, beatTime * 500);

        // Schedule next beat
        this.musicTimeout = setTimeout(() => this.musicBeat(), beatTime * 1000);
    }

    stopMusic() {
        if (this.musicTimeout) {
            clearTimeout(this.musicTimeout);
            this.musicTimeout = null;
        }

        if (this.musicNodes) {
            try {
                this.musicNodes.bassOsc.stop();
            } catch (e) {}
            this.musicNodes = null;
        }
    }

    // Clean up
    cleanup() {
        this.stopAllEngines();
        this.stopMusic();
    }
}

const Audio = new AudioManager();
