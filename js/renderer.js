// Renderer for RC Revolt

class Renderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.minimapCanvas = null;
        this.minimapCtx = null;
        this.camera = { x: 0, y: 0 };
        this.cameraTarget = { x: 0, y: 0 };
        this.cameraSmooth = 0.1;
        this.shake = { x: 0, y: 0, intensity: 0 };
        this.particles = [];
        this.quality = 'medium';
    }

    init(canvasId, minimapCanvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        if (minimapCanvasId) {
            this.minimapCanvas = document.getElementById(minimapCanvasId);
            this.minimapCtx = this.minimapCanvas.getContext('2d');
        }

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setQuality(quality) {
        this.quality = quality;
    }

    setCameraTarget(x, y) {
        this.cameraTarget.x = x;
        this.cameraTarget.y = y;
    }

    updateCamera(dt) {
        // Smooth camera follow
        const t = 1 - Math.pow(1 - this.cameraSmooth, dt / 16);
        this.camera.x = Utils.lerp(this.camera.x, this.cameraTarget.x, t);
        this.camera.y = Utils.lerp(this.camera.y, this.cameraTarget.y, t);

        // Apply camera shake
        if (this.shake.intensity > 0) {
            this.shake.x = (Math.random() - 0.5) * this.shake.intensity * 2;
            this.shake.y = (Math.random() - 0.5) * this.shake.intensity * 2;
            this.shake.intensity *= 0.9;
            if (this.shake.intensity < 0.1) this.shake.intensity = 0;
        } else {
            this.shake.x = 0;
            this.shake.y = 0;
        }
    }

    addShake(intensity) {
        this.shake.intensity = Math.min(this.shake.intensity + intensity, 20);
    }

    // Particle system
    addParticle(x, y, type, options = {}) {
        const particle = {
            x, y,
            type,
            vx: options.vx || (Math.random() - 0.5) * 4,
            vy: options.vy || (Math.random() - 0.5) * 4,
            life: options.life || 1000,
            maxLife: options.life || 1000,
            size: options.size || 5,
            color: options.color || '#ffffff',
            gravity: options.gravity || 0
        };
        this.particles.push(particle);
    }

    addExplosion(x, y, color = '#ff8800', count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = Utils.randomFloat(2, 8);
            this.addParticle(x, y, 'explosion', {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: Utils.randomFloat(300, 600),
                size: Utils.randomFloat(3, 8),
                color: color,
                gravity: 0.1
            });
        }
    }

    addDust(x, y, count = 5) {
        for (let i = 0; i < count; i++) {
            this.addParticle(x, y, 'dust', {
                vx: Utils.randomFloat(-1, 1),
                vy: Utils.randomFloat(-2, 0),
                life: Utils.randomFloat(200, 500),
                size: Utils.randomFloat(2, 6),
                color: '#a08060'
            });
        }
    }

    addSpark(x, y) {
        this.addParticle(x, y, 'spark', {
            vx: Utils.randomFloat(-3, 3),
            vy: Utils.randomFloat(-3, 3),
            life: Utils.randomFloat(100, 300),
            size: Utils.randomFloat(2, 4),
            color: '#ffcc00'
        });
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx * dt / 16;
            p.y += p.vy * dt / 16;
            p.vy += p.gravity;
            p.life -= dt;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    renderParticles(ctx) {
        for (const p of this.particles) {
            const screenX = p.x - this.camera.x + ctx.canvas.width / 2 + this.shake.x;
            const screenY = p.y - this.camera.y + ctx.canvas.height / 2 + this.shake.y;

            const alpha = p.life / p.maxLife;
            const size = p.size * alpha;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // Main render function
    render(gameState) {
        const ctx = this.ctx;

        // Clear
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply camera offset with shake
        ctx.save();
        ctx.translate(this.shake.x, this.shake.y);

        // Render track
        if (gameState.track) {
            gameState.track.render(ctx, this.camera);
        }

        // Render power-ups
        if (gameState.powerupMgr) {
            gameState.powerupMgr.render(ctx, this.camera);
        }

        // Render cars (sorted by Y position for pseudo-3D)
        if (gameState.cars) {
            const sortedCars = [...gameState.cars].sort((a, b) => a.y - b.y);
            for (const car of sortedCars) {
                car.render(ctx, this.camera);
            }
        }

        // Render particles
        this.renderParticles(ctx);

        ctx.restore();

        // Render minimap
        if (this.minimapCtx && gameState.track && gameState.cars) {
            gameState.track.renderMinimap(
                this.minimapCtx,
                gameState.cars,
                gameState.playerCar
            );
        }
    }

    // Clear particles
    clearParticles() {
        this.particles = [];
    }

    // Reset camera
    resetCamera(x, y) {
        this.camera.x = x;
        this.camera.y = y;
        this.cameraTarget.x = x;
        this.cameraTarget.y = y;
    }
}

// UI Renderer for HUD elements
class UIRenderer {
    constructor() {
        this.elements = {};
    }

    cacheElements() {
        this.elements = {
            position: document.getElementById('current-position'),
            totalRacers: document.getElementById('total-racers'),
            lap: document.getElementById('current-lap'),
            totalLaps: document.getElementById('total-laps'),
            time: document.getElementById('race-time'),
            speed: document.getElementById('speed-value'),
            speedNeedle: document.getElementById('speed-needle'),
            powerupIcon: document.getElementById('powerup-icon'),
            powerupSlot: document.getElementById('powerup-slot'),
            countdown: document.getElementById('countdown'),
            countdownText: document.getElementById('countdown-text'),
            pauseMenu: document.getElementById('pause-menu'),
            raceResults: document.getElementById('race-results'),
            resultsBody: document.getElementById('results-body')
        };
    }

    updatePosition(position, total) {
        if (this.elements.position) {
            this.elements.position.textContent = position;
        }
        if (this.elements.totalRacers) {
            this.elements.totalRacers.textContent = total;
        }
    }

    updateLap(current, total) {
        if (this.elements.lap) {
            this.elements.lap.textContent = current;
        }
        if (this.elements.totalLaps) {
            this.elements.totalLaps.textContent = total;
        }
    }

    updateTime(timeMs) {
        if (this.elements.time) {
            this.elements.time.textContent = Utils.formatRaceTime(timeMs);
        }
    }

    updateSpeed(speed) {
        if (this.elements.speed) {
            const displaySpeed = Math.round(speed * 0.5); // Convert to km/h-ish
            this.elements.speed.textContent = displaySpeed;
        }
        if (this.elements.speedNeedle) {
            const maxSpeed = 300;
            const angle = -90 + (speed / maxSpeed) * 180;
            this.elements.speedNeedle.style.transform =
                `translateX(-50%) rotate(${angle}deg)`;
        }
    }

    updatePowerup(powerupId) {
        if (this.elements.powerupIcon) {
            if (powerupId) {
                const type = Object.values(PowerupTypes).find(t => t.id === powerupId);
                this.elements.powerupIcon.textContent = type ? type.icon : '?';
                this.elements.powerupSlot.classList.add('has-powerup');
            } else {
                this.elements.powerupIcon.textContent = '';
                this.elements.powerupSlot.classList.remove('has-powerup');
            }
        }
    }

    showCountdown(number) {
        if (this.elements.countdown && this.elements.countdownText) {
            this.elements.countdown.classList.remove('hidden');
            this.elements.countdownText.textContent = number > 0 ? number : 'GO!';

            // Reset animation
            this.elements.countdownText.style.animation = 'none';
            void this.elements.countdownText.offsetWidth; // Trigger reflow
            this.elements.countdownText.style.animation = '';
        }
    }

    hideCountdown() {
        if (this.elements.countdown) {
            this.elements.countdown.classList.add('hidden');
        }
    }

    showPauseMenu() {
        if (this.elements.pauseMenu) {
            this.elements.pauseMenu.classList.remove('hidden');
        }
    }

    hidePauseMenu() {
        if (this.elements.pauseMenu) {
            this.elements.pauseMenu.classList.add('hidden');
        }
    }

    showResults(results, playerName = 'Hráč') {
        if (this.elements.raceResults && this.elements.resultsBody) {
            this.elements.resultsBody.innerHTML = '';

            results.forEach((result, index) => {
                const row = document.createElement('tr');
                if (result.isPlayer) {
                    row.classList.add('player');
                }

                row.innerHTML = `
                    <td>${index + 1}.</td>
                    <td>${result.isPlayer ? playerName : result.name}</td>
                    <td>${Utils.formatRaceTime(result.time)}</td>
                `;

                this.elements.resultsBody.appendChild(row);
            });

            this.elements.raceResults.classList.remove('hidden');
        }
    }

    hideResults() {
        if (this.elements.raceResults) {
            this.elements.raceResults.classList.add('hidden');
        }
    }

    showWrongWay(show) {
        let wrongWay = document.getElementById('wrong-way');
        if (show) {
            if (!wrongWay) {
                wrongWay = document.createElement('div');
                wrongWay.id = 'wrong-way';
                wrongWay.textContent = 'ŠPATNÝ SMĚR!';
                document.getElementById('game-screen').appendChild(wrongWay);
            }
        } else if (wrongWay) {
            wrongWay.remove();
        }
    }

    showLapTime(time, isBest) {
        const popup = document.createElement('div');
        popup.className = `lap-time-popup ${isBest ? 'best' : 'normal'}`;
        popup.textContent = `${isBest ? 'NEJLEPŠÍ KOL! ' : 'Kolo: '}${Utils.formatRaceTime(time)}`;
        document.getElementById('game-screen').appendChild(popup);

        setTimeout(() => popup.remove(), 2500);
    }
}

const GameRenderer = new Renderer();
const UI = new UIRenderer();
