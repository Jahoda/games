// Game logic for RC Revolt

class Game {
    constructor() {
        this.state = 'menu'; // menu, loading, countdown, racing, paused, finished
        this.mode = 'race'; // race, time_trial, battle, championship

        // Game objects
        this.track = null;
        this.cars = [];
        this.playerCar = null;

        // Settings
        this.settings = {
            sfxVolume: 70,
            musicVolume: 50,
            opponentCount: 5,
            aiDifficulty: 'medium',
            graphicsQuality: 'medium',
            laps: 3
        };

        // Race state
        this.raceTime = 0;
        this.countdownValue = 3;
        this.countdownTimer = 0;
        this.lapStartTime = 0;
        this.raceStarted = false;

        // Selection state
        this.selectedCarId = 'rc_speeder';
        this.selectedTrackId = 'living_room';
        this.playerColor = '#ff0000';

        // Input
        this.keys = {};
        this.lastFrameTime = 0;

        // Animation frame
        this.animationId = null;
        this.running = false;
    }

    init() {
        // Initialize audio
        Audio.init();
        Audio.setSfxVolume(this.settings.sfxVolume / 100);
        Audio.setMusicVolume(this.settings.musicVolume / 100);

        // Initialize renderer
        GameRenderer.init('game-canvas', 'minimap-canvas');
        GameRenderer.setQuality(this.settings.graphicsQuality);

        // Cache UI elements
        UI.cacheElements();

        // Setup input
        this.setupInput();

        // Setup menu event listeners
        this.setupMenuListeners();

        // Show main menu
        this.showScreen('main-menu');
    }

    setupInput() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            // Pause
            if (e.code === 'Escape') {
                if (this.state === 'racing') {
                    this.pause();
                } else if (this.state === 'paused') {
                    this.resume();
                }
            }

            // Use powerup
            if (e.code === 'KeyE' || e.code === 'ShiftLeft') {
                if (this.state === 'racing' && this.playerCar && this.playerCar.powerup) {
                    PowerupMgr.usePowerup(this.playerCar);
                }
            }

            // Reset car
            if (e.code === 'KeyR' && this.state === 'racing') {
                this.resetPlayerCar();
            }

