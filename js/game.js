// ============================================================
// SVATA VODA: CERTI APOKALYPSA
// 3D Minecraft-style FPS - Holy Water vs Demons
// ============================================================

(function() {
'use strict';

// ============================================================
// AUDIO SYSTEM - Procedural sound generation
// ============================================================
const Audio = {
    ctx: null,
    masterGain: null,
    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.ctx.destination);
    },
    play(type) {
        if (!this.ctx) return;
        switch(type) {
            case 'shoot_pistol': this._tone(800, 0.08, 'square', 0.3); this._noise(0.05, 0.2); break;
            case 'shoot_chalice': this._tone(500, 0.15, 'sawtooth', 0.25); this._tone(700, 0.1, 'sine', 0.15); break;
            case 'shoot_shotgun': this._noise(0.12, 0.4); this._tone(200, 0.1, 'square', 0.3); break;
            case 'shoot_beam': this._tone(1200, 0.3, 'sine', 0.2); this._tone(1500, 0.25, 'sine', 0.15); break;
            case 'shoot_grenade': this._tone(300, 0.1, 'square', 0.3); break;
            case 'explosion': this._noise(0.4, 0.5); this._tone(80, 0.4, 'sawtooth', 0.4); this._tone(50, 0.5, 'square', 0.3); break;
            case 'hit': this._tone(400, 0.08, 'square', 0.2); this._noise(0.04, 0.15); break;
            case 'enemy_die': this._tone(300, 0.15, 'sawtooth', 0.3); this._tone(150, 0.2, 'square', 0.25); break;
            case 'player_hurt': this._tone(200, 0.15, 'sawtooth', 0.3); this._tone(100, 0.2, 'square', 0.2); break;
            case 'pickup': this._tone(600, 0.1, 'sine', 0.2); this._tone(900, 0.1, 'sine', 0.2, 0.1); break;
            case 'angel': this._tone(800, 0.3, 'sine', 0.15); this._tone(1000, 0.3, 'sine', 0.12, 0.1); this._tone(1200, 0.3, 'sine', 0.1, 0.2); break;
            case 'prayer': this._tone(400, 0.5, 'sine', 0.2); this._tone(600, 0.5, 'sine', 0.15, 0.15); this._tone(800, 0.4, 'sine', 0.12, 0.3); break;
            case 'wave_start': this._tone(150, 0.4, 'sawtooth', 0.3); this._tone(100, 0.5, 'square', 0.25, 0.2); break;
            case 'reload': this._tone(500, 0.08, 'square', 0.15); this._tone(600, 0.08, 'square', 0.15, 0.1); break;
            case 'no_ammo': this._tone(200, 0.1, 'square', 0.15); break;
            case 'bonus_activate': this._tone(700, 0.15, 'sine', 0.2); this._tone(1000, 0.15, 'sine', 0.18, 0.1); this._tone(1400, 0.15, 'sine', 0.15, 0.2); break;
            case 'enemy_attack': this._tone(150, 0.12, 'sawtooth', 0.2); this._noise(0.06, 0.15); break;
            case 'fireball': this._tone(250, 0.2, 'sawtooth', 0.2); this._noise(0.15, 0.15); break;
        }
    },
    _tone(freq, dur, type, vol, delay) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        const t = this.ctx.currentTime + (delay || 0);
        gain.gain.setValueAtTime(vol || 0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + dur + 0.01);
    },
    _noise(dur, vol) {
        const bufferSize = this.ctx.sampleRate * dur;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol || 0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        source.connect(gain);
        gain.connect(this.masterGain);
        source.start();
    }
};

// ============================================================
// VOXEL HELPERS - Minecraft-style block building
// ============================================================
function createVoxelBox(w, h, d, color, shade) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const c = new THREE.Color(color);
    const darkerC = new THREE.Color(color).multiplyScalar(shade || 0.7);
    const lighterC = new THREE.Color(color).multiplyScalar(1.15);
    const materials = [
        new THREE.MeshLambertMaterial({ color: c }),
        new THREE.MeshLambertMaterial({ color: c }),
        new THREE.MeshLambertMaterial({ color: lighterC }),
        new THREE.MeshLambertMaterial({ color: darkerC }),
        new THREE.MeshLambertMaterial({ color: c }),
        new THREE.MeshLambertMaterial({ color: c })
    ];
    return new THREE.Mesh(geo, materials);
}

function createVoxelCharacter(config) {
    const group = new THREE.Group();

    const bodyW = config.bodyW || 1;
    const bodyH = config.bodyH || 1.2;
    const bodyD = config.bodyD || 0.6;
    const headS = config.headS || 0.8;
    const bodyY = config.bodyY || 0.6;

    // Body
    const body = createVoxelBox(bodyW, bodyH, bodyD, config.bodyColor);
    body.position.y = bodyY;
    group.add(body);

    // Head
    const head = createVoxelBox(headS, headS, headS, config.headColor);
    head.position.y = bodyY + bodyH / 2 + headS / 2;
    group.add(head);

    // Eyes
    if (config.eyeColor) {
        const eyeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.1);
        const eyeMat = new THREE.MeshLambertMaterial({ color: config.eyeColor, emissive: config.eyeColor, emissiveIntensity: 0.5 });
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.18, head.position.y + 0.08, headS / 2 + 0.01);
        eyeR.position.set(0.18, head.position.y + 0.08, headS / 2 + 0.01);
        group.add(eyeL, eyeR);
    }

    // Horns
    if (config.horns) {
        const hornGeo = new THREE.ConeGeometry(0.08, 0.4, 4);
        const hornMat = new THREE.MeshLambertMaterial({ color: config.hornColor || 0x333333 });
        const hornL = new THREE.Mesh(hornGeo, hornMat);
        const hornR = new THREE.Mesh(hornGeo, hornMat);
        hornL.position.set(-0.25, head.position.y + headS / 2 + 0.15, 0);
        hornR.position.set(0.25, head.position.y + headS / 2 + 0.15, 0);
        hornL.rotation.z = 0.3;
        hornR.rotation.z = -0.3;
        group.add(hornL, hornR);
    }

    // Arms
    const armW = 0.3, armH = bodyH * 0.8, armD = 0.3;
    const armColor = config.armColor || config.bodyColor;
    const armL = createVoxelBox(armW, armH, armD, armColor);
    const armR = createVoxelBox(armW, armH, armD, armColor);
    armL.position.set(-bodyW / 2 - armW / 2, bodyY, 0);
    armR.position.set(bodyW / 2 + armW / 2, bodyY, 0);
    group.add(armL, armR);
    group.userData.armL = armL;
    group.userData.armR = armR;

    // Legs
    const legW = 0.35, legH = 0.7, legD = 0.35;
    const legColor = config.legColor || config.bodyColor;
    const legL = createVoxelBox(legW, legH, legD, legColor);
    const legR = createVoxelBox(legW, legH, legD, legColor);
    legL.position.set(-0.22, -legH / 2 + 0.05, 0);
    legR.position.set(0.22, -legH / 2 + 0.05, 0);
    group.add(legL, legR);
    group.userData.legL = legL;
    group.userData.legR = legR;

    // Tail (demons)
    if (config.tail) {
        const tailGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.8, 4);
        const tailMat = new THREE.MeshLambertMaterial({ color: config.bodyColor });
        const tail = new THREE.Mesh(tailGeo, tailMat);
        tail.position.set(0, 0.2, -bodyD / 2 - 0.3);
        tail.rotation.x = -0.6;
        group.add(tail);
        const tipGeo = new THREE.ConeGeometry(0.1, 0.2, 3);
        const tipMat = new THREE.MeshLambertMaterial({ color: 0x330000 });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.set(0, -0.05, -bodyD / 2 - 0.65);
        tip.rotation.x = Math.PI / 2;
        group.add(tip);
    }

    // Wings (angels)
    if (config.wings) {
        const wingGeo = new THREE.PlaneGeometry(1.2, 1.0);
        const wingMat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
        const wingL = new THREE.Mesh(wingGeo, wingMat);
        const wingR = new THREE.Mesh(wingGeo, wingMat);
        wingL.position.set(-0.8, bodyY + 0.3, -0.1);
        wingR.position.set(0.8, bodyY + 0.3, -0.1);
        wingL.rotation.y = 0.4;
        wingR.rotation.y = -0.4;
        group.add(wingL, wingR);
        group.userData.wingL = wingL;
        group.userData.wingR = wingR;
    }

    // Halo (angels)
    if (config.halo) {
        const haloGeo = new THREE.TorusGeometry(0.35, 0.04, 8, 16);
        const haloMat = new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.5 });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.position.y = head.position.y + headS / 2 + 0.15;
        halo.rotation.x = Math.PI / 2;
        group.add(halo);
    }

    return group;
}

// ============================================================
// WEAPON DEFINITIONS
// ============================================================
const WEAPONS = {
    kropenka: {
        name: 'Kropenka', index: 0,
        damage: 15, fireRate: 0.25, range: 40, spread: 0.03,
        ammo: 30, maxAmmo: 30, reserve: 120, reloadTime: 1.5,
        pellets: 1, projectile: false, sound: 'shoot_pistol',
        color: 0x44aaff
    },
    kalich: {
        name: 'Svaty Kalich', index: 1,
        damage: 10, fireRate: 0.1, range: 35, spread: 0.06,
        ammo: 50, maxAmmo: 50, reserve: 200, reloadTime: 2.0,
        pellets: 1, projectile: false, sound: 'shoot_chalice',
        color: 0x44ddff
    },
    pumpa: {
        name: 'Svecena Pumpa', index: 2,
        damage: 9, fireRate: 0.7, range: 20, spread: 0.15,
        pellets: 8, ammo: 8, maxAmmo: 8, reserve: 40, reloadTime: 2.5,
        projectile: false, sound: 'shoot_shotgun',
        color: 0x88ccff
    },
    paprsek: {
        name: 'Nebesky Paprsek', index: 3,
        damage: 50, fireRate: 1.2, range: 80, spread: 0.0,
        ammo: 10, maxAmmo: 10, reserve: 30, reloadTime: 3.0,
        pellets: 1, projectile: false, sound: 'shoot_beam',
        color: 0xffff44
    },
    granat: {
        name: 'Svaty Granat', index: 4,
        damage: 80, fireRate: 1.5, range: 8, spread: 0,
        ammo: 3, maxAmmo: 3, reserve: 9, reloadTime: 2.0,
        pellets: 1, projectile: true, explosionRadius: 6, sound: 'shoot_grenade',
        color: 0xffaa00
    }
};
const WEAPON_KEYS = ['kropenka', 'kalich', 'pumpa', 'paprsek', 'granat'];

// ============================================================
// ENEMY DEFINITIONS
// ============================================================
const ENEMY_TYPES = {
    imp: {
        name: 'Certik', health: 30, speed: 5, damage: 8, attackRate: 1.0,
        score: 100, ranged: false,
        bodyColor: 0xcc3333, headColor: 0xdd4444, eyeColor: 0xffff00,
        horns: true, hornColor: 0x222222, tail: true, size: 0.8
    },
    demon: {
        name: 'Rohatec', health: 80, speed: 3.5, damage: 18, attackRate: 1.5,
        score: 250, ranged: false,
        bodyColor: 0x882222, headColor: 0x993333, eyeColor: 0xff4400,
        horns: true, hornColor: 0x111111, tail: true, size: 1.1,
        bodyW: 1.2, bodyH: 1.4
    },
    knight: {
        name: 'Pekelnik', health: 150, speed: 2.5, damage: 30, attackRate: 2.0,
        score: 500, ranged: false,
        bodyColor: 0x551111, headColor: 0x662222, eyeColor: 0xff0000,
        horns: true, hornColor: 0x000000, tail: true, size: 1.4,
        bodyW: 1.5, bodyH: 1.6, headS: 1.0
    },
    fire: {
        name: 'Ohnivec', health: 60, speed: 3, damage: 12, attackRate: 2.0,
        score: 350, ranged: true, projectileSpeed: 15,
        bodyColor: 0xff6600, headColor: 0xff8800, eyeColor: 0xffff00,
        horns: true, hornColor: 0x442200, tail: true, size: 1.0
    },
    boss: {
        name: 'Lucifer', health: 800, speed: 2, damage: 40, attackRate: 1.5,
        score: 2000, ranged: true, projectileSpeed: 12,
        bodyColor: 0x330000, headColor: 0x440000, eyeColor: 0xff0000,
        horns: true, hornColor: 0x000000, tail: true, size: 2.0,
        bodyW: 2.0, bodyH: 2.2, headS: 1.3
    }
};

// ============================================================
// WAVE DEFINITIONS (10 waves)
// ============================================================
const WAVES = [
    { enemies: [{ type: 'imp', count: 5 }], spawnInterval: 2.0 },
    { enemies: [{ type: 'imp', count: 8 }, { type: 'demon', count: 2 }], spawnInterval: 1.8 },
    { enemies: [{ type: 'imp', count: 6 }, { type: 'demon', count: 4 }, { type: 'fire', count: 1 }], spawnInterval: 1.6 },
    { enemies: [{ type: 'demon', count: 6 }, { type: 'fire', count: 3 }], spawnInterval: 1.5 },
    { enemies: [{ type: 'imp', count: 8 }, { type: 'demon', count: 5 }, { type: 'fire', count: 3 }, { type: 'knight', count: 1 }], spawnInterval: 1.3 },
    { enemies: [{ type: 'demon', count: 6 }, { type: 'knight', count: 3 }, { type: 'fire', count: 4 }], spawnInterval: 1.2 },
    { enemies: [{ type: 'imp', count: 10 }, { type: 'fire', count: 5 }, { type: 'knight', count: 3 }], spawnInterval: 1.0 },
    { enemies: [{ type: 'demon', count: 8 }, { type: 'knight', count: 5 }, { type: 'fire', count: 5 }], spawnInterval: 0.9 },
    { enemies: [{ type: 'knight', count: 6 }, { type: 'fire', count: 8 }, { type: 'demon', count: 6 }], spawnInterval: 0.8 },
    { enemies: [{ type: 'imp', count: 10 }, { type: 'demon', count: 8 }, { type: 'knight', count: 5 }, { type: 'fire', count: 6 }, { type: 'boss', count: 1 }], spawnInterval: 0.7 }
];

// ============================================================
// BONUS DEFINITIONS
// ============================================================
const BONUS_TYPES = {
    prayer:     { name: 'Modlitba',       duration: 0,  icon: '\u271D', color: 0xffd700, desc: 'Znici slabe nepratele', instant: true },
    holyGround: { name: 'Svecena Zeme',   duration: 10, icon: '\u2726', color: 0x88ff88, desc: 'Odpuzuje nepratele' },
    angelGlow:  { name: 'Andelska Zare',  duration: 8,  icon: '\u2605', color: 0xffffaa, desc: 'Nezranitelnost' },
    blessing:   { name: 'Pozehnani',      duration: 12, icon: '\u2720', color: 0xff88ff, desc: '2x poskozeni' },
    incense:    { name: 'Kadidlo',        duration: 10, icon: '\u2740', color: 0xaaaaff, desc: 'Zpomali nepratele' },
    healthPack: { name: 'Svata Voda',     duration: 0,  icon: '+',      color: 0x44ff44, desc: '+40 zdravi', instant: true },
    ammoPack:   { name: 'Municni Bedna',  duration: 0,  icon: '\u25A0', color: 0x44aaff, desc: 'Doplni munici', instant: true }
};

// ============================================================
// MAIN GAME CLASS
// ============================================================
class Game {
    constructor() {
        this.state = 'menu';
        this.clock = new THREE.Clock();

        // Player state
        this.player = this._defaultPlayer();

        // World
        this.arenaSize = 50;
        this.worldBlocks = [];

        // Entities
        this.enemies = [];
        this.projectiles = [];
        this.pickups = [];
        this.particles = [];
        this.angel = null;
        this.angelActive = false;

        // Waves
        this.currentWave = 0;
        this.waveActive = false;
        this.waveEnemiesRemaining = 0;
        this.waveSpawnQueue = [];
        this.waveSpawnTimer = 0;
        this.waveBreakTimer = 0;

        // Input
        this.keys = {};
        this.mouseLocked = false;
        this.shooting = false;
        this.nearPickup = null;

        // UI
        this.ui = {};

        // Weapon viewmodel
        this.weaponViewmodel = null;

        this._initRenderer();
        this._cacheUI();
        this._setupInput();
        this._gameLoop();
    }

    _defaultPlayer() {
        return {
            position: new THREE.Vector3(0, 1.7, 0),
            velocity: new THREE.Vector3(),
            yaw: 0, pitch: 0,
            health: 100, maxHealth: 100,
            lives: 3, maxLives: 5,
            speed: 8, jumpForce: 8,
            onGround: true,
            currentWeapon: 'kropenka',
            weapons: {},
            fireTimer: 0, reloading: false, reloadTimer: 0,
            score: 0,
            activeBonuses: {},
            invulnerable: false,
            damageMultiplier: 1
        };
    }

