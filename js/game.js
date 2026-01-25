// Main game logic for Counter-Strike Clone

const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    ROUND_END: 'round_end',
    GAME_OVER: 'game_over'
};

const GameMode = {
    DEATHMATCH: 'deathmatch',
    DEFUSE: 'defuse'
};

class Game {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Game state
        this.state = GameState.MENU;
        this.mode = GameMode.DEATHMATCH;
        this.isRunning = false;

        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.fpsCounter = 0;
        this.fpsTime = 0;

        // Game objects
        this.map = new GameMap(MapData);
        this.player = null;
        this.botManager = new BotManager();
        this.raycaster = new Raycaster(this.canvas);

        // Round system
        this.roundTime = 105; // 1:45
        this.roundTimeRemaining = this.roundTime;
        this.freezeTime = 5;
        this.isFreezeTime = true;
        this.roundNumber = 1;
        this.maxRounds = 30;

        // Score
        this.ctScore = 0;
        this.tScore = 0;

        // UI elements
        this.ui = {
            mainMenu: document.getElementById('main-menu'),
            teamSelect: document.getElementById('team-select'),
            controlsMenu: document.getElementById('controls-menu'),
            buyMenu: document.getElementById('buy-menu'),
            scoreboard: document.getElementById('scoreboard'),
            hud: document.getElementById('hud'),
            deathScreen: document.getElementById('death-screen'),
            roundEnd: document.getElementById('round-end')
        };

        // Input
        this.pointerLocked = false;

        // Kill feed
        this.killFeed = [];
        this.maxKillFeed = 5;
        this.killFeedDirty = true; // Only update DOM when changed

        // Timers (for cleanup)
        this.activeTimers = [];
        this.hitMarkerTimer = null;
        this.roundEndTimer = null;

        // Bind game loop once to avoid creating new closures
        this.boundGameLoop = this.gameLoop.bind(this);

        // Radar canvas context (cache it)
        this.radarCanvas = null;
        this.radarCtx = null;

