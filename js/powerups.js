// Power-up system for RC Revolt

const PowerupTypes = {
    // Offensive power-ups
    ROCKET: {
        id: 'rocket',
        name: 'Raketa',
        description: 'Střela vpřed',
        color: '#ff4444',
        icon: '🚀',
        rarity: 0.15
    },
    MISSILE: {
        id: 'missile',
        name: 'Naváděná střela',
        description: 'Sleduje nejbližší cíl',
        color: '#ff8800',
        icon: '🎯',
        rarity: 0.1
    },
    BOMB: {
        id: 'bomb',
        name: 'Bomba',
        description: 'Položí bombu za sebe',
        color: '#333333',
        icon: '💣',
        rarity: 0.15
    },
    SHOCKWAVE: {
        id: 'shockwave',
        name: 'Rázová vlna',
        description: 'Zpomalí okolní soupeře',
        color: '#00ccff',
        icon: '⚡',
        rarity: 0.08
    },
    OIL: {
        id: 'oil',
        name: 'Olejová skvrna',
        description: 'Soupeři na ní smýkají',
        color: '#222222',
        icon: '🛢️',
        rarity: 0.12
    },

    // Defensive/Support power-ups
    SHIELD: {
        id: 'shield',
        name: 'Štít',
        description: 'Dočasná nezranitelnost',
        color: '#4488ff',
        icon: '🛡️',
        rarity: 0.1
    },
    BATTERY: {
        id: 'battery',
        name: 'Turbo baterie',
        description: 'Velký boost rychlosti',
        color: '#ffcc00',
        icon: '🔋',
        rarity: 0.15
    },
    BOOST: {
        id: 'boost',
        name: 'Mini boost',
        description: 'Malé zrychlení',
        color: '#00ff00',
        icon: '💨',
        rarity: 0.2
    },

    // Special power-ups
    WATERBOMB: {
        id: 'waterbomb',
        name: 'Vodní bomba',
        description: 'Balónek s vodou',
        color: '#4488ff',
        icon: '💧',
        rarity: 0.1
    },
    FIREWORK: {
        id: 'firework',
        name: 'Ohňostroj',
        description: 'Rozptylující exploze',
        color: '#ff00ff',
        icon: '🎆',
        rarity: 0.05
    }
};

class Powerup {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.rotation = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.active = true;
        this.respawnTime = 0;
        this.respawnDelay = 10000; // 10 seconds
    }

    update(dt) {
        this.rotation += dt * 0.003;
        this.bobOffset += dt * 0.005;

        if (!this.active && this.respawnTime > 0) {
            this.respawnTime -= dt;
            if (this.respawnTime <= 0) {
                this.active = true;
            }
        }
    }

    collect() {
        this.active = false;
        this.respawnTime = this.respawnDelay;
    }

    render(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x + ctx.canvas.width / 2;
        const screenY = this.y - camera.y + ctx.canvas.height / 2;

        // Bob animation
        const bob = Math.sin(this.bobOffset) * 3;

        ctx.save();
        ctx.translate(screenX, screenY + bob);
        ctx.rotate(this.rotation);

        // Glow effect
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 1.5);
        gradient.addColorStop(0, this.type.color + '88');
        gradient.addColorStop(1, this.type.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Box shape
        ctx.fillStyle = this.type.color;
        ctx.beginPath();
        this.drawBox(ctx, 0, 0, this.radius * 1.6);
        ctx.fill();

        // Inner box
        ctx.fillStyle = Utils.shadeColor(this.type.color, 30);
        ctx.beginPath();
        this.drawBox(ctx, 0, 0, this.radius * 1.2);
        ctx.fill();

        // Question mark or icon
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', 0, 0);

        ctx.restore();

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screenX, screenY + this.radius + 5, this.radius * 0.8, this.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawBox(ctx, x, y, size) {
        const half = size / 2;
        ctx.moveTo(x, y - half);
        ctx.lineTo(x + half, y);
        ctx.lineTo(x, y + half);
        ctx.lineTo(x - half, y);
        ctx.closePath();
    }
}

class Projectile {
    constructor(type, x, y, angle, owner) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.owner = owner;
        this.speed = this.getSpeed();
        this.velocityX = Math.cos(angle) * this.speed;
        this.velocityY = Math.sin(angle) * this.speed;
        this.active = true;
        this.lifetime = this.getLifetime();
        this.target = null;
        this.trailPoints = [];
    }

    getSpeed() {
        switch (this.type.id) {
            case 'rocket': return 600;
            case 'missile': return 450;
            case 'waterbomb': return 400;
            case 'firework': return 500;
            default: return 500;
        }
    }

    getLifetime() {
        switch (this.type.id) {
            case 'rocket': return 3000;
            case 'missile': return 5000;
            case 'waterbomb': return 2000;
            case 'firework': return 2500;
            default: return 3000;
        }
    }

    update(dt, cars) {
        const deltaTime = dt / 1000;

        // Homing missile logic
        if (this.type.id === 'missile' && !this.target) {
            this.findTarget(cars);
        }

        if (this.type.id === 'missile' && this.target) {
            // Home towards target
            const targetAngle = Math.atan2(
                this.target.y - this.y,
                this.target.x - this.x
            );

            let angleDiff = Utils.angleDifference(this.angle, targetAngle);
            const turnRate = 3 * deltaTime;
            this.angle += Utils.clamp(angleDiff, -turnRate, turnRate);

            this.velocityX = Math.cos(this.angle) * this.speed;
            this.velocityY = Math.sin(this.angle) * this.speed;
        }

        // Update position
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;

        // Update trail
        this.trailPoints.unshift({ x: this.x, y: this.y, age: 0 });
        if (this.trailPoints.length > 20) {
            this.trailPoints.pop();
        }
        for (const point of this.trailPoints) {
            point.age += dt;
        }

        // Update lifetime
        this.lifetime -= dt;
        if (this.lifetime <= 0) {
            this.active = false;
        }

        // Check collisions with cars
        for (const car of cars) {
            if (car === this.owner) continue;
            if (car.invincibleTime > 0) continue;

            const dist = Utils.distance(this.x, this.y, car.x, car.y);
            if (dist < 30) {
                this.hit(car);
                return;
            }
        }
    }

    findTarget(cars) {
        let closestDist = Infinity;
        let closestCar = null;

        for (const car of cars) {
            if (car === this.owner) continue;

            // Check if car is ahead of projectile
            const toCar = { x: car.x - this.x, y: car.y - this.y };
            const forward = { x: Math.cos(this.angle), y: Math.sin(this.angle) };
            const dot = toCar.x * forward.x + toCar.y * forward.y;

            if (dot > 0) {
                const dist = Utils.distance(this.x, this.y, car.x, car.y);
                if (dist < closestDist && dist < 500) {
                    closestDist = dist;
                    closestCar = car;
                }
            }
        }

        this.target = closestCar;
    }

    hit(car) {
        this.active = false;
        Physics.spinOut(car);
        Audio.playExplosion(0.7);
    }

    render(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x + ctx.canvas.width / 2;
        const screenY = this.y - camera.y + ctx.canvas.height / 2;

        // Draw trail
        ctx.beginPath();
        for (let i = 0; i < this.trailPoints.length; i++) {
            const point = this.trailPoints[i];
            const px = point.x - camera.x + ctx.canvas.width / 2;
            const py = point.y - camera.y + ctx.canvas.height / 2;
            const alpha = 1 - (i / this.trailPoints.length);

            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.strokeStyle = this.type.color + '88';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw projectile
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.angle);

        switch (this.type.id) {
            case 'rocket':
                this.drawRocket(ctx);
                break;
            case 'missile':
                this.drawMissile(ctx);
                break;
            case 'waterbomb':
                this.drawWaterBomb(ctx);
                break;
            case 'firework':
                this.drawFirework(ctx);
                break;
            default:
                this.drawGenericProjectile(ctx);
        }

        ctx.restore();
    }

    drawRocket(ctx) {
        // Body
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, -6);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, 6);
        ctx.closePath();
        ctx.fill();

        // Fins
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(-10, -8, 5, 4);
        ctx.fillRect(-10, 4, 5, 4);

        // Flame
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(-15, -3);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-15, 3);
        ctx.closePath();
        ctx.fill();
    }

    drawMissile(ctx) {
        // Body
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Nose
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(8, -4);
        ctx.lineTo(8, 4);
        ctx.closePath();
        ctx.fill();

        // Wings
        ctx.fillStyle = '#cc6600';
        ctx.fillRect(-8, -8, 6, 3);
        ctx.fillRect(-8, 5, 6, 3);
    }

    drawWaterBomb(ctx) {
        // Balloon
        ctx.fillStyle = '#4488ff';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = '#88ccff';
        ctx.beginPath();
        ctx.arc(-3, -3, 4, 0, Math.PI * 2);
        ctx.fill();

        // Knot
        ctx.fillStyle = '#2266cc';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(12, -2);
        ctx.lineTo(12, 2);
        ctx.closePath();
        ctx.fill();
    }

    drawFirework(ctx) {
        // Tube
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(-8, -4, 16, 8);

        // Sparkle
        const sparkle = Math.random() * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${sparkle})`;
        ctx.beginPath();
        ctx.arc(10, 0, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawGenericProjectile(ctx) {
        ctx.fillStyle = this.type.color;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Hazard {
    constructor(type, x, y, owner) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.owner = owner;
        this.active = true;
        this.lifetime = this.getLifetime();
        this.radius = this.getRadius();
        this.triggered = false;
        this.triggerTime = 0;
    }

    getLifetime() {
        switch (this.type.id) {
            case 'bomb': return 15000;
            case 'oil': return 20000;
            default: return 10000;
        }
    }

    getRadius() {
        switch (this.type.id) {
            case 'bomb': return 15;
            case 'oil': return 30;
            default: return 20;
        }
    }

    update(dt, cars) {
        this.lifetime -= dt;
        if (this.lifetime <= 0) {
            this.active = false;
            return;
        }

        if (this.triggered) {
            this.triggerTime += dt;
            if (this.triggerTime > 500) {
                this.explode(cars);
            }
            return;
        }

        // Check collisions with cars
        for (const car of cars) {
            if (this.type.id === 'bomb' && car === this.owner && this.lifetime > 14000) {
                continue; // Brief grace period for owner
            }

            const dist = Utils.distance(this.x, this.y, car.x, car.y);
            if (dist < this.radius + car.width / 2) {
                this.affect(car);
            }
        }
    }

    affect(car) {
        switch (this.type.id) {
            case 'bomb':
                if (!this.triggered) {
                    this.triggered = true;
                    this.triggerTime = 0;
                    Audio.playPowerupUse('bomb');
                }
                break;
            case 'oil':
                car.isDrifting = true;
                if (car.speed > 150) {
                    Physics.spinOut(car, car.steering > 0 ? 1 : -1);
                }
                break;
        }
    }

    explode(cars) {
        this.active = false;
        Audio.playExplosion(1);

        // Affect nearby cars
        for (const car of cars) {
            const dist = Utils.distance(this.x, this.y, car.x, car.y);
            if (dist < 100) {
                if (car.invincibleTime <= 0) {
                    Physics.spinOut(car);

                    // Push car away
                    const angle = Math.atan2(car.y - this.y, car.x - this.x);
                    const force = (100 - dist) * 3;
                    car.velocityX += Math.cos(angle) * force;
                    car.velocityY += Math.sin(angle) * force;
                }
            }
        }
    }

    render(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x + ctx.canvas.width / 2;
        const screenY = this.y - camera.y + ctx.canvas.height / 2;

        switch (this.type.id) {
            case 'bomb':
                this.drawBomb(ctx, screenX, screenY);
                break;
            case 'oil':
                this.drawOil(ctx, screenX, screenY);
                break;
            default:
                ctx.fillStyle = this.type.color;
                ctx.beginPath();
                ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
                ctx.fill();
        }
    }

    drawBomb(ctx, x, y) {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + 5, this.radius * 0.8, this.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bomb body
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = '#555555';
        ctx.beginPath();
        ctx.arc(x - 4, y - 4, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Fuse
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y - this.radius);
        ctx.quadraticCurveTo(x + 5, y - this.radius - 5, x + 8, y - this.radius - 10);
        ctx.stroke();

        // Spark
        if (this.triggered) {
            const sparkSize = 5 + Math.random() * 5;
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(x + 8, y - this.radius - 10, sparkSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawOil(ctx, x, y) {
        // Oil splatter
        ctx.fillStyle = 'rgba(20, 20, 30, 0.8)';

        // Main blob
        ctx.beginPath();
        ctx.ellipse(x, y, this.radius, this.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Smaller blobs
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const dist = this.radius * 0.8;
            const bx = x + Math.cos(angle) * dist;
            const by = y + Math.sin(angle) * dist * 0.7;
            const size = this.radius * (0.2 + Math.random() * 0.3);

            ctx.beginPath();
            ctx.ellipse(bx, by, size, size * 0.7, angle, 0, Math.PI * 2);
            ctx.fill();
        }

        // Shine
        ctx.fillStyle = 'rgba(100, 100, 120, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x - 5, y - 3, this.radius * 0.3, this.radius * 0.2, -0.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

class ShockwaveEffect {
    constructor(x, y, owner) {
        this.x = x;
        this.y = y;
        this.owner = owner;
        this.radius = 0;
        this.maxRadius = 200;
        this.speed = 400;
        this.active = true;
        this.affectedCars = new Set();
    }

    update(dt, cars) {
        const deltaTime = dt / 1000;
        this.radius += this.speed * deltaTime;

        if (this.radius >= this.maxRadius) {
            this.active = false;
            return;
        }

        // Affect cars at the wave front
        for (const car of cars) {
            if (car === this.owner) continue;
            if (this.affectedCars.has(car)) continue;

            const dist = Utils.distance(this.x, this.y, car.x, car.y);
            if (dist >= this.radius - 20 && dist <= this.radius + 20) {
                this.affectedCars.add(car);

                if (car.invincibleTime <= 0) {
                    // Slow down car
                    car.velocityX *= 0.3;
                    car.velocityY *= 0.3;

                    // Brief spin
                    car.spinTime = 300;
                    car.spinDirection = Math.random() > 0.5 ? 1 : -1;
                }
            }
        }
    }

    render(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x + ctx.canvas.width / 2;
        const screenY = this.y - camera.y + ctx.canvas.height / 2;

        const alpha = 1 - (this.radius / this.maxRadius);

        // Outer ring
        ctx.strokeStyle = `rgba(0, 200, 255, ${alpha})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner ring
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius * 0.9, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Power-up manager
class PowerupManager {
    constructor() {
        this.powerups = [];
        this.projectiles = [];
        this.hazards = [];
        this.effects = [];
    }

    init(track) {
        this.powerups = [];
        this.projectiles = [];
        this.hazards = [];
        this.effects = [];

        // Create power-ups at spawn points
        if (track && track.powerupSpawns) {
            for (const spawn of track.powerupSpawns) {
                const type = this.getRandomPowerupType();
                this.powerups.push(new Powerup(type, spawn.x, spawn.y));
            }
        }
    }

    getRandomPowerupType() {
        const types = Object.values(PowerupTypes);
        const totalRarity = types.reduce((sum, t) => sum + t.rarity, 0);
        let random = Math.random() * totalRarity;

        for (const type of types) {
            random -= type.rarity;
            if (random <= 0) {
                return type;
            }
        }

        return types[0];
    }

    update(dt, cars) {
        // Update power-ups
        for (const powerup of this.powerups) {
            powerup.update(dt);
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update(dt, cars);
            if (!this.projectiles[i].active) {
                this.projectiles.splice(i, 1);
            }
        }

        // Update hazards
        for (let i = this.hazards.length - 1; i >= 0; i--) {
            this.hazards[i].update(dt, cars);
            if (!this.hazards[i].active) {
                this.hazards.splice(i, 1);
            }
        }

        // Update effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            this.effects[i].update(dt, cars);
            if (!this.effects[i].active) {
                this.effects.splice(i, 1);
            }
        }
    }

    checkCollisions(car) {
        for (const powerup of this.powerups) {
            if (!powerup.active) continue;

            const dist = Utils.distance(car.x, car.y, powerup.x, powerup.y);
            if (dist < powerup.radius + car.width / 2) {
                if (car.collectPowerup(powerup.type.id)) {
                    powerup.collect();
                    return powerup.type;
                }
            }
        }
        return null;
    }

    usePowerup(car) {
        const powerupId = car.usePowerup();
        if (!powerupId) return;

        const type = Object.values(PowerupTypes).find(t => t.id === powerupId);
        if (!type) return;

        switch (powerupId) {
            case 'rocket':
            case 'missile':
            case 'waterbomb':
            case 'firework':
                this.fireProjectile(type, car);
                break;
            case 'bomb':
            case 'oil':
                this.dropHazard(type, car);
                break;
            case 'boost':
                Physics.applyBoost(car, 1.3, 500);
                break;
            case 'battery':
                Physics.applyBoost(car, 1.5, 1500);
                break;
            case 'shield':
                car.invincibleTime = 5000;
                break;
            case 'shockwave':
                this.createShockwave(car);
                break;
        }
    }

    fireProjectile(type, car) {
        const frontX = car.x + Math.cos(car.angle) * car.width / 2;
        const frontY = car.y + Math.sin(car.angle) * car.width / 2;

        this.projectiles.push(new Projectile(type, frontX, frontY, car.angle, car));
    }

    dropHazard(type, car) {
        const backX = car.x - Math.cos(car.angle) * car.width / 2;
        const backY = car.y - Math.sin(car.angle) * car.width / 2;

        this.hazards.push(new Hazard(type, backX, backY, car));
    }

    createShockwave(car) {
        this.effects.push(new ShockwaveEffect(car.x, car.y, car));
        Audio.playShockwave();
    }

    render(ctx, camera) {
        // Render hazards first (under everything)
        for (const hazard of this.hazards) {
            hazard.render(ctx, camera);
        }

        // Render power-ups
        for (const powerup of this.powerups) {
            powerup.render(ctx, camera);
        }

        // Render projectiles
        for (const projectile of this.projectiles) {
            projectile.render(ctx, camera);
        }

        // Render effects
        for (const effect of this.effects) {
            effect.render(ctx, camera);
        }
    }

    cleanup() {
        this.powerups = [];
        this.projectiles = [];
        this.hazards = [];
        this.effects = [];
    }
}

const PowerupMgr = new PowerupManager();