    // ========================================================
    // RENDERER
    // ========================================================
    _initRenderer() {
        const canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.renderer.setClearColor(0x1a0a2e);

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x1a0a2e, 0.012);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    }

    // ========================================================
    // UI CACHE
    // ========================================================
    _cacheUI() {
        const ids = [
            'menu-screen', 'game-over-screen', 'victory-screen',
            'hud', 'health-bar', 'lives-display', 'wave-display',
            'score-display', 'weapon-display', 'ammo-display', 'enemies-display',
            'wave-announce', 'bonus-announce', 'angel-message', 'pickup-hint',
            'damage-overlay', 'crosshair', 'active-bonuses',
            'go-score', 'go-wave', 'vic-score'
        ];
        ids.forEach(id => { this.ui[id] = document.getElementById(id); });
    }

    // ========================================================
    // INPUT
    // ========================================================
    _setupInput() {
        document.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (this.state !== 'playing') return;

            if (e.key >= '1' && e.key <= '5') {
                const idx = parseInt(e.key) - 1;
                if (WEAPON_KEYS[idx] && !this.player.reloading) {
                    this.player.currentWeapon = WEAPON_KEYS[idx];
                    this._updateWeaponViewmodel();
                }
            }
            if (e.code === 'KeyR' && !this.player.reloading) this._startReload();
            if (e.code === 'KeyE' && this.nearPickup) this._collectPickup(this.nearPickup);
            if (e.code === 'KeyQ') this._useSpecialAbility();
        });

        document.addEventListener('keyup', e => { this.keys[e.code] = false; });

        document.addEventListener('mousedown', e => {
            if (e.button === 0 && this.state === 'playing' && this.mouseLocked) this.shooting = true;
        });
        document.addEventListener('mouseup', e => {
            if (e.button === 0) this.shooting = false;
        });

        document.addEventListener('mousemove', e => {
            if (this.state !== 'playing' || !this.mouseLocked) return;
            this.player.yaw -= e.movementX * 0.002;
            this.player.pitch -= e.movementY * 0.002;
            this.player.pitch = Math.max(-1.4, Math.min(1.4, this.player.pitch));
        });

        const canvas = document.getElementById('game-canvas');
        canvas.addEventListener('click', () => {
            if (this.state === 'playing' && !this.mouseLocked) canvas.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            this.mouseLocked = document.pointerLockElement === document.getElementById('game-canvas');
            this.ui['crosshair'].classList.toggle('hidden', !this.mouseLocked);
        });

        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('victory-restart-btn').addEventListener('click', () => this.startGame());

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // ========================================================
    // GAME START
    // ========================================================
    startGame() {
        Audio.init();
        this.state = 'playing';

        this.ui['menu-screen'].style.display = 'none';
        this.ui['game-over-screen'].style.display = 'none';
        this.ui['victory-screen'].style.display = 'none';
        this.ui['hud'].style.display = 'flex';

        // Reset player
        const p = this.player;
        p.position.set(0, 1.7, 0);
        p.velocity.set(0, 0, 0);
        p.yaw = 0; p.pitch = 0;
        p.health = 100; p.lives = 3;
        p.score = 0; p.invulnerable = false;
        p.damageMultiplier = 1; p.activeBonuses = {};
        p.fireTimer = 0; p.reloading = false; p.reloadTimer = 0;
        p.currentWeapon = 'kropenka';

        p.weapons = {};
        for (const [key, w] of Object.entries(WEAPONS)) {
            p.weapons[key] = { ammo: w.ammo, reserve: w.reserve };
        }

        // Clear scene
        this._clearScene();
        this._setupLights();
        this._buildWorld();
        this._createWeaponViewmodel();

        // Reset entities
        this.enemies = [];
        this.projectiles = [];
        this.pickups = [];
        this.particles = [];
        this.angel = null;
        this.angelActive = false;
        this.currentWave = 0;
        this.waveActive = false;
        this.waveBreakTimer = 3;
        this.shooting = false;
        this.nearPickup = null;

        document.getElementById('game-canvas').requestPointerLock();
    }

    _clearScene() {
        while (this.scene.children.length > 0) {
            const c = this.scene.children[0];
            this.scene.remove(c);
        }
        this.worldBlocks = [];
    }

    // ========================================================
    // LIGHTS
    // ========================================================
    _setupLights() {
        this.scene.add(new THREE.AmbientLight(0x334466, 0.6));

        const dir = new THREE.DirectionalLight(0xffeedd, 0.8);
        dir.position.set(30, 50, 20);
        dir.castShadow = true;
        dir.shadow.mapSize.set(1024, 1024);
        dir.shadow.camera.left = -60; dir.shadow.camera.right = 60;
        dir.shadow.camera.top = 60; dir.shadow.camera.bottom = -60;
        this.scene.add(dir);

        const redL = new THREE.PointLight(0xff2200, 0.4, 80);
        redL.position.set(0, 15, 0);
        this.scene.add(redL);
    }

    // ========================================================
    // WORLD BUILDING
    // ========================================================
    _buildWorld() {
        const S = this.arenaSize;

        // Ground
        const groundGeo = new THREE.PlaneGeometry(S * 2, S * 2, 1, 1);
        const groundMat = new THREE.MeshLambertMaterial({ color: 0x3a6b35 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Stone patches
        for (let i = 0; i < 60; i++) {
            const x = (Math.random() - 0.5) * S * 1.6;
            const z = (Math.random() - 0.5) * S * 1.6;
            const block = createVoxelBox(1 + Math.random() * 2, 0.15, 1 + Math.random() * 2,
                Math.random() > 0.5 ? 0x666666 : 0x555544);
            block.position.set(x, 0.075, z);
            block.receiveShadow = true;
            this.scene.add(block);
        }

        // Perimeter walls
        const wH = 5;
        for (let i = -S; i <= S; i += 2) {
            this._addBlock(i, wH / 2, -S, 2, wH, 2, 0x554433, true);
            this._addBlock(i, wH / 2, S, 2, wH, 2, 0x554433, true);
            this._addBlock(-S, wH / 2, i, 2, wH, 2, 0x554433, true);
            this._addBlock(S, wH / 2, i, 2, wH, 2, 0x554433, true);
        }

        // Cover structures
        const structs = [
            { x: 10, z: 10, w: 3, h: 2, d: 3 }, { x: -15, z: 8, w: 4, h: 3, d: 2 },
            { x: 8, z: -12, w: 2, h: 2.5, d: 4 }, { x: -10, z: -15, w: 5, h: 2, d: 3 },
            { x: 20, z: -5, w: 3, h: 4, d: 3 }, { x: -20, z: 20, w: 4, h: 2, d: 4 },
            { x: 0, z: 20, w: 6, h: 1.5, d: 2 }, { x: -25, z: -8, w: 3, h: 3, d: 5 },
            { x: 15, z: 22, w: 2, h: 2, d: 2 }, { x: -5, z: -25, w: 4, h: 2.5, d: 3 }
        ];
        const sColors = [0x887766, 0x776655, 0x665544, 0x998877, 0x554433];
        structs.forEach(s => {
            const c = sColors[Math.floor(Math.random() * sColors.length)];
            for (let bx = 0; bx < s.w; bx++) {
                for (let by = 0; by < s.h; by++) {
                    for (let bz = 0; bz < s.d; bz++) {
                        if (Math.random() < 0.15) continue;
                        const vc = c + Math.floor(Math.random() * 0x0a0a0a);
                        this._addBlock(s.x + bx, by + 0.5, s.z + bz, 1, 1, 1, vc, true);
                    }
                }
            }
        });

        // Church in center
        this._buildChurch();

        // Trees
        for (let i = 0; i < 15; i++) {
            const tx = (Math.random() - 0.5) * S * 1.5;
            const tz = (Math.random() - 0.5) * S * 1.5;
            if (Math.abs(tx) < 8 && Math.abs(tz) < 8) continue;
            this._buildTree(tx, tz);
        }

        // Lava pools
        for (let i = 0; i < 5; i++) {
            const lx = (Math.random() - 0.5) * S * 1.4;
            const lz = (Math.random() - 0.5) * S * 1.4;
            if (Math.abs(lx) < 12 && Math.abs(lz) < 12) continue;
            const lavaGeo = new THREE.PlaneGeometry(3 + Math.random() * 3, 3 + Math.random() * 3);
            const lavaMat = new THREE.MeshLambertMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.5 });
            const lava = new THREE.Mesh(lavaGeo, lavaMat);
            lava.rotation.x = -Math.PI / 2;
            lava.position.set(lx, 0.02, lz);
            this.scene.add(lava);
            const ll = new THREE.PointLight(0xff4400, 0.5, 10);
            ll.position.set(lx, 1, lz);
            this.scene.add(ll);
        }

        // Distant mountains
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            const dist = S + 20 + Math.random() * 15;
            const h = 8 + Math.random() * 15;
            const m = createVoxelBox(6 + Math.random() * 8, h, 6 + Math.random() * 8, 0x332244);
            m.position.set(Math.cos(angle) * dist, h / 2, Math.sin(angle) * dist);
            this.scene.add(m);
        }
    }

    _addBlock(x, y, z, w, h, d, color, collider) {
        const block = createVoxelBox(w, h, d, color);
        block.position.set(x, y, z);
        block.castShadow = true;
        block.receiveShadow = true;
        this.scene.add(block);
        if (collider) {
            this.worldBlocks.push({ pos: new THREE.Vector3(x, y, z), size: new THREE.Vector3(w, h, d) });
        }
    }

    _buildChurch() {
        // Floor
        for (let x = -4; x <= 4; x++) {
            for (let z = -3; z <= 3; z++) {
                const tile = createVoxelBox(1, 0.2, 1, 0xddddbb);
                tile.position.set(x, 0.1, z);
                this.scene.add(tile);
            }
        }
        // Pillars
        [[-4, -3], [4, -3], [-4, 3], [4, 3]].forEach(([px, pz]) => {
            for (let y = 0; y < 6; y++) {
                this._addBlock(px, y + 0.5, pz, 1, 1, 1, 0xccccaa, true);
            }
        });
        // Cross
        const cV = createVoxelBox(0.3, 2, 0.3, 0xffd700);
        cV.position.set(0, 7, 0);
        this.scene.add(cV);
        const cH = createVoxelBox(1.2, 0.3, 0.3, 0xffd700);
        cH.position.set(0, 7.5, 0);
        this.scene.add(cH);
        // Holy light
        const hl = new THREE.PointLight(0xffd700, 1, 20);
        hl.position.set(0, 6, 0);
        this.scene.add(hl);
    }

    _buildTree(x, z) {
        for (let y = 0; y < 4; y++) {
            this._addBlock(x, y + 0.5, z, 1, 1, 1, 0x664422, true);
        }
        for (let lx = -2; lx <= 2; lx++) {
            for (let lz = -2; lz <= 2; lz++) {
                for (let ly = 0; ly < 3; ly++) {
                    if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && ly > 0) continue;
                    if (ly === 2 && (Math.abs(lx) > 1 || Math.abs(lz) > 1)) continue;
                    if (Math.random() > 0.8) continue;
                    const leaf = createVoxelBox(1, 1, 1, 0x1a4a1a + Math.floor(Math.random() * 0x0a2a0a));
                    leaf.position.set(x + lx, 4 + ly + 0.5, z + lz);
                    this.scene.add(leaf);
                }
            }
        }
    }

    // ========================================================
    // WEAPON VIEWMODEL (first-person weapon display)
    // ========================================================
    _createWeaponViewmodel() {
        if (this.weaponViewmodel) this.camera.remove(this.weaponViewmodel);

        const group = new THREE.Group();
        const w = WEAPONS[this.player.currentWeapon];

        // Simple block weapon representation
        const bodyGeo = new THREE.BoxGeometry(0.12, 0.12, 0.5);
        const bodyMat = new THREE.MeshLambertMaterial({ color: w.color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);

        const handleGeo = new THREE.BoxGeometry(0.08, 0.2, 0.08);
        const handleMat = new THREE.MeshLambertMaterial({ color: 0x664422 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(0, -0.12, 0.1);

        group.add(body, handle);
        group.position.set(0.3, -0.25, -0.5);
        group.rotation.set(0, 0, 0);

        this.camera.add(group);
        this.scene.add(this.camera);
        this.weaponViewmodel = group;
    }

    _updateWeaponViewmodel() {
        this._createWeaponViewmodel();
    }

    // ========================================================
    // GAME LOOP
    // ========================================================
    _gameLoop() {
        requestAnimationFrame(() => this._gameLoop());
        const dt = Math.min(this.clock.getDelta(), 0.05);

        if (this.state === 'playing') {
            this._updatePlayer(dt);
            this._updateWeapon(dt);
            this._updateEnemies(dt);
            this._updateProjectiles(dt);
            this._updateParticles(dt);
            this._updatePickups(dt);
            this._updateAngel(dt);
            this._updateWaves(dt);
            this._updateBonuses(dt);
            this._updateCamera();
            this._updateViewmodel(dt);
            this._updateHUD();
        }

        this.renderer.render(this.scene, this.camera);
    }

    // ========================================================
    // PLAYER
    // ========================================================
    _updatePlayer(dt) {
        const p = this.player;
        const fwd = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
        const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));

        const move = new THREE.Vector3();
        if (this.keys['KeyW']) move.add(fwd);
        if (this.keys['KeyS']) move.sub(fwd);
        if (this.keys['KeyA']) move.sub(right);
        if (this.keys['KeyD']) move.add(right);
        if (move.lengthSq() > 0) move.normalize().multiplyScalar(p.speed);

        // Horizontal collision
        const nx = p.position.x + move.x * dt;
        const nz = p.position.z + move.z * dt;
        if (!this._collide(nx, p.position.y, p.position.z, 0.4)) p.position.x = nx;
        if (!this._collide(p.position.x, p.position.y, nz, 0.4)) p.position.z = nz;

        // Bounds
        const B = this.arenaSize - 1;
        p.position.x = Math.max(-B, Math.min(B, p.position.x));
        p.position.z = Math.max(-B, Math.min(B, p.position.z));

        // Jump
        if (this.keys['Space'] && p.onGround) {
            p.velocity.y = p.jumpForce;
            p.onGround = false;
        }

        // Gravity
        p.velocity.y -= 20 * dt;
        p.position.y += p.velocity.y * dt;
        if (p.position.y <= 1.7) { p.position.y = 1.7; p.velocity.y = 0; p.onGround = true; }

        // Shooting
        if (this.shooting && p.fireTimer <= 0 && !p.reloading) this._fire();
        if (p.fireTimer > 0) p.fireTimer -= dt;
    }

    _collide(x, y, z, r) {
        for (const b of this.worldBlocks) {
            if (Math.abs(x - b.pos.x) < b.size.x / 2 + r &&
                Math.abs(y - b.pos.y) < b.size.y / 2 + 0.5 &&
                Math.abs(z - b.pos.z) < b.size.z / 2 + r) return true;
        }
        return false;
    }

    // ========================================================
    // CAMERA
    // ========================================================
    _updateCamera() {
        this.camera.position.copy(this.player.position);
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.player.yaw;
        this.camera.rotation.x = this.player.pitch;
    }

    _updateViewmodel(dt) {
        if (!this.weaponViewmodel) return;
        // Weapon sway
        const sway = Math.sin(Date.now() * 0.003) * 0.005;
        this.weaponViewmodel.position.y = -0.25 + sway;

        // Recoil animation
        if (this.player.fireTimer > 0) {
            const w = WEAPONS[this.player.currentWeapon];
            const t = this.player.fireTimer / w.fireRate;
            this.weaponViewmodel.rotation.x = -t * 0.3;
            this.weaponViewmodel.position.z = -0.5 + t * 0.1;
        } else {
            this.weaponViewmodel.rotation.x *= 0.9;
            this.weaponViewmodel.position.z += (-0.5 - this.weaponViewmodel.position.z) * 0.1;
        }
    }

    // ========================================================
    // WEAPON
    // ========================================================
    _updateWeapon(dt) {
        const p = this.player;
        if (!p.reloading) return;
        p.reloadTimer -= dt;
        if (p.reloadTimer <= 0) {
            p.reloading = false;
            const w = WEAPONS[p.currentWeapon];
            const ws = p.weapons[p.currentWeapon];
            const need = w.maxAmmo - ws.ammo;
            const avail = Math.min(need, ws.reserve);
            ws.ammo += avail;
            ws.reserve -= avail;
        }
    }

    _startReload() {
        const p = this.player;
        const w = WEAPONS[p.currentWeapon];
        const ws = p.weapons[p.currentWeapon];
        if (ws.ammo >= w.maxAmmo || ws.reserve <= 0) return;
        p.reloading = true;
        p.reloadTimer = w.reloadTime;
        Audio.play('reload');
    }

    _fire() {
        const p = this.player;
        const w = WEAPONS[p.currentWeapon];
        const ws = p.weapons[p.currentWeapon];

        if (ws.ammo <= 0) {
            Audio.play('no_ammo');
            if (ws.reserve > 0) this._startReload();
            return;
        }

        ws.ammo--;
        p.fireTimer = w.fireRate;
        Audio.play(w.sound);

        if (w.projectile) {
            this._fireGrenade(w);
        } else {
            const pellets = w.pellets || 1;
            for (let i = 0; i < pellets; i++) this._fireRay(w);
        }

        if (ws.ammo <= 0 && ws.reserve > 0) this._startReload();
    }

    _fireRay(w) {
        const p = this.player;
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), p.pitch);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);
        dir.x += (Math.random() - 0.5) * w.spread;
        dir.y += (Math.random() - 0.5) * w.spread;
        dir.z += (Math.random() - 0.5) * w.spread;
        dir.normalize();

        const dmg = w.damage * p.damageMultiplier;

        // Tracer
        this._tracer(p.position, dir, w);

        // Hit test
        let bestEnemy = null, bestDist = Infinity;
        for (const e of this.enemies) {
            if (!e.alive) continue;
            const toE = new THREE.Vector3().subVectors(e.mesh.position, p.position);
            const proj = toE.dot(dir);
            if (proj < 0 || proj > w.range) continue;
            const closest = dir.clone().multiplyScalar(proj).add(p.position);
            const d = closest.distanceTo(e.mesh.position);
            const hr = (e.type.size || 1) * 0.6;
            if (d < hr && proj < bestDist) { bestDist = proj; bestEnemy = e; }
        }
        if (bestEnemy) this._damageEnemy(bestEnemy, dmg);
    }

    _fireGrenade(w) {
        const p = this.player;
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), p.pitch);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);

        const geo = new THREE.SphereGeometry(0.2, 6, 6);
        const mat = new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 0.3 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(p.position);
        this.scene.add(mesh);

        this.projectiles.push({
            mesh,
            velocity: dir.clone().multiplyScalar(20).add(new THREE.Vector3(0, 5, 0)),
            type: 'grenade', damage: w.damage * p.damageMultiplier,
            radius: w.explosionRadius, life: 3, friendly: true
        });
    }

    _tracer(origin, dir, w) {
        const len = Math.min(w.range, 30);
        const geo = new THREE.CylinderGeometry(0.015, 0.015, len, 3);
        geo.rotateX(Math.PI / 2);
        const color = w === WEAPONS.paprsek ? 0xffff44 : w.color;
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(origin).add(dir.clone().multiplyScalar(len / 2));
        mesh.lookAt(origin.clone().add(dir.clone().multiplyScalar(len)));
        this.scene.add(mesh);
        this.particles.push({ mesh, life: 0.08, maxLife: 0.08, type: 'tracer' });
    }

    // ========================================================
    // ENEMIES
    // ========================================================
    _spawnEnemy(typeName) {
        const t = ENEMY_TYPES[typeName];
        const config = {
            bodyColor: t.bodyColor, headColor: t.headColor, eyeColor: t.eyeColor,
            horns: t.horns, hornColor: t.hornColor, tail: t.tail,
            bodyW: t.bodyW, bodyH: t.bodyH, headS: t.headS,
            bodyD: 0.6, legColor: t.bodyColor, armColor: t.bodyColor
        };
        const mesh = createVoxelCharacter(config);
        if (t.size !== 1) mesh.scale.setScalar(t.size);

        // Spawn at edges
        const S = this.arenaSize - 3;
        const side = Math.floor(Math.random() * 4);
        let x, z;
        if (side === 0) { x = -S; z = (Math.random() - 0.5) * S * 2; }
        else if (side === 1) { x = S; z = (Math.random() - 0.5) * S * 2; }
        else if (side === 2) { z = -S; x = (Math.random() - 0.5) * S * 2; }
        else { z = S; x = (Math.random() - 0.5) * S * 2; }
        mesh.position.set(x, 0, z);

        this.scene.add(mesh);

        // Health bar
        const hbMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        const hb = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.1), hbMat);
        const hbBg = new THREE.Mesh(
            new THREE.PlaneGeometry(1.05, 0.15),
            new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })
        );
        const headY = ((t.bodyH || 1.2) + (t.headS || 0.8) + 0.5) * (t.size || 1);
        hb.position.y = headY;
        hbBg.position.y = headY;
        mesh.add(hbBg);
        mesh.add(hb);

        this.enemies.push({
            mesh, type: t, typeName,
            health: t.health, maxHealth: t.health,
            alive: true, attackTimer: t.attackRate,
            animTimer: Math.random() * 6.28,
            stunTimer: 0, healthBar: hb
        });
    }

    _updateEnemies(dt) {
        const p = this.player;
        const slow = p.activeBonuses.incense ? 0.4 : 1;

        for (const e of this.enemies) {
            if (!e.alive) continue;

            if (e.stunTimer > 0) { e.stunTimer -= dt; continue; }

            const ePos = e.mesh.position;
            const toP = new THREE.Vector3(p.position.x - ePos.x, 0, p.position.z - ePos.z);
            const dist = toP.length();

            // Holy Ground repel
            if (p.activeBonuses.holyGround && dist < 6) {
                const repel = toP.normalize().multiplyScalar(-e.type.speed * 2 * dt);
                ePos.add(repel);
                continue;
            }

            // Move toward player
            const attackDist = e.type.ranged ? 15 : 1.8;
            if (dist > attackDist) {
                const mv = toP.normalize().multiplyScalar(e.type.speed * slow * dt);
                ePos.add(mv);
            }

            // Face player
            e.mesh.lookAt(new THREE.Vector3(p.position.x, ePos.y, p.position.z));

            // Walking animation
            e.animTimer += dt * 5;
            if (e.mesh.userData.legL) {
                e.mesh.userData.legL.rotation.x = Math.sin(e.animTimer) * 0.5;
                e.mesh.userData.legR.rotation.x = -Math.sin(e.animTimer) * 0.5;
                e.mesh.userData.armL.rotation.x = -Math.sin(e.animTimer) * 0.4;
                e.mesh.userData.armR.rotation.x = Math.sin(e.animTimer) * 0.4;
            }

            // Attack
            e.attackTimer -= dt;
            if (e.attackTimer <= 0) {
                if (e.type.ranged && dist > 3 && dist < 40) {
                    this._enemyShoot(e);
                    e.attackTimer = e.type.attackRate;
                } else if (dist < 2.5) {
                    this._playerTakeDamage(e.type.damage);
                    e.attackTimer = e.type.attackRate;
                    Audio.play('enemy_attack');
                }
            }

            // Health bar update
            const hp = e.health / e.maxHealth;
            e.healthBar.scale.x = Math.max(0.01, hp);
            e.healthBar.material.color.setHex(hp > 0.5 ? 0x00ff00 : hp > 0.25 ? 0xffaa00 : 0xff0000);

            // Boss glow
            if (e.typeName === 'boss') {
                ePos.y = Math.sin(e.animTimer * 0.5) * 0.2;
            }
        }
    }

    _enemyShoot(enemy) {
        const dir = new THREE.Vector3().subVectors(this.player.position, enemy.mesh.position).normalize();
        const geo = new THREE.SphereGeometry(0.2, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(enemy.mesh.position);
        mesh.position.y += 1;

        const light = new THREE.PointLight(0xff4400, 0.5, 5);
        mesh.add(light);
        this.scene.add(mesh);

        this.projectiles.push({
            mesh, velocity: dir.multiplyScalar(enemy.type.projectileSpeed || 12),
            type: 'fireball', damage: enemy.type.damage,
            life: 4, friendly: false
        });
        Audio.play('fireball');
    }

    _damageEnemy(enemy, damage) {
        if (!enemy.alive) return;
        enemy.health -= damage;
        enemy.stunTimer = 0.1;
        Audio.play('hit');
        this._spawnParticles(enemy.mesh.position.clone().setY(enemy.mesh.position.y + 1), 0x44aaff, 5);

        if (enemy.health <= 0) {
            enemy.alive = false;
            Audio.play('enemy_die');
            this.player.score += enemy.type.score;
            this.waveEnemiesRemaining--;
            this._spawnParticles(enemy.mesh.position.clone().setY(0.8), enemy.type.bodyColor, 15);
            if (Math.random() < 0.25) this._spawnPickup(enemy.mesh.position.clone());
            this.scene.remove(enemy.mesh);
        }
    }

    // ========================================================
    // PROJECTILES
    // ========================================================
    _updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const pr = this.projectiles[i];
            pr.life -= dt;

            if (pr.type === 'grenade') pr.velocity.y -= 15 * dt;

            pr.mesh.position.add(pr.velocity.clone().multiplyScalar(dt));
            pr.mesh.rotation.x += dt * 3;

            // Grenade ground hit
            if (pr.type === 'grenade' && pr.mesh.position.y <= 0.2) {
                this._explode(pr);
                this.scene.remove(pr.mesh);
                this.projectiles.splice(i, 1);
                continue;
            }

            // Fireball hits player
            if (!pr.friendly && pr.mesh.position.distanceTo(this.player.position) < 1) {
                this._playerTakeDamage(pr.damage);
                this._spawnParticles(pr.mesh.position.clone(), 0xff4400, 8);
                this.scene.remove(pr.mesh);
                this.projectiles.splice(i, 1);
                continue;
            }

            if (pr.life <= 0) {
                if (pr.type === 'grenade') this._explode(pr);
                this.scene.remove(pr.mesh);
                this.projectiles.splice(i, 1);
            }
        }
    }

    _explode(pr) {
        Audio.play('explosion');
        this._spawnParticles(pr.mesh.position.clone(), 0xffd700, 25);
        this._spawnParticles(pr.mesh.position.clone(), 0xff6600, 20);

        const light = new THREE.PointLight(0xff8800, 3, 15);
        light.position.copy(pr.mesh.position);
        this.scene.add(light);
        setTimeout(() => this.scene.remove(light), 300);

        for (const e of this.enemies) {
            if (!e.alive) continue;
            const d = e.mesh.position.distanceTo(pr.mesh.position);
            if (d < pr.radius) this._damageEnemy(e, pr.damage * (1 - d / pr.radius));
        }
    }

    // ========================================================
    // PARTICLES
    // ========================================================
    _spawnParticles(pos, color, count) {
        for (let i = 0; i < count; i++) {
            const s = 0.08 + Math.random() * 0.15;
            const geo = new THREE.BoxGeometry(s, s, s);
            const mat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(color).offsetHSL(0, 0, (Math.random() - 0.5) * 0.3),
                transparent: true
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos).add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5
            ));
            this.scene.add(mesh);
            this.particles.push({
                mesh,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 5, Math.random() * 5 + 2, (Math.random() - 0.5) * 5
                ),
                life: 0.5 + Math.random() * 0.5, maxLife: 1, type: 'particle'
            });
        }
    }

    _updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pa = this.particles[i];
            pa.life -= dt;
            if (pa.life <= 0) {
                this.scene.remove(pa.mesh);
                this.particles.splice(i, 1);
                continue;
            }
            if (pa.velocity) {
                pa.velocity.y -= 10 * dt;
                pa.mesh.position.add(pa.velocity.clone().multiplyScalar(dt));
            }
            if (pa.mesh.material.opacity !== undefined) {
                pa.mesh.material.opacity = Math.max(0, pa.life / pa.maxLife);
            }
            pa.mesh.rotation.x += dt * 3;
            pa.mesh.rotation.z += dt * 2;
        }
    }

    // ========================================================
    // PLAYER DAMAGE / LIVES
    // ========================================================
    _playerTakeDamage(damage) {
        const p = this.player;
        if (p.invulnerable) return;

        p.health -= damage;
        Audio.play('player_hurt');
        this.ui['damage-overlay'].style.opacity = '0.6';
        setTimeout(() => { this.ui['damage-overlay'].style.opacity = '0'; }, 200);

        if (p.health <= 0) {
            p.lives--;
            if (p.lives <= 0) {
                this._gameOver();
            } else {
                p.health = p.maxHealth;
                p.invulnerable = true;
                setTimeout(() => { p.invulnerable = false; }, 2000);
                this._spawnAngel();
            }
        }
    }

    // ========================================================
    // ANGEL SYSTEM
    // ========================================================
    _spawnAngel() {
        if (this.angelActive) return;

        const config = {
            bodyColor: 0xffffff, headColor: 0xffeedd, eyeColor: 0x4488ff,
            wings: true, halo: true, bodyW: 0.8, bodyH: 1.0,
            legColor: 0xeeeeff, armColor: 0xffffff
        };
        const mesh = createVoxelCharacter(config);
        mesh.scale.setScalar(0.8);

        const angle = Math.random() * Math.PI * 2;
        const dist = 8 + Math.random() * 10;
        mesh.position.set(
            this.player.position.x + Math.cos(angle) * dist,
            2 + Math.random() * 3,
            this.player.position.z + Math.sin(angle) * dist
        );

        const glow = new THREE.PointLight(0xffffff, 1, 10);
        glow.position.y = 1;
        mesh.add(glow);

        this.scene.add(mesh);
        this.angel = { mesh, timer: 15, bobTimer: 0 };
        this.angelActive = true;

        this._announce('angel-message', 'Andel se zjevil! Dotkni se ho! [E]', 3000);
        Audio.play('angel');
    }

    _updateAngel(dt) {
        if (!this.angelActive || !this.angel) return;

        this.angel.timer -= dt;
        this.angel.bobTimer += dt;
        this.angel.mesh.position.y = 2 + Math.sin(this.angel.bobTimer * 2) * 0.5;
        this.angel.mesh.rotation.y += dt * 1.5;

        if (this.angel.mesh.userData.wingL) {
            this.angel.mesh.userData.wingL.rotation.y = 0.4 + Math.sin(this.angel.bobTimer * 4) * 0.2;
            this.angel.mesh.userData.wingR.rotation.y = -0.4 - Math.sin(this.angel.bobTimer * 4) * 0.2;
        }

        const dist = this.angel.mesh.position.distanceTo(this.player.position);
        if (dist < 3) {
            this.ui['pickup-hint'].textContent = 'Stiskni [E] pro zachranu andela!';
            this.ui['pickup-hint'].style.opacity = '1';
            this.nearPickup = { type: 'angel' };
        } else if (this.nearPickup && this.nearPickup.type === 'angel') {
            this.ui['pickup-hint'].style.opacity = '0';
            this.nearPickup = null;
        }

        if (this.angel.timer <= 0) {
            this.scene.remove(this.angel.mesh);
            this.angel = null;
            this.angelActive = false;
            if (this.nearPickup && this.nearPickup.type === 'angel') {
                this.nearPickup = null;
                this.ui['pickup-hint'].style.opacity = '0';
            }
        }
    }

    _rescueAngel() {
        if (!this.angelActive) return;
        this.player.lives = Math.min(this.player.lives + 1, this.player.maxLives);
        this._announce('angel-message', '+1 Zivot! Andel te pozehnal!', 2500);
        Audio.play('angel');
        this._spawnParticles(this.angel.mesh.position.clone(), 0xffffff, 20);
        this._spawnParticles(this.angel.mesh.position.clone(), 0xffd700, 15);
        this.scene.remove(this.angel.mesh);
        this.angel = null;
        this.angelActive = false;
        this.nearPickup = null;
        this.ui['pickup-hint'].style.opacity = '0';
    }

    // ========================================================
    // PICKUPS / BONUSES
    // ========================================================
    _spawnPickup(pos) {
        const types = Object.keys(BONUS_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];
        const bt = BONUS_TYPES[type];

        const group = new THREE.Group();
        const cubeGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const cubeMat = new THREE.MeshLambertMaterial({
            color: bt.color, emissive: bt.color, emissiveIntensity: 0.4,
            transparent: true, opacity: 0.9
        });
        group.add(new THREE.Mesh(cubeGeo, cubeMat));

        const light = new THREE.PointLight(bt.color, 0.5, 6);
        light.position.y = 0.5;
        group.add(light);

        pos.y = 0.8;
        group.position.copy(pos);
        this.scene.add(group);

        this.pickups.push({
            mesh: group, type, bonusType: bt,
            bobTimer: Math.random() * 6.28, life: 20
        });
    }

    _updatePickups(dt) {
        let nearest = null, nearestD = Infinity;

        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const pk = this.pickups[i];
            pk.life -= dt;
            pk.bobTimer += dt;
            pk.mesh.position.y = 0.8 + Math.sin(pk.bobTimer * 3) * 0.2;
            pk.mesh.rotation.y += dt * 2;

            if (pk.life < 5) pk.mesh.visible = Math.sin(pk.life * 10) > 0;

            const d = pk.mesh.position.distanceTo(this.player.position);
            if (d < 2.5 && d < nearestD) { nearestD = d; nearest = pk; }

            if (pk.life <= 0) {
                this.scene.remove(pk.mesh);
                this.pickups.splice(i, 1);
            }
        }

        if (nearest && !(this.nearPickup && this.nearPickup.type === 'angel' && this.angelActive)) {
            this.nearPickup = nearest;
            this.ui['pickup-hint'].textContent = `[E] ${nearest.bonusType.name}: ${nearest.bonusType.desc}`;
            this.ui['pickup-hint'].style.opacity = '1';
        } else if (!nearest && this.nearPickup && this.nearPickup.type !== 'angel') {
            this.nearPickup = null;
            this.ui['pickup-hint'].style.opacity = '0';
        }
    }

    _collectPickup(pickup) {
        if (pickup.type === 'angel') { this._rescueAngel(); return; }

        const bt = pickup.bonusType;
        Audio.play('pickup');

        if (bt.instant) {
            switch(pickup.type) {
                case 'prayer': this._activatePrayer(); break;
                case 'healthPack':
                    this.player.health = Math.min(this.player.health + 40, this.player.maxHealth);
                    this._announce('bonus-announce', '+40 Zdravi!', 1500);
                    break;
                case 'ammoPack':
                    for (const ws of Object.values(this.player.weapons)) ws.reserve += 30;
                    this._announce('bonus-announce', 'Munice doplnena!', 1500);
                    break;
            }
        } else {
            this.player.activeBonuses[pickup.type] = bt.duration;
            this._applyBonus(pickup.type, true);
            this._announce('bonus-announce', `${bt.name} aktivovano! (${bt.duration}s)`, 2000);
            Audio.play('bonus_activate');
        }

        this._spawnParticles(pickup.mesh.position.clone(), bt.color, 10);
        this.scene.remove(pickup.mesh);
        const idx = this.pickups.indexOf(pickup);
        if (idx >= 0) this.pickups.splice(idx, 1);
        this.nearPickup = null;
        this.ui['pickup-hint'].style.opacity = '0';
    }

    _activatePrayer() {
        Audio.play('prayer');
        this._announce('bonus-announce', 'MODLITBA! Slabi nepratele zniceni!', 2500);

        this.ui['damage-overlay'].style.background =
            'radial-gradient(ellipse at center, rgba(255,255,200,0.8) 0%, rgba(255,215,0,0.3) 100%)';
        this.ui['damage-overlay'].style.opacity = '0.8';
        setTimeout(() => {
            this.ui['damage-overlay'].style.opacity = '0';
            setTimeout(() => {
                this.ui['damage-overlay'].style.background =
                    'radial-gradient(ellipse at center, transparent 40%, rgba(255,0,0,0.5) 100%)';
            }, 500);
        }, 500);

        for (const e of this.enemies) {
            if (!e.alive) continue;
            this._damageEnemy(e, e.health <= 60 ? 9999 : 50);
        }
    }

    _applyBonus(type, on) {
        if (type === 'angelGlow') this.player.invulnerable = on;
        if (type === 'blessing') this.player.damageMultiplier = on ? 2 : 1;
    }

    _updateBonuses(dt) {
        const p = this.player;
        const container = this.ui['active-bonuses'];
        let html = '';

        for (const [type, timeLeft] of Object.entries(p.activeBonuses)) {
            if (timeLeft <= 0) {
                this._applyBonus(type, false);
                delete p.activeBonuses[type];
                continue;
            }
            p.activeBonuses[type] -= dt;
            const bt = BONUS_TYPES[type];
            const pct = (p.activeBonuses[type] / bt.duration) * 100;
            html += `<div class="active-bonus-item">
                <span>${bt.icon}</span><span>${bt.name}</span>
                <div class="bonus-timer-bar"><div class="bonus-timer-fill" style="width:${pct}%"></div></div>
                <span>${Math.ceil(p.activeBonuses[type])}s</span>
            </div>`;
        }
        container.innerHTML = html;
    }

    _useSpecialAbility() {
        if (this.player.score >= 500) {
            this.player.score -= 500;
            this._activatePrayer();
        } else {
            this._announce('bonus-announce', 'Nedostatek skore pro modlitbu! (500)', 1500);
        }
    }

    // ========================================================
    // WAVES
    // ========================================================
    _updateWaves(dt) {
        if (!this.waveActive) {
            this.waveBreakTimer -= dt;
            if (this.waveBreakTimer <= 0) this._startWave();
            return;
        }

        if (this.waveSpawnQueue.length > 0) {
            this.waveSpawnTimer -= dt;
            if (this.waveSpawnTimer <= 0) {
                this._spawnEnemy(this.waveSpawnQueue.shift());
                this.waveSpawnTimer = WAVES[this.currentWave - 1].spawnInterval;
            }
        }

        // Check wave done - all spawned and all dead
        if (this.waveSpawnQueue.length === 0 && this.waveEnemiesRemaining <= 0) {
            this.waveActive = false;
            if (this.currentWave >= 10) {
                this._victory();
            } else {
                this.waveBreakTimer = 5;
                this._announce('wave-announce', `Vlna ${this.currentWave} dokoncena!`, 2500);
                this.player.health = Math.min(this.player.health + 20, this.player.maxHealth);

                // Bonus pickup between waves
                const a = Math.random() * Math.PI * 2;
                const d = 5 + Math.random() * 10;
                this._spawnPickup(new THREE.Vector3(
                    this.player.position.x + Math.cos(a) * d, 0,
                    this.player.position.z + Math.sin(a) * d
                ));
            }
        }
    }

    _startWave() {
        this.currentWave++;
        this.waveActive = true;
        this.waveSpawnTimer = 1;

        const wave = WAVES[this.currentWave - 1];
        this.waveSpawnQueue = [];
        for (const eg of wave.enemies) {
            for (let i = 0; i < eg.count; i++) this.waveSpawnQueue.push(eg.type);
        }
        // Shuffle
        for (let i = this.waveSpawnQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.waveSpawnQueue[i], this.waveSpawnQueue[j]] = [this.waveSpawnQueue[j], this.waveSpawnQueue[i]];
        }
        this.waveEnemiesRemaining = this.waveSpawnQueue.length;

        const name = this.currentWave === 10 ? 'VLNA 10: FINALNI BITVA!' : `VLNA ${this.currentWave}`;
        this._announce('wave-announce', name, 3000);
        Audio.play('wave_start');
    }

    // ========================================================
    // HUD
    // ========================================================
    _updateHUD() {
        const p = this.player;
        const w = WEAPONS[p.currentWeapon];
        const ws = p.weapons[p.currentWeapon];

        this.ui['health-bar'].style.width = Math.max(0, p.health) + '%';
        this.ui['health-bar'].style.background = p.health > 50
            ? 'linear-gradient(90deg, #3a3, #5c5)'
            : p.health > 25 ? 'linear-gradient(90deg, #ca3, #ec5)' : 'linear-gradient(90deg, #d33, #f55)';

        let lives = '';
        for (let i = 0; i < p.lives; i++) lives += '\u271D ';
        this.ui['lives-display'].textContent = lives;

        this.ui['wave-display'].textContent = `Vlna: ${this.currentWave}/10`;
        this.ui['score-display'].textContent = `Skore: ${p.score}`;
        this.ui['weapon-display'].textContent = w.name;
        this.ui['ammo-display'].textContent = p.reloading ? 'Nabijeni...' : `${ws.ammo}/${ws.reserve}`;
        this.ui['enemies-display'].textContent = `Nepratele: ${this.enemies.filter(e => e.alive).length}`;
    }

    // ========================================================
    // GAME END
    // ========================================================
    _gameOver() {
        this.state = 'gameover';
        document.exitPointerLock();
        this.ui['hud'].style.display = 'none';
        this.ui['crosshair'].classList.add('hidden');
        this.ui['game-over-screen'].style.display = 'flex';
        this.ui['go-score'].textContent = this.player.score;
        this.ui['go-wave'].textContent = this.currentWave;
    }

    _victory() {
        this.state = 'victory';
        document.exitPointerLock();
        this.ui['hud'].style.display = 'none';
        this.ui['crosshair'].classList.add('hidden');
        this.ui['victory-screen'].style.display = 'flex';
        this.ui['vic-score'].textContent = this.player.score;

        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                this._spawnParticles(new THREE.Vector3(
                    (Math.random() - 0.5) * 20, Math.random() * 5, (Math.random() - 0.5) * 20
                ), Math.random() > 0.5 ? 0xffd700 : 0xffffff, 5);
            }, i * 100);
        }
    }

    // ========================================================
    // UTILS
    // ========================================================
    _announce(id, text, dur) {
        const el = this.ui[id];
        if (!el) return;
        el.textContent = text;
        el.style.opacity = '1';
        setTimeout(() => { el.style.opacity = '0'; }, dur);
    }
}

// ============================================================
// BOOT
// ============================================================
window.addEventListener('load', () => { new Game(); });

})();