        // Initialize
        this.setupEventListeners();
        this.resize();
    }

    setupEventListeners() {
        // Resize handler
        window.addEventListener('resize', () => this.resize());

        // Keyboard
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Mouse
        this.canvas.addEventListener('click', () => this.requestPointerLock());
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Menu buttons
        document.getElementById('btn-new-game').addEventListener('click', () => this.showTeamSelect());
        document.getElementById('btn-controls').addEventListener('click', () => this.showControls());
        document.getElementById('btn-options').addEventListener('click', () => { });
        document.getElementById('btn-back-main').addEventListener('click', () => this.showMainMenu());
        document.getElementById('btn-back-controls').addEventListener('click', () => this.showMainMenu());
        document.getElementById('btn-ct').addEventListener('click', () => this.startGame('ct'));
        document.getElementById('btn-t').addEventListener('click', () => this.startGame('t'));
        document.getElementById('btn-close-buy').addEventListener('click', () => this.closeBuyMenu());

        // Buy menu items
        document.querySelectorAll('.buy-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const weapon = e.target.dataset.weapon;
                this.buyWeapon(weapon);
            });
        });
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.raycaster.resize(this.canvas.width, this.canvas.height);
    }

    requestPointerLock() {
        if (this.state !== GameState.PLAYING) return;
        this.canvas.requestPointerLock();
    }

    onPointerLockChange() {
        this.pointerLocked = document.pointerLockElement === this.canvas;

        if (!this.pointerLocked && this.state === GameState.PLAYING) {
            this.pause();
        }
    }

    // Menu functions
    showMainMenu() {
        this.hideAllMenus();
        this.ui.mainMenu.classList.remove('hidden');
        this.state = GameState.MENU;
    }

    showTeamSelect() {
        this.hideAllMenus();
        this.ui.teamSelect.classList.remove('hidden');
    }

    showControls() {
        this.hideAllMenus();
        this.ui.controlsMenu.classList.remove('hidden');
    }

    hideAllMenus() {
        Object.values(this.ui).forEach(el => {
            if (el) el.classList.add('hidden');
        });
    }

    // Game functions
    startGame(team) {
        // Initialize audio
        Audio.init();

        // Create player
        this.player = new Player(team);
        this.player.reset();

        // Setup bots
        this.setupBots(team);

        // Start round
        this.startRound();

        // Show HUD
        this.hideAllMenus();
        this.ui.hud.classList.remove('hidden');

        // Start game loop
        this.state = GameState.PLAYING;
        this.isRunning = true;
        this.lastTime = performance.now();

        // Request pointer lock
        this.requestPointerLock();

        // Play round start sound
        Audio.playRoundStart();

        // Start game loop (use bound function to avoid creating closures)
        requestAnimationFrame(this.boundGameLoop);
    }

    setupBots(playerTeam) {
        this.botManager = new BotManager();

        // Add enemy bots
        const enemyTeam = playerTeam === 'ct' ? 't' : 'ct';
        for (let i = 0; i < 4; i++) {
            const difficulty = i < 2 ? 'EASY' : 'MEDIUM';
            this.botManager.addBot(enemyTeam, difficulty);
        }

        // Add teammate bots
        for (let i = 0; i < 3; i++) {
            this.botManager.addBot(playerTeam, 'MEDIUM');
        }
    }

    startRound() {
        // Reset round timer
        this.roundTimeRemaining = this.roundTime;
        this.isFreezeTime = true;

        // Spawn player
        const spawnIndex = 0;
        const spawn = this.map.getSpawnPoint(this.player.team, spawnIndex);
        this.player.spawn(spawn, this.player.team === 'ct' ? Math.PI : 0);

        // Spawn bots
        this.botManager.spawnBots(this.map);

        // Give starting money if first round
        if (this.roundNumber === 1) {
            this.player.money = 800;
        }

        // Refill ammo
        this.player.inventory.refillAmmo();

        // Hide death screen
        this.ui.deathScreen.classList.add('hidden');
        this.ui.roundEnd.classList.add('hidden');

        // Update HUD
        this.updateHUD();
    }

    endRound(winner, reason) {
        this.state = GameState.ROUND_END;

        // Update score
        if (winner === 'ct') {
            this.ctScore++;
        } else {
            this.tScore++;
        }

        // Award money
        if (winner === this.player.team) {
            this.player.earnMoney(3250);
        } else {
            this.player.earnMoney(1400 + Math.min(this.roundNumber * 500, 2500));
        }

        // Show round end
        const roundWinner = document.getElementById('round-winner');
        const roundReason = document.getElementById('round-reason');

        roundWinner.textContent = winner === 'ct' ? 'Counter-Terrorists Win!' : 'Terrorists Win!';
        roundWinner.className = winner === 'ct' ? 'ct-win' : 't-win';
        roundReason.textContent = reason;

        this.ui.roundEnd.classList.remove('hidden');

        // Clear previous timer if exists
        if (this.roundEndTimer) {
            clearTimeout(this.roundEndTimer);
        }

        // Start next round after delay
        this.roundEndTimer = setTimeout(() => {
            this.roundEndTimer = null;
            this.roundNumber++;
            if (this.roundNumber > this.maxRounds ||
                this.ctScore > this.maxRounds / 2 ||
                this.tScore > this.maxRounds / 2) {
                this.endGame();
            } else {
                this.startRound();
                this.state = GameState.PLAYING;
            }
        }, 5000);
    }

    endGame() {
        this.state = GameState.GAME_OVER;
        this.isRunning = false;

        // Clear all timers
        if (this.hitMarkerTimer) {
            clearTimeout(this.hitMarkerTimer);
            this.hitMarkerTimer = null;
        }
        if (this.roundEndTimer) {
            clearTimeout(this.roundEndTimer);
            this.roundEndTimer = null;
        }

        // Clear kill feed
        this.killFeed = [];
        this.killFeedDirty = true;

        this.showMainMenu();
    }

    pause() {
        if (this.state === GameState.PLAYING) {
            this.state = GameState.PAUSED;
            // Could show pause menu
        }
    }

    resume() {
        if (this.state === GameState.PAUSED) {
            this.state = GameState.PLAYING;
            this.requestPointerLock();
        }
    }

    // Game loop
    gameLoop(currentTime) {
        if (!this.isRunning) return;

        // Calculate delta time
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Cap delta time
        if (this.deltaTime > 100) this.deltaTime = 100;

        // FPS counter
        this.fpsCounter++;
        this.fpsTime += this.deltaTime;
        if (this.fpsTime >= 1000) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsTime = 0;
        }

        // Update game
        if (this.state === GameState.PLAYING) {
            this.update();
        }

        // Render
        this.render();

        // Next frame (use bound function to avoid creating closures each frame)
        requestAnimationFrame(this.boundGameLoop);
    }

    update() {
        // Update round timer
        if (!this.isFreezeTime) {
            this.roundTimeRemaining -= this.deltaTime / 1000;
            if (this.roundTimeRemaining <= 0) {
                // Time's up - CT wins in defuse, random in DM
                this.endRound('ct', 'Time ran out');
                return;
            }
        } else {
            this.freezeTime -= this.deltaTime / 1000;
            if (this.freezeTime <= 0) {
                this.isFreezeTime = false;
                this.freezeTime = 5;
            }
        }

        // Update player
        if (this.player && this.player.isAlive) {
            this.player.update(this.deltaTime, this.map);

            // Handle firing
            if (this.player.keys.fire && !this.isFreezeTime) {
                const shot = this.player.fire();
                if (shot) {
                    this.processShot(shot, this.player);
                }
            }

            // Handle reload
            if (this.player.keys.reload) {
                this.player.reload();
                this.player.keys.reload = false;
            }
        }

        // Update bots
        if (!this.isFreezeTime) {
            const botShots = this.botManager.update(this.deltaTime, this.map, this.player);
            botShots.forEach(shot => {
                if (shot) this.processShot(shot, shot.shooter);
            });
        }

        // Check round end conditions
        this.checkRoundEnd();

        // Update HUD
        this.updateHUD();

        // Update kill feed
        this.updateKillFeed();
    }

    processShot(shot, shooter) {
        // Cast ray to find hit
        const ray = this.map.castRay(shot.x, shot.y, shot.angle, shot.range);

        // Check entity hits
        let closestHit = null;
        let closestDist = ray.hit ? ray.distance : shot.range;

        // Get all potential targets
        const targets = [...this.botManager.bots];
        if (shooter !== this.player && this.player.isAlive) {
            targets.push(this.player);
        }

        targets.forEach(target => {
            if (!target.isAlive) return;
            if (target === shooter) return;

            // Check if ray hits entity
            const dx = target.x - shot.x;
            const dy = target.y - shot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > closestDist) return;

            // Calculate perpendicular distance to ray
            const rayDirX = Math.cos(shot.angle);
            const rayDirY = Math.sin(shot.angle);
            const perpDist = Math.abs(dx * rayDirY - dy * rayDirX);

            // Entity radius for hit detection
            const hitRadius = 20;

            if (perpDist < hitRadius) {
                // Check if in front of shooter
                const dotProduct = dx * rayDirX + dy * rayDirY;
                if (dotProduct > 0 && dist < closestDist) {
                    closestHit = target;
                    closestDist = dist;
                }
            }
        });

        // Apply damage if hit
        if (closestHit) {
            const direction = Utils.angleBetween(closestHit.x, closestHit.y, shot.x, shot.y);

            // Check for headshot (random chance based on accuracy)
            const isHeadshot = Math.random() < 0.15;
            const damage = isHeadshot ? shot.damage * 4 : shot.damage;

            const actualDamage = closestHit.takeDamage(damage, direction, shooter);

            // Show hit marker for player
            if (shooter === this.player) {
                this.showHitMarker();
            }

            // Check for kill
            if (!closestHit.isAlive) {
                shooter.kills++;
                shooter.earnMoney && shooter.earnMoney(300);
                this.addKillFeed(shooter, closestHit, shot.weapon, isHeadshot);
            }
        }
    }

    checkRoundEnd() {
        const ctAlive = (this.player.team === 'ct' && this.player.isAlive ? 1 : 0) +
            this.botManager.getAliveBots('ct').length;
        const tAlive = (this.player.team === 't' && this.player.isAlive ? 1 : 0) +
            this.botManager.getAliveBots('t').length;

        if (ctAlive === 0) {
            this.endRound('t', 'Counter-Terrorists eliminated');
        } else if (tAlive === 0) {
            this.endRound('ct', 'Terrorists eliminated');
        }
    }

    showHitMarker() {
        const hitMarker = document.getElementById('hit-marker');
        hitMarker.classList.add('show');

        // Clear previous timer to avoid stacking
        if (this.hitMarkerTimer) {
            clearTimeout(this.hitMarkerTimer);
        }
        this.hitMarkerTimer = setTimeout(() => {
            hitMarker.classList.remove('show');
            this.hitMarkerTimer = null;
        }, 100);
    }

    addKillFeed(killer, victim, weapon, headshot) {
        this.killFeed.unshift({
            killer: killer === this.player ? 'Ty' : (killer.name || 'Enemy'),
            killerTeam: killer.team,
            victim: victim === this.player ? 'Ty' : (victim.name || 'Enemy'),
            weapon: weapon.name,
            headshot: headshot,
            time: performance.now()
        });

        if (this.killFeed.length > this.maxKillFeed) {
            this.killFeed.pop();
        }

        // Mark as dirty so DOM gets updated
        this.killFeedDirty = true;
    }

    updateKillFeed() {
        const now = performance.now();
        const oldLength = this.killFeed.length;

        // Filter expired entries
        this.killFeed = this.killFeed.filter(entry => now - entry.time < 5000);

        // Check if anything changed
        if (this.killFeed.length !== oldLength) {
            this.killFeedDirty = true;
        }

        // Only update DOM when necessary
        if (!this.killFeedDirty) return;
        this.killFeedDirty = false;

        const feedEl = document.getElementById('kill-feed');
        feedEl.innerHTML = '';

        this.killFeed.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'kill-entry';
            div.innerHTML = `
                <span class="killer ${entry.killerTeam}">${entry.killer}</span>
                <span class="weapon">[${entry.weapon}${entry.headshot ? ' HS' : ''}]</span>
                <span class="victim">${entry.victim}</span>
            `;
            feedEl.appendChild(div);
        });
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.state === GameState.PLAYING || this.state === GameState.ROUND_END) {
            // Render 3D view
            this.raycaster.setPlayerPosition(this.player.x, this.player.y);
            this.raycaster.render(
                this.player,
                this.map,
                this.botManager.bots
            );

            // Render radar
            this.renderRadar();
        }
    }

    renderRadar() {
        // Cache radar canvas and context
        if (!this.radarCanvas) {
            this.radarCanvas = document.getElementById('radar-canvas');
            this.radarCtx = this.radarCanvas.getContext('2d');
            // Set size only once
            this.radarCanvas.width = 150;
            this.radarCanvas.height = 150;
        }

        // Clear radar (don't resize - that causes memory allocation)
        this.radarCtx.clearRect(0, 0, 150, 150);

        // Draw map on radar
        this.map.drawMinimap(
            this.radarCtx,
            this.player.x,
            this.player.y,
            this.player.angle,
            this.botManager.bots,
            150,
            150
        );
    }

    updateHUD() {
        if (!this.player) return;

        // Health and armor
        document.getElementById('health').textContent = Math.ceil(this.player.health);
        document.getElementById('armor').textContent = Math.ceil(this.player.inventory.armor);

        // Ammo
        const weapon = this.player.inventory.getCurrentWeapon();
        if (weapon) {
            const clip = weapon.currentClip === Infinity ? '∞' : weapon.currentClip;
            const reserve = weapon.currentReserve === Infinity ? '∞' : weapon.currentReserve;
            document.getElementById('ammo-clip').textContent = clip;
            document.getElementById('ammo-reserve').textContent = reserve;
        }

        // Money
        document.getElementById('money').textContent = '$' + this.player.money;
        document.getElementById('player-money').textContent = '$' + this.player.money;

        // Timer
        document.getElementById('round-timer').textContent =
            this.isFreezeTime ? `FREEZE: ${Math.ceil(this.freezeTime)}` :
                Utils.formatTime(this.roundTimeRemaining);

        // Score
        document.getElementById('ct-rounds').textContent = this.ctScore;
        document.getElementById('t-rounds').textContent = this.tScore;

        // Death screen
        if (!this.player.isAlive) {
            this.ui.deathScreen.classList.remove('hidden');
        }

        // Update buy menu availability
        this.updateBuyMenu();
    }

    updateBuyMenu() {
        const inBuyZone = this.map.isInBuyZone(this.player.x, this.player.y, this.player.team);

        document.querySelectorAll('.buy-item').forEach(btn => {
            const weaponId = btn.dataset.weapon;
            const weaponData = Weapons[weaponId];
            const canAfford = this.player.money >= weaponData.price;
            const canBuy = inBuyZone && canAfford && this.isFreezeTime;

            btn.disabled = !canBuy;

            if (!canAfford) {
                btn.style.color = '#ff4444';
            } else {
                btn.style.color = '#fff';
            }
        });
    }

    buyWeapon(weaponId) {
        if (!this.map.isInBuyZone(this.player.x, this.player.y, this.player.team)) return;
        if (!this.isFreezeTime) return;

        if (this.player.buyWeapon(weaponId)) {
            this.updateHUD();
        }
    }

    openBuyMenu() {
        if (!this.map.isInBuyZone(this.player.x, this.player.y, this.player.team)) return;
        if (!this.isFreezeTime) return;

        this.ui.buyMenu.classList.remove('hidden');
    }

    closeBuyMenu() {
        this.ui.buyMenu.classList.add('hidden');
    }

    toggleScoreboard(show) {
        if (show) {
            this.ui.scoreboard.classList.remove('hidden');
            this.updateScoreboard();
        } else {
            this.ui.scoreboard.classList.add('hidden');
        }
    }

    updateScoreboard() {
        document.getElementById('ct-score').textContent = this.ctScore;
        document.getElementById('t-score').textContent = this.tScore;

        const playerList = document.getElementById('player-list');
        playerList.innerHTML = '';

        // Add player
        const playerRow = document.createElement('div');
        playerRow.textContent = `Ty - K: ${this.player.kills} D: ${this.player.deaths}`;
        playerRow.style.color = this.player.team === 'ct' ? '#44aaff' : '#ffaa44';
        playerList.appendChild(playerRow);

        // Add bots
        this.botManager.bots.forEach(bot => {
            const row = document.createElement('div');
            row.textContent = `${bot.name} - K: ${bot.kills} D: ${bot.deaths}`;
            row.style.color = bot.team === 'ct' ? '#44aaff' : '#ffaa44';
            playerList.appendChild(row);
        });
    }

    // Input handlers
    handleKeyDown(e) {
        if (this.state === GameState.MENU) return;

        if (!this.player) return;

        switch (e.code) {
            case 'KeyW':
                this.player.keys.forward = true;
                break;
            case 'KeyS':
                this.player.keys.backward = true;
                break;
            case 'KeyA':
                this.player.keys.left = true;
                break;
            case 'KeyD':
                this.player.keys.right = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.player.keys.walk = true;
                break;
            case 'ControlLeft':
            case 'ControlRight':
                this.player.keys.crouch = true;
                break;
            case 'Space':
                this.player.keys.jump = true;
                break;
            case 'KeyR':
                this.player.keys.reload = true;
                break;
            case 'KeyB':
                if (this.ui.buyMenu.classList.contains('hidden')) {
                    this.openBuyMenu();
                } else {
                    this.closeBuyMenu();
                }
                break;
            case 'Digit1':
                this.player.inventory.switchToSlot(WeaponSlots.PRIMARY);
                break;
            case 'Digit2':
                this.player.inventory.switchToSlot(WeaponSlots.PISTOL);
                break;
            case 'Digit3':
                this.player.inventory.switchToSlot(WeaponSlots.KNIFE);
                break;
            case 'Tab':
                e.preventDefault();
                this.toggleScoreboard(true);
                break;
            case 'Escape':
                this.closeBuyMenu();
                if (this.pointerLocked) {
                    document.exitPointerLock();
                }
                break;
        }
    }

    handleKeyUp(e) {
        if (!this.player) return;

        switch (e.code) {
            case 'KeyW':
                this.player.keys.forward = false;
                break;
            case 'KeyS':
                this.player.keys.backward = false;
                break;
            case 'KeyA':
                this.player.keys.left = false;
                break;
            case 'KeyD':
                this.player.keys.right = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.player.keys.walk = false;
                break;
            case 'ControlLeft':
            case 'ControlRight':
                this.player.keys.crouch = false;
                break;
            case 'Space':
                this.player.keys.jump = false;
                break;
            case 'Tab':
                this.toggleScoreboard(false);
                break;
        }
    }

    handleMouseMove(e) {
        if (!this.pointerLocked || this.state !== GameState.PLAYING) return;
        if (!this.player) return;

        this.player.handleMouseMove(e.movementX, e.movementY);
    }

    handleMouseDown(e) {
        if (!this.pointerLocked || this.state !== GameState.PLAYING) return;
        if (!this.player) return;

        if (e.button === 0) { // Left click
            this.player.keys.fire = true;
        } else if (e.button === 2) { // Right click
            this.player.toggleScope();
        }
    }

    handleMouseUp(e) {
        if (!this.player) return;

        if (e.button === 0) {
            this.player.keys.fire = false;
        }
    }
}
