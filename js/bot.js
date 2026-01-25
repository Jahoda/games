// Bot AI for Counter-Strike Clone

const BotDifficulty = {
    EASY: { reactionTime: 800, accuracy: 0.4, moveSpeed: 0.7 },
    MEDIUM: { reactionTime: 400, accuracy: 0.6, moveSpeed: 0.85 },
    HARD: { reactionTime: 200, accuracy: 0.8, moveSpeed: 1.0 },
    EXPERT: { reactionTime: 100, accuracy: 0.95, moveSpeed: 1.0 }
};

const BotState = {
    IDLE: 'idle',
    PATROL: 'patrol',
    CHASE: 'chase',
    ATTACK: 'attack',
    RETREAT: 'retreat',
    DEAD: 'dead'
};

const BotNames = [
    'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo',
    'Fox', 'Ghost', 'Hawk', 'Ivan', 'Joker',
    'Kilo', 'Lima', 'Mike', 'Nova', 'Oscar',
    'Papa', 'Romeo', 'Sierra', 'Tango', 'Victor'
];

class Bot {
    constructor(team, difficulty = 'MEDIUM') {
        this.id = Math.random().toString(36).substr(2, 9);
        this.name = BotNames[Math.floor(Math.random() * BotNames.length)];
        this.team = team;
        this.difficulty = BotDifficulty[difficulty] || BotDifficulty.MEDIUM;

        // Position
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.radius = 15;

        // Stats
        this.health = 100;
        this.maxHealth = 100;
        this.armor = 0;
        this.isAlive = true;

        // Inventory
        this.inventory = new Inventory();

        // AI state
        this.state = BotState.IDLE;
        this.target = null;
        this.lastKnownTargetPos = null;
        this.targetAcquiredTime = 0;

        // Pathfinding
        this.path = [];
        this.currentPathIndex = 0;
        this.patrolPoints = [];
        this.currentPatrolIndex = 0;

        // Combat
        this.lastFireTime = 0;
        this.lastSeenTime = 0;
        this.kills = 0;
        this.deaths = 0;

        // Movement
        this.velocity = new Vector2D();
        this.moveSpeed = 200 * this.difficulty.moveSpeed;
    }

    spawn(spawnPoint, angle = 0) {
        this.x = spawnPoint.x;
        this.y = spawnPoint.y;
        this.angle = angle;
        this.health = this.maxHealth;
        this.isAlive = true;
        this.state = BotState.PATROL;
        this.target = null;
        this.path = [];
        this.velocity = new Vector2D();
    }

    reset() {
        this.health = this.maxHealth;
        this.armor = 0;
        this.isAlive = true;
        this.inventory.reset(this.team);
        this.state = BotState.IDLE;
        this.target = null;
    }

    update(deltaTime, map, entities, player) {
        if (!this.isAlive) return;

        const dt = deltaTime / 1000;

        // Update weapon
        const weapon = this.inventory.getCurrentWeapon();
        if (weapon) {
            weapon.updateReload(performance.now());
        }

        // Find targets
        this.updateTargetAcquisition(map, entities, player);

        // Update AI state
        this.updateState(map);

        // Execute behavior based on state
        switch (this.state) {
            case BotState.IDLE:
                this.behaviorIdle(dt, map);
                break;
            case BotState.PATROL:
                this.behaviorPatrol(dt, map);
                break;
            case BotState.CHASE:
                this.behaviorChase(dt, map);
                break;
            case BotState.ATTACK:
                this.behaviorAttack(dt, map);
                break;
            case BotState.RETREAT:
                this.behaviorRetreat(dt, map);
                break;
        }

        // Apply movement
        this.applyMovement(dt, map);
    }

    updateTargetAcquisition(map, entities, player) {
        const now = performance.now();
        let closestEnemy = null;
        let closestDist = Infinity;

        // Check player
        if (player && player.isAlive && player.team !== this.team) {
            const dist = Utils.distance(this.x, this.y, player.x, player.y);
            if (dist < 800 && this.canSee(player.x, player.y, map)) {
                closestEnemy = player;
                closestDist = dist;
            }
        }

        // Check other entities (bots)
        if (entities) {
            entities.forEach(entity => {
                if (entity === this || !entity.isAlive || entity.team === this.team) return;

                const dist = Utils.distance(this.x, this.y, entity.x, entity.y);
                if (dist < 800 && dist < closestDist && this.canSee(entity.x, entity.y, map)) {
                    closestEnemy = entity;
                    closestDist = dist;
                }
            });
        }

        // Update target
        if (closestEnemy) {
            if (this.target !== closestEnemy) {
                this.targetAcquiredTime = now;
            }
            this.target = closestEnemy;
            this.lastKnownTargetPos = { x: closestEnemy.x, y: closestEnemy.y };
            this.lastSeenTime = now;
        } else if (now - this.lastSeenTime > 3000) {
            // Lost target for too long
            this.target = null;
        }
    }

