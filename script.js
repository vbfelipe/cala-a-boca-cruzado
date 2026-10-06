/**
 * CALA A BOCA, CRUZADO! - 3D FLIPERAMA EDITION
 * A high-octane 3D Whack-A-Mole arcade game starring Luana,
 * smashing coworker heads with a massive gothic sledgehammer.
 */

// ============================================================================
// 1. PROCEDURAL WEB AUDIO SYNTHESIZER & SOUND SYSTEM
// ============================================================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.sfxEnabled = true;
        this.musicEnabled = true;
        this.currentTrack = null; // 'menu' | 'game' | null
        this.schedulerTimer = null;

        // High-precision Lookahead Scheduler
        this.tempo = 104;
        this.currentStep = 0;
        this.nextNoteTime = 0.0;
        this.scheduleAheadTime = 0.14; // lookahead window (seconds)
        this.lookaheadInterval = 25;   // tick frequency (ms)

        // Audio Buses
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.noiseBuffer = null;

        // Music Data Definitions
        this.menuChords = [
            [60, 64, 67, 71], // Bar 1: Am9 (C4, E4, G4, B4)
            [53, 57, 60, 64], // Bar 2: Fmaj7 (F3, A3, C4, E4)
            [60, 64, 67, 71], // Bar 3: Cmaj7 (C4, E4, G4, B4)
            [64, 67, 71, 74]  // Bar 4: Em7 (E4, G4, B4, D5)
        ];

        this.menuBass = [
            33, 0, 0, 0, 0, 0, 45, 0, 0, 0, 33, 0, 0, 0, 36, 0,
            29, 0, 0, 0, 0, 0, 41, 0, 0, 0, 29, 0, 0, 0, 31, 0,
            36, 0, 0, 0, 0, 0, 48, 0, 0, 0, 31, 0, 0, 0, 35, 0,
            40, 0, 0, 0, 0, 0, 52, 0, 0, 0, 31, 0, 0, 0, 35, 0
        ];

        this.menuLead = [
            76, 0, 0, 0, 74, 0, 0, 72, 0, 0, 71, 0, 69, 0, 72, 0,
            69, 0, 0, 0, 72, 0, 76, 0, 0, 0, 79, 0, 76, 0, 74, 0,
            76, 0, 0, 0, 79, 0, 83, 0, 0, 0, 81, 0, 79, 0, 76, 0,
            74, 0, 0, 0, 71, 0, 67, 0, 0, 0, 64, 0, 67, 0, 71, 0
        ];

        this.gameBass = [
            // Bar 1: Dm
            38, 50, 38, 50, 38, 50, 38, 50, 38, 50, 38, 41, 38, 50, 36, 37,
            // Bar 2: Bb
            34, 46, 34, 46, 34, 46, 34, 46, 34, 46, 34, 46, 34, 46, 36, 37,
            // Bar 3: C
            36, 48, 36, 48, 36, 48, 36, 48, 36, 48, 36, 48, 36, 48, 38, 40,
            // Bar 4: A7
            33, 45, 33, 45, 33, 45, 33, 45, 33, 45, 33, 45, 33, 45, 36, 37,
            // Bar 5: Gm
            31, 43, 31, 43, 31, 43, 31, 43, 31, 43, 31, 43, 31, 43, 33, 34,
            // Bar 6: C
            36, 48, 36, 48, 36, 48, 36, 48, 36, 48, 36, 48, 36, 48, 38, 40,
            // Bar 7: F
            29, 41, 29, 41, 29, 41, 29, 41, 29, 41, 29, 41, 29, 41, 31, 33,
            // Bar 8: A7
            33, 45, 33, 45, 33, 45, 33, 45, 33, 45, 33, 45, 33, 33, 34, 36
        ];

        this.gameLead = [
            // Bar 1
            74, 0, 74, 0, 77, 0, 79, 0, 81, 0, 0, 0, 79, 0, 77, 0,
            // Bar 2
            74, 0, 0, 0, 77, 0, 0, 0, 79, 0, 0, 0, 77, 0, 76, 0,
            // Bar 3
            76, 0, 0, 0, 79, 0, 0, 0, 81, 0, 0, 0, 84, 0, 83, 0,
            // Bar 4
            81, 0, 0, 0, 79, 0, 0, 0, 76, 0, 0, 0, 73, 0, 76, 0,
            // Bar 5
            79, 0, 82, 0, 86, 0, 0, 0, 84, 0, 82, 0, 81, 0, 79, 0,
            // Bar 6
            84, 0, 88, 0, 86, 0, 84, 0, 81, 0, 79, 0, 81, 0, 0, 0,
            // Bar 7
            77, 0, 81, 0, 84, 0, 89, 0, 88, 0, 86, 0, 84, 0, 81, 0,
            // Bar 8
            85, 0, 81, 0, 79, 0, 76, 0, 77, 0, 76, 0, 74, 0, 73, 0
        ];
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            this.musicGain.connect(this.masterGain);

            // 1-second white noise buffer for crisp arcade drums
            const bufferSize = this.ctx.sampleRate;
            this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = this.noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => { });
        }
    }

    // ========================================================================
    // SOUND EFFECTS (SFX)
    // ========================================================================
    playSwing() {
        if (!this.sfxEnabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.12);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain || this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.13);
    }

    playHammerHit() {
        if (!this.sfxEnabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Sub bass thump
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'triangle';
        sub.frequency.setValueAtTime(180, now);
        sub.frequency.exponentialRampToValueAtTime(35, now + 0.18);
        subGain.gain.setValueAtTime(0.65, now);
        subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        sub.connect(subGain);
        subGain.connect(this.sfxGain || this.ctx.destination);
        sub.start(now);
        sub.stop(now + 0.2);

        // Metallic anvil clang
        const metal = this.ctx.createOscillator();
        const metalGain = this.ctx.createGain();
        metal.type = 'square';
        metal.frequency.setValueAtTime(1200, now);
        metal.frequency.exponentialRampToValueAtTime(250, now + 0.08);
        metalGain.gain.setValueAtTime(0.25, now);
        metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        metal.connect(metalGain);
        metalGain.connect(this.sfxGain || this.ctx.destination);
        metal.start(now);
        metal.stop(now + 0.09);
    }

    playExplosion(type = 'cruzado') {
        if (!this.sfxEnabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Comic High Pop
        const pop = this.ctx.createOscillator();
        const popGain = this.ctx.createGain();
        pop.type = 'sine';
        pop.frequency.setValueAtTime(420, now);
        pop.frequency.exponentialRampToValueAtTime(1300, now + 0.05);
        pop.frequency.exponentialRampToValueAtTime(100, now + 0.18);
        popGain.gain.setValueAtTime(0.45, now);
        popGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        pop.connect(popGain);
        popGain.connect(this.sfxGain || this.ctx.destination);
        pop.start(now);
        pop.stop(now + 0.18);

        // White noise explosion burst
        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(1600, now);
            noiseFilter.frequency.exponentialRampToValueAtTime(300, now + 0.22);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.5, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.sfxGain || this.ctx.destination);
            noise.start(now);
            noise.stop(now + 0.26);
        }

        if (type === 'coffee') {
            if (typeof this.playCoffeeChime === 'function') this.playCoffeeChime();
        } else if (type === 'docinho') {
            if (typeof this.playDocinhoChime === 'function') this.playDocinhoChime();
        }
    }

    playEmailAlert() {
        if (!this.sfxEnabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Two urgent, harsh retro buzzer beeps (downward sawtooth)
        [0, 0.12].forEach((offset, idx) => {
            const t = now + offset;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(idx === 0 ? 560 : 380, t);
            osc.frequency.exponentialRampToValueAtTime(idx === 0 ? 300 : 180, t + 0.10);

            gain.gain.setValueAtTime(0.35, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.10);

            osc.connect(gain);
            gain.connect(this.sfxGain || this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.11);
        });
    }

    playAcFreezeSound() {
        if (!this.sfxEnabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Triple sharp digital AC remote confirmation beeps (2000Hz, 2200Hz, 2400Hz)
        [0, 0.07, 0.14].forEach((offset, idx) => {
            const t = now + offset;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(idx === 2 ? 2400 : 2000, t);

            gain.gain.setValueAtTime(0.32, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

            osc.connect(gain);
            gain.connect(this.sfxGain || this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.06);
        });

        // Chilling frost / descending FM sweep
        const sweep = this.ctx.createOscillator();
        const sweepGain = this.ctx.createGain();
        sweep.type = 'triangle';
        sweep.frequency.setValueAtTime(900, now + 0.16);
        sweep.frequency.exponentialRampToValueAtTime(140, now + 0.50);

        sweepGain.gain.setValueAtTime(0.38, now + 0.16);
        sweepGain.gain.exponentialRampToValueAtTime(0.005, now + 0.52);

        sweep.connect(sweepGain);
        sweepGain.connect(this.sfxGain || this.ctx.destination);
        sweep.start(now + 0.16);
        sweep.stop(now + 0.53);
    }

    playFartSound() {
        if (!this.sfxEnabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Resonant squishy lowpass filter to mimic flatulence acoustics
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.linearRampToValueAtTime(110, now + 0.42);
        filter.Q.setValueAtTime(5.5, now);
        filter.connect(this.sfxGain || this.ctx.destination);

        // 2. Main Sawtooth Oscillator with downward pitch droop
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(115, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.42);

        // Rapid Sputtering LFO (34Hz down to 16Hz) to create the fluttery flapping lip effect
        const lfo = this.ctx.createOscillator();
        lfo.type = 'square';
        lfo.frequency.setValueAtTime(34, now);
        lfo.frequency.linearRampToValueAtTime(16, now + 0.42);

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(48, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        // Main amplitude envelope (prominent and distinct)
        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.70, now);
        oscGain.gain.setValueAtTime(0.65, now + 0.25);
        oscGain.gain.exponentialRampToValueAtTime(0.005, now + 0.44);

        osc.connect(oscGain);
        oscGain.connect(filter);

        // 3. Air puff noise layer
        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.25, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.002, now + 0.35);
            noise.connect(noiseGain);
            noiseGain.connect(filter);
            noise.start(now);
            noise.stop(now + 0.38);
        }

        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 0.45);
        osc.stop(now + 0.45);
    }

    playCoffeeChime() {
        if (!this.sfxEnabled || !this.ctx) return;
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime + idx * 0.05;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.connect(gain);
            gain.connect(this.sfxGain || this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.28);
        });
    }

    playDocinhoChime() {
        if (!this.sfxEnabled || !this.ctx) return;
        // Sparkling high-pitch arpeggio for rare sweet candy bonus
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime + idx * 0.045;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.28, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.26);
            osc.connect(gain);
            gain.connect(this.sfxGain || this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.28);
        });
    }

    playCoin() {
        if (!this.sfxEnabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        [987.77, 1318.51].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + i * 0.07;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
            osc.connect(gain);
            gain.connect(this.sfxGain || this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.3);
        });
    }

    playFuryStinger() {
        if (!this.sfxEnabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const freqs = [164.81, 246.94, 329.63, 493.88];
        freqs.forEach(f => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, now);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            osc.connect(gain);
            gain.connect(this.sfxGain || this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.85);
        });
    }

    playFuryExtend() {
        if (!this.sfxEnabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
        osc.connect(gain);
        gain.connect(this.sfxGain || this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playGameOver() {
        if (!this.sfxEnabled || !this.ctx) return;
        const notes = [493.88, 440, 392, 329.63];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime + idx * 0.16;
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.connect(gain);
            gain.connect(this.sfxGain || this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
        });
    }


    // ========================================================================
    // DUAL-TRACK ARCADE PROCEDURAL MUSIC SYNTHESIZER
    // ========================================================================
    midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    playKick(time, isGame) {
        if (!this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const startFreq = isGame ? 165 : 125;
        const endFreq = 38;
        const dur = isGame ? 0.13 : 0.16;
        osc.frequency.setValueAtTime(startFreq, time);
        osc.frequency.exponentialRampToValueAtTime(endFreq, time + dur);
        gain.gain.setValueAtTime(isGame ? 0.36 : 0.28, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(time);
        osc.stop(time + dur);
    }

    playSnare(time, isGame) {
        if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = isGame ? 'highpass' : 'bandpass';
        filter.frequency.setValueAtTime(isGame ? 1400 : 1100, time);
        const gain = this.ctx.createGain();
        const dur = isGame ? 0.11 : 0.09;
        gain.gain.setValueAtTime(isGame ? 0.22 : 0.14, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        src.start(time);
        src.stop(time + dur);

        // Warm tonal body tone
        const body = this.ctx.createOscillator();
        const bodyGain = this.ctx.createGain();
        body.type = 'triangle';
        body.frequency.setValueAtTime(180, time);
        body.frequency.exponentialRampToValueAtTime(90, time + 0.08);
        bodyGain.gain.setValueAtTime(0.14, time);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
        body.connect(bodyGain);
        bodyGain.connect(this.musicGain);
        body.start(time);
        body.stop(time + 0.08);
    }

    playHiHat(time, open = false, vol = 0.04) {
        if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7500, time);
        const gain = this.ctx.createGain();
        const dur = open ? 0.15 : 0.035;
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        src.start(time);
        src.stop(time + dur);
    }

    playBass(note, time, dur, isGame) {
        if (!this.ctx || !this.musicGain || note === 0) return;
        const freq = this.midiToFreq(note);
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        if (isGame) {
            // Driving rolling arcade sawtooth bass
            osc.type = 'sawtooth';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2200, time);
            filter.frequency.exponentialRampToValueAtTime(320, time + dur);
            filter.Q.setValueAtTime(2.5, time);
            gain.gain.setValueAtTime(0.20, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
        } else {
            // Chill warm synth funk bass
            osc.type = 'triangle';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(550, time);
            gain.gain.setValueAtTime(0.26, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
        }
        osc.frequency.setValueAtTime(freq, time);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(time);
        osc.stop(time + dur + 0.02);
    }

    playChord(notes, time, dur) {
        if (!this.ctx || !this.musicGain || !notes || !notes.length) return;
        notes.forEach(n => {
            const freq = this.midiToFreq(n);
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc1.type = 'triangle';
            osc2.type = 'sawtooth';
            osc1.detune.setValueAtTime(-4, time);
            osc2.detune.setValueAtTime(+4, time);
            osc1.frequency.setValueAtTime(freq, time);
            osc2.frequency.setValueAtTime(freq, time);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(950, time);

            const chordVol = 0.045 / Math.sqrt(notes.length);
            gain.gain.setValueAtTime(0.001, time);
            gain.gain.linearRampToValueAtTime(chordVol, time + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);
            osc1.start(time);
            osc2.start(time);
            osc1.stop(time + dur + 0.05);
            osc2.stop(time + dur + 0.05);
        });
    }

    playLead(note, time, dur, isGame) {
        if (!this.ctx || !this.musicGain || note === 0) return;
        const freq = this.midiToFreq(note);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        if (isGame) {
            // High-octane arcade pulse lead
            osc.type = 'square';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(3200, time);
            gain.gain.setValueAtTime(0.14, time);
            gain.gain.exponentialRampToValueAtTime(0.005, time + dur);
        } else {
            // Chill dreamy fliperama chime/pluck
            osc.type = 'triangle';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1800, time);
            gain.gain.setValueAtTime(0.16, time);
            gain.gain.exponentialRampToValueAtTime(0.002, time + dur);
        }
        osc.frequency.setValueAtTime(freq, time);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(time);
        osc.stop(time + dur + 0.03);
    }

    // Sequencer Lookahead Scheduler Loop
    schedulerLoop() {
        if (!this.musicEnabled || !this.ctx) return;
        const stepSeconds = 60 / this.tempo / 4;

        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            if (this.currentTrack === 'menu') {
                this.scheduleMenuStep(this.currentStep, this.nextNoteTime, stepSeconds);
            } else if (this.currentTrack === 'game') {
                this.scheduleGameStep(this.currentStep, this.nextNoteTime, stepSeconds);
            }
            this.nextNoteTime += stepSeconds;
            this.currentStep++;
        }
    }

    scheduleMenuStep(step, time, stepDur) {
        const loopStep = step % 64;
        const barIndex = Math.floor(loopStep / 16);

        // Chords on bar downbeats
        if (loopStep % 16 === 0) {
            this.playChord(this.menuChords[barIndex], time, stepDur * 14);
        }

        // Chill Bass
        const bassNote = this.menuBass[loopStep];
        if (bassNote > 0) {
            this.playBass(bassNote, time, stepDur * 3.5, false);
        }

        // Dreamy Pluck Lead
        const leadNote = this.menuLead[loopStep];
        if (leadNote > 0) {
            this.playLead(leadNote, time, stepDur * 2.8, false);
        }

        // Drum groove: kick, soft snare, swung hi-hats
        if (loopStep % 16 === 0 || loopStep % 16 === 8 || loopStep % 16 === 10) {
            this.playKick(time, false);
        }
        if (loopStep % 16 === 4 || loopStep % 16 === 12) {
            this.playSnare(time, false);
        }
        if (loopStep % 2 === 1) {
            const hatVol = (loopStep % 4 === 1) ? 0.045 : 0.025;
            this.playHiHat(time, false, hatVol);
        }
    }

    scheduleGameStep(step, time, stepDur) {
        const loopStep = step % 128;

        // Four-on-the-floor driving kick
        if (loopStep % 4 === 0) {
            this.playKick(time, true);
        }
        // Snappy arcade snare on 2 and 4
        if (loopStep % 8 === 4) {
            this.playSnare(time, true);
        }
        // Running 16th hi-hats
        const isOpen = (loopStep % 4 === 2);
        this.playHiHat(time, isOpen, isOpen ? 0.045 : 0.025);

        // Driving rolling 16th-note arcade bass
        const bassNote = this.gameBass[loopStep];
        if (bassNote > 0) {
            this.playBass(bassNote, time, stepDur * 0.95, true);
        }

        // High-energy 8-bit melody hook
        const leadNote = this.gameLead[loopStep];
        if (leadNote > 0) {
            this.playLead(leadNote, time, stepDur * 1.8, true);
        }
    }

    startMenuMusic() {
        if (!this.musicEnabled) return;
        this.init();
        if (this.currentTrack === 'menu' && this.schedulerTimer) return;

        if (this.schedulerTimer) {
            clearInterval(this.schedulerTimer);
            this.schedulerTimer = null;
        }

        this.currentTrack = 'menu';
        this.tempo = 104;
        this.currentStep = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.06;
        this.schedulerTimer = setInterval(() => this.schedulerLoop(), this.lookaheadInterval);
    }

    startGameMusic() {
        if (!this.musicEnabled) return;
        this.init();
        if (this.currentTrack === 'game' && this.schedulerTimer) return;

        if (this.schedulerTimer) {
            clearInterval(this.schedulerTimer);
            this.schedulerTimer = null;
        }

        this.currentTrack = 'game';
        this.tempo = 144;
        this.currentStep = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.05;
        this.schedulerTimer = setInterval(() => this.schedulerLoop(), this.lookaheadInterval);
    }


    stopMusic() {
        if (this.schedulerTimer) {
            clearInterval(this.schedulerTimer);
            this.schedulerTimer = null;
        }
        this.currentTrack = null;
    }
}

// ============================================================================
// 2. THREE.JS 3D SCENE & FLIPERAMA CABINET ENGINE
// ============================================================================
class ArcadeWhackGame {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.sound = new SoundEngine();

        // Game State (Starts at 0 in menu)
        this.score = 0;
        this.timeLeft = 0;
        this.isPlaying = false;
        this.combo = 0;
        this.maxCombo = 1;
        this.explodedHeads = 0;
        this.stressLevel = 0;
        this.isFuryMode = false;
        this.furyTimeRemaining = 0;
        this.furyMaxTime = 7.5;
        this.furyInterval = null;
        this.gameTimer = null;
        this.spawnTimer = null;
        this.record = 0;
        try {
            this.record = parseInt(localStorage.getItem('cala_cruzado_record') || '0', 10);
        } catch (e) { }

        // Coworkers stats breakdown
        this.stats = { cruzado: 0, sena: 0, jorio: 0, coffee: 0, docinho: 0, email: 0, ac: 0 };
        this.coinButtons = [];

        // Camera views (Responsive Dynamic Framing)
        // 'wide': Arcade overview angle (zoomed out to showcase full majestic 80s cabinet & logo backboard)
        // 'play': Table top-down playable angle (MESA - focused squarely on holes and gameplay)
        this.baseCameraViews = {
            play: {
                target: new THREE.Vector3(0, 1.4, 0.1),
                offset: new THREE.Vector3(0, 3.9, 3.7) // base: pos = (0, 5.3, 3.8)
            },
            wide: {
                target: new THREE.Vector3(0.0, 3.4, -0.6),
                offset: new THREE.Vector3(-5.2, 3.8, 11.2) // base: pos = (-5.2, 7.2, 10.6)
            }
        };

        this.cameraViews = {
            play: { pos: new THREE.Vector3(0, 5.3, 3.8), target: new THREE.Vector3(0, 1.4, 0.1) },
            wide: { pos: new THREE.Vector3(-5.2, 7.2, 10.6), target: new THREE.Vector3(0.0, 3.4, -0.6) }
        };
        this.currentView = 'wide';
        this.cameraPos = new THREE.Vector3().copy(this.cameraViews.wide.pos);
        this.cameraTarget = new THREE.Vector3().copy(this.cameraViews.wide.target);
        this.shakeIntensity = 0;

        // Raycasting & Mouse Tracking
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0.26).normalize(), -1.4);
        this.hoverPoint = new THREE.Vector3(0.0, 1.6, 0.2);
        this.isSmashing = false;
        this._smashPhase = 'idle'; // 'idle' | 'striking' | 'recovering'
        this._smashTweens = [];
        this._bufferedSmash = null;
        this.isHammerPickingUp = false;
        this.restingHammerPos = new THREE.Vector3();
        this.restingHammerRot = new THREE.Euler(0.26, -1.20, 0.0);

        // Entities config (scaled down by /10 for tighter, balanced arcade scoring)
        this.ENTITIES = {
            CRUZADO: { type: 'cruzado', points: 10, bonusTime: 0, yell: 'CALA A BOCA, CRUZADO! +10', color: 0x00f0ff },
            SENA: { type: 'sena', points: -15, bonusTime: -5, yell: 'SAI SENA! -15 PTS -5s', color: 0xff0033 },
            JORIO: { type: 'jorio', points: 25, bonusTime: 0, yell: 'JÓRIO VELHO! +25', color: 0x00f0ff },
            COFFEE: { type: 'coffee', points: 20, bonusTime: 3, yell: 'CAFEZINHO! +20 PTS +3s', color: 0xffe600 },
            DOCINHO: { type: 'docinho', points: 50, bonusTime: 6, yell: 'DOCINHO! +50 PTS +6s', color: 0xffe600 },
            EMAIL: { type: 'email', points: -60, bonusTime: -15, yell: 'DOIS E-MAILS! -60 PTS -15s', color: 0xff0033 },
            AC: { type: 'ac', points: -30, bonusTime: -10, yell: 'AR NO 15°C! -30 PTS -10s', color: 0xff0033 }
        };

        // Texture loader
        this.textureLoader = new THREE.TextureLoader();
        this.textures = {};

        // 3D Scene Components
        this.holes = [];

        this.initThree();
        this.loadTextures();
        this.buildArcadeRoom();
        this.buildCabinet();
        this.buildLuanaHammer();
        this.bindEvents();

        // Start chill, addictive 80s fliperama lounge music on open
        this.sound.startMenuMusic();

        // Browser Autoplay Policy: if AudioContext was suspended, resume and play on first user interaction anywhere
        const unlockAudio = () => {
            this.sound.init();
            if (this.sound.musicEnabled && !this.sound.currentTrack) {
                if (this.isPlaying) {
                    this.sound.startGameMusic();
                } else {
                    this.sound.startMenuMusic();
                }
            }
        };
        window.addEventListener('pointerdown', unlockAudio, { once: true });
        window.addEventListener('keydown', unlockAudio, { once: true });

        // Start render loop
        this.clock = new THREE.Clock();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        // Initial HUD render: points, tempo, combo show 0 in menu
        this.updateHUD();
    }

    // Setup Three.js Renderer, Scene, Camera
    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x06040b);
        // Explicitly NO scene fog: ensures 100% constant, crystal-clear illumination at all zoom distances and aspect ratios!

        this.container = document.getElementById('canvas-container');
        const w = (this.container && this.container.clientWidth) ? this.container.clientWidth : 690;
        const h = (this.container && this.container.clientHeight) ? this.container.clientHeight : 866;

        this.camera = new THREE.PerspectiveCamera(
            50,
            w / (h || 1),
            0.1,
            100
        );
        this.camera.position.copy(this.cameraPos);
        this.camera.lookAt(this.cameraTarget);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
        this.renderer.shadowMap.enabled = false;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.container.appendChild(this.renderer.domElement);

        // Crisp Arcade Ambiance (Preserves deep inky blacks and rich contrast)
        const ambient = new THREE.AmbientLight(0x221332, 0.85);
        this.scene.add(ambient);

        // Key Directional Light on Table (Crisp shadows, sharp highlights)
        this.mainLight = new THREE.DirectionalLight(0xfff8fa, 1.25);
        this.mainLight.position.set(0, 8.5, 4.5);
        this.scene.add(this.mainLight);

        // Cabinet Rim Lights (Subtle pink and cyan edge accents)
        const pinkRim = new THREE.DirectionalLight(0xff0088, 0.70);
        pinkRim.position.set(-5.0, 4.0, 1.0);
        this.scene.add(pinkRim);

        const cyanRim = new THREE.DirectionalLight(0x00f0ff, 0.50);
        cyanRim.position.set(5.0, 4.0, 1.0);
        this.scene.add(cyanRim);

        this._shakeOffset = new THREE.Vector3();
        this._planeIntersection = new THREE.Vector3();

        this.updateCameraProjection();
    }

    // Dynamic Responsive Auto-Framing: Guarantees the table, holes, artwork, and cabinet fit 100% inside any window size,
    // including ultra-tall mobile screens (e.g. Galaxy Z Flip 22:9, iPhones) and narrow desktop windows!
    updateCameraProjection() {
        if (!this.container || !this.renderer || !this.camera) return;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        if (w === 0 || h === 0) return;
        const aspect = w / h;

        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));

        // 1. Desktop Base Framing (Aspect >= 0.72)
        // Preserves 100% of the desktop arcade cabinet experience
        let desktopPlayZoom = 1.0;
        let desktopWideZoom = 1.0;

        if (aspect < 1.05) {
            desktopPlayZoom = Math.min(1.75, Math.max(1.0, Math.pow(1.05 / aspect, 0.82)));
        }
        if (aspect < 0.75) {
            desktopWideZoom = Math.min(1.35, Math.max(1.0, Math.pow(0.75 / aspect, 0.70)));
        }
        if (h < 580 && aspect >= 0.75) {
            const hFactor = Math.min(1.25, 580 / Math.max(300, h));
            desktopPlayZoom = Math.max(desktopPlayZoom, desktopPlayZoom * hFactor);
        }

        const dPlayTarget = new THREE.Vector3(
            this.baseCameraViews.play.target.x,
            aspect < 1.0 ? 1.30 : 1.40,
            aspect < 1.0 ? 0.20 : 0.10
        );
        const dPlayPos = new THREE.Vector3(
            this.baseCameraViews.play.target.x + this.baseCameraViews.play.offset.x * desktopPlayZoom,
            this.baseCameraViews.play.target.y + this.baseCameraViews.play.offset.y * desktopPlayZoom,
            this.baseCameraViews.play.target.z + this.baseCameraViews.play.offset.z * desktopPlayZoom
        );

        const dWideTarget = new THREE.Vector3().copy(this.baseCameraViews.wide.target);
        const dWidePos = new THREE.Vector3(
            this.baseCameraViews.wide.target.x + this.baseCameraViews.wide.offset.x * desktopWideZoom,
            this.baseCameraViews.wide.target.y + this.baseCameraViews.wide.offset.y * desktopWideZoom,
            this.baseCameraViews.wide.target.z + this.baseCameraViews.wide.offset.z * desktopWideZoom
        );

        if (aspect >= 0.72) {
            this.cameraViews.play.pos.copy(dPlayPos);
            this.cameraViews.play.target.copy(dPlayTarget);
            this.cameraViews.wide.pos.copy(dWidePos);
            this.cameraViews.wide.target.copy(dWideTarget);
        } else {
            // 2. Mobile Portrait Framing (Aspect < 0.72, e.g. Galaxy Z Flip 22:9, iPhones, standard smartphones)
            // Smoothly blends from aspect 0.72 down to 0.60
            const t = Math.min(1.0, Math.max(0.0, (0.72 - aspect) / 0.12));

            // Width factor: ensures cabinet fits with edge margins on narrow & ultra-tall phones (e.g. aspect ~0.45)
            const widthFactor = Math.max(1.0, Math.pow(0.50 / Math.max(0.35, aspect), 0.72));

            // Mobile Play View:
            // Perfectly frames the entire marquee illustration (Luana, "CALA A BOCA, CRUZADO!", coworker heads)
            // AND the table with all 9 holes centered and ergonomically positioned for touch tapping!
            const mPlayTarget = new THREE.Vector3(0, 3.15, -0.60);
            const mPlayPos = new THREE.Vector3(
                0,
                3.15 + 4.65 * widthFactor,
                -0.60 + 10.8 * widthFactor
            );

            // Mobile Wide View (Menu):
            // Centers the full 3D fliperama cabinet with ample top & bottom margins
            const mWideTarget = new THREE.Vector3(0, 3.05, -0.60);
            const mWidePos = new THREE.Vector3(
                -5.8 * widthFactor,
                3.05 + 5.15 * widthFactor,
                -0.60 + 13.4 * widthFactor
            );

            this.cameraViews.play.target.lerpVectors(dPlayTarget, mPlayTarget, t);
            this.cameraViews.play.pos.lerpVectors(dPlayPos, mPlayPos, t);
            this.cameraViews.wide.target.lerpVectors(dWideTarget, mWideTarget, t);
            this.cameraViews.wide.pos.lerpVectors(dWidePos, mWidePos, t);
        }

        // Snap immediately on first load or menu resize so there's zero jump or drift
        if (!this.isPlaying && this.currentView === 'wide') {
            this.cameraPos.copy(this.cameraViews.wide.pos);
            this.cameraTarget.copy(this.cameraViews.wide.target);
            this.camera.position.copy(this.cameraPos);
            this.camera.lookAt(this.cameraTarget);
        }
    }

    // Preload Textures with automatic zero-CORS embedded Data-URI support for file:// and offline execution
    loadTextures() {
        const texData = window.GAME_TEXTURES || {};

        const load = (key, fallbackPath) => {
            const source = texData[key] || fallbackPath;
            this.textures[key] = this.textureLoader.load(source);
        };

        load('cruzadoToken', 'assets/img/cruzado_token.png');
        load('jorioToken', 'assets/img/jorio_token.png');
        load('senaToken', 'assets/img/sena_token.png');
        load('curlyToken', 'assets/img/cruzado_token.png'); // backwards compatibility alias
        load('logoArt', 'assets/img/logo.jpg');
        load('docinhoSnickers', 'assets/img/docinho_snickers.png');

        this.textures.tableMat = this.createProceduralTableTexture();
        this.textures.acLcd = this.createProceduralAcLcdTexture();

        // Update HTML Luana portrait if base64 data available (guarantees offline/file:// works too)
        if (texData.luanaHead) {
            const portrait = document.getElementById('luana-portrait');
            if (portrait) portrait.src = texData.luanaHead;
        }
    }

    // Creates retro cyber-goth diamond plate arcade table pad
    createProceduralTableTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Dark metallic violet base
        const grad = ctx.createLinearGradient(0, 0, 0, 1024);
        grad.addColorStop(0, '#1c0f2b');
        grad.addColorStop(0.5, '#28153c');
        grad.addColorStop(1, '#150a22');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1024, 1024);

        // Cyber Grid Lines
        ctx.strokeStyle = 'rgba(255, 0, 119, 0.2)';
        ctx.lineWidth = 2;
        const step = 64;
        for (let x = 0; x <= 1024; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 1024);
            ctx.stroke();
        }
        for (let y = 0; y <= 1024; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(1024, y);
            ctx.stroke();
        }

        // Diamond Tread Plate Pattern
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        for (let x = 32; x < 1024; x += 64) {
            for (let y = 32; y < 1024; y += 64) {
                ctx.beginPath();
                ctx.ellipse(x, y, 16, 5, Math.PI / 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(x, y, 16, 5, -Math.PI / 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Hazard Caution Stripes on Bottom Edge
        const stripeH = 80;
        ctx.fillStyle = '#ffe600';
        ctx.fillRect(0, 1024 - stripeH, 1024, stripeH);
        ctx.fillStyle = '#111111';
        for (let i = -100; i < 1100; i += 70) {
            ctx.beginPath();
            ctx.moveTo(i, 1024);
            ctx.lineTo(i + 40, 1024);
            ctx.lineTo(i + 80, 1024 - stripeH);
            ctx.lineTo(i + 40, 1024 - stripeH);
            ctx.closePath();
            ctx.fill();
        }

        // Top Neon Header Accent Line
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(40, 40);
        ctx.lineTo(984, 40);
        ctx.stroke();

        // Subtle Center Graphic
        ctx.font = '900 28px "Press Start 2P", monospace';
        ctx.fillStyle = 'rgba(255, 0, 119, 0.35)';
        ctx.textAlign = 'center';
        ctx.fillText('A POSTURA ACABOU', 512, 100);

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 4;
        return tex;
    }

    // Generates high-resolution LCD display face for AC Remote, showing 15°C freezing setting
    createProceduralAcLcdTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 384;
        const ctx = canvas.getContext('2d');

        // Classic retro greenish-gray backlit LCD background (matching reference photo)
        const grad = ctx.createLinearGradient(0, 0, 0, 384);
        grad.addColorStop(0, '#a8bfa0');
        grad.addColorStop(0.5, '#9cb394');
        grad.addColorStop(1, '#8ea686');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 384);

        // Subtle LCD pixel/grid texture
        ctx.fillStyle = 'rgba(0, 0, 0, 0.035)';
        for (let y = 0; y < 384; y += 4) {
            ctx.fillRect(0, y, 512, 1);
        }

        // Dark LCD ink color (classic liquid crystal dark charcoal/olive)
        const lcdInk = '#0e1a0e';
        ctx.fillStyle = lcdInk;

        // Top Status Bar: Snowflake + "COOL" (top-left) & Battery indicator (top-right)
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('❄ COOL', 32, 48);

        // Battery indicator (top-right)
        ctx.strokeStyle = lcdInk;
        ctx.lineWidth = 3;
        ctx.strokeRect(416, 26, 54, 24);
        ctx.fillRect(470, 32, 6, 12);
        ctx.fillRect(422, 30, 13, 16);
        ctx.fillRect(439, 30, 13, 16);
        ctx.fillRect(456, 30, 10, 16);

        // Top separator line
        ctx.strokeStyle = 'rgba(14, 26, 14, 0.5)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(26, 62);
        ctx.lineTo(486, 62);
        ctx.stroke();

        // Label: "SET TEMP"
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SET TEMP', 170, 100);

        // Giant Digital "15" (Freezing cold setting that Luana hates!)
        ctx.font = '900 152px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('15', 205, 224);

        // Temperature unit "°C"
        ctx.font = '900 48px monospace';
        ctx.fillText('°C', 368, 154);

        // Fan Speed Bar / Status (matching reference bottom row)
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('💨 AUTO', 36, 276);

        // Digital fan speed bar graph
        for (let i = 0; i < 10; i++) {
            ctx.fillRect(162 + i * 16, 260, 11, 18);
        }

        // Bottom Warning Banner: "CONGELANDO!"
        ctx.fillStyle = 'rgba(14, 26, 14, 0.16)';
        ctx.fillRect(26, 304, 460, 52);

        ctx.fillStyle = lcdInk;
        ctx.font = '900 25px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('❄ CONGELANDO! ❄', 256, 340);

        // Outer LCD border highlight/shadow
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 6;
        ctx.strokeRect(4, 4, 504, 376);

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 4;
        tex.needsUpdate = true;
        return tex;
    }

    // 3D Arcade Room Environment (Streamlined & Lightweight)
    buildArcadeRoom() {
        const floorGeo = new THREE.PlaneGeometry(30, 30);
        const floorMat = new THREE.MeshBasicMaterial({ color: 0x080410 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1.6;
        this.scene.add(floor);

        const gridHelper = new THREE.GridHelper(24, 16, 0x8a2be2, 0x261042);
        gridHelper.position.y = -1.58;
        this.scene.add(gridHelper);
    }

    // Helper: Solid Watertight Trapezoid Prism Geometry for Arcade Cabinet Body & Side Walls
    createTrapezoidPrismGeometry(width, yFloor, zFront, yFront, zBack, yBack) {
        const hw = width / 2;
        // 8 vertices for a 100% closed, solid trapezoidal arcade housing
        const v0 = [-hw, yFloor, zFront]; // front bottom left
        const v1 = [hw, yFloor, zFront]; // front bottom right
        const v2 = [hw, yFront, zFront]; // front top right
        const v3 = [-hw, yFront, zFront]; // front top left
        const v4 = [-hw, yFloor, zBack];  // back bottom left
        const v5 = [hw, yFloor, zBack];  // back bottom right
        const v6 = [hw, yBack, zBack];  // back top right
        const v7 = [-hw, yBack, zBack];  // back top left

        // 12 triangles (counter-clockwise winding, outward facing normals)
        const vertices = new Float32Array([
            // Front face (+Z)
            ...v0, ...v1, ...v2, ...v0, ...v2, ...v3,
            // Back face (-Z)
            ...v5, ...v4, ...v7, ...v5, ...v7, ...v6,
            // Top sloped face
            ...v3, ...v2, ...v6, ...v3, ...v6, ...v7,
            // Bottom face on floor (-Y)
            ...v4, ...v5, ...v1, ...v4, ...v1, ...v0,
            // Left face (-X)
            ...v4, ...v0, ...v3, ...v4, ...v3, ...v7,
            // Right face (+X)
            ...v1, ...v5, ...v6, ...v1, ...v6, ...v2
        ]);

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geo.computeVertexNormals();
        return geo;
    }

    // 3. Build Fliperama Cabinet (Authentic Solid Arcade Construction - ZERO FLOATING PARTS!)
    buildCabinet() {
        this.cabinetGroup = new THREE.Group();
        this.cabinetGroup.position.set(0, 0, 0);

        const cabinetMat = new THREE.MeshStandardMaterial({
            color: 0x130a21, // Sleek black-ish arcade cabinet finish
            roughness: 0.50,
            metalness: 0.20
        });

        // 1. Solid Under-Table Cabinet Pedestal (Seamlessly connects Floor y = -1.60 up to Tilted Table & Marquee Base)
        // Matches table slope and dimensions exactly: NO STEPPED GAP, NO FLOATING!
        const bodyGeo = this.createTrapezoidPrismGeometry(
            3.88,   // width (tucks flush under table width 3.90)
            -1.60,  // yFloor (rests on floor)
            2.04,  // zFront (front underside of table)
            0.96,  // yFront
            -2.02,  // zBack (meets full depth of cabinet back)
            2.24   // yBack (flush under marquee base)
        );
        const bodyMesh = new THREE.Mesh(bodyGeo, cabinetMat);
        this.cabinetGroup.add(bodyMesh);

        // 2. Authentic Arcade Side Cheeks / Wings (Left & Right solid side panels like real Whack-a-Mole!)
        // These flank the table and rise slightly above the playfield to act as side protective walls!
        const cheekThick = 0.08;
        const cheekGeo = this.createTrapezoidPrismGeometry(
            cheekThick,
            -1.60,  // yFloor
            2.07,  // zFront
            1.33,  // yFront (rises ~0.08 above the front table top surface 1.25)
            -2.02,  // zBack (runs all the way back to meet marquee wall)
            2.34   // yBack (rises to meet marquee wall side seamlessly)
        );

        const neonTrimMat = new THREE.MeshBasicMaterial({ color: 0xff0088 });

        // Left & Right cheeks with glowing T-molding along top sloping edge
        const cheekSlopeLen = Math.hypot(2.07 - (-2.02), 1.33 - 2.34);
        const cheekAngleX = Math.atan2(2.34 - 1.33, 2.07 - (-2.02));
        [-1, 1].forEach(sign => {
            const posX = sign * (3.88 / 2 + cheekThick / 2);
            const cheek = new THREE.Mesh(cheekGeo, cabinetMat);
            cheek.position.set(posX, 0, 0);
            this.cabinetGroup.add(cheek);

            // Glowing Neon Pink T-Molding along the sloping top edge of each cheek
            const tMoldingGeo = new THREE.BoxGeometry(cheekThick + 0.02, 0.04, cheekSlopeLen);
            const tMolding = new THREE.Mesh(tMoldingGeo, neonTrimMat);
            tMolding.position.set(posX, (1.33 + 2.34) / 2 + 0.01, (2.07 + (-2.02)) / 2);
            tMolding.rotation.x = cheekAngleX;
            this.cabinetGroup.add(tMolding);
        });

        // 3. Front Apron: Speaker Grille & Coin Door
        this.buildFrontCoinDoor();

        // 4. Tilted Playfield Table (GENEROUS DIMENSIONS, 100% VISIBLE HOLES)
        this.tableGroup = new THREE.Group();
        this.tableGroup.position.set(0, 1.45, 0.2);
        this.tableGroup.rotation.x = 0.26;

        const tableWidth = 3.9;
        const tableDepth = 3.8;
        const tableGeo = new THREE.BoxGeometry(tableWidth, 0.3, tableDepth);
        const tableMat = new THREE.MeshStandardMaterial({
            map: this.textures.tableMat,
            roughness: 0.45,
            metalness: 0.25
        });
        this.tableMesh = new THREE.Mesh(tableGeo, tableMat);
        this.tableMesh.position.y = 0.15;
        this.tableGroup.add(this.tableMesh);

        // Neon Playfield Radiance: soft cyan neon glow over the table surface (focused, zero washout)
        this.tableLight = new THREE.PointLight(0x00d4ff, 0.45, 3.8);
        this.tableLight.position.set(0, 1.0, 0.2);
        this.tableGroup.add(this.tableLight);

        this.buildTableTrim(tableWidth, tableDepth);
        this.buildArcadeHoles();

        this.cabinetGroup.add(this.tableGroup);
        this.buildMarqueeTower();

        this.scene.add(this.cabinetGroup);
        this.updateTablePlane();
    }

    updateTablePlane() {
        if (!this.tableMesh || !this.tableGroup) return;
        const normal = new THREE.Vector3(0, 1, 0).applyEuler(this.tableGroup.rotation);
        const center = new THREE.Vector3();
        this.tableMesh.getWorldPosition(center);
        center.y += 0.15;
        this.tablePlane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, center);
    }

    buildFrontCoinDoor() {
        // Front Face is at z = 2.04, extending from floor y = -1.60 up to front table lip y = 0.96

        // 1. Upper Front Speaker Grille (just beneath the front table lip)
        const speakerPanelGeo = new THREE.BoxGeometry(3.6, 0.36, 0.04);
        const speakerPanelMat = new THREE.MeshStandardMaterial({
            color: 0x1a0f26,
            roughness: 0.6,
            metalness: 0.3
        });
        const speakerPanel = new THREE.Mesh(speakerPanelGeo, speakerPanelMat);
        speakerPanel.position.set(0, 0.72, 2.06);
        this.cabinetGroup.add(speakerPanel);

        // Acoustic speaker horizontal vents
        const ventMat = new THREE.MeshBasicMaterial({ color: 0x090510 });
        for (let i = -2; i <= 2; i++) {
            const vent = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.03, 0.05), ventMat);
            vent.position.set(0, 0.72 + i * 0.065, 2.065);
            this.cabinetGroup.add(vent);
        }

        // 2. Vintage Arcade Coin Door Panel
        const doorGeo = new THREE.BoxGeometry(1.7, 1.5, 0.06);
        const doorMat = new THREE.MeshStandardMaterial({
            color: 0x0c0716,
            metalness: 0.85,
            roughness: 0.25
        });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, -0.32, 2.06);
        this.cabinetGroup.add(door);

        // Coin Door Inner Frame & Accent
        const doorBorder = new THREE.Mesh(
            new THREE.BoxGeometry(1.74, 1.54, 0.03),
            new THREE.MeshStandardMaterial({ color: 0x221330, roughness: 0.5 })
        );
        doorBorder.position.set(0, -0.32, 2.045);
        this.cabinetGroup.add(doorBorder);

        this.coinButtons = [];
        [-0.42, 0.42].forEach(offset => {
            // Coin Entry Bezel
            const slotFrame = new THREE.Mesh(
                new THREE.BoxGeometry(0.36, 0.52, 0.06),
                new THREE.MeshStandardMaterial({ color: 0x221633, metalness: 0.9 })
            );
            slotFrame.position.set(offset, 0.12, 2.10);
            this.cabinetGroup.add(slotFrame);

            // Glowing Coin Reject Button (Orange/Red illuminated)
            const insertBtn = new THREE.Mesh(
                new THREE.BoxGeometry(0.26, 0.26, 0.05),
                new THREE.MeshBasicMaterial({ color: 0xff3b00 })
            );
            insertBtn.position.set(offset, 0.12, 2.135);
            insertBtn.userData = { isCoinButton: true };
            this.cabinetGroup.add(insertBtn);
            this.coinButtons.push(insertBtn);

            // Coin Return Pocket at bottom
            const pocket = new THREE.Mesh(
                new THREE.BoxGeometry(0.32, 0.32, 0.05),
                new THREE.MeshStandardMaterial({ color: 0x08040f, metalness: 0.9, roughness: 0.4 })
            );
            pocket.position.set(offset, -0.72, 2.09);
            this.cabinetGroup.add(pocket);
        });

        // Center Key Lock
        const lock = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.04, 16),
            new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95 })
        );
        lock.rotation.x = Math.PI / 2;
        lock.position.set(0, 0.22, 2.10);
        this.cabinetGroup.add(lock);
    }

    // Completely eliminates Z-fighting: outer protective bumpers with elevated, non-flickering neon halo
    buildTableTrim(w, d) {
        const trimMat = new THREE.MeshStandardMaterial({
            color: 0x1c102a,
            roughness: 0.3,
            metalness: 0.85
        });

        // Anti-flicker WebGL polygon offset material
        const neonTrimMat = new THREE.MeshBasicMaterial({
            color: 0xff0088,
            polygonOffset: true,
            polygonOffsetFactor: -2.0,
            polygonOffsetUnits: -4.0
        });

        const halfW = w / 2;
        const halfD = d / 2;
        const bThick = 0.12;  // Bumper thickness
        const bHeight = 0.26; // Bumper height
        const bY = 0.17;      // Center Y of bumper (top is at 0.17 + 0.13 = 0.30)
        const neonY = 0.34;   // Center Y of neon strip (rests proudly at y = 0.31..0.37, ZERO collision!)
        const neonSize = 0.06;

        // 1. LEFT & RIGHT BUMPERS + NEON (Surrounding the table externally at ±(halfW + bThick/2))
        const sideBumperGeo = new THREE.BoxGeometry(bThick, bHeight, d + bThick * 2);
        const sideNeonGeo = new THREE.BoxGeometry(neonSize, neonSize, d + bThick * 2);

        [-1, 1].forEach(sign => {
            const posX = sign * (halfW + bThick / 2);

            const bumper = new THREE.Mesh(sideBumperGeo, trimMat);
            bumper.position.set(posX, bY, 0);
            this.tableGroup.add(bumper);

            const neonLine = new THREE.Mesh(sideNeonGeo, neonTrimMat);
            neonLine.position.set(posX, neonY, 0);
            this.tableGroup.add(neonLine);
        });

        // 2. BACK BUMPER (Solid foundation beam supporting the marquee wall)
        const backBumperGeo = new THREE.BoxGeometry(w, bHeight, bThick);
        const backBumper = new THREE.Mesh(backBumperGeo, trimMat);
        backBumper.position.set(0, bY, -(halfD + bThick / 2));
        this.tableGroup.add(backBumper);

        // 3. FRONT BUMPER + NEON (Cleanly separated in front, 0% Z-fighting, 100% visible front holes!)
        const frontBumperGeo = new THREE.BoxGeometry(w, bHeight, bThick);
        const frontBumper = new THREE.Mesh(frontBumperGeo, trimMat);
        frontBumper.position.set(0, bY, (halfD + bThick / 2));
        this.tableGroup.add(frontBumper);

        const frontNeonGeo = new THREE.BoxGeometry(w, neonSize, neonSize);
        const frontNeon = new THREE.Mesh(frontNeonGeo, neonTrimMat);
        frontNeon.position.set(0, neonY, (halfD + bThick / 2));
        this.tableGroup.add(frontNeon);
    }

    // 9 Arcade Holes (Crucial: moles are hidden and invisible until spawned!)
    buildArcadeHoles() {
        const spacingX = 1.15;
        const spacingZ = 1.05;
        const holeRadius = 0.44;

        let index = 0;
        for (let row = -1; row <= 1; row++) {
            for (let col = -1; col <= 1; col++) {
                const posX = col * spacingX;
                const posZ = row * spacingZ;

                const holeGroup = new THREE.Group();
                holeGroup.position.set(posX, 0.33, posZ);

                // Deep inner dark hole cavity
                const cavityGeo = new THREE.CylinderGeometry(holeRadius, holeRadius, 0.8, 24);
                const cavityMat = new THREE.MeshBasicMaterial({ color: 0x020104 });
                const cavity = new THREE.Mesh(cavityGeo, cavityMat);
                cavity.position.y = -0.35;
                holeGroup.add(cavity);

                // Metal ring rim
                const rimGeo = new THREE.RingGeometry(holeRadius - 0.02, holeRadius + 0.12, 32);
                const rimMat = new THREE.MeshStandardMaterial({
                    color: 0x2e1e48,
                    roughness: 0.25,
                    metalness: 0.85,
                    side: THREE.DoubleSide
                });
                const rim = new THREE.Mesh(rimGeo, rimMat);
                rim.rotation.x = -Math.PI / 2;
                rim.position.y = 0.02;
                holeGroup.add(rim);

                // LED Underglow ring: wide and bright so the 9 holes gleam clearly when machine is on
                const ledGeo = new THREE.RingGeometry(holeRadius - 0.09, holeRadius + 0.01, 32);
                const ledMat = new THREE.MeshBasicMaterial({
                    color: 0x00f5ff,
                    side: THREE.DoubleSide
                });
                const ledRing = new THREE.Mesh(ledGeo, ledMat);
                ledRing.rotation.x = -Math.PI / 2;
                ledRing.position.y = 0.025;
                holeGroup.add(ledRing);

                // Mole / Coworker Entity Instance:
                // MUST BE STRICTLY INVISIBLE UNTIL EXPLICITLY SPAWNED
                const mole = this.createMoleEntity(index);
                mole.group.position.set(0, -1.2, 0);
                mole.group.visible = false;
                holeGroup.add(mole.group);

                // Invisible hit cylinder for raycasting
                const hitBoxGeo = new THREE.CylinderGeometry(holeRadius + 0.15, holeRadius + 0.15, 1.2, 16);
                const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
                const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
                hitBox.position.y = 0.3;
                hitBox.userData = { holeIndex: index };
                holeGroup.add(hitBox);

                this.tableGroup.add(holeGroup);

                this.holes.push({
                    index: index,
                    group: holeGroup,
                    hitBox: hitBox,
                    ledRing: ledRing,
                    mole: mole,
                    isUp: false,
                    isTrembling: false,
                    entity: null,
                    timeoutId: null,
                    trembleTimeoutId: null,
                    worldPos: new THREE.Vector3()
                });

                index++;
            }
        }

        // Cache stationary world positions and hit targets once (zero matrix traversal in 60fps render loop)
        this.tableGroup.updateMatrixWorld(true);
        this.holes.forEach(h => {
            h.group.getWorldPosition(h.worldPos);
        });
        this.hitTargets = this.holes.map(h => h.hitBox);
    }

    createMoleEntity(holeIndex) {
        const group = new THREE.Group();

        // 1. Hydraulic Piston Shaft (Polished chrome rod underneath platform)
        const pistonMat = new THREE.MeshStandardMaterial({
            color: 0x99aabb,
            metalness: 0.95,
            roughness: 0.15
        });
        const piston = new THREE.Mesh(
            new THREE.CylinderGeometry(0.10, 0.10, 0.45, 16),
            pistonMat
        );
        piston.position.y = -0.28;
        group.add(piston);

        // Accordion Corrugated Rubber Boot at base of piston
        const bootMat = new THREE.MeshStandardMaterial({
            color: 0x110a1a,
            roughness: 0.85,
            metalness: 0.15
        });
        const boot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.20, 0.25, 0.18, 16),
            bootMat
        );
        boot.position.y = -0.15;
        group.add(boot);

        // 2. Solid Pop-Up Bumper Platform (Chunky Arcade Button / Puck)
        // Cylinder radius 0.38, height 0.14 (fits inside holeRadius 0.44 with 0.06 rim clearance)
        const platformMat = new THREE.MeshStandardMaterial({
            color: 0x241438,
            metalness: 0.85,
            roughness: 0.25
        });
        const platform = new THREE.Mesh(
            new THREE.CylinderGeometry(0.38, 0.39, 0.14, 32),
            platformMat
        );
        platform.position.y = 0.0;
        group.add(platform);

        // Glowing Neon Accent Ring around perimeter of mole platform (dynamic entity color: cyan, green, or yellow)
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const ringMesh = new THREE.Mesh(
            new THREE.TorusGeometry(0.382, 0.016, 10, 32),
            ringMat
        );
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.y = 0.07;
        group.add(ringMesh);

        // 3. Horizontal Token Stamp (Circular Decal laid flat on top of platform)
        // Upright from player perspective: +Y in texture -> -Z (up table), -Y -> +Z (player)
        const stampGeo = new THREE.CircleGeometry(0.364, 32);
        const stampMat = new THREE.MeshStandardMaterial({
            map: this.textures.cruzadoToken,
            transparent: true,
            roughness: 0.30,
            metalness: 0.15,
            polygonOffset: true,
            polygonOffsetFactor: -1.0,
            polygonOffsetUnits: -2.0
        });
        const faceMesh = new THREE.Mesh(stampGeo, stampMat);
        faceMesh.rotation.set(-Math.PI / 2, 0, 0);
        faceMesh.position.set(0, 0.072, 0);
        group.add(faceMesh);

        // 4. Comic Coffee Mug Bonus Model (Pretty, vibrant and cartoon-styled)
        const coffeeGroup = this.createComicCoffeeGroup();
        group.add(coffeeGroup);

        // 5. Comic Docinho Snickers Chocolate Bar Model (+15s)
        const docinhoGroup = this.createComicDocinhoGroup();
        group.add(docinhoGroup);

        // 6. Comic 2 E-Mails Model (Two white business envelopes from HR & Director, -15s penalty!)
        const emailGroup = this.createComicEmailsGroup();
        group.add(emailGroup);

        // 7. Comic AC Remote Model (Freezing 15°C hazard, Luana hates cold!)
        const acGroup = this.createComicAcRemoteGroup();
        group.add(acGroup);

        return {
            group: group,
            faceMesh: faceMesh,
            ringMesh: ringMesh,
            coffeeGroup: coffeeGroup,
            docinhoGroup: docinhoGroup,
            emailGroup: emailGroup,
            acGroup: acGroup
        };
    }

    createComicCoffeeGroup() {
        const coffeeGroup = new THREE.Group();
        coffeeGroup.visible = false;

        const mugGroup = new THREE.Group();
        // Resting on the mole platform surface (y = 0.07)
        mugGroup.position.set(0, 0.07, 0);

        // Crucial Player Angle of Vision Calibration:
        // The player camera views the table from overhead at ~41-42 degrees.
        // Tilting backward (rotation.x = -0.30) elevates the front faceted cylinder wall so it is clearly
        // visible in profile, while still allowing the player to look across the rim into the dark coffee!
        // rotation.y = 0.45 turns the angular handle outward to the left-front for maximum silhouette readability.
        mugGroup.rotation.x = -0.30;
        mugGroup.rotation.y = 0.45;

        // 1. Off-White Porcelain Material (Exact match to Reference 1)
        const porcelainMat = new THREE.MeshStandardMaterial({
            color: 0xf2f0eb, // Clean porcelain off-white
            roughness: 0.30,
            metalness: 0.06,
            flatShading: true
        });

        // 2. Faceted Low-Poly Mug Body (14-sided cylinder, open-ended so interior is hollow)
        const bodyGeo = new THREE.CylinderGeometry(0.19, 0.14, 0.32, 14, 1, true);
        const body = new THREE.Mesh(bodyGeo, porcelainMat);
        body.position.y = 0.16;
        mugGroup.add(body);

        // 3. Low-Poly Base Foot Ring (solid base)
        const footGeo = new THREE.CylinderGeometry(0.14, 0.125, 0.03, 14);
        const foot = new THREE.Mesh(footGeo, porcelainMat);
        foot.position.y = 0.015;
        mugGroup.add(foot);

        // 4. Hollow Beveled Top Lip Rim (14-sided ring framing the opening)
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0xf2f0eb,
            roughness: 0.30,
            metalness: 0.06,
            flatShading: true,
            side: THREE.DoubleSide
        });
        const rimRing = new THREE.Mesh(new THREE.RingGeometry(0.155, 0.195, 14), rimMat);
        rimRing.rotation.x = -Math.PI / 2;
        rimRing.position.y = 0.32;
        mugGroup.add(rimRing);

        // Outer rim collar for physical depth
        const rimCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.190, 0.02, 14, 1, true), porcelainMat);
        rimCollar.position.y = 0.31;
        mugGroup.add(rimCollar);

        // 5. Rich Dark Roasted Coffee Liquid Inside (Prominently visible dark brown surface)
        const coffeeMat = new THREE.MeshStandardMaterial({
            color: 0x3d1b06, // Deep rich roasted coffee brown
            roughness: 0.16,
            metalness: 0.10,
            flatShading: true
        });

        // Top liquid surface disc (flush just under rim, zero obstruction)
        const liquidDisc = new THREE.Mesh(
            new THREE.CircleGeometry(0.160, 14),
            coffeeMat
        );
        liquidDisc.rotation.x = -Math.PI / 2;
        liquidDisc.position.y = 0.312;
        mugGroup.add(liquidDisc);

        // Solid inner volume of liquid
        const liquidVol = new THREE.Mesh(
            new THREE.CylinderGeometry(0.158, 0.130, 0.18, 14),
            coffeeMat
        );
        liquidVol.position.y = 0.22;
        mugGroup.add(liquidVol);

        // 6. Angular Low-Poly Geometric Handle (Exact match to Reference 1)
        // Positioned on the left side: horizontal top strut, diagonal corners, vertical grip, bottom strut
        const handleGroup = new THREE.Group();
        handleGroup.position.set(-0.19, 0.16, 0);

        // Top horizontal segment
        const topStrut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.034, 0.034), porcelainMat);
        topStrut.position.set(-0.03, 0.09, 0);
        topStrut.rotation.z = -0.15;
        handleGroup.add(topStrut);

        // Upper diagonal corner
        const topDiag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.034, 0.034), porcelainMat);
        topDiag.position.set(-0.07, 0.075, 0);
        topDiag.rotation.z = Math.PI / 4;
        handleGroup.add(topDiag);

        // Outer vertical grip
        const gripStrut = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.16, 0.034), porcelainMat);
        gripStrut.position.set(-0.085, 0.01, 0);
        handleGroup.add(gripStrut);

        // Lower diagonal corner
        const btmDiag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.034, 0.034), porcelainMat);
        btmDiag.position.set(-0.07, -0.055, 0);
        btmDiag.rotation.z = -Math.PI / 4;
        handleGroup.add(btmDiag);

        // Bottom return strut
        const btmStrut = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.034, 0.034), porcelainMat);
        btmStrut.position.set(-0.035, -0.07, 0);
        btmStrut.rotation.z = 0.25;
        handleGroup.add(btmStrut);

        mugGroup.add(handleGroup);
        coffeeGroup.add(mugGroup);
        return coffeeGroup;
    }

    createComicDocinhoGroup() {
        const docinhoGroup = new THREE.Group();
        docinhoGroup.visible = false;

        // Low-poly Wrapped Party Candy ("Docinho / Bala de Festa", Exact match to Reference 2)
        const candyGroup = new THREE.Group();
        // Resting on the platform surface
        candyGroup.position.set(0, 0.16, 0);
        // Tilt toward the overhead camera so both top and front facets are in full view
        candyGroup.rotation.x = 0.38;
        candyGroup.rotation.y = 0.15; // Jaunty diagonal angle (matching Reference 2)

        // Materials: Vibrant Candy Pink & Festive Golden Yellow
        const pinkMat = new THREE.MeshStandardMaterial({
            color: 0xd91656, // Vibrant festive candy pink/ruby
            roughness: 0.32,
            metalness: 0.06,
            flatShading: true
        });

        const goldMat = new THREE.MeshStandardMaterial({
            color: 0xffbe0b, // Golden yellow wrapper
            roughness: 0.32,
            metalness: 0.14,
            flatShading: true
        });

        // 1. Central Striped Candy Body (Faceted concentric low-poly barrel along X-axis)
        // Alternating bands of pink and gold stripes matching Reference 2:
        const candyBody = new THREE.Group();

        // Center pink band
        const cCenterGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.065, 12);
        cCenterGeo.rotateZ(Math.PI / 2);
        candyBody.add(new THREE.Mesh(cCenterGeo, pinkMat));

        // Yellow stripe left
        const cYellowLGeo = new THREE.CylinderGeometry(0.145, 0.160, 0.055, 12);
        cYellowLGeo.rotateZ(Math.PI / 2);
        const yL = new THREE.Mesh(cYellowLGeo, goldMat);
        yL.position.x = -0.058;
        candyBody.add(yL);

        // Yellow stripe right
        const cYellowRGeo = new THREE.CylinderGeometry(0.160, 0.145, 0.055, 12);
        cYellowRGeo.rotateZ(Math.PI / 2);
        const yR = new THREE.Mesh(cYellowRGeo, goldMat);
        yR.position.x = 0.058;
        candyBody.add(yR);

        // Pink end cap left
        const cPinkLGeo = new THREE.CylinderGeometry(0.095, 0.145, 0.045, 12);
        cPinkLGeo.rotateZ(Math.PI / 2);
        const pL = new THREE.Mesh(cPinkLGeo, pinkMat);
        pL.position.x = -0.105;
        candyBody.add(pL);

        // Pink end cap right
        const cPinkRGeo = new THREE.CylinderGeometry(0.145, 0.095, 0.045, 12);
        cPinkRGeo.rotateZ(Math.PI / 2);
        const pR = new THREE.Mesh(cPinkRGeo, pinkMat);
        pR.position.x = 0.105;
        candyBody.add(pR);

        candyGroup.add(candyBody);

        // 2. Twisted Pinched Wrapper Collars (Left & Right seams)
        const collarLGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.035, 8);
        collarLGeo.rotateZ(Math.PI / 2);
        const collarL = new THREE.Mesh(collarLGeo, goldMat);
        collarL.position.x = -0.14;
        candyGroup.add(collarL);

        const collarRGeo = new THREE.CylinderGeometry(0.08, 0.04, 0.035, 8);
        collarRGeo.rotateZ(Math.PI / 2);
        const collarR = new THREE.Mesh(collarRGeo, goldMat);
        collarR.position.x = 0.14;
        candyGroup.add(collarR);

        // 3. Flared Pleated Wrapper Wings / Tails (Left & Right, Reference 2)
        const makeWrapperTail = (isLeft) => {
            const tailGroup = new THREE.Group();
            const dir = isLeft ? -1 : 1;
            tailGroup.position.set(dir * 0.155, 0, 0);

            // Flared faceted wrapper fan blades:
            // Upper blade
            const upperGeo = new THREE.BoxGeometry(0.13, 0.015, 0.11);
            const upper = new THREE.Mesh(upperGeo, goldMat);
            upper.position.set(dir * 0.065, 0.045, 0.02);
            upper.rotation.set(0.15, dir * 0.20, dir * 0.40);
            tailGroup.add(upper);

            // Center main blade (widest)
            const midGeo = new THREE.BoxGeometry(0.15, 0.015, 0.13);
            const mid = new THREE.Mesh(midGeo, goldMat);
            mid.position.set(dir * 0.075, 0.005, 0.0);
            mid.rotation.set(-0.10, dir * 0.05, dir * 0.10);
            tailGroup.add(mid);

            // Lower blade
            const lowerGeo = new THREE.BoxGeometry(0.13, 0.015, 0.10);
            const lower = new THREE.Mesh(lowerGeo, goldMat);
            lower.position.set(dir * 0.065, -0.035, -0.02);
            lower.rotation.set(-0.20, dir * -0.25, dir * -0.35);
            tailGroup.add(lower);

            return tailGroup;
        };

        candyGroup.add(makeWrapperTail(true));  // Left wrapper tail
        candyGroup.add(makeWrapperTail(false)); // Right wrapper tail

        docinhoGroup.add(candyGroup);
        return docinhoGroup;
    }

    // 3D Low-Poly Two White Business Envelopes ("Vou mandar dois e-mails!" - RH & Diretoria)
    createComicEmailsGroup() {
        const emailsGroup = new THREE.Group();
        emailsGroup.visible = false;

        const mailRig = new THREE.Group();
        mailRig.position.set(0, 0.14, 0);

        // Angled up toward the player camera (~42 deg overhead) for perfect readability
        mailRig.rotation.x = -0.52;
        mailRig.rotation.y = 0.06;

        // Materials:
        // Front envelope paper (crisp white)
        const paperFrontMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.45,
            metalness: 0.05,
            flatShading: true
        });

        // Rear envelope paper (subtle off-white tone for 3D depth separation)
        const paperBackMat = new THREE.MeshStandardMaterial({
            color: 0xeeeff4,
            roughness: 0.50,
            metalness: 0.05,
            flatShading: true
        });

        // Danger Red for the warning badge, postage stamp, and wax seal
        const redMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
        // Subtle grey for address lines and flap creases
        const inkLineMat = new THREE.MeshBasicMaterial({ color: 0x828292 });
        const flapCreaseMat = new THREE.MeshBasicMaterial({ color: 0xbebec8 });

        const envWidth = 0.54;
        const envHeight = 0.28;
        const envThick = 0.016;

        // ====================================================================
        // ENVELOPE 1: Rear Envelope (Tilted +12 deg right, showing rear flap)
        // ====================================================================
        const env1 = new THREE.Group();
        env1.position.set(0.05, 0.18, -0.030);
        env1.rotation.z = 0.16;

        // Base envelope body
        const env1Body = new THREE.Mesh(
            new THREE.BoxGeometry(envWidth, envHeight, envThick),
            paperBackMat
        );
        env1.add(env1Body);

        // Triangular folded flap on rear envelope
        const flapGeo = new THREE.BufferGeometry();
        const hw = envWidth / 2 - 0.012;
        const hh = envHeight / 2 - 0.005;
        const fv = new Float32Array([
            -hw, hh, 0.010,
            hw, hh, 0.010,
            0.0, -0.015, 0.013
        ]);
        flapGeo.setAttribute('position', new THREE.BufferAttribute(fv, 3));
        flapGeo.computeVertexNormals();
        const flapMesh = new THREE.Mesh(flapGeo, new THREE.MeshStandardMaterial({
            color: 0xe0e2ea,
            roughness: 0.50,
            metalness: 0.05,
            side: THREE.DoubleSide
        }));
        env1.add(flapMesh);

        // Flap crease line across the top edge
        const topCrease = new THREE.Mesh(
            new THREE.BoxGeometry(envWidth - 0.02, 0.009, 0.003),
            flapCreaseMat
        );
        topCrease.position.set(0, hh, 0.011);
        env1.add(topCrease);

        // Red Wax Seal / Urgent HR Dot at the tip of the flap
        const seal = new THREE.Mesh(
            new THREE.CylinderGeometry(0.030, 0.030, 0.010, 16),
            redMat
        );
        seal.rotation.x = Math.PI / 2;
        seal.position.set(0, -0.015, 0.016);
        env1.add(seal);

        mailRig.add(env1);

        // ====================================================================
        // ENVELOPE 2: Front Envelope (Tilted -10 deg left, showing front address)
        // ====================================================================
        const env2 = new THREE.Group();
        env2.position.set(-0.05, 0.14, 0.030);
        env2.rotation.z = -0.12;

        // Base envelope body
        const env2Body = new THREE.Mesh(
            new THREE.BoxGeometry(envWidth, envHeight, envThick),
            paperFrontMat
        );
        env2.add(env2Body);

        // Postage Stamp in top-right corner
        const stampBox = new THREE.Mesh(
            new THREE.BoxGeometry(0.075, 0.088, 0.005),
            redMat
        );
        stampBox.position.set(envWidth / 2 - 0.065, envHeight / 2 - 0.065, 0.011);
        env2.add(stampBox);

        // Inner white center of stamp
        const stampInner = new THREE.Mesh(
            new THREE.BoxGeometry(0.052, 0.064, 0.003),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        stampInner.position.set(envWidth / 2 - 0.065, envHeight / 2 - 0.065, 0.013);
        env2.add(stampInner);

        // 3 Address Lines on lower left
        const lineLengths = [0.24, 0.19, 0.14];
        lineLengths.forEach((len, idx) => {
            const line = new THREE.Mesh(
                new THREE.BoxGeometry(len, 0.012, 0.003),
                inkLineMat
            );
            line.position.set(-0.09 + (0.24 - len) / 2, -0.02 - idx * 0.038, 0.011);
            env2.add(line);
        });

        // "RH / DIREÇÃO" Red Warning Header Bar on front envelope
        const rhBar = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.042, 0.004),
            redMat
        );
        rhBar.position.set(-0.12, envHeight / 2 - 0.055, 0.011);
        env2.add(rhBar);

        mailRig.add(env2);
        emailsGroup.add(mailRig);

        return emailsGroup;
    }

    // 3D Harmonized Air Conditioner Remote Control ("Ar no 15°C! Luana odeia frio!")
    // Faithfully constructed based on reference photos: sleek, single-piece rounded white casing,
    // illuminated 15°C LCD screen, amber power button, circular navigation dial with OK, and pill function buttons.
    createComicAcRemoteGroup() {
        const acGroup = new THREE.Group();
        acGroup.visible = false;

        const remoteRig = new THREE.Group();
        // Resting on mole platform surface with perfect elevation and camera angle
        remoteRig.position.set(0, 0.20, -0.01);

        // Player Camera Angle Calibration:
        // Overhead camera views table at ~42 deg.
        // Positive rotation.x (+0.70 rad) tilts the remote face forward directly towards player's eyes!
        remoteRig.rotation.x = 0.70;
        remoteRig.rotation.y = 0.04;
        remoteRig.rotation.z = -0.02;
        remoteRig.scale.set(1.18, 1.18, 1.18);

        // --- Materials ---
        // 1. Crisp Appliance White Plastic (Unified, single-body finish)
        const whitePlasticMat = new THREE.MeshStandardMaterial({
            color: 0xf7f9fc, // Clean appliance white
            roughness: 0.26,
            metalness: 0.02,
            flatShading: false
        });

        // 2. Dark charcoal recessed display bezel
        const bezelMat = new THREE.MeshStandardMaterial({
            color: 0x2b323c,
            roughness: 0.45,
            metalness: 0.08
        });

        // 3. Amber Orange Power Button (Signature feature from reference photo!)
        const powerMat = new THREE.MeshStandardMaterial({
            color: 0xff9900,
            emissive: 0xff5500,
            emissiveIntensity: 0.35,
            roughness: 0.22,
            metalness: 0.06
        });

        // 4. Clean Soft Gray for standard plastic buttons
        const buttonMat = new THREE.MeshStandardMaterial({
            color: 0xe2e6ed,
            roughness: 0.32,
            metalness: 0.04
        });

        // 5. Center OK Button
        const okButtonMat = new THREE.MeshStandardMaterial({
            color: 0xf1f3f7,
            roughness: 0.25,
            metalness: 0.04
        });

        // 6. Navigation Torus Dial Ring
        const navDialMat = new THREE.MeshStandardMaterial({
            color: 0xe6eaf0,
            roughness: 0.30,
            metalness: 0.04
        });

        // 7. Dark ink for button markings & directional arrows
        const darkInkMat = new THREE.MeshBasicMaterial({ color: 0x3d4754 });

        // --- A. Harmonious Single-Piece Rounded Chassis ---
        // Seamless 2D pill/rounded-box path with smooth rounded corners at top and bottom
        const w = 0.28;   // width along X
        const l = 0.65;   // total length along Z
        const cr = 0.055; // corner radius
        const hw = w / 2;
        const hl = l / 2;

        const bodyShape = new THREE.Shape();
        bodyShape.moveTo(-hw + cr, -hl);
        bodyShape.lineTo(hw - cr, -hl);
        bodyShape.quadraticCurveTo(hw, -hl, hw, -hl + cr);
        bodyShape.lineTo(hw, hl - cr);
        bodyShape.quadraticCurveTo(hw, hl, hw - cr, hl);
        bodyShape.lineTo(-hw + cr, hl);
        bodyShape.quadraticCurveTo(-hw, hl, -hw, hl - cr);
        bodyShape.lineTo(-hw, -hl + cr);
        bodyShape.quadraticCurveTo(-hw, -hl, -hw + cr, -hl);

        const extrudeSettings = {
            depth: 0.040,      // body thickness
            bevelEnabled: true,
            bevelSegments: 4,  // silky smooth curvature
            steps: 1,
            bevelSize: 0.012,  // rounded soft bevel on front and rear edges
            bevelThickness: 0.012
        };

        const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
        bodyGeo.center(); // Center pivot cleanly at (0, 0, 0)

        const bodyMesh = new THREE.Mesh(bodyGeo, whitePlasticMat);
        bodyMesh.rotation.x = Math.PI / 2;
        remoteRig.add(bodyMesh);

        // Front face surface is at y = 0.032
        const frontY = 0.032;

        // Hairline battery compartment seam across the lower section (matching reference)
        const seamLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.002, 0.003),
            new THREE.MeshBasicMaterial({ color: 0xc4cad4 })
        );
        seamLine.position.set(0, frontY + 0.0005, 0.21);
        remoteRig.add(seamLine);

        // --- B. The LCD Display Screen (Freezing 15°C) ---
        const lcdWidth = 0.20;
        const lcdLength = 0.15;
        const lcdZ = -0.155;

        // Recessed dark bezel
        const bezel = new THREE.Mesh(
            new THREE.BoxGeometry(lcdWidth + 0.014, 0.004, lcdLength + 0.014),
            bezelMat
        );
        bezel.position.set(0, frontY + 0.001, lcdZ);
        remoteRig.add(bezel);

        // High-contrast LCD face screen (shows 15°C, auto fan, and freeze alert)
        const lcdScreen = new THREE.Mesh(
            new THREE.PlaneGeometry(lcdWidth, lcdLength),
            new THREE.MeshBasicMaterial({
                map: this.textures.acLcd
            })
        );
        lcdScreen.rotation.x = -Math.PI / 2;
        lcdScreen.position.set(0, frontY + 0.0035, lcdZ);
        remoteRig.add(lcdScreen);

        // Glossy protective acrylic glass lens overlay
        const glassOverlay = new THREE.Mesh(
            new THREE.PlaneGeometry(lcdWidth + 0.006, lcdLength + 0.006),
            new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.06,
                metalness: 0.25,
                transparent: true,
                opacity: 0.18
            })
        );
        glassOverlay.rotation.x = -Math.PI / 2;
        glassOverlay.position.set(0, frontY + 0.0045, lcdZ);
        remoteRig.add(glassOverlay);

        // --- C. Buttons ---
        // Row 1: Top control buttons (under screen: Amber Power, Mode, Sleep)
        const row1Z = -0.032;

        // Amber Power Button (left, signature feature!)
        const powerBtn = new THREE.Mesh(
            new THREE.CylinderGeometry(0.024, 0.024, 0.012, 24),
            powerMat
        );
        powerBtn.position.set(-0.068, frontY + 0.006, row1Z);
        remoteRig.add(powerBtn);

        // Power ring icon
        const pMark = new THREE.Mesh(
            new THREE.RingGeometry(0.009, 0.013, 16),
            new THREE.MeshBasicMaterial({ color: 0x3a2000 })
        );
        pMark.rotation.x = -Math.PI / 2;
        pMark.position.set(-0.068, frontY + 0.0125, row1Z);
        remoteRig.add(pMark);

        // Mode Button (center)
        const modeBtn = new THREE.Mesh(
            new THREE.CylinderGeometry(0.022, 0.022, 0.010, 24),
            buttonMat
        );
        modeBtn.position.set(0.0, frontY + 0.005, row1Z);
        remoteRig.add(modeBtn);

        // Sleep/Moon Button (right)
        const sleepBtn = new THREE.Mesh(
            new THREE.CylinderGeometry(0.020, 0.020, 0.010, 24),
            buttonMat
        );
        sleepBtn.position.set(0.068, frontY + 0.005, row1Z);
        remoteRig.add(sleepBtn);

        // Row 2: Central Navigation D-Pad & OK Button
        const navZ = 0.058;

        // Outer circular navigation ring
        const navRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.046, 0.014, 12, 32),
            navDialMat
        );
        navRing.rotation.x = Math.PI / 2;
        navRing.position.set(0.0, frontY + 0.005, navZ);
        remoteRig.add(navRing);

        // Up arrow on nav ring (∧)
        const upArrow = new THREE.Mesh(
            new THREE.BoxGeometry(0.014, 0.003, 0.003),
            darkInkMat
        );
        upArrow.position.set(0.0, frontY + 0.011, navZ - 0.045);
        remoteRig.add(upArrow);

        // Down arrow on nav ring (∨)
        const downArrow = new THREE.Mesh(
            new THREE.BoxGeometry(0.014, 0.003, 0.003),
            darkInkMat
        );
        downArrow.position.set(0.0, frontY + 0.011, navZ + 0.045);
        remoteRig.add(downArrow);

        // Center OK Button
        const okBtn = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.025, 0.012, 24),
            okButtonMat
        );
        okBtn.position.set(0.0, frontY + 0.007, navZ);
        remoteRig.add(okBtn);

        // Row 3: Lower Function Buttons (Fan & Swing)
        const row3Z = 0.138;
        [-0.052, 0.052].forEach(x => {
            const pill = new THREE.Mesh(
                new THREE.CylinderGeometry(0.018, 0.018, 0.009, 20),
                buttonMat
            );
            pill.position.set(x, frontY + 0.004, row3Z);
            remoteRig.add(pill);
        });

        // Row 4: Bottom Pill Buttons (Turbo, LED, Clean)
        const row4Z = 0.178;
        [-0.066, 0.0, 0.066].forEach(x => {
            const miniPill = new THREE.Mesh(
                new THREE.BoxGeometry(0.046, 0.008, 0.018),
                buttonMat
            );
            miniPill.position.set(x, frontY + 0.004, row4Z);
            remoteRig.add(miniPill);
        });

        acGroup.add(remoteRig);
        return acGroup;
    }

    buildMarqueeTower() {
        const marqueeGroup = new THREE.Group();
        // Authentic 80s arcade backboard (wall):
        // Positioned flush along the back edge of the table (z = -1.82, y = 5.25)
        // Standing plumb, perfectly aligned: bottom neon frame rests right on the table lip with zero penetration!
        marqueeGroup.position.set(0, 5.25, -1.82);
        marqueeGroup.rotation.x = 0.0;

        // Exact dimensions tailored to logo.jpg (aspect ratio: 646 x 1024)
        const logoWidth = 3.70;
        const logoHeight = 5.865; // 3.70 * (1024 / 646) - perfectly preserved aspect ratio
        const trimThick = 0.08;
        const halfW = logoWidth / 2;
        const halfH = logoHeight / 2;
        const frameW = logoWidth + trimThick * 2;
        const frameH = logoHeight + trimThick * 2;

        // 1. Back Casing Box (matching exact dimensions of logo + neon border)
        const frameGeo = new THREE.BoxGeometry(frameW, frameH, 0.40);
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x11081e,
            roughness: 0.45,
            metalness: 0.25
        });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        marqueeGroup.add(frame);

        // 2. Glowing Neon Pink Border Frame (Hugging logo.jpg directly with ZERO gap!)
        const pillarMat = new THREE.MeshBasicMaterial({ color: 0xff0088 });

        // Left Neon Pillar
        const vTrimGeo = new THREE.BoxGeometry(trimThick, frameH, trimThick);
        const leftPillar = new THREE.Mesh(vTrimGeo, pillarMat);
        leftPillar.position.set(-(halfW + trimThick / 2), 0, 0.22);
        marqueeGroup.add(leftPillar);

        // Right Neon Pillar
        const rightPillar = new THREE.Mesh(vTrimGeo, pillarMat);
        rightPillar.position.set(+(halfW + trimThick / 2), 0, 0.22);
        marqueeGroup.add(rightPillar);

        // Top Neon Trim
        const hTrimGeo = new THREE.BoxGeometry(frameW, trimThick, trimThick);
        const topTrim = new THREE.Mesh(hTrimGeo, pillarMat);
        topTrim.position.set(0, +(halfH + trimThick / 2), 0.22);
        marqueeGroup.add(topTrim);

        // Bottom Neon Trim
        const botTrim = new THREE.Mesh(hTrimGeo, pillarMat);
        botTrim.position.set(0, -(halfH + trimThick / 2), 0.22);
        marqueeGroup.add(botTrim);

        // 3. Illuminated Backlit Marquee Artwork Panel (Crisp translite: 100% original contrast & pure blacks!)
        const logoGeo = new THREE.PlaneGeometry(logoWidth, logoHeight);
        const logoMat = new THREE.MeshBasicMaterial({
            map: this.textures.logoArt,
            side: THREE.FrontSide
        });
        const logoMesh = new THREE.Mesh(logoGeo, logoMat);
        logoMesh.position.set(0, 0, 0.21);
        marqueeGroup.add(logoMesh);

        // 4. Marquee Neon Spill (Gentle hot-pink halo spill onto cabinet edges, artwork stays unwashed!)
        this.marqueeLight = new THREE.PointLight(0xff0077, 0.70, 4.5);
        this.marqueeLight.position.set(0, halfH * 0.7, 0.35);
        marqueeGroup.add(this.marqueeLight);

        this.cabinetGroup.add(marqueeGroup);
    }

    // 4. Build Luana's Sledgehammer (Scaled up, Horizontal 1st-person grip, Flipped so Oval Striking Face hits!)
    buildLuanaHammer() {
        this.hammerGroup = new THREE.Group();

        // 1. Mallet Head (Chunky & Scaled Up ~25%-30% bigger as requested!)
        // Radius 0.24 (diameter 0.48), Height 0.70
        const headGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.70, 24);
        const headMat = new THREE.MeshStandardMaterial({
            color: 0x161620,
            metalness: 0.92,
            roughness: 0.25
        });
        const head = new THREE.Mesh(headGeo, headMat);
        this.hammerGroup.add(head);

        // 2. THE OVAL STRIKING FACE (Flipped to Striking End: y = +0.35!)
        // This is the prominent "oval part" that strikes the mole directly!
        const strikeCapGeo = new THREE.CylinderGeometry(0.26, 0.24, 0.08, 24);
        const strikeCapMat = new THREE.MeshStandardMaterial({
            color: 0x2e1b42,
            metalness: 0.95,
            roughness: 0.18
        });
        const strikeCap = new THREE.Mesh(strikeCapGeo, strikeCapMat);
        strikeCap.position.set(0, 0.35, 0);
        this.hammerGroup.add(strikeCap);

        // Glowing Neon Pink Striking Rune Plate on the striking face (oval perspective)
        const runeFaceMat = new THREE.MeshBasicMaterial({ color: 0xff0077 });
        const runeRing = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.22, 24), runeFaceMat);
        runeRing.rotation.x = -Math.PI / 2; // Facing outward towards player & target!
        runeRing.position.set(0, 0.391, 0);
        this.hammerGroup.add(runeRing);

        // Inner glowing rune center dot
        const runeDot = new THREE.Mesh(new THREE.CircleGeometry(0.048, 16), runeFaceMat);
        runeDot.rotation.x = -Math.PI / 2;
        runeDot.position.set(0, 0.391, 0);
        this.hammerGroup.add(runeDot);

        // Outer Neon Pink Glowing Accent Rim around the striking cap
        const strikingRim = new THREE.Mesh(
            new THREE.TorusGeometry(0.262, 0.015, 8, 24),
            runeFaceMat
        );
        strikingRim.rotation.x = Math.PI / 2;
        strikingRim.position.set(0, 0.35, 0);
        this.hammerGroup.add(strikingRim);

        // 3. Rear Counterweight Crown with Chrome Spikes (Flipped to back: y = -0.35!)
        const rearCapGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.07, 24);
        const rearCap = new THREE.Mesh(rearCapGeo, strikeCapMat);
        rearCap.position.set(0, -0.35, 0);
        this.hammerGroup.add(rearCap);

        // 4 Chrome Spikes on Rear Counterweight Crown
        const spikeGeo = new THREE.ConeGeometry(0.05, 0.14, 8);
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.95, roughness: 0.1 });
        [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]].forEach(([sx, sz]) => {
            const spike = new THREE.Mesh(spikeGeo, spikeMat);
            spike.position.set(sx, -0.42, sz);
            spike.rotation.x = Math.PI; // Pointing outward/backward
            this.hammerGroup.add(spike);
        });

        // 4. Central Collar Band & Glowing Torus
        const centerCollar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.26, 0.26, 0.12, 24),
            new THREE.MeshStandardMaterial({ color: 0x3d1858, metalness: 0.85, roughness: 0.3 })
        );
        this.hammerGroup.add(centerCollar);

        const centerRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.264, 0.018, 8, 24),
            runeFaceMat
        );
        centerRing.rotation.x = Math.PI / 2;
        this.hammerGroup.add(centerRing);

        // 5. Horizontal Handle (Extending backward towards player: length 1.50)
        const handleLength = 1.50;
        const handleGeo = new THREE.CylinderGeometry(0.050, 0.060, handleLength, 16);
        const handleMat = new THREE.MeshStandardMaterial({
            color: 0x22132e,
            roughness: 0.75,
            metalness: 0.3
        });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.rotation.x = Math.PI / 2; // Lies horizontally along Z-axis towards player
        handle.position.set(0, 0, handleLength / 2);
        this.hammerGroup.add(handle);

        // Silver Accent Rings along handle (before rubber grip)
        const gripRingGeo = new THREE.TorusGeometry(0.066, 0.014, 8, 16);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9 });
        [0.45, 0.68].forEach(z => {
            const ring = new THREE.Mesh(gripRingGeo, ringMat);
            ring.position.set(0, 0, z);
            this.hammerGroup.add(ring);
        });

        // 6. Black-ish Ergonomic Rubber Grip (Unified, permanent part of the hammer at all times!)
        const gripGeo = new THREE.CylinderGeometry(0.088, 0.098, 0.62, 16);
        const gripMat = new THREE.MeshStandardMaterial({
            color: 0x140e1a,
            roughness: 0.90,
            metalness: 0.15
        });
        const rubberGrip = new THREE.Mesh(gripGeo, gripMat);
        rubberGrip.rotation.x = Math.PI / 2;
        rubberGrip.position.set(0, 0, 1.05);
        this.hammerGroup.add(rubberGrip);

        // Gothic Heavy Pommel at end of handle
        const pommelGeo = new THREE.CylinderGeometry(0.078, 0.052, 0.12, 16);
        const pommelMat = new THREE.MeshStandardMaterial({ color: 0x442266, metalness: 0.9 });
        const pommel = new THREE.Mesh(pommelGeo, pommelMat);
        pommel.rotation.x = Math.PI / 2;
        pommel.position.set(0, 0, handleLength);
        this.hammerGroup.add(pommel);

        // Default resting state: resting quietly down on the table at the front end, like someone left it there after playing!
        // Positioned along the front hazard warning area, 100% free of holes and bumpers (zero texture invasion)
        this.tableGroup.updateMatrixWorld(true);
        const localRestingPos = new THREE.Vector3(0.60, 0.54, 1.70);
        this.restingHammerPos = this.tableGroup.localToWorld(localRestingPos.clone());
        this.restingHammerRot = new THREE.Euler(0.26, -1.20, 0.0);

        this.hammerGroup.position.copy(this.restingHammerPos);
        this.hammerGroup.rotation.copy(this.restingHammerRot);

        this.scene.add(this.hammerGroup);
    }

    // ========================================================================
    // 5. MOLE IMPACT FEEDBACK (Clean, no heavy 3D debris or shockwaves)
    // ========================================================================
    triggerHeadExplosion(hole, entity) {
        this.explodedHeads++;

        if (entity.type === 'sena') {
            // Silence normal rewarding explosion and play ONLY the comedic fart sound!
            this.sound.playFartSound();
            hole.ledRing.material.color.setHex(0xff0033); // Danger RED LED ring flash
            setTimeout(() => {
                if (hole.ledRing) hole.ledRing.material.color.setHex(0x00f0ff);
            }, 300);
        } else if (entity.type === 'email') {
            this.sound.playEmailAlert();
            hole.ledRing.material.color.setHex(0xff0033); // Danger RED LED ring flash
            setTimeout(() => {
                if (hole.ledRing) hole.ledRing.material.color.setHex(0x00f0ff);
            }, 350);
        } else if (entity.type === 'ac') {
            this.sound.playAcFreezeSound();
            hole.ledRing.material.color.setHex(0x00f0ff); // Frosty cyan LED ring flash
            setTimeout(() => {
                if (hole.ledRing) hole.ledRing.material.color.setHex(0x00f0ff);
            }, 350);
        } else {
            this.sound.playExplosion(entity.type);
            hole.ledRing.material.color.setHex(0xffffff);
            setTimeout(() => {
                if (hole.ledRing) hole.ledRing.material.color.setHex(0x00f0ff);
            }, 140);
        }

        this.shakeIntensity = 0.16 + Math.min(0.10, this.combo * 0.01);

        // Comic shout on hit matching the entity's ring color (cyan, green, red, gold)
        this.showComicShout(entity.yell, entity.type);
    }

    triggerGreenSmoke(hole) {
        const smokeGroup = new THREE.Group();
        smokeGroup.position.copy(hole.worldPos);
        smokeGroup.position.y += 0.15;
        this.scene.add(smokeGroup);

        const smokeMat = new THREE.MeshBasicMaterial({
            color: 0x2ecc71, // Toxic cartoon green
            transparent: true,
            opacity: 0.85
        });

        // 4 small lightweight low-poly smoke puffs (clean, 0 lag, ~48 polygons)
        const puffGeo = new THREE.DodecahedronGeometry(0.11, 0);
        const puffs = [];
        const offsets = [
            { x: -0.08, y: 0.04, z: 0.06, targetY: 0.38, targetScale: 1.6 },
            { x: 0.08, y: 0.07, z: -0.05, targetY: 0.44, targetScale: 1.8 },
            { x: -0.02, y: 0.11, z: -0.03, targetY: 0.52, targetScale: 2.0 },
            { x: 0.05, y: 0.02, z: 0.06, targetY: 0.32, targetScale: 1.4 }
        ];

        offsets.forEach(cfg => {
            const p = new THREE.Mesh(puffGeo, smokeMat);
            p.position.set(cfg.x, cfg.y, cfg.z);
            p.scale.setScalar(0.4);
            smokeGroup.add(p);
            puffs.push({ mesh: p, cfg });
        });

        const anim = { progress: 0, opacity: 0.85 };
        new TWEEN.Tween(anim)
            .to({ progress: 1, opacity: 0 }, 460)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
                smokeMat.opacity = anim.opacity;
                puffs.forEach(({ mesh, cfg }) => {
                    const t = anim.progress;
                    mesh.position.y = cfg.y + (cfg.targetY - cfg.y) * t;
                    mesh.position.x = cfg.x + cfg.x * 0.7 * t;
                    mesh.position.z = cfg.z + cfg.z * 0.7 * t;
                    const s = 0.4 + (cfg.targetScale - 0.4) * t;
                    mesh.scale.set(s, s, s);
                });
            })
            .onComplete(() => {
                this.scene.remove(smokeGroup);
                puffGeo.dispose();
                smokeMat.dispose();
            })
            .start();
    }

    triggerFrostSmoke(hole) {
        const frostGroup = new THREE.Group();
        frostGroup.position.copy(hole.worldPos);
        frostGroup.position.y += 0.15;
        this.scene.add(frostGroup);

        const frostMat = new THREE.MeshBasicMaterial({
            color: 0x80e5ff, // Frost ice cyan
            transparent: true,
            opacity: 0.90
        });

        // Lightweight faceted ice crystals/puffs
        const crystalGeo = new THREE.OctahedronGeometry(0.12, 0);
        const crystals = [];
        const offsets = [
            { x: -0.09, y: 0.04, z: 0.07, targetY: 0.40, targetScale: 1.5, rotSpeed: 3.0 },
            { x: 0.09, y: 0.06, z: -0.06, targetY: 0.46, targetScale: 1.7, rotSpeed: -2.5 },
            { x: -0.03, y: 0.12, z: -0.04, targetY: 0.54, targetScale: 1.9, rotSpeed: 4.0 },
            { x: 0.06, y: 0.02, z: 0.08, targetY: 0.35, targetScale: 1.3, rotSpeed: -3.5 }
        ];

        offsets.forEach(cfg => {
            const p = new THREE.Mesh(crystalGeo, frostMat);
            p.position.set(cfg.x, cfg.y, cfg.z);
            p.scale.setScalar(0.4);
            frostGroup.add(p);
            crystals.push({ mesh: p, cfg });
        });

        const anim = { progress: 0, opacity: 0.90 };
        new TWEEN.Tween(anim)
            .to({ progress: 1, opacity: 0 }, 480)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
                frostMat.opacity = anim.opacity;
                crystals.forEach(({ mesh, cfg }) => {
                    const t = anim.progress;
                    mesh.position.y = cfg.y + (cfg.targetY - cfg.y) * t;
                    mesh.position.x = cfg.x + cfg.x * 0.7 * t;
                    mesh.position.z = cfg.z + cfg.z * 0.7 * t;
                    mesh.rotation.y += 0.15 * cfg.rotSpeed;
                    mesh.rotation.z += 0.10 * cfg.rotSpeed;
                    const s = 0.4 + (cfg.targetScale - 0.4) * t;
                    mesh.scale.set(s, s, s);
                });
            })
            .onComplete(() => {
                this.scene.remove(frostGroup);
                crystalGeo.dispose();
                frostMat.dispose();
            })
            .start();
    }

    showComicShout(text, type = 'gold') {
        const shoutEl = document.getElementById('comic-shout');
        const shoutText = document.getElementById('shout-text');
        if (!shoutEl || !shoutText) return;

        shoutText.textContent = text;

        // Reset color variant classes
        shoutEl.classList.remove('cyan', 'green', 'red', 'yellow', 'gold', 'fury');

        // Color mapped to ring colors:
        // - Cruzado & Jório: Cyan
        // - Bad Moles (Sena, 2 E-mails & Ar no 15°C): Danger Red
        // - Cafezinho & Docinho: Signature Gold / Yellow
        // - Fury Mode: Neon Pink
        if (type === 'cruzado' || type === 'jorio' || type === 'curly' || type === 'cyan') {
            shoutEl.classList.add('cyan');
        } else if (type === 'sena' || type === 'email' || type === 'ac' || type === 'red') {
            shoutEl.classList.add('red');
        } else if (type === 'green') {
            shoutEl.classList.add('green');
        } else if (type === 'fury') {
            shoutEl.classList.add('fury');
        } else {
            shoutEl.classList.add('gold');
        }

        shoutEl.classList.remove('hidden');

        clearTimeout(this.shoutTimer);
        this.shoutTimer = setTimeout(() => {
            shoutEl.classList.add('hidden');
        }, 450);
    }

    // ========================================================================
    // 7. HAMMER SMASH, PICKUP TRANSITION & FLUID TRACKING
    // ========================================================================
    pickUpHammer() {
        this.isHammerPickingUp = true;
        this.sound.playSwing();

        // Target position in first-person view: centered at table front
        const targetPos = new THREE.Vector3(0.0, 2.22, 0.45);
        const targetRot = new THREE.Euler(0.28, 0, 0);

        new TWEEN.Tween(this.hammerGroup.position)
            .to({ x: targetPos.x, y: targetPos.y, z: targetPos.z }, 750)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();

        new TWEEN.Tween(this.hammerGroup.rotation)
            .to({ x: targetRot.x, y: targetRot.y, z: targetRot.z }, 750)
            .easing(TWEEN.Easing.Cubic.Out)
            .onComplete(() => {
                this.isHammerPickingUp = false;
                this.hoverPoint.set(targetPos.x, targetPos.y - 0.54, targetPos.z - 0.22);
            })
            .start();
    }

    putDownHammer() {
        this.isHammerPickingUp = false;
        new TWEEN.Tween(this.hammerGroup.position)
            .to({
                x: this.restingHammerPos.x,
                y: this.restingHammerPos.y,
                z: this.restingHammerPos.z
            }, 800)
            .easing(TWEEN.Easing.Cubic.InOut)
            .start();

        new TWEEN.Tween(this.hammerGroup.rotation)
            .to({
                x: this.restingHammerRot.x,
                y: this.restingHammerRot.y,
                z: this.restingHammerRot.z
            }, 800)
            .easing(TWEEN.Easing.Cubic.InOut)
            .start();
    }

    _stopSmashTweens() {
        if (this._smashTweens) {
            this._smashTweens.forEach(t => {
                if (t && typeof t.stop === 'function') t.stop();
            });
            this._smashTweens = [];
        }
    }

    isHoleHittable(hole) {
        if (!hole || !hole.entity) return false;
        if (hole._pendingHit) return false;
        if (hole.isUp) return true;
        // Coyote Time: Grace window while sliding underground (150ms)
        if (hole._retractingUntil && performance.now() < hole._retractingUntil) {
            return true;
        }
        return false;
    }

    resolveHitTarget(clickPos) {
        // 1. Raycast direct intersection with hittable mole hitboxes
        const activeHoles = this.holes.filter(h => this.isHoleHittable(h));
        if (activeHoles.length > 0) {
            const activeHitBoxes = activeHoles.map(h => h.hitBox);
            const directIntersects = this.raycaster.intersectObjects(activeHitBoxes);
            if (directIntersects.length > 0) {
                const targetIdx = directIntersects[0].object.userData.holeIndex;
                const hole = this.holes[targetIdx];
                if (hole && this.isHoleHittable(hole)) {
                    return { pos: hole.worldPos, hole: hole };
                }
            }
        }

        // 2. Intelligent Proximity Hit Sweep (Sweet Spot for Near-Misses)
        // Hole radius is 0.44; hammer head striking face radius is ~0.22.
        // A distance <= 0.65 units corresponds to physically striking the mole platform,
        // neon ring, or edge of the hole.
        const maxHitDist = 0.65;
        let bestActiveHole = null;
        let minActiveDist = Infinity;

        for (let h of activeHoles) {
            const dist = clickPos.distanceTo(h.worldPos);
            if (dist < minActiveDist) {
                minActiveDist = dist;
                bestActiveHole = h;
            }
        }

        if (bestActiveHole && minActiveDist <= maxHitDist) {
            return { pos: bestActiveHole.worldPos, hole: bestActiveHole };
        }

        // 3. Fallback: No active mole within reach -> Natural empty swing
        let closestHole = null;
        let minAnyDist = Infinity;
        for (let h of this.holes) {
            const dist = clickPos.distanceTo(h.worldPos);
            if (dist < minAnyDist) {
                minAnyDist = dist;
                closestHole = h;
            }
        }

        if (closestHole && minAnyDist <= 0.65) {
            return { pos: closestHole.worldPos, hole: closestHole };
        }

        return { pos: clickPos, hole: null };
    }

    smashAtTarget(targetPos, targetHole = null) {
        // Interruption & Action Queuing for rapid-fire arcade clicking
        if (this.isSmashing) {
            if (this._smashPhase === 'recovering') {
                this._stopSmashTweens();
                this.isSmashing = false;
            } else {
                // Buffer the next click so fast double-taps are never dropped
                this._bufferedSmash = { targetPos, targetHole };
                return;
            }
        }

        this.isSmashing = true;
        this._smashPhase = 'striking';
        this.sound.playSwing();

        // If targetHole is hittable right now, lock in the hit immediately!
        // This eliminates any possibility of the mole vanishing during the 85ms swing
        const isHittable = targetHole && this.isHoleHittable(targetHole);
        let hitEntity = null;
        if (isHittable) {
            hitEntity = targetHole.entity;
            targetHole._pendingHit = true;
            targetHole._pendingEntity = hitEntity;
            targetHole.isUp = false;
            targetHole._retractingUntil = 0;
            clearTimeout(targetHole.timeoutId);
            clearTimeout(targetHole.trembleTimeoutId);
            targetHole.isTrembling = false;
            if (targetHole._retractTween) {
                targetHole._retractTween.stop();
                targetHole._retractTween = null;
            }
        }

        const startY = this.hammerGroup.position.y;
        const startRotX = this.hammerGroup.rotation.x;
        // The oval striking face impacts squarely on top of the horizontal platform stamp
        const impactY = targetPos.y + 0.14;
        // Enforce invisible wall boundary during smash: never penetrate into the marquee title wall
        const impactZ = Math.max(-1.15, targetPos.z + 0.22);
        const impactX = Math.max(-1.75, Math.min(1.75, targetPos.x));

        this._smashTweens = [];

        // Snappier windup: 30ms up, 55ms slam down -> Total 85ms to crisp impact!
        const raiseTween = new TWEEN.Tween(this.hammerGroup.position)
            .to({ y: startY + 0.22 }, 30)
            .easing(TWEEN.Easing.Quadratic.Out);

        const slamTween = new TWEEN.Tween(this.hammerGroup.position)
            .to({ y: impactY, x: impactX, z: impactZ }, 55)
            .easing(TWEEN.Easing.Cubic.In)
            .onComplete(() => {
                this._smashPhase = 'recovering';

                const isSena = hitEntity && hitEntity.type === 'sena';
                if (!isSena) {
                    this.sound.playHammerHit();
                }

                if (targetHole && targetHole._pendingHit && this.isPlaying) {
                    targetHole._pendingHit = false;
                    this.handleHoleHit(targetHole, hitEntity);
                }

                // If user queued a click while the hammer was swinging down, execute immediately!
                if (this._bufferedSmash) {
                    const next = this._bufferedSmash;
                    this._bufferedSmash = null;
                    this._stopSmashTweens();
                    this.isSmashing = false;
                    this.smashAtTarget(next.targetPos, next.targetHole);
                    return;
                }

                // Fluid recovery back to normal hover height
                const recoverTween = new TWEEN.Tween(this.hammerGroup.position)
                    .to({ y: startY }, 80)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .onComplete(() => {
                        this.isSmashing = false;
                        this._smashPhase = 'idle';
                    });

                this._smashTweens.push(recoverTween);
                recoverTween.start();
            });

        raiseTween.chain(slamTween);
        this._smashTweens.push(raiseTween, slamTween);
        raiseTween.start();

        // Downward strike rotation arc
        const rotRaiseTween = new TWEEN.Tween(this.hammerGroup.rotation)
            .to({ x: startRotX - 0.28 }, 30)
            .easing(TWEEN.Easing.Quadratic.Out);

        const rotSlamTween = new TWEEN.Tween(this.hammerGroup.rotation)
            .to({ x: startRotX + 0.65 }, 55)
            .easing(TWEEN.Easing.Cubic.In)
            .chain(
                new TWEEN.Tween(this.hammerGroup.rotation)
                    .to({ x: startRotX }, 80)
                    .easing(TWEEN.Easing.Quadratic.Out)
            );

        rotRaiseTween.chain(rotSlamTween);
        this._smashTweens.push(rotRaiseTween, rotSlamTween);
        rotRaiseTween.start();
    }

    handleHoleHit(hole, hitEntity = null) {
        const entity = hitEntity || hole.entity;
        if (!entity) return;

        clearTimeout(hole.timeoutId);
        clearTimeout(hole.trembleTimeoutId);
        if (hole._retractTween) {
            hole._retractTween.stop();
            hole._retractTween = null;
        }
        hole._pendingHit = false;
        hole._retractingUntil = 0;
        hole.isUp = false;
        hole.isTrembling = false;

        // Hide coworker instantly on hit!
        hole.mole.group.visible = false;
        hole.mole.group.position.x = 0;
        hole.mole.group.position.z = 0;
        hole.mole.group.position.y = -1.2;

        // Stat tracking
        if (entity.type in this.stats) {
            this.stats[entity.type]++;
        }

        this.triggerHeadExplosion(hole, entity);

        // Sena penalty handling: -15 points, -5s penalty, green smoke, combo break, stress penalty!
        if (entity.type === 'sena') {
            this.triggerGreenSmoke(hole);
            this.score = Math.max(0, this.score - 15);
            this.timeLeft = Math.max(0, this.timeLeft - 5);
            this.breakCombo('sena');
            if (this.isFuryMode) {
                // Sena interrupts fury flow: penalizes remaining fever time!
                this.furyTimeRemaining = Math.max(0.5, this.furyTimeRemaining - 2.0);
            }
            // Flash score HUD red to signal point deduction
            const scoreEl = document.getElementById('score-display');
            if (scoreEl) {
                scoreEl.style.color = '#ff3366';
                scoreEl.style.transform = 'scale(1.20)';
                setTimeout(() => {
                    scoreEl.style.color = '';
                    scoreEl.style.transform = '';
                }, 300);
            }
            // Flash timer HUD in danger red for -5s penalty
            const timeEl = document.getElementById('time-display');
            if (timeEl) {
                timeEl.style.transform = 'scale(1.25)';
                timeEl.style.color = '#ff3366';
                timeEl.style.textShadow = '0 0 16px #ff3366';
                setTimeout(() => {
                    timeEl.style.transform = '';
                    timeEl.style.color = '';
                    timeEl.style.textShadow = '';
                }, 400);
            }
        } else if (entity.type === 'email') {
            // Bad Mole Hazard: Boss sent 2 e-mails! -60 pts & -15s penalty & combo break!
            this.score = Math.max(0, this.score - 60);
            this.timeLeft = Math.max(0, this.timeLeft - 15);
            this.breakCombo('email');
            if (this.isFuryMode) {
                this.furyTimeRemaining = Math.max(0.5, this.furyTimeRemaining - 2.5);
            }
            // Flash timer HUD in danger red
            const timeEl = document.getElementById('time-display');
            if (timeEl) {
                timeEl.style.transform = 'scale(1.35)';
                timeEl.style.color = '#ff0033';
                timeEl.style.textShadow = '0 0 20px #ff0033';
                setTimeout(() => {
                    timeEl.style.transform = '';
                    timeEl.style.color = '';
                    timeEl.style.textShadow = '';
                }, 500);
            }
            // Flash score HUD red for -60 pts deduction
            const scoreEl = document.getElementById('score-display');
            if (scoreEl) {
                scoreEl.style.color = '#ff0033';
                scoreEl.style.transform = 'scale(1.20)';
                setTimeout(() => {
                    scoreEl.style.color = '';
                    scoreEl.style.transform = '';
                }, 300);
            }
        } else if (entity.type === 'ac') {
            // Bad Mole Hazard: AC set to 15°C! Luana hates cold! -30 pts & -10s penalty
            this.triggerFrostSmoke(hole);
            this.score = Math.max(0, this.score - 30);
            this.timeLeft = Math.max(0, this.timeLeft - 10);
            this.breakCombo('ac');
            if (this.isFuryMode) {
                // Cold shocks Luana and cuts fury timer!
                this.furyTimeRemaining = Math.max(0.5, this.furyTimeRemaining - 2.0);
            }
            // Flash score HUD in frosty blue/cyan
            const scoreEl = document.getElementById('score-display');
            if (scoreEl) {
                scoreEl.style.color = '#00f0ff';
                scoreEl.style.textShadow = '0 0 16px #00f0ff';
                scoreEl.style.transform = 'scale(1.20)';
                setTimeout(() => {
                    scoreEl.style.color = '';
                    scoreEl.style.textShadow = '';
                    scoreEl.style.transform = '';
                }, 350);
            }
            // Flash timer HUD in frosty blue/cyan for -10s
            const timeEl = document.getElementById('time-display');
            if (timeEl) {
                timeEl.style.transform = 'scale(1.30)';
                timeEl.style.color = '#00f0ff';
                timeEl.style.textShadow = '0 0 16px #00f0ff';
                setTimeout(() => {
                    timeEl.style.transform = '';
                    timeEl.style.color = '';
                    timeEl.style.textShadow = '';
                }, 450);
            }
        } else {
            this.score += entity.points * (this.isFuryMode ? 2 : 1) * this.combo;
            this.timeLeft += entity.bonusTime;
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;

            // STRESS & FURY MECHANICS
            if (this.isFuryMode) {
                // ADDICTIVE FEVER EXTENSION: Every hit adds time to the fury clock!
                this.furyTimeRemaining = Math.min(this.furyMaxTime, this.furyTimeRemaining + 0.40);
                this.sound.playFuryExtend();
            } else {
                // Tuned for challenging, rewarding fury buildup (needs ~22-24 hits instead of ~12)
                // Base gain: Cruzado = 2.6%, Jorio = 3.6%, Coffee / Docinho = 4.5%
                let baseGain = 2.6;
                if (entity.type === 'jorio' || entity.type === 'curly') baseGain = 3.6;
                else if (entity.type === 'coffee' || entity.type === 'docinho') baseGain = 4.5;

                // Combo momentum scaling (rewards rhythm & continuous streaks!)
                const comboBonus = Math.min(3.0, (this.combo - 1) * 0.20);
                const totalGain = baseGain + comboBonus;

                this.stressLevel = Math.min(100, this.stressLevel + totalGain);
                if (this.stressLevel >= 100) {
                    this.activateFuryMode();
                }
            }
        }

        // Visual flash for bonus time!
        if (entity.bonusTime > 0) {
            const timeEl = document.getElementById('time-display');
            if (timeEl) {
                timeEl.style.transform = 'scale(1.25)';
                timeEl.style.color = '#00ff66';
                timeEl.style.textShadow = '0 0 16px #00ff66';
                setTimeout(() => {
                    timeEl.style.transform = '';
                    timeEl.style.color = '';
                    timeEl.style.textShadow = '';
                }, 350);
            }
        }

        this.updateHUD();
    }

    breakCombo(reason = 'sena') {
        let changed = false;
        if (this.combo > 1) {
            this.combo = 1;
            changed = true;
        }
        // Hazards deduct stress and break fury momentum
        if (!this.isFuryMode && this.stressLevel > 0) {
            const drop = (reason === 'sena' || reason === 'email' || reason === 'ac') ? 15 : 0;
            if (drop > 0) {
                this.stressLevel = Math.max(0, this.stressLevel - drop);
                changed = true;
            }
        }
        if (changed) {
            this.updateHUD();
        }
    }

    activateFuryMode() {
        if (this.isFuryMode) return;
        this.isFuryMode = true;
        this.furyMaxTime = 7.5;
        this.furyTimeRemaining = 7.5;
        this.sound.playFuryStinger();

        const overlay = document.getElementById('fury-overlay');
        if (overlay) overlay.classList.add('active');
        const flames = document.getElementById('avatar-flames');
        if (flames) flames.classList.add('active');

        this.showComicShout('MODO FÚRIA!', 'fury');

        // Accelerate spawns during fury mode!
        clearInterval(this.spawnTimer);
        this.spawnTimer = setInterval(() => this.spawnTarget(), 380);

        // High-frequency fury drain timer (every 100ms)
        if (this.furyInterval) clearInterval(this.furyInterval);
        this.furyInterval = setInterval(() => {
            if (!this.isPlaying || !this.isFuryMode) {
                clearInterval(this.furyInterval);
                return;
            }
            this.furyTimeRemaining = Math.max(0, this.furyTimeRemaining - 0.1);
            this.updateHUD();

            if (this.furyTimeRemaining <= 0) {
                this.deactivateFuryMode();
            }
        }, 100);

        this.updateHUD();
    }

    deactivateFuryMode() {
        if (!this.isFuryMode) return;
        this.isFuryMode = false;
        this.stressLevel = 0;
        this.furyTimeRemaining = 0;
        if (this.furyInterval) {
            clearInterval(this.furyInterval);
            this.furyInterval = null;
        }

        const overlay = document.getElementById('fury-overlay');
        if (overlay) overlay.classList.remove('active');
        const flames = document.getElementById('avatar-flames');
        if (flames) flames.classList.remove('active');

        // Restore standard spawn rate
        clearInterval(this.spawnTimer);
        if (this.isPlaying) {
            this.spawnTimer = setInterval(() => this.spawnTarget(), 650);
        }

        this.updateHUD();
    }

    // ========================================================================
    // 8. GAME LOOP & SPAWN CONTROLLER
    // ========================================================================
    startGame() {
        this.sound.init();
        this.sound.playCoin();
        this.sound.startGameMusic();

        this.score = 0;
        this.timeLeft = 60;
        this.combo = 1;
        this.maxCombo = 1;
        this.explodedHeads = 0;
        this.stressLevel = 0;
        this.isPlaying = true;
        this.isFuryMode = false;
        this.furyTimeRemaining = 0;
        if (this.furyInterval) {
            clearInterval(this.furyInterval);
            this.furyInterval = null;
        }
        const overlay = document.getElementById('fury-overlay');
        if (overlay) overlay.classList.remove('active');
        const flames = document.getElementById('avatar-flames');
        if (flames) flames.classList.remove('active');
        this.stats = { cruzado: 0, sena: 0, jorio: 0, coffee: 0, docinho: 0, email: 0, ac: 0 };

        // CAMERA TRANSITION:
        // Swoop smoothly from the 'wide' arcade attract angle into the 'play' (MESA) playable angle!
        // TCHARAMMM, user is playing!
        this.currentView = 'play';

        // HAMMER PICKUP:
        // Smoothly pick up the hammer from the table into the center playing view!
        this.pickUpHammer();

        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.classList.add('hidden');
        }
        const rulesBtn = document.getElementById('rules-btn');
        if (rulesBtn) {
            rulesBtn.disabled = true;
            rulesBtn.classList.add('hidden');
        }
        const rankMenuBtn = document.getElementById('rank-menu-btn');
        if (rankMenuBtn) {
            rankMenuBtn.disabled = true;
            rankMenuBtn.classList.add('hidden');
        }
        document.getElementById('highscore-modal').classList.add('hidden');

        // ENSURE ALL HOLES ARE INVISIBLE & DEEP UNDERGROUND INITIALLY
        this._stopSmashTweens();
        this.isSmashing = false;
        this._smashPhase = 'idle';
        this._bufferedSmash = null;
        this.holes.forEach(h => {
            clearTimeout(h.timeoutId);
            clearTimeout(h.trembleTimeoutId);
            if (h._retractTween) {
                h._retractTween.stop();
                h._retractTween = null;
            }
            h.isUp = false;
            h.isTrembling = false;
            h._pendingHit = false;
            h._retractingUntil = 0;
            h.mole.group.visible = false;
            h.mole.group.position.set(0, -1.2, 0);
        });

        this.updateHUD();

        const spawnDelay = this.isFuryMode ? 400 : 650;
        this.spawnTimer = setInterval(() => this.spawnTarget(), spawnDelay);

        this.gameTimer = setInterval(() => {
            this.timeLeft = Math.max(0, this.timeLeft - 1);

            // Passive stress decay: continuous cool-down when not hitting moles
            if (!this.isFuryMode && this.stressLevel > 0) {
                this.stressLevel = Math.max(0, this.stressLevel - 2.4);
            }

            if (this.timeLeft <= 0) {
                this.endGame();
                return;
            }

            this.updateHUD();
        }, 1000);
    }

    endGame() {
        clearInterval(this.gameTimer);
        clearInterval(this.spawnTimer);
        if (this.furyInterval) {
            clearInterval(this.furyInterval);
            this.furyInterval = null;
        }
        this.isFuryMode = false;
        this.furyTimeRemaining = 0;
        this.stressLevel = 0;

        const overlay = document.getElementById('fury-overlay');
        if (overlay) overlay.classList.remove('active');
        const flames = document.getElementById('avatar-flames');
        if (flames) flames.classList.remove('active');

        this.isPlaying = false;
        this.updateHUD();
        this.sound.playGameOver();

        // Return to chill fliperama menu music after game over melody
        setTimeout(() => {
            if (this.sound.musicEnabled && !this.isPlaying) {
                this.sound.startMenuMusic();
            }
        }, 1100);

        // Return camera to cinematic arcade overview angle
        this.currentView = 'wide';

        // Return hammer down to the table to rest
        this.putDownHammer();

        this._stopSmashTweens();
        this.isSmashing = false;
        this._smashPhase = 'idle';
        this._bufferedSmash = null;

        this.holes.forEach(h => {
            clearTimeout(h.timeoutId);
            clearTimeout(h.trembleTimeoutId);
            if (h._retractTween) {
                h._retractTween.stop();
                h._retractTween = null;
            }
            h.isUp = false;
            h.isTrembling = false;
            h._pendingHit = false;
            h._retractingUntil = 0;
            h.mole.group.position.x = 0;
            h.mole.group.position.z = 0;
            new TWEEN.Tween(h.mole.group.position)
                .to({ y: -1.2 }, 150)
                .onComplete(() => {
                    h.mole.group.visible = false;
                })
                .start();
        });

        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.classList.remove('hidden');
        }
        const rulesBtn = document.getElementById('rules-btn');
        if (rulesBtn) {
            rulesBtn.disabled = false;
            rulesBtn.classList.remove('hidden');
        }
        const rankMenuBtn = document.getElementById('rank-menu-btn');
        if (rankMenuBtn) {
            rankMenuBtn.disabled = false;
            rankMenuBtn.classList.remove('hidden');
        }

        // Save final stats for modal display & record before zeroing HUD state
        const finalScore = this.score;
        const finalHeads = this.explodedHeads;
        const finalCombo = this.maxCombo;

        if (finalScore > this.record) {
            this.record = finalScore;
            try {
                localStorage.setItem('cala_cruzado_record', String(this.record));
            } catch (e) { }
            const recEl = document.getElementById('record-display');
            if (recEl) recEl.textContent = this.record;
        }

        document.getElementById('final-score').textContent = finalScore;
        document.getElementById('final-heads').textContent = finalHeads;
        document.getElementById('final-combo').textContent = finalCombo + 'x';

        // Zero out HUD game state so points, tempo and combo show 0
        this.score = 0;
        this.timeLeft = 0;
        this.combo = 0;
        this.updateHUD();

        // Render Breakdown List (Always 1-Column List, No Points Displayed)
        const bd = document.getElementById('coworker-breakdown');
        if (bd) {
            bd.innerHTML = `
                <div class="breakdown-pill cruzado">
                    <span class="pill-label">🧑🏻‍🦱 CRUZADO CALADO:</span>
                    <span class="pill-count">${this.stats.cruzado}</span>
                </div>
                <div class="breakdown-pill jorio">
                    <span class="pill-label">👨🏻‍🦲 JÓRIO XINGADO:</span>
                    <span class="pill-count">${this.stats.jorio || 0}</span>
                </div>
                <div class="breakdown-pill sena">
                    <span class="pill-label">🤢 PEIDOS DO SENA:</span>
                    <span class="pill-count">${this.stats.sena}</span>
                </div>
                <div class="breakdown-pill coffee">
                    <span class="pill-label">☕ CAFÉS TOMADOS:</span>
                    <span class="pill-count">${this.stats.coffee}</span>
                </div>
                <div class="breakdown-pill docinho">
                    <span class="pill-label">🍬 DOCINHOS MORDIDOS:</span>
                    <span class="pill-count">${this.stats.docinho || 0}</span>
                </div>
                <div class="breakdown-pill ac">
                    <span class="pill-label">❄️ AR NO 15°C:</span>
                    <span class="pill-count">${this.stats.ac || 0}</span>
                </div>
                <div class="breakdown-pill email">
                    <span class="pill-label">✉️ 2 E-MAILS RECEBIDOS:</span>
                    <span class="pill-count">${this.stats.email || 0}</span>
                </div>
            `;
        }

        document.getElementById('highscore-modal').classList.remove('hidden');
    }

    returnToMenu() {
        if (document.activeElement) document.activeElement.blur();
        this.sound.playCoin();
        document.getElementById('highscore-modal').classList.add('hidden');
        this.currentView = 'wide';
        this.putDownHammer();
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.classList.remove('hidden');
        }
        const rulesBtn = document.getElementById('rules-btn');
        if (rulesBtn) {
            rulesBtn.disabled = false;
            rulesBtn.classList.remove('hidden');
        }
        const rankMenuBtn = document.getElementById('rank-menu-btn');
        if (rankMenuBtn) {
            rankMenuBtn.disabled = false;
            rankMenuBtn.classList.remove('hidden');
        }

        // Complete zeroing of stress-o-meter, fury state and timers when returning to menu
        clearInterval(this.gameTimer);
        clearInterval(this.spawnTimer);
        if (this.furyInterval) {
            clearInterval(this.furyInterval);
            this.furyInterval = null;
        }
        this.isPlaying = false;
        this.isFuryMode = false;
        this.furyTimeRemaining = 0;
        this.stressLevel = 0;

        // Zero out points, tempo and combo on menu
        this.score = 0;
        this.timeLeft = 0;
        this.combo = 0;

        const overlay = document.getElementById('fury-overlay');
        if (overlay) overlay.classList.remove('active');
        const flames = document.getElementById('avatar-flames');
        if (flames) flames.classList.remove('active');

        this.updateHUD();

        this.holes.forEach(h => {
            clearTimeout(h.timeoutId);
            clearTimeout(h.trembleTimeoutId);
            h.isUp = false;
            h.isTrembling = false;
            h.mole.group.visible = false;
            h.mole.group.position.set(0, -1.2, 0);
        });
        document.getElementById('start-btn').disabled = false;
        const rBtn = document.getElementById('rules-btn');
        if (rBtn) rBtn.disabled = false;
        const rkBtn = document.getElementById('rank-menu-btn');
        if (rkBtn) rkBtn.disabled = false;
        if (this.sound.musicEnabled && !this.isPlaying) {
            this.sound.startMenuMusic();
        }
    }

    // ONLY ONE mole pops up at a time (2 in Fury Mode)!
    spawnTarget() {
        if (!this.isPlaying) return;

        // Limit concurrent active targets so it feels clean and authentic
        const maxActive = this.isFuryMode ? 2 : 1;
        const currentActive = this.holes.filter(h => this.isHoleHittable(h)).length;
        if (currentActive >= maxActive) return;

        const available = this.holes.filter(h => !h.isUp && !h._pendingHit && (!h._retractingUntil || performance.now() >= h._retractingUntil));
        if (!available.length) return;

        const hole = available[Math.floor(Math.random() * available.length)];
        hole.isUp = true;
        hole._pendingHit = false;
        hole._retractingUntil = 0;
        if (hole._retractTween) {
            hole._retractTween.stop();
            hole._retractTween = null;
        }

        const roll = Math.random();
        let entity = this.ENTITIES.CRUZADO;
        if (roll > 0.975) entity = this.ENTITIES.DOCINHO;       // ~2.5% (rare sweet bonus +50pts, +6s)
        else if (roll > 0.945) entity = this.ENTITIES.EMAIL;     // ~3.0% (boss 2 e-mails penalty -60pts, -15s)
        else if (roll > 0.910) entity = this.ENTITIES.AC;        // ~3.5% (freezing AC remote hazard -30pts, -10s)
        else if (roll > 0.835) entity = this.ENTITIES.COFFEE;    // ~7.5% (coffee time boost +20pts, +3s)
        else if (roll > 0.760) entity = this.ENTITIES.SENA;      // ~7.5% (sabotage hazard -15pts, -5s)
        else if (roll > 0.450) entity = this.ENTITIES.JORIO;     // ~31.0% (coworker target +25pts)
        else entity = this.ENTITIES.CRUZADO;                    // ~45.0% (primary target +10pts)

        hole.entity = entity;

        const mole = hole.mole;
        mole.faceMesh.visible = false;
        mole.coffeeGroup.visible = false;
        mole.docinhoGroup.visible = false;
        mole.emailGroup.visible = false;
        mole.acGroup.visible = false;

        if (entity.type === 'coffee') {
            mole.coffeeGroup.visible = true;
            mole.ringMesh.material.color.setHex(0xffe600); // Yellow ring
        } else if (entity.type === 'docinho') {
            mole.docinhoGroup.visible = true;
            mole.ringMesh.material.color.setHex(0xffe600); // Yellow ring
        } else if (entity.type === 'email') {
            mole.emailGroup.visible = true;
            mole.ringMesh.material.color.setHex(0xff0033); // Danger RED ring!
        } else if (entity.type === 'ac') {
            mole.acGroup.visible = true;
            mole.ringMesh.material.color.setHex(0xff0033); // Danger RED ring!
        } else if (entity.type === 'sena') {
            mole.faceMesh.visible = true;
            mole.faceMesh.material.map = this.textures.senaToken;
            mole.faceMesh.material.needsUpdate = true;
            mole.ringMesh.material.color.setHex(0xff0033); // Danger RED ring!
        } else {
            mole.faceMesh.visible = true;
            if (entity.type === 'cruzado') mole.faceMesh.material.map = this.textures.cruzadoToken;
            else if (entity.type === 'jorio' || entity.type === 'curly') mole.faceMesh.material.map = this.textures.jorioToken;
            mole.faceMesh.material.needsUpdate = true;
            mole.ringMesh.material.color.setHex(0x00f0ff); // Only a Cyan ring!
        }

        // MAKE VISIBLE ONLY NOW, and tween up to safe pop-up platform height (zero collision with hammer!)
        clearTimeout(hole.timeoutId);
        clearTimeout(hole.trembleTimeoutId);
        hole.isTrembling = false;
        hole._pendingHit = false;
        hole._retractingUntil = 0;
        mole.group.visible = true;
        mole.group.position.set(0, -1.2, 0);

        new TWEEN.Tween(mole.group.position)
            .to({ y: 0.08 }, 160)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();

        const stayDuration = Math.random() * 500 + (this.isFuryMode ? 450 : 650);
        // Warning tremble right before vanishing: lasts ~280ms (or ~40% of stay duration)
        const warningDuration = Math.min(280, Math.floor(stayDuration * 0.4));
        const calmDuration = Math.max(160, stayDuration - warningDuration);

        // ALWAYS starts to tremble when about to vanish!
        hole.trembleTimeoutId = setTimeout(() => {
            if (hole.isUp && !hole._pendingHit) {
                hole.isTrembling = true;
            }
        }, calmDuration);

        // Vanish & retract down into the hole
        hole.timeoutId = setTimeout(() => {
            if (hole.isUp && !hole._pendingHit) {
                hole.isUp = false;
                hole.isTrembling = false;
                // Coyote Time grace window: allows hitting during the 150ms slide-down!
                hole._retractingUntil = performance.now() + 150;
                mole.group.position.x = 0;
                mole.group.position.z = 0;

                hole._retractTween = new TWEEN.Tween(mole.group.position)
                    .to({ y: -1.2 }, 150)
                    .easing(TWEEN.Easing.Quadratic.In)
                    .onComplete(() => {
                        if (!hole._pendingHit) {
                            mole.group.visible = false;
                            hole.entity = null;
                        }
                        hole._retractTween = null;
                    });
                hole._retractTween.start();
            }
        }, stayDuration);
    }

    // ========================================================================
    // 9. HUD & INTERACTION EVENTS
    // ========================================================================
    updateHUD() {
        const scoreEl = document.getElementById('score-display');
        if (scoreEl) scoreEl.textContent = String(Math.max(0, this.score)).padStart(4, '0');
        const timeEl = document.getElementById('time-display');
        if (timeEl) timeEl.innerHTML = `${Math.max(0, this.timeLeft)}<small>s</small>`;
        const comboEl = document.getElementById('combo-display');
        if (comboEl) comboEl.textContent = `${Math.max(0, this.combo)}x`;
        const recEl = document.getElementById('record-display');
        if (recEl) recEl.textContent = this.record || 0;

        const panel = document.getElementById('stress-meter-panel');
        const fill = document.getElementById('stress-fill');
        const perc = document.getElementById('stress-percentage');
        const moodEl = document.getElementById('luana-mood');

        if (this.isFuryMode) {
            const furyPercent = Math.max(0, Math.min(100, (this.furyTimeRemaining / this.furyMaxTime) * 100));
            if (fill) {
                fill.style.width = `${furyPercent}%`;
                fill.className = 'stress-bar-fill fury-active';
            }
            if (perc) perc.textContent = `${this.furyTimeRemaining.toFixed(1)}s`;
            if (moodEl) {
                moodEl.textContent = '🔥 FÚRIA! COMBO x2! 🔥';
                moodEl.title = 'FÚRIA ATIVA! COMBO x2!';
            }
            if (panel) {
                panel.className = 'stress-meter-panel fury-active';
            }
        } else {
            const pct = Math.round(this.stressLevel);
            if (fill) {
                fill.style.width = `${pct}%`;
                if (pct >= 90) fill.className = 'stress-bar-fill critical';
                else if (pct >= 70) fill.className = 'stress-bar-fill furious';
                else if (pct >= 35) fill.className = 'stress-bar-fill tense';
                else fill.className = 'stress-bar-fill';
            }
            if (perc) perc.textContent = `${pct}%`;

            let mood = '"POSTURA MANTIDA"';
            let panelClass = 'stress-meter-panel';
            if (pct >= 90) {
                mood = '"PRESTES A EXPLODIR!!" ⚡';
                panelClass = 'stress-meter-panel critical';
            } else if (pct >= 70) {
                mood = '"PACIÊNCIA NO LIMITE!"';
                panelClass = 'stress-meter-panel furious';
            } else if (pct >= 35) {
                mood = '"CRUZADO FALANDO DEMAIS..."';
                panelClass = 'stress-meter-panel tense';
            }
            if (moodEl) {
                moodEl.textContent = mood;
                moodEl.title = mood;
            }
            if (panel) panel.className = panelClass;
        }
    }

    bindEvents() {
        const updateResponsiveLayout = () => {
            const gameWindow = document.getElementById('game-window');
            if (gameWindow) {
                const gw = gameWindow.clientWidth;
                const gh = gameWindow.clientHeight;
                gameWindow.classList.toggle('w-narrow', gw <= 600);
                gameWindow.classList.toggle('w-tiny', gw <= 420);
                gameWindow.classList.toggle('h-compact', gh <= 650);
                gameWindow.classList.toggle('h-tiny', gh <= 520);
            }
            this.updateCameraProjection();
        };

        window.addEventListener('resize', updateResponsiveLayout);
        window.addEventListener('orientationchange', () => {
            setTimeout(updateResponsiveLayout, 80);
        });

        // ResizeObserver on game container guarantees instantaneous reframing on any modal/iframe resize
        if (window.ResizeObserver && this.container) {
            const ro = new ResizeObserver(() => {
                updateResponsiveLayout();
            });
            ro.observe(this.container);
            const gw = document.getElementById('game-window');
            if (gw) ro.observe(gw);
        }

        // Close button: emits postMessage to parent ERP or returns to menu
        const erpCloseBtn = document.getElementById('erp-close-btn');
        if (erpCloseBtn) {
            erpCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                try {
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage({ type: 'CLOSE_GAME', action: 'close' }, '*');
                    }
                } catch (err) { }
                if (this.isPlaying) {
                    this.returnToMenu();
                }
            });
        }

        window.addEventListener('pointermove', (e) => {
            if (!this.renderer || !this.renderer.domElement) return;
            const rect = this.renderer.domElement.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            // Pinpoint raycasting relative to game canvas bounds
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            // Do not track mouse or move hammer if not actively playing
            if (!this.isPlaying) return;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            if (this.raycaster.ray.intersectPlane(this.tablePlane, this._planeIntersection)) {
                // INVISIBLE WALL CONSTRAINT:
                // Prevents the hammer from penetrating the back marquee wall where the title "CALA A BOCA, CRUZADO!" is.
                // Back holes are at z = -0.73; marquee wall is at z = -1.58.
                // Clamping z >= -1.35 and hammer position ensures the hammer stops cleanly in front of the wall.
                this._planeIntersection.z = Math.max(-1.35, Math.min(1.45, this._planeIntersection.z));
                this._planeIntersection.x = Math.max(-1.75, Math.min(1.75, this._planeIntersection.x));
                this.hoverPoint.copy(this._planeIntersection);
            }
        });

        // Click / Tap on Table to Smash or Insert Coin
        window.addEventListener('pointerdown', (e) => {
            // Only ignore smash if directly clicking interactive UI controls (buttons, links, inputs, modals)
            if (e.target.closest('button, .arcade-btn, .icon-btn, .modal-box, input, select, a, .erp-close-btn')) return;

            if (!this.renderer || !this.renderer.domElement) return;
            const rect = this.renderer.domElement.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            // Only interact if click was within game viewport
            if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
                return;
            }

            this.sound.init();

            // Crucial: Update mouse raycast coordinates directly from the click event!
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);

            // 1. Check if 3D Coin Buttons on Arcade Front were clicked
            if (this.coinButtons && this.coinButtons.length > 0) {
                const coinIntersects = this.raycaster.intersectObjects(this.coinButtons);
                if (coinIntersects.length > 0) {
                    this.sound.playCoin();
                    const slotBtn = coinIntersects[0].object;
                    slotBtn.material.color.setHex(0xffff00);
                    setTimeout(() => slotBtn.material.color.setHex(0xff3b00), 220);
                    if (!this.isPlaying) {
                        this.startGame();
                    }
                    return;
                }
            }

            // DO NOT SMASH IF GAME HAS NOT STARTED OR HAMMER IS CURRENTLY PICKING UP!
            if (!this.isPlaying || this.isHammerPickingUp) return;

            // Compute exact 3D click position on table surface
            const clickPos = new THREE.Vector3();
            if (this.raycaster.ray.intersectPlane(this.tablePlane, this._planeIntersection)) {
                this._planeIntersection.z = Math.max(-1.35, Math.min(1.45, this._planeIntersection.z));
                this._planeIntersection.x = Math.max(-1.75, Math.min(1.75, this._planeIntersection.x));
                clickPos.copy(this._planeIntersection);
                this.hoverPoint.copy(this._planeIntersection);
            } else {
                clickPos.copy(this.hoverPoint);
            }

            // Professional Smart Hit Calibration (Active mole prioritization & generous sweet spot)
            const target = this.resolveHitTarget(clickPos);
            this.smashAtTarget(target.pos, target.hole);
        });

        // Keyboard hotkeys (Only keys 1 to 9)
        const keyMap = {
            // Number Row (1 to 9, left to right, top to bottom)
            'Digit1': 0, 'Digit2': 1, 'Digit3': 2,
            'Digit4': 3, 'Digit5': 4, 'Digit6': 5,
            'Digit7': 6, 'Digit8': 7, 'Digit9': 8,
            // Numpad Numbers (Physical 3x3 layout)
            'Numpad7': 0, 'Numpad8': 1, 'Numpad9': 2,
            'Numpad4': 3, 'Numpad5': 4, 'Numpad6': 5,
            'Numpad1': 6, 'Numpad2': 7, 'Numpad3': 8
        };

        window.addEventListener('keydown', (e) => {
            if (document.activeElement.tagName === 'INPUT') return;
            if (!this.isPlaying || this.isHammerPickingUp) return;

            const code = e.code;
            if (code in keyMap) {
                const idx = keyMap[code];
                if (idx >= 0 && idx < this.holes.length) {
                    const hole = this.holes[idx];
                    this.smashAtTarget(hole.worldPos, hole);
                }
            }
        });

        document.getElementById('start-btn').addEventListener('click', () => {
            if (document.activeElement) document.activeElement.blur();
            this.startGame();
        });
        document.getElementById('restart-btn').addEventListener('click', () => {
            if (document.activeElement) document.activeElement.blur();
            this.startGame();
        });
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                this.returnToMenu();
            });
        }

        // Audio & Music Toggles
        const musicBtn = document.getElementById('music-toggle');
        musicBtn.addEventListener('click', () => {
            this.sound.musicEnabled = !this.sound.musicEnabled;
            musicBtn.textContent = `🎵 BGM: ${this.sound.musicEnabled ? 'ON' : 'OFF'}`;
            if (this.sound.musicEnabled) {
                if (this.isPlaying) this.sound.startGameMusic();
                else this.sound.startMenuMusic();
            } else {
                this.sound.stopMusic();
            }
        });

        const sfxBtn = document.getElementById('sfx-toggle');
        sfxBtn.addEventListener('click', () => {
            this.sound.sfxEnabled = !this.sound.sfxEnabled;
            sfxBtn.textContent = `🔊 SFX: ${this.sound.sfxEnabled ? 'ON' : 'OFF'}`;
        });

        // Rules / How to Play Modal
        const rulesBtn = document.getElementById('rules-btn');
        const rulesModal = document.getElementById('rules-modal');
        const closeRulesBtn = document.getElementById('close-rules-btn');

        if (rulesBtn && rulesModal) {
            rulesBtn.addEventListener('click', () => {
                if (document.activeElement) document.activeElement.blur();
                this.sound.playCoin();
                rulesModal.classList.remove('hidden');
            });
        }
        if (closeRulesBtn && rulesModal) {
            closeRulesBtn.addEventListener('click', () => {
                this.sound.playCoin();
                rulesModal.classList.add('hidden');
            });
        }
        if (rulesModal) {
            rulesModal.addEventListener('click', (e) => {
                if (e.target === rulesModal) {
                    rulesModal.classList.add('hidden');
                }
            });
        }

        // "VER RANK" and Menu Crown Rank placeholder buttons (dead buttons, tactile click animation)
        const rankBtn = document.getElementById('view-rank-btn');
        if (rankBtn) {
            rankBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (document.activeElement) document.activeElement.blur();
                this.sound.playCoin();
            });
        }
        const rankMenuBtn = document.getElementById('rank-menu-btn');
        if (rankMenuBtn) {
            rankMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (document.activeElement) document.activeElement.blur();
                this.sound.playCoin();
            });
        }
    }

    // ========================================================================
    // 10. ANIMATION & 60FPS RENDER LOOP
    // ========================================================================
    animate(time) {
        requestAnimationFrame(this.animate);
        TWEEN.update();

        const delta = this.clock.getDelta();

        // Panic Jitter: only update trembling moles (zero matrix dirtying for idle moles)
        for (let i = 0; i < this.holes.length; i++) {
            const h = this.holes[i];
            if (h.isUp && h.isTrembling && h.mole && h.mole.group.visible) {
                h.mole.group.position.x = (Math.random() - 0.5) * 0.05;
                h.mole.group.position.z = (Math.random() - 0.5) * 0.05;
            }
        }

        // Fluid Horizontal Sledgehammer Tracking & Banking Tilt (ONLY when actively playing!)
        if (this.isPlaying && !this.isHammerPickingUp && !this.isSmashing) {
            this.hammerGroup.position.x += (this.hoverPoint.x - this.hammerGroup.position.x) * 0.25;
            this.hammerGroup.position.z += (this.hoverPoint.z + 0.22 - this.hammerGroup.position.z) * 0.25;

            // Strict Invisible Wall Boundary: Absolute physical barrier preventing penetration into marquee wall
            // Marquee wall front face is at z = -1.58; hammer head extends forward ~0.35 -> clamp z >= -1.15
            this.hammerGroup.position.z = Math.max(-1.15, Math.min(1.65, this.hammerGroup.position.z));
            this.hammerGroup.position.x = Math.max(-1.75, Math.min(1.75, this.hammerGroup.position.x));

            // Height follows tilted table surface (+0.54 above table): leaves generous clearance over popped-up platform!
            const targetHoverY = this.hoverPoint.y + 0.54;
            const idleBob = Math.sin(time * 0.004) * 0.02;
            this.hammerGroup.position.y += (targetHoverY + idleBob - this.hammerGroup.position.y) * 0.20;

            const vx = (this.hoverPoint.x - this.hammerGroup.position.x);
            const vz = (this.hoverPoint.z + 0.22 - this.hammerGroup.position.z);
            this.hammerGroup.rotation.z = -vx * 0.35;
            this.hammerGroup.rotation.x = 0.28 + vz * 0.20;
            this.hammerGroup.rotation.y = vx * 0.15;
        }

        // Smooth Camera Interpolation (Zero heap allocations)
        const viewTarget = this.cameraViews[this.currentView];
        const parallaxX = this.mouse.x * 0.22;
        const parallaxY = this.mouse.y * 0.12;

        this._shakeOffset.set(0, 0, 0);
        if (this.shakeIntensity > 0) {
            this._shakeOffset.set(
                (Math.random() - 0.5) * this.shakeIntensity,
                (Math.random() - 0.5) * this.shakeIntensity,
                (Math.random() - 0.5) * this.shakeIntensity
            );
            this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 2.2);
        }

        this.cameraPos.x += (viewTarget.pos.x + parallaxX + this._shakeOffset.x - this.cameraPos.x) * 0.08;
        this.cameraPos.y += (viewTarget.pos.y + parallaxY + this._shakeOffset.y - this.cameraPos.y) * 0.08;
        this.cameraPos.z += (viewTarget.pos.z + this._shakeOffset.z - this.cameraPos.z) * 0.08;
        this.camera.position.copy(this.cameraPos);

        this.cameraTarget.lerp(viewTarget.target, 0.08);
        this.camera.lookAt(this.cameraTarget);

        // Subtle Arcade "Machine Is Alive" Breathing Pulse (Zero CPU/GPU cost)
        if (this.marqueeLight) {
            this.marqueeLight.intensity = 0.70 + Math.sin(time * 0.003) * 0.12;
        }
        if (this.tableLight) {
            this.tableLight.intensity = 0.45 + Math.cos(time * 0.0035) * 0.08;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Instantiate game on page load
window.addEventListener('DOMContentLoaded', () => {
    window.game = new ArcadeWhackGame();

    // Inspection preview hook (?testProp=coffee, ?testProp=docinho, ?testProp=email)
    const urlParams = new URLSearchParams(window.location.search);
    const testProp = urlParams.get('testProp');
    if (testProp && window.game.holes && window.game.holes[4]) {
        const h = window.game.holes[4];
        const m = h.mole;
        m.faceMesh.visible = false;
        if (testProp === 'coffee') {
            h.entity = window.game.ENTITIES.COFFEE;
            m.coffeeGroup.visible = true;
            m.docinhoGroup.visible = false;
            m.emailGroup.visible = false;
            m.acGroup.visible = false;
            if (m.ringMesh) m.ringMesh.material.color.setHex(0xffe600);
        } else if (testProp === 'docinho') {
            h.entity = window.game.ENTITIES.DOCINHO;
            m.coffeeGroup.visible = false;
            m.docinhoGroup.visible = true;
            m.emailGroup.visible = false;
            m.acGroup.visible = false;
            if (m.ringMesh) m.ringMesh.material.color.setHex(0xffe600);
        } else if (testProp === 'email') {
            h.entity = window.game.ENTITIES.EMAIL;
            m.coffeeGroup.visible = false;
            m.docinhoGroup.visible = false;
            m.emailGroup.visible = true;
            m.acGroup.visible = false;
            if (m.ringMesh) m.ringMesh.material.color.setHex(0xff0033);
        } else if (testProp === 'ac') {
            h.entity = window.game.ENTITIES.AC;
            m.coffeeGroup.visible = false;
            m.docinhoGroup.visible = false;
            m.emailGroup.visible = false;
            m.acGroup.visible = true;
            if (m.ringMesh) m.ringMesh.material.color.setHex(0xff0033);
        }
        h.isUp = true;
        m.group.visible = true;
        m.group.position.y = 0.08;
        window.game.currentView = 'play';
        window.game.putDownHammer();
        const startModal = document.getElementById('start-modal');
        if (startModal) startModal.style.display = 'none';
    }

    if (urlParams.get('testGameOver') === '1') {
        setTimeout(() => {
            if (window.game) window.game.endGame();
        }, 150);
    }
});