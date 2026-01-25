// Car definitions and rendering for RC Revolt

const CarDefinitions = [
    {
        id: 'rc_speeder',
        name: 'RC Speeder',
        description: 'Rychlé závodní autíčko s dobrou akcelerací',
        class: 'rookie',
        stats: {
            speed: 85,
            acceleration: 80,
            handling: 70,
            weight: 40
        },
        colors: {
            primary: '#ff0000',
            secondary: '#ffffff',
            accent: '#ffcc00'
        },
        physics: {
            maxSpeed: 450,
            acceleration: 800,
            braking: 2.5,
            handling: 4.5,
            mass: 1.0
        }
    },
    {
        id: 'mini_monster',
        name: 'Mini Monster',
        description: 'Těžké monster truck s vysokou stabilitou',
        class: 'rookie',
        stats: {
            speed: 55,
            acceleration: 50,
            handling: 60,
            weight: 95
        },
        colors: {
            primary: '#228b22',
            secondary: '#000000',
            accent: '#ffff00'
        },
        physics: {
            maxSpeed: 350,
            acceleration: 500,
            braking: 2.0,
            handling: 3.0,
            mass: 1.8
        }
    },
    {
        id: 'turbo_racer',
        name: 'Turbo Racer',
        description: 'Profesionální závodní model',
        class: 'amateur',
        stats: {
            speed: 90,
            acceleration: 75,
            handling: 80,
            weight: 35
        },
        colors: {
            primary: '#0066ff',
            secondary: '#ffffff',
            accent: '#ff6600'
        },
        physics: {
            maxSpeed: 500,
            acceleration: 750,
            braking: 3.0,
            handling: 5.0,
            mass: 0.9
        }
    },
    {
        id: 'drift_king',
        name: 'Drift King',
        description: 'Speciál pro driftování',
        class: 'amateur',
        stats: {
            speed: 75,
            acceleration: 70,
            handling: 95,
            weight: 50
        },
        colors: {
            primary: '#ff00ff',
            secondary: '#000000',
            accent: '#00ffff'
        },
        physics: {
            maxSpeed: 420,
            acceleration: 700,
            braking: 2.8,
            handling: 6.0,
            mass: 1.1
        }
    },
    {
        id: 'classic_toy',
        name: 'Classic Toy',
        description: 'Klasické RC autíčko z 80. let',
        class: 'rookie',
        stats: {
            speed: 60,
            acceleration: 65,
            handling: 75,
            weight: 55
        },
        colors: {
            primary: '#ffcc00',
            secondary: '#ff6600',
            accent: '#ffffff'
        },
        physics: {
            maxSpeed: 380,
            acceleration: 650,
            braking: 2.2,
            handling: 4.0,
            mass: 1.2
        }
    },
    {
        id: 'buggy_pro',
        name: 'Buggy Pro',
        description: 'Terénní bugina pro všechny povrchy',
        class: 'amateur',
        stats: {
            speed: 70,
            acceleration: 85,
            handling: 65,
            weight: 60
        },
        colors: {
            primary: '#ff8800',
            secondary: '#333333',
            accent: '#00ff00'
        },
        physics: {
            maxSpeed: 400,
            acceleration: 850,
            braking: 2.5,
            handling: 3.5,
            mass: 1.3
        }
    },
    {
        id: 'formula_x',
        name: 'Formula X',
        description: 'Nejrychlejší vůz v boxu',
        class: 'pro',
        stats: {
            speed: 100,
            acceleration: 90,
            handling: 75,
            weight: 25
        },
        colors: {
            primary: '#cc0000',
            secondary: '#ffffff',
            accent: '#000000'
        },
        physics: {
            maxSpeed: 550,
            acceleration: 900,
            braking: 3.5,
            handling: 4.8,
            mass: 0.7
        }
    },
    {
        id: 'muscle_mini',
        name: 'Muscle Mini',
        description: 'Miniatura amerického muscle car',
        class: 'pro',
        stats: {
            speed: 88,
            acceleration: 95,
            handling: 55,
            weight: 70
        },
        colors: {
            primary: '#000000',
            secondary: '#ff0000',
            accent: '#ffffff'
        },
        physics: {
            maxSpeed: 480,
            acceleration: 950,
            braking: 2.8,
            handling: 3.2,
            mass: 1.5
        }
    }
];

class Car {
    constructor(definition, x = 0, y = 0, angle = 0) {
        this.definition = definition;
        this.id = definition.id;
        this.name = definition.name;

        // Position and rotation
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.driftAngle = 0;

        // Dimensions
        this.width = 40;
        this.height = 24;

        // Velocity
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 0;
        this.rpm = 1000;

        // Controls
        this.throttle = 0;
        this.brake = 0;
        this.reverse = 0;
        this.steering = 0;
        this.isDrifting = false;

        // Physics properties from definition
        this.maxSpeed = definition.physics.maxSpeed;
        this.baseMaxSpeed = definition.physics.maxSpeed;
        this.acceleration = definition.physics.acceleration;
        this.braking = definition.physics.braking;
        this.handling = definition.physics.handling;
        this.mass = definition.physics.mass;

        // Colors
        this.primaryColor = definition.colors.primary;
        this.secondaryColor = definition.colors.secondary;
        this.accentColor = definition.colors.accent;

        // State
        this.onTrack = true;
        this.onBoostPad = false;
        this.isJumping = false;
        this.jumpTime = 0;
        this.jumpHeight = 0;
        this.boostTime = 0;
        this.invincibleTime = 0;
        this.spinTime = 0;
        this.spinDirection = 0;
        this.isFlipped = false;

        // Power-up
        this.powerup = null;

        // Race state
        this.lap = 0;
        this.checkpoint = 0;
        this.totalCheckpoints = 0;
        this.finished = false;
        this.finishTime = 0;
        this.lapTimes = [];
        this.bestLapTime = Infinity;
        this.wrongWay = false;

        // AI specific
        this.isAI = false;
        this.aiDifficulty = 'medium';
        this.targetWaypoint = 0;

        // Visual effects
        this.wheelRotation = 0;
        this.exhaustTimer = 0;
        this.sparks = [];
    }

    reset(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 0;
        this.rpm = 1000;
        this.throttle = 0;
        this.brake = 0;
        this.reverse = 0;
        this.steering = 0;
        this.isDrifting = false;
        this.boostTime = 0;
        this.maxSpeed = this.baseMaxSpeed;
        this.invincibleTime = 0;
        this.spinTime = 0;
        this.powerup = null;
        this.lap = 0;
        this.checkpoint = 0;
        this.finished = false;
        this.finishTime = 0;
        this.lapTimes = [];
        this.wrongWay = false;
    }

    setColor(color) {
        this.primaryColor = color;
    }

    collectPowerup(type) {
        if (this.powerup === null) {
            this.powerup = type;
            Audio.playPowerupPickup();
            return true;
        }
        return false;
    }

    usePowerup() {
        if (this.powerup === null) return null;

        const type = this.powerup;
        this.powerup = null;
        Audio.playPowerupUse(type);
        return type;
    }

    completeLap(time) {
        this.lapTimes.push(time);
        if (time < this.bestLapTime) {
            this.bestLapTime = time;
        }
        this.lap++;
        Audio.playLapComplete();
    }

    finish(time) {
        this.finished = true;
        this.finishTime = time;
    }

    update(dt) {
        // Update wheel rotation
        this.wheelRotation += this.speed * 0.1 * (dt / 16);

        // Update exhaust
        if (this.throttle > 0.5) {
            this.exhaustTimer += dt;
        }

        // Update sparks
        if (this.isDrifting && this.speed > 100) {
            if (Math.random() < 0.3) {
                this.addSpark();
            }
        }

        // Update and remove old sparks
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            this.sparks[i].life -= dt;
            this.sparks[i].x += this.sparks[i].vx * dt / 16;
            this.sparks[i].y += this.sparks[i].vy * dt / 16;
            if (this.sparks[i].life <= 0) {
                this.sparks.splice(i, 1);
            }
        }
    }

    addSpark() {
        const backX = this.x - Math.cos(this.angle) * this.width / 2;
        const backY = this.y - Math.sin(this.angle) * this.height / 2;

        this.sparks.push({
            x: backX + Utils.randomFloat(-5, 5),
            y: backY + Utils.randomFloat(-5, 5),
            vx: Utils.randomFloat(-2, 2) - this.velocityX * 0.01,
            vy: Utils.randomFloat(-2, 2) - this.velocityY * 0.01,
            life: Utils.randomFloat(100, 300),
            size: Utils.randomFloat(2, 4)
        });
    }

    render(ctx, camera) {
        ctx.save();

        // Apply camera transform
        const screenX = this.x - camera.x + ctx.canvas.width / 2;
        const screenY = this.y - camera.y + ctx.canvas.height / 2;

        ctx.translate(screenX, screenY);
        ctx.rotate(this.angle + this.driftAngle);

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(3, 5, this.width / 2, this.height / 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Jump effect
        if (this.isJumping) {
            const jumpScale = 1 + this.jumpHeight * 0.01;
            ctx.scale(jumpScale, jumpScale);
        }

        // Flash when invincible
        if (this.invincibleTime > 0 && Math.floor(this.invincibleTime / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Draw car body
        this.drawBody(ctx);

        // Draw wheels
        this.drawWheels(ctx);

        // Draw details
        this.drawDetails(ctx);

        ctx.restore();

        // Draw sparks
        this.drawSparks(ctx, camera);

        // Draw exhaust
        if (this.throttle > 0.3) {
            this.drawExhaust(ctx, camera);
        }

        // Draw boost effect
        if (this.boostTime > 0) {
            this.drawBoostFlame(ctx, camera);
        }
    }

    drawBody(ctx) {
        const hw = this.width / 2;
        const hh = this.height / 2;

        // Main body
        ctx.fillStyle = this.primaryColor;
        ctx.beginPath();
        ctx.moveTo(hw, 0);
        ctx.lineTo(hw - 5, -hh);
        ctx.lineTo(-hw + 5, -hh);
        ctx.lineTo(-hw, -hh + 3);
        ctx.lineTo(-hw, hh - 3);
        ctx.lineTo(-hw + 5, hh);
        ctx.lineTo(hw - 5, hh);
        ctx.closePath();
        ctx.fill();

        // Body stripe
        ctx.fillStyle = this.secondaryColor;
        ctx.fillRect(-hw + 10, -3, hw + 5, 6);

        // Cockpit/cabin
        ctx.fillStyle = this.secondaryColor;
        ctx.fillRect(-5, -hh + 2, 15, hh * 2 - 4);

        // Windshield
        ctx.fillStyle = '#4488ff';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(5, -hh + 4, 8, hh * 2 - 8);
        ctx.globalAlpha = 1;
    }

    drawWheels(ctx) {
        const hw = this.width / 2;
        const hh = this.height / 2;
        const wheelW = 8;
        const wheelH = 6;

        ctx.fillStyle = '#333';

        // Front wheels
        ctx.save();
        ctx.translate(hw - 8, -hh - 2);
        ctx.rotate(this.steering * 0.3);
        ctx.fillRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.restore();

        ctx.save();
        ctx.translate(hw - 8, hh + 2);
        ctx.rotate(this.steering * 0.3);
        ctx.fillRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.restore();

        // Rear wheels
        ctx.fillRect(-hw + 4, -hh - 2 - wheelH / 2, wheelW, wheelH);
        ctx.fillRect(-hw + 4, hh + 2 - wheelH / 2, wheelW, wheelH);

        // Wheel treads
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        const treadOffset = (this.wheelRotation % 4) - 2;

        [-hh - 2, hh + 2].forEach(y => {
            for (let i = 0; i < 3; i++) {
                const x = -hw + 4 + treadOffset + i * 3;
                ctx.beginPath();
                ctx.moveTo(x, y - wheelH / 2);
                ctx.lineTo(x, y + wheelH / 2);
                ctx.stroke();
            }
        });
    }

    drawDetails(ctx) {
        const hw = this.width / 2;
        const hh = this.height / 2;

        // Headlights
        ctx.fillStyle = '#ffff88';
        ctx.beginPath();
        ctx.arc(hw - 3, -hh + 4, 2, 0, Math.PI * 2);
        ctx.arc(hw - 3, hh - 4, 2, 0, Math.PI * 2);
        ctx.fill();

        // Taillights
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-hw + 2, -hh + 2, 3, 4);
        ctx.fillRect(-hw + 2, hh - 6, 3, 4);

        // Spoiler
        ctx.fillStyle = this.accentColor;
        ctx.fillRect(-hw, -hh - 1, 4, hh * 2 + 2);

        // Racing number (for AI cars)
        if (this.isAI) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.aiNumber || '?', 0, 3);
        }
    }

    drawSparks(ctx, camera) {
        for (const spark of this.sparks) {
            const sx = spark.x - camera.x + ctx.canvas.width / 2;
            const sy = spark.y - camera.y + ctx.canvas.height / 2;

            ctx.fillStyle = `rgba(255, ${200 + Math.random() * 55}, 0, ${spark.life / 300})`;
            ctx.beginPath();
            ctx.arc(sx, sy, spark.size * spark.life / 300, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawExhaust(ctx, camera) {
        const backX = this.x - Math.cos(this.angle) * this.width / 2;
        const backY = this.y - Math.sin(this.angle) * this.height / 2;

        const sx = backX - camera.x + ctx.canvas.width / 2;
        const sy = backY - camera.y + ctx.canvas.height / 2;

        // Smoke puffs
        for (let i = 0; i < 3; i++) {
            const offset = (this.exhaustTimer / 50 + i * 10) % 30;
            const size = 3 + offset * 0.5;
            const alpha = Math.max(0, 1 - offset / 30);

            const ox = -Math.cos(this.angle) * offset;
            const oy = -Math.sin(this.angle) * offset;

            ctx.fillStyle = `rgba(150, 150, 150, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(sx + ox, sy + oy, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawBoostFlame(ctx, camera) {
        const backX = this.x - Math.cos(this.angle) * this.width / 2;
        const backY = this.y - Math.sin(this.angle) * this.height / 2;

        const sx = backX - camera.x + ctx.canvas.width / 2;
        const sy = backY - camera.y + ctx.canvas.height / 2;

        // Flame
        const flicker = Math.random() * 10;
        const flameLength = 20 + flicker;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(this.angle + Math.PI);

        // Outer flame
        const gradient = ctx.createLinearGradient(0, 0, flameLength, 0);
        gradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(flameLength, 0);
        ctx.lineTo(0, 5);
        ctx.closePath();
        ctx.fill();

        // Inner flame
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(flameLength * 0.5, 0);
        ctx.lineTo(0, 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

// Car factory
const CarFactory = {
    createCar(carId, x = 0, y = 0, angle = 0) {
        const definition = CarDefinitions.find(c => c.id === carId);
        if (!definition) {
            console.warn(`Car definition not found: ${carId}`);
            return new Car(CarDefinitions[0], x, y, angle);
        }
        return new Car(definition, x, y, angle);
    },

    createAICar(carId, difficulty = 'medium', aiNumber = 1) {
        const car = this.createCar(carId);
        car.isAI = true;
        car.aiDifficulty = difficulty;
        car.aiNumber = aiNumber;
        return car;
    },

    getCarById(carId) {
        return CarDefinitions.find(c => c.id === carId);
    },

    getAllCars() {
        return [...CarDefinitions];
    },

    getCarsByClass(carClass) {
        return CarDefinitions.filter(c => c.class === carClass);
    },

    getRandomCar(excludeIds = []) {
        const available = CarDefinitions.filter(c => !excludeIds.includes(c.id));
        return Utils.randomChoice(available);
    }
};