    canSee(targetX, targetY, map) {
        return map.hasLineOfSight(this.x, this.y, targetX, targetY);
    }

    updateState(map) {
        const weapon = this.inventory.getCurrentWeapon();
        const hasAmmo = weapon && (weapon.currentClip > 0 || weapon.type === WeaponTypes.KNIFE);

        if (this.target) {
            const dist = Utils.distance(this.x, this.y, this.target.x, this.target.y);

            // Low health - retreat
            if (this.health < 30 && hasAmmo) {
                this.state = BotState.RETREAT;
            }
            // Close range - attack
            else if (dist < weapon.range * 0.8) {
                this.state = BotState.ATTACK;
            }
            // Medium range - chase
            else {
                this.state = BotState.CHASE;
            }
        } else if (this.lastKnownTargetPos) {
            this.state = BotState.CHASE;
        } else {
            this.state = BotState.PATROL;
        }

        // Need to reload
        if (weapon && weapon.currentClip === 0 && weapon.currentReserve > 0) {
            weapon.startReload(performance.now());
        }
    }

    behaviorIdle(dt, map) {
        // Stand still, look around occasionally
        if (Math.random() < 0.01) {
            this.angle += (Math.random() - 0.5) * 0.5;
        }
    }

    behaviorPatrol(dt, map) {
        // If no patrol points, generate some
        if (this.patrolPoints.length === 0) {
            this.generatePatrolPoints(map);
        }

        // Move to current patrol point
        const target = this.patrolPoints[this.currentPatrolIndex];
        if (!target) return;

        const dist = Utils.distance(this.x, this.y, target.x, target.y);

        if (dist < 30) {
            // Reached point, move to next
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
        } else {
            this.moveToward(target.x, target.y, dt);
        }
    }

    behaviorChase(dt, map) {
        let targetPos = this.target
            ? { x: this.target.x, y: this.target.y }
            : this.lastKnownTargetPos;

        if (!targetPos) {
            this.state = BotState.PATROL;
            return;
        }

        const dist = Utils.distance(this.x, this.y, targetPos.x, targetPos.y);

        if (dist < 50) {
            // Reached last known position
            this.lastKnownTargetPos = null;
            if (!this.target) {
                this.state = BotState.PATROL;
            }
        } else {
            this.moveToward(targetPos.x, targetPos.y, dt);
        }

        // Look at target if visible
        if (this.target) {
            this.lookAt(this.target.x, this.target.y, dt);
        }
    }

    behaviorAttack(dt, map) {
        if (!this.target || !this.target.isAlive) {
            this.state = BotState.PATROL;
            return;
        }

        // Look at target
        this.lookAt(this.target.x, this.target.y, dt);

        // Strafe randomly
        if (Math.random() < 0.02) {
            this.strafeDirection = Math.random() < 0.5 ? -1 : 1;
        }

        const strafeAngle = this.angle + (Math.PI / 2) * (this.strafeDirection || 1);
        this.velocity.x = Math.cos(strafeAngle) * this.moveSpeed * 0.5;
        this.velocity.y = Math.sin(strafeAngle) * this.moveSpeed * 0.5;

        // Fire at target
        this.tryFire();
    }

    behaviorRetreat(dt, map) {
        if (!this.target) {
            this.state = BotState.PATROL;
            return;
        }

        // Move away from target
        const awayAngle = Utils.angleBetween(this.target.x, this.target.y, this.x, this.y);
        this.velocity.x = Math.cos(awayAngle) * this.moveSpeed;
        this.velocity.y = Math.sin(awayAngle) * this.moveSpeed;

        // Still try to fire while retreating
        this.lookAt(this.target.x, this.target.y, dt);
        this.tryFire();
    }

    moveToward(targetX, targetY, dt) {
        const angle = Utils.angleBetween(this.x, this.y, targetX, targetY);
        this.velocity.x = Math.cos(angle) * this.moveSpeed;
        this.velocity.y = Math.sin(angle) * this.moveSpeed;

        // Gradually turn toward movement direction
        this.lookAt(targetX, targetY, dt);
    }

    lookAt(targetX, targetY, dt) {
        const targetAngle = Utils.angleBetween(this.x, this.y, targetX, targetY);
        let diff = targetAngle - this.angle;

        // Normalize angle difference
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        // Smoothly rotate
        const turnSpeed = 5 * dt;
        if (Math.abs(diff) < turnSpeed) {
            this.angle = targetAngle;
        } else {
            this.angle += Math.sign(diff) * turnSpeed;
        }

        this.angle = Utils.normalizeAngle(this.angle);
    }