            e.preventDefault();
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    setupMenuListeners() {
        // Main menu buttons
        document.getElementById('btn-single-race')?.addEventListener('click', () => {
            this.mode = 'race';
            this.showCarSelect();
            Audio.playMenuSelect();
        });

        document.getElementById('btn-championship')?.addEventListener('click', () => {
            this.mode = 'championship';
            this.showCarSelect();
            Audio.playMenuSelect();
        });

        document.getElementById('btn-time-trial')?.addEventListener('click', () => {
            this.mode = 'time_trial';
            this.settings.opponentCount = 0;
            this.showCarSelect();
            Audio.playMenuSelect();
        });

        document.getElementById('btn-battle')?.addEventListener('click', () => {
            this.mode = 'battle';
            this.showCarSelect();
            Audio.playMenuSelect();
        });

        document.getElementById('btn-garage')?.addEventListener('click', () => {
            this.showGarage();
            Audio.playMenuSelect();
        });

        document.getElementById('btn-settings')?.addEventListener('click', () => {
            this.showSettings();
            Audio.playMenuSelect();
        });

        // Car selection
        document.getElementById('btn-prev-car')?.addEventListener('click', () => {
            this.prevCar();
            Audio.playMenuClick();
        });

        document.getElementById('btn-next-car')?.addEventListener('click', () => {
            this.nextCar();
            Audio.playMenuClick();
        });

        document.getElementById('btn-select-car')?.addEventListener('click', () => {
            this.showTrackSelect();
            Audio.playMenuSelect();
        });

        document.getElementById('btn-back-car')?.addEventListener('click', () => {
            this.showScreen('main-menu');
            Audio.playMenuClick();
        });

        // Track selection
        document.getElementById('btn-start-race')?.addEventListener('click', () => {
            this.startRace();
            Audio.playMenuSelect();
        });

        document.getElementById('btn-back-track')?.addEventListener('click', () => {
            this.showCarSelect();
            Audio.playMenuClick();
        });

        // Settings
        document.getElementById('sfx-volume')?.addEventListener('input', (e) => {
            this.settings.sfxVolume = e.target.value;
            Audio.setSfxVolume(this.settings.sfxVolume / 100);
        });

        document.getElementById('music-volume')?.addEventListener('input', (e) => {
            this.settings.musicVolume = e.target.value;
            Audio.setMusicVolume(this.settings.musicVolume / 100);
        });

        document.getElementById('opponent-count')?.addEventListener('change', (e) => {
            this.settings.opponentCount = parseInt(e.target.value);
        });

        document.getElementById('ai-difficulty')?.addEventListener('change', (e) => {
            this.settings.aiDifficulty = e.target.value;
        });

        document.getElementById('graphics-quality')?.addEventListener('change', (e) => {
            this.settings.graphicsQuality = e.target.value;
            GameRenderer.setQuality(e.target.value);
        });

        document.getElementById('btn-back-settings')?.addEventListener('click', () => {
            this.showScreen('main-menu');
            Audio.playMenuClick();
        });

        // Garage
        document.getElementById('btn-back-garage')?.addEventListener('click', () => {
            this.showScreen('main-menu');
            Audio.playMenuClick();
        });

        // Color picker in garage
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.playerColor = e.target.dataset.color;
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.drawGarageCar();
                Audio.playMenuClick();
            });
        });

        // Pause menu
        document.getElementById('btn-resume')?.addEventListener('click', () => {
            this.resume();
            Audio.playMenuClick();
        });

        document.getElementById('btn-restart')?.addEventListener('click', () => {
            this.restartRace();
            Audio.playMenuClick();
        });

        document.getElementById('btn-quit')?.addEventListener('click', () => {
            this.quitRace();
            Audio.playMenuClick();
        });

        // Results
        document.getElementById('btn-restart-race')?.addEventListener('click', () => {
            this.restartRace();
            Audio.playMenuClick();
        });

        document.getElementById('btn-back-menu')?.addEventListener('click', () => {
            this.quitRace();
            Audio.playMenuClick();
        });
    }

    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.menu-screen, #game-screen').forEach(el => {
            el.classList.add('hidden');
        });

        // Show requested screen
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.remove('hidden');
        }

        this.state = 'menu';
    }

    showCarSelect() {
        this.showScreen('car-select');
        this.populateCarSelect();
        this.updateCarStats();
    }

    populateCarSelect() {
        const carousel = document.getElementById('car-carousel');
        carousel.innerHTML = '';

        const cars = CarFactory.getAllCars();
        const currentIndex = cars.findIndex(c => c.id === this.selectedCarId);

        // Add car name first
        const name = document.createElement('div');
        name.className = 'car-name';
        name.textContent = cars[currentIndex].name;
        carousel.appendChild(name);

        // Show 3 cars (prev, current, next)
        for (let offset = -1; offset <= 1; offset++) {
            const index = (currentIndex + offset + cars.length) % cars.length;
            const car = cars[index];

            const preview = document.createElement('div');
            preview.className = `car-preview ${offset === 0 ? 'selected' : ''}`;

            const canvas = document.createElement('canvas');
            canvas.width = 180;
            canvas.height = 130;

            const ctx = canvas.getContext('2d');
            this.drawCarPreview(ctx, car);

            preview.appendChild(canvas);
            carousel.appendChild(preview);
        }
    }

    drawCarPreview(ctx, carDef) {
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Create temp car for rendering
        const tempCar = new Car(carDef, ctx.canvas.width / 2, ctx.canvas.height / 2 + 10, -Math.PI / 2);
        tempCar.primaryColor = this.playerColor;

        // Scale up for preview
        ctx.save();
        ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2 + 10);
        ctx.scale(2, 2);
        ctx.translate(-ctx.canvas.width / 2, -ctx.canvas.height / 2 - 10);

        const camera = { x: ctx.canvas.width / 2, y: ctx.canvas.height / 2 + 10 };
        tempCar.render(ctx, camera);

        ctx.restore();
    }

    updateCarStats() {
        const car = CarFactory.getCarById(this.selectedCarId);
        if (!car) return;

        document.getElementById('stat-speed').style.width = `${car.stats.speed}%`;
        document.getElementById('stat-accel').style.width = `${car.stats.acceleration}%`;
        document.getElementById('stat-weight').style.width = `${car.stats.weight}%`;
        document.getElementById('stat-handling').style.width = `${car.stats.handling}%`;
    }

    prevCar() {
        const cars = CarFactory.getAllCars();
        const currentIndex = cars.findIndex(c => c.id === this.selectedCarId);
        const newIndex = (currentIndex - 1 + cars.length) % cars.length;
        this.selectedCarId = cars[newIndex].id;
        this.populateCarSelect();
        this.updateCarStats();
    }

    nextCar() {
        const cars = CarFactory.getAllCars();
        const currentIndex = cars.findIndex(c => c.id === this.selectedCarId);
        const newIndex = (currentIndex + 1) % cars.length;
        this.selectedCarId = cars[newIndex].id;
        this.populateCarSelect();
        this.updateCarStats();
    }

    showTrackSelect() {
        this.showScreen('track-select');
        this.populateTrackSelect();
        this.updateTrackPreview();
    }

    populateTrackSelect() {
        const trackList = document.getElementById('track-list');
        trackList.innerHTML = '';

        const tracks = TrackFactory.getAllTracks();

        tracks.forEach(track => {
            const item = document.createElement('div');
            item.className = `track-item ${track.id === this.selectedTrackId ? 'selected' : ''}`;
            item.textContent = track.name;
            item.dataset.trackId = track.id;

            item.addEventListener('click', () => {
                document.querySelectorAll('.track-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                this.selectedTrackId = track.id;
                this.updateTrackPreview();
                Audio.playMenuClick();
            });

            trackList.appendChild(item);
        });
    }

    updateTrackPreview() {
        const trackDef = TrackFactory.getTrackById(this.selectedTrackId);
        if (!trackDef) return;

        document.getElementById('track-name').textContent = trackDef.name;
        document.getElementById('track-desc').textContent = trackDef.description;
        document.getElementById('track-laps').textContent = trackDef.laps;

        // Draw track preview
        const canvas = document.getElementById('track-preview-canvas');
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = trackDef.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Create temp track and render minimap
        const tempTrack = TrackFactory.createTrack(this.selectedTrackId);

        // Scale to fit
        const padding = 20;
        const scaleX = (canvas.width - padding * 2) / (tempTrack.bounds.maxX - tempTrack.bounds.minX);
        const scaleY = (canvas.height - padding * 2) / (tempTrack.bounds.maxY - tempTrack.bounds.minY);
        const scale = Math.min(scaleX, scaleY);

        ctx.save();
        ctx.translate(padding, padding);
        ctx.scale(scale, scale);
        ctx.translate(-tempTrack.bounds.minX, -tempTrack.bounds.minY);

        // Draw track
        ctx.strokeStyle = tempTrack.trackColor;
        ctx.lineWidth = tempTrack.trackWidth * 0.6 / scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (tempTrack.waypoints.length > 0) {
            ctx.beginPath();
            ctx.moveTo(tempTrack.waypoints[0].x, tempTrack.waypoints[0].y);
            for (let i = 1; i < tempTrack.waypoints.length; i++) {
                ctx.lineTo(tempTrack.waypoints[i].x, tempTrack.waypoints[i].y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        ctx.restore();
    }

    showSettings() {
        this.showScreen('settings-screen');

        // Update UI to match current settings
        document.getElementById('sfx-volume').value = this.settings.sfxVolume;
        document.getElementById('music-volume').value = this.settings.musicVolume;
        document.getElementById('opponent-count').value = this.settings.opponentCount;
        document.getElementById('ai-difficulty').value = this.settings.aiDifficulty;
        document.getElementById('graphics-quality').value = this.settings.graphicsQuality;
    }

    showGarage() {
        this.showScreen('garage-screen');

        const car = CarFactory.getCarById(this.selectedCarId);
        document.getElementById('garage-car-name').textContent = car ? car.name : '-';

        // Highlight selected color
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.color === this.playerColor);
        });

        // Draw car in garage
        this.drawGarageCar();
    }

    drawGarageCar() {
        const canvas = document.getElementById('garage-canvas');
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const carDef = CarFactory.getCarById(this.selectedCarId);
        if (!carDef) return;

        const tempCar = new Car(carDef, canvas.width / 2, canvas.height / 2, -Math.PI / 2);
        tempCar.primaryColor = this.playerColor;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(3, 3);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        const camera = { x: canvas.width / 2, y: canvas.height / 2 };
        tempCar.render(ctx, camera);

        ctx.restore();
    }

    async startRace() {
        // Show loading screen
        this.showScreen('loading-screen');
        const loadingProgress = document.getElementById('loading-progress');
        const loadingText = document.getElementById('loading-text');

        // Simulate loading
        loadingText.textContent = 'Načítání tratě...';
        loadingProgress.style.width = '20%';
        await this.delay(200);

        // Create track
        this.track = TrackFactory.createTrack(this.selectedTrackId);
        this.settings.laps = this.track.laps;

        loadingText.textContent = 'Příprava vozidel...';
        loadingProgress.style.width = '50%';
        await this.delay(200);

        // Create cars
        this.cars = [];

        // Player car
        this.playerCar = CarFactory.createCar(this.selectedCarId);
        this.playerCar.setColor(this.playerColor);
        const playerStart = this.track.getStartPosition(0);
        this.playerCar.reset(playerStart.x, playerStart.y, playerStart.angle);
        this.cars.push(this.playerCar);

        // AI cars
        const aiCarIds = CarFactory.getAllCars().map(c => c.id).filter(id => id !== this.selectedCarId);
        const shuffledIds = Utils.shuffle(aiCarIds);

        for (let i = 0; i < this.settings.opponentCount; i++) {
            const carId = shuffledIds[i % shuffledIds.length];
            const aiCar = CarFactory.createAICar(carId, this.settings.aiDifficulty, i + 1);
            const startPos = this.track.getStartPosition(i + 1);
            aiCar.reset(startPos.x, startPos.y, startPos.angle);
            this.cars.push(aiCar);
        }

        loadingText.textContent = 'Inicializace AI...';
        loadingProgress.style.width = '70%';
        await this.delay(200);

        // Initialize AI
        AIMgr.init(this.cars, this.settings.aiDifficulty);

        // Initialize power-ups
        PowerupMgr.init(this.track);

        loadingText.textContent = 'Start!';
        loadingProgress.style.width = '100%';
        await this.delay(300);

        // Show game screen
        this.showScreen('game-screen');
        document.getElementById('game-screen').classList.remove('hidden');

        // Initialize renderer camera
        GameRenderer.resetCamera(this.playerCar.x, this.playerCar.y);

        // Update HUD
        UI.updateLap(1, this.settings.laps);
        UI.updatePosition(1, this.cars.length);
        UI.updateTime(0);
        UI.updateSpeed(0);
        UI.updatePowerup(null);
        UI.hideResults();

        // Start countdown
        this.state = 'countdown';
        this.countdownValue = 3;
        this.countdownTimer = 0;
        this.raceTime = 0;
        this.raceStarted = false;

        // Start engines
        for (const car of this.cars) {
            Audio.startEngine(car.id || Math.random(), 2000);
        }

        // Start game loop
        this.running = true;
        this.lastFrameTime = performance.now();
        this.gameLoop();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    gameLoop() {
        if (!this.running) return;

        const currentTime = performance.now();
        const dt = Math.min(currentTime - this.lastFrameTime, 50); // Cap at 50ms
        this.lastFrameTime = currentTime;

        this.update(dt);
        this.render();

        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    update(dt) {
        // Handle countdown
        if (this.state === 'countdown') {
            this.countdownTimer += dt;

            if (this.countdownTimer >= 1000) {
                this.countdownTimer = 0;
                this.countdownValue--;

                if (this.countdownValue > 0) {
                    UI.showCountdown(this.countdownValue);
                    Audio.playCountdown(this.countdownValue);
                } else if (this.countdownValue === 0) {
                    UI.showCountdown(0);
                    Audio.playCountdown(0);
                } else {
                    UI.hideCountdown();
                    this.state = 'racing';
                    this.raceStarted = true;
                    this.lapStartTime = 0;
                }
            } else if (this.countdownValue === 3 && this.countdownTimer < 100) {
                UI.showCountdown(3);
                Audio.playCountdown(3);
            }

            // Still update camera during countdown
            GameRenderer.setCameraTarget(this.playerCar.x, this.playerCar.y);
            GameRenderer.updateCamera(dt);
            return;
        }

        // Paused
        if (this.state === 'paused') {
            return;
        }

        // Racing
        if (this.state === 'racing') {
            this.raceTime += dt;

            // Update player input
            this.updatePlayerInput();

            // Update physics for all cars
            for (const car of this.cars) {
                Physics.updateCar(car, this.track, dt);
                car.update(dt);

                // Update engine sound
                Audio.updateEngine(car.id || 0, car.rpm, car.throttle);
            }

            // Update AI
            AIMgr.update(dt, this.track, this.cars, this.playerCar);

            // Check car-to-car collisions
            for (let i = 0; i < this.cars.length; i++) {
                for (let j = i + 1; j < this.cars.length; j++) {
                    if (Physics.checkCarCollision(this.cars[i], this.cars[j])) {
                        Physics.resolveCarCollision(this.cars[i], this.cars[j]);
                    }
                }
            }

            // Update power-ups
            PowerupMgr.update(dt, this.cars);

            // Check power-up pickups
            for (const car of this.cars) {
                PowerupMgr.checkCollisions(car);
            }

            // Check checkpoints and laps
            this.checkCheckpoints();

            // Update positions
            this.updatePositions();

            // Check race finish
            this.checkFinish();

            // Update UI
            this.updateUI();

            // Check wrong way
            this.checkWrongWay();
        }

        // Update camera
        GameRenderer.setCameraTarget(this.playerCar.x, this.playerCar.y);
        GameRenderer.updateCamera(dt);

        // Update particles
        GameRenderer.updateParticles(dt);
    }

    updatePlayerInput() {
        // Steering
        let steering = 0;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) steering -= 1;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) steering += 1;
        this.playerCar.steering = steering;

        // Throttle
        let throttle = 0;
        if (this.keys['ArrowUp'] || this.keys['KeyW']) throttle = 1;
        this.playerCar.throttle = throttle;

        // Reverse
        let reverse = 0;
        if (this.keys['ArrowDown'] || this.keys['KeyS']) reverse = 1;
        this.playerCar.reverse = reverse;

        // Brake/Drift
        let brake = 0;
        if (this.keys['Space']) {
            brake = 1;
            this.playerCar.isDrifting = true;
        } else {
            this.playerCar.isDrifting = false;
        }
        this.playerCar.brake = brake;

        // Tire screech when drifting
        if (this.playerCar.isDrifting && this.playerCar.speed > 100) {
            if (Math.random() < 0.1) {
                Audio.playTireScreech(0.3, 0.1);
            }
        }
    }

    checkCheckpoints() {
        for (const car of this.cars) {
            if (car.finished) continue;

            const checkpoints = this.track.checkpoints;
            const nextCheckpoint = checkpoints[car.checkpoint];

            if (Physics.checkCheckpointCollision(car, nextCheckpoint)) {
                car.checkpoint++;

                // Completed a lap
                if (car.checkpoint >= checkpoints.length) {
                    car.checkpoint = 0;
                    const lapTime = this.raceTime - this.lapStartTime;

                    if (car === this.playerCar) {
                        const isBest = lapTime < car.bestLapTime;
                        car.completeLap(lapTime);
                        UI.showLapTime(lapTime, isBest);
                        this.lapStartTime = this.raceTime;
                    } else {
                        car.completeLap(lapTime);
                    }

                    // Check if finished
                    if (car.lap >= this.settings.laps) {
                        car.finish(this.raceTime);

                        if (car === this.playerCar) {
                            const position = this.getCarPosition(car);
                            Audio.playRaceFinish(position);
                        }
                    }
                }
            }
        }
    }

    checkWrongWay() {
        // Simple wrong way detection based on angle to next checkpoint
        const checkpoint = this.track.checkpoints[this.playerCar.checkpoint];
        const cpCenterX = (checkpoint.x1 + checkpoint.x2) / 2;
        const cpCenterY = (checkpoint.y1 + checkpoint.y2) / 2;

        const toCheckpoint = Math.atan2(
            cpCenterY - this.playerCar.y,
            cpCenterX - this.playerCar.x
        );

        const angleDiff = Math.abs(Utils.angleDifference(this.playerCar.angle, toCheckpoint));
        this.playerCar.wrongWay = angleDiff > Math.PI * 0.7 && this.playerCar.speed > 50;

        UI.showWrongWay(this.playerCar.wrongWay);
    }

    updatePositions() {
        // Sort cars by progress
        const sorted = [...this.cars].sort((a, b) => {
            if (a.finished && !b.finished) return -1;
            if (!a.finished && b.finished) return 1;
            if (a.finished && b.finished) return a.finishTime - b.finishTime;

            const progressA = a.lap * 1000 + a.checkpoint * 10 + this.getCheckpointProgress(a);
            const progressB = b.lap * 1000 + b.checkpoint * 10 + this.getCheckpointProgress(b);
            return progressB - progressA;
        });

        // Assign positions
        sorted.forEach((car, index) => {
            car.position = index + 1;
        });
    }

    getCheckpointProgress(car) {
        const checkpoint = this.track.checkpoints[car.checkpoint];
        const cpCenterX = (checkpoint.x1 + checkpoint.x2) / 2;
        const cpCenterY = (checkpoint.y1 + checkpoint.y2) / 2;
        const dist = Utils.distance(car.x, car.y, cpCenterX, cpCenterY);
        return Math.max(0, 1 - dist / 500);
    }

    getCarPosition(car) {
        return car.position || 1;
    }

    checkFinish() {
        // Check if all cars finished or player finished
        const allFinished = this.cars.every(car => car.finished);
        const playerFinished = this.playerCar.finished;

        if (playerFinished || allFinished) {
            this.endRace();
        }
    }

    endRace() {
        this.state = 'finished';

        // Stop engines
        Audio.stopAllEngines();

        // Prepare results
        const results = this.cars
            .filter(car => car.finished)
            .sort((a, b) => a.finishTime - b.finishTime)
            .map(car => ({
                name: car.name,
                time: car.finishTime,
                isPlayer: car === this.playerCar
            }));

        // Add unfinished cars
        const unfinished = this.cars.filter(car => !car.finished);
        unfinished.forEach(car => {
            results.push({
                name: car.name,
                time: Infinity,
                isPlayer: car === this.playerCar
            });
        });

        UI.showResults(results);
    }

    updateUI() {
        UI.updatePosition(this.getCarPosition(this.playerCar), this.cars.length);
        UI.updateLap(Math.min(this.playerCar.lap + 1, this.settings.laps), this.settings.laps);
        UI.updateTime(this.raceTime);
        UI.updateSpeed(this.playerCar.speed);
        UI.updatePowerup(this.playerCar.powerup);
    }

    render() {
        GameRenderer.render({
            track: this.track,
            cars: this.cars,
            playerCar: this.playerCar,
            powerupMgr: PowerupMgr
        });
    }

    pause() {
        if (this.state !== 'racing') return;
        this.state = 'paused';
        UI.showPauseMenu();
    }

    resume() {
        if (this.state !== 'paused') return;
        this.state = 'racing';
        UI.hidePauseMenu();
    }

    restartRace() {
        this.stopRace();
        this.startRace();
    }

    quitRace() {
        this.stopRace();
        this.showScreen('main-menu');
    }

    stopRace() {
        this.running = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Cleanup
        Audio.stopAllEngines();
        Audio.stopMusic();
        PowerupMgr.cleanup();
        AIMgr.cleanup();
        GameRenderer.clearParticles();

        UI.hidePauseMenu();
        UI.hideResults();
        UI.showWrongWay(false);
    }

    resetPlayerCar() {
        // Find nearest checkpoint and reset there
        let nearestDist = Infinity;
        let nearestCheckpoint = 0;

        for (let i = 0; i < this.track.checkpoints.length; i++) {
            const cp = this.track.checkpoints[i];
            const cpX = (cp.x1 + cp.x2) / 2;
            const cpY = (cp.y1 + cp.y2) / 2;
            const dist = Utils.distance(this.playerCar.x, this.playerCar.y, cpX, cpY);

            if (dist < nearestDist) {
                nearestDist = dist;
                nearestCheckpoint = i;
            }
        }

        const cp = this.track.checkpoints[nearestCheckpoint];
        const resetX = (cp.x1 + cp.x2) / 2;
        const resetY = (cp.y1 + cp.y2) / 2;

        // Calculate angle towards next checkpoint
        const nextCp = this.track.checkpoints[(nearestCheckpoint + 1) % this.track.checkpoints.length];
        const nextX = (nextCp.x1 + nextCp.x2) / 2;
        const nextY = (nextCp.y1 + nextCp.y2) / 2;
        const resetAngle = Math.atan2(nextY - resetY, nextX - resetX);

        this.playerCar.x = resetX;
        this.playerCar.y = resetY;
        this.playerCar.angle = resetAngle;
        this.playerCar.velocityX = 0;
        this.playerCar.velocityY = 0;
        this.playerCar.spinTime = 0;
    }
}

const game = new Game();