    tryFire() {
        if (!this.target) return null;

        const now = performance.now();
        const weapon = this.inventory.getCurrentWeapon();

        if (!weapon || weapon.isReloading) return null;

        // Check reaction time
        if (now - this.targetAcquiredTime < this.difficulty.reactionTime) {
            return null;
        }

        // Check fire rate
        if (!weapon.canFire(now)) return null;

        // Check accuracy (random miss based on difficulty)
        if (Math.random() > this.difficulty.accuracy) {
            weapon.fire(now);
            return null; // Missed shot
        }

        // Fire weapon
        if (weapon.fire(now)) {
            const spread = weapon.getSpread() + (1 - this.difficulty.accuracy) * 0.1;
            const spreadAngle = (Math.random() - 0.5) * spread;

            return {
                weapon: weapon,
                angle: this.angle + spreadAngle,
                x: this.x,
                y: this.y,
                damage: weapon.damage,
                range: weapon.range,
                shooter: this
            };
        }

        return null;
    }

    applyMovement(dt, map) {
        const newX = this.x + this.velocity.x * dt;
        const newY = this.y + this.velocity.y * dt;

        // Collision detection
        if (!map.isSolidAt(newX + this.radius, this.y) &&
            !map.isSolidAt(newX - this.radius, this.y)) {
            this.x = newX;
        }

        if (!map.isSolidAt(this.x, newY + this.radius) &&
            !map.isSolidAt(this.x, newY - this.radius)) {
            this.y = newY;
        }

        // Dampen velocity
        this.velocity.x *= 0.9;
        this.velocity.y *= 0.9;
    }

    generatePatrolPoints(map) {
        this.patrolPoints = [];

        // Generate random patrol points
        for (let i = 0; i < 5; i++) {
            let attempts = 0;
            while (attempts < 50) {
                const x = Utils.randomInt(2, map.width - 2) * map.tileSize + map.tileSize / 2;
                const y = Utils.randomInt(2, map.height - 2) * map.tileSize + map.tileSize / 2;

                if (!map.isSolidAt(x, y)) {
                    this.patrolPoints.push({ x, y });
                    break;
                }
                attempts++;
            }
        }

        // If no points generated, use spawn area
        if (this.patrolPoints.length === 0) {
            this.patrolPoints.push({ x: this.x + 100, y: this.y });
            this.patrolPoints.push({ x: this.x - 100, y: this.y });
        }
    }

    takeDamage(damage, direction, attacker = null) {
        if (!this.isAlive) return 0;

        // Apply armor
        let actualDamage = damage;
        if (this.armor > 0) {
            const armorDamage = Math.min(this.armor, damage * 0.5);
            this.armor -= armorDamage;
            actualDamage = damage - armorDamage * 0.5;
        }

        this.health -= actualDamage;

        // React to damage
        if (attacker) {
            this.target = attacker;
            this.lastKnownTargetPos = { x: attacker.x, y: attacker.y };
            this.lastSeenTime = performance.now();
            this.targetAcquiredTime = performance.now();
        }

        if (this.health <= 0) {
            this.health = 0;
            this.die(attacker);
        }

        return actualDamage;
    }

    die(killer = null) {
        this.isAlive = false;
        this.deaths++;
        this.state = BotState.DEAD;
        Audio.playDeath();

        if (killer) {
            if (killer.kills !== undefined) {
                killer.kills++;
            }
        }
    }

    getState() {
        return {
            id: this.id,
            name: this.name,
            x: this.x,
            y: this.y,
            angle: this.angle,
            health: this.health,
            armor: this.armor,
            team: this.team,
            isAlive: this.isAlive,
            state: this.state,
            kills: this.kills,
            deaths: this.deaths
        };
    }
}

// Bot manager for handling multiple bots
class BotManager {
    constructor() {
        this.bots = [];
    }

    addBot(team, difficulty = 'MEDIUM') {
        const bot = new Bot(team, difficulty);
        this.bots.push(bot);
        return bot;
    }

    removeBot(bot) {
        const index = this.bots.indexOf(bot);
        if (index !== -1) {
            this.bots.splice(index, 1);
        }
    }

    update(deltaTime, map, player) {
        const shots = [];

        this.bots.forEach(bot => {
            const shot = null;
            bot.update(deltaTime, map, this.bots, player);

            // Get shots from attacking bots
            if (bot.state === BotState.ATTACK || bot.state === BotState.RETREAT) {
                const botShot = bot.tryFire();
                if (botShot) {
                    shots.push(botShot);
                }
            }
        });

        return shots;
    }

    getTeamBots(team) {
        return this.bots.filter(bot => bot.team === team);
    }

    getAliveBots(team = null) {
        return this.bots.filter(bot => {
            if (!bot.isAlive) return false;
            if (team && bot.team !== team) return false;
            return true;
        });
    }

    spawnBots(map) {
        let ctIndex = 0;
        let tIndex = 0;

        this.bots.forEach(bot => {
            const spawns = bot.team === 'ct' ? map.ctSpawns : map.tSpawns;
            const index = bot.team === 'ct' ? ctIndex++ : tIndex++;
            const spawn = spawns[index % spawns.length];

            bot.spawn(spawn, bot.team === 'ct' ? Math.PI : 0);
        });
    }

    reset() {
        this.bots.forEach(bot => bot.reset());
    }
}
