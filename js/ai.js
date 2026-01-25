// AI system for RC Revolt

class AIController {
    constructor(car, difficulty = 'medium') {
        this.car = car;
        this.difficulty = difficulty;
        this.car.isAI = true;
        this.car.aiDifficulty = difficulty;

        // AI parameters based on difficulty
        this.params = this.getDifficultyParams();

        // Pathfinding
        this.targetWaypoint = 0;
        this.lookAhead = 2;

        // State
        this.stuckTime = 0;
        this.lastPosition = { x: 0, y: 0 };
        this.recoveryMode = false;
        this.recoveryTime = 0;

        // Power-up usage
        this.powerupCooldown = 0;

        // Reaction time simulation
        this.reactionDelay = 0;
        this.pendingActions = [];
    }

    getDifficultyParams() {
        switch (this.difficulty) {
            case 'easy':
                return {
                    speedMultiplier: 0.75,
                    reactionTime: 300,
                    accuracy: 0.7,
                    aggressiveness: 0.3,
                    rubberBanding: true,
                    powerupSkill: 0.4,
                    driftSkill: 0.3,
                    lookAhead: 1
                };
            case 'hard':
                return {
                    speedMultiplier: 1.0,
                    reactionTime: 80,
                    accuracy: 0.95,
                    aggressiveness: 0.8,
                    rubberBanding: false,
                    powerupSkill: 0.9,
                    driftSkill: 0.9,
                    lookAhead: 4
                };
            case 'medium':
            default:
                return {
                    speedMultiplier: 0.9,
                    reactionTime: 150,
                    accuracy: 0.85,
                    aggressiveness: 0.5,
                    rubberBanding: true,
                    powerupSkill: 0.65,
                    driftSkill: 0.6,
                    lookAhead: 2
                };
        }
    }

    update(dt, track, cars, playerPosition) {
        if (!track || track.waypoints.length === 0) return;

        // Update cooldowns
        this.powerupCooldown = Math.max(0, this.powerupCooldown - dt);
        this.reactionDelay = Math.max(0, this.reactionDelay - dt);

        // Process pending actions
        this.processPendingActions(dt);

        // Check if stuck
        this.checkStuck(dt);

        // Recovery mode
        if (this.recoveryMode) {
            this.handleRecovery(dt, track);
            return;
        }

        // Add reaction delay
        if (this.reactionDelay > 0) {
            return;
        }

        // Rubber banding (catch up or slow down based on position)
        let speedMod = 1.0;
        if (this.params.rubberBanding && playerPosition !== undefined) {
            const positionDiff = this.car.lap * 100 + this.car.checkpoint - playerPosition;
            if (positionDiff < -50) {
                speedMod = 1.15; // Behind - speed up
            } else if (positionDiff > 50) {
                speedMod = 0.85; // Ahead - slow down
            }
        }

        // Get target waypoint
        const target = this.getTargetWaypoint(track);

        // Calculate steering
        const steering = this.calculateSteering(target);

        // Calculate throttle
        const throttle = this.calculateThrottle(target, track, speedMod);

        // Apply inputs with some randomness
        this.applyInputs(steering, throttle, dt);

        // Handle power-ups
        this.handlePowerups(cars);

        // Consider drifting
        this.handleDrifting(steering, track);

        // Update last position
        this.lastPosition.x = this.car.x;
        this.lastPosition.y = this.car.y;
    }

    getTargetWaypoint(track) {
        const waypoints = track.waypoints;
        const lookAhead = this.params.lookAhead;

        // Find closest waypoint
        let closestDist = Infinity;
        let closestIdx = this.targetWaypoint;

        for (let i = 0; i < waypoints.length; i++) {
            const wp = waypoints[i];
            const dist = Utils.distance(this.car.x, this.car.y, wp.x, wp.y);

            if (dist < closestDist) {
                closestDist = dist;
                closestIdx = i;
            }
        }

        // Target waypoint ahead
        this.targetWaypoint = (closestIdx + lookAhead) % waypoints.length;

        return waypoints[this.targetWaypoint];
    }

    calculateSteering(target) {
        // Angle to target
        const targetAngle = Math.atan2(
            target.y - this.car.y,
            target.x - this.car.x
        );

        // Angle difference
        let angleDiff = Utils.angleDifference(this.car.angle, targetAngle);

        // Add some inaccuracy
        angleDiff += (Math.random() - 0.5) * (1 - this.params.accuracy) * 0.5;

        // Convert to steering input (-1 to 1)
        let steering = angleDiff / (Math.PI / 4);
        steering = Utils.clamp(steering, -1, 1);

        return steering;
    }

    calculateThrottle(target, track, speedMod) {
        const distToTarget = Utils.distance(
            this.car.x, this.car.y,
            target.x, target.y
        );

        // Base throttle
        let throttle = 1.0 * this.params.speedMultiplier * speedMod;

        // Slow down for turns
        const targetAngle = Math.atan2(
            target.y - this.car.y,
            target.x - this.car.x
        );
        const angleDiff = Math.abs(Utils.angleDifference(this.car.angle, targetAngle));

        if (angleDiff > Math.PI / 4) {
            throttle *= 0.6;
        } else if (angleDiff > Math.PI / 8) {
            throttle *= 0.8;
        }

        // Slow down when close to target (approaching turn)
        if (distToTarget < 50 && angleDiff > Math.PI / 6) {
            throttle *= 0.5;
        }

        // Check for upcoming sharp turns
        const nextWp = track.waypoints[(this.targetWaypoint + 1) % track.waypoints.length];
        const nextAngle = Math.atan2(
            nextWp.y - target.y,
            nextWp.x - target.x
        );
        const turnSharpness = Math.abs(Utils.angleDifference(targetAngle, nextAngle));

        if (turnSharpness > Math.PI / 3) {
            throttle *= 0.7;
        }

        return throttle;
    }

    applyInputs(steering, throttle, dt) {
        // Smoothly apply steering
        const steerSpeed = 5 * (dt / 1000);
        this.car.steering = Utils.lerp(this.car.steering, steering, steerSpeed);

        // Apply throttle
        this.car.throttle = throttle;
        this.car.reverse = 0;
        this.car.brake = 0;

        // Brake if going wrong way at high speed
        if (this.car.wrongWay && this.car.speed > 100) {
            this.car.brake = 0.5;
        }
    }

    checkStuck(dt) {
        const moved = Utils.distance(
            this.car.x, this.car.y,
            this.lastPosition.x, this.lastPosition.y
        );

        if (moved < 1 && this.car.speed < 10) {
            this.stuckTime += dt;
        } else {
            this.stuckTime = 0;
        }

        if (this.stuckTime > 2000) {
            this.recoveryMode = true;
            this.recoveryTime = 0;
            this.stuckTime = 0;
        }
    }

    handleRecovery(dt, track) {
        this.recoveryTime += dt;

        // Try reversing
        if (this.recoveryTime < 500) {
            this.car.throttle = 0;
            this.car.reverse = 1;
            this.car.steering = (Math.random() - 0.5) * 2;
        }
        // Then try going forward with random steering
        else if (this.recoveryTime < 1500) {
            this.car.throttle = 0.5;
            this.car.reverse = 0;
            this.car.steering = Math.random() > 0.5 ? 1 : -1;
        }
        // Exit recovery mode
        else {
            this.recoveryMode = false;
            this.reactionDelay = this.params.reactionTime;
        }
    }

    handlePowerups(cars) {
        if (this.car.powerup === null) return;
        if (this.powerupCooldown > 0) return;
        if (Math.random() > this.params.powerupSkill) return;

        // Decide whether to use power-up
        const shouldUse = this.shouldUsePowerup(cars);

        if (shouldUse) {
            PowerupMgr.usePowerup(this.car);
            this.powerupCooldown = 2000;
        }
    }

    shouldUsePowerup(cars) {
        const powerupId = this.car.powerup;

        switch (powerupId) {
            case 'rocket':
            case 'missile':
                // Use if car ahead is close
                return this.hasCarAhead(cars, 200);

            case 'bomb':
            case 'oil':
                // Use if car behind is close
                return this.hasCarBehind(cars, 100);

            case 'boost':
            case 'battery':
                // Use on straights or when behind
                return this.car.speed > 200 || this.isInLowerPosition(cars);

            case 'shield':
                // Use when projectile nearby or in pack
                return this.isInDanger(cars);

            case 'shockwave':
                // Use when surrounded
                return this.getNearbyCars(cars, 150).length >= 2;

            case 'waterbomb':
            case 'firework':
                // Use when car ahead
                return this.hasCarAhead(cars, 150);

            default:
                return Math.random() > 0.5;
        }
    }

    hasCarAhead(cars, distance) {
        for (const car of cars) {
            if (car === this.car) continue;

            // Check if car is ahead
            const toCar = { x: car.x - this.car.x, y: car.y - this.car.y };
            const forward = { x: Math.cos(this.car.angle), y: Math.sin(this.car.angle) };
            const dot = toCar.x * forward.x + toCar.y * forward.y;

            if (dot > 0 && dot < distance) {
                const dist = Utils.distance(this.car.x, this.car.y, car.x, car.y);
                if (dist < distance) return true;
            }
        }
        return false;
    }

    hasCarBehind(cars, distance) {
        for (const car of cars) {
            if (car === this.car) continue;

            const toCar = { x: car.x - this.car.x, y: car.y - this.car.y };
            const forward = { x: Math.cos(this.car.angle), y: Math.sin(this.car.angle) };
            const dot = toCar.x * forward.x + toCar.y * forward.y;

            if (dot < 0 && Math.abs(dot) < distance) {
                const dist = Utils.distance(this.car.x, this.car.y, car.x, car.y);
                if (dist < distance) return true;
            }
        }
        return false;
    }

    isInLowerPosition(cars) {
        let position = 1;
        for (const car of cars) {
            if (car === this.car) continue;
            const myProgress = this.car.lap * 1000 + this.car.checkpoint;
            const theirProgress = car.lap * 1000 + car.checkpoint;
            if (theirProgress > myProgress) position++;
        }
        return position > cars.length / 2;
    }

    isInDanger(cars) {
        // Check for nearby projectiles (simplified - just check for nearby cars going fast)
        return this.getNearbyCars(cars, 100).some(car => car.speed > 300);
    }

    getNearbyCars(cars, distance) {
        return cars.filter(car => {
            if (car === this.car) return false;
            return Utils.distance(this.car.x, this.car.y, car.x, car.y) < distance;
        });
    }

    handleDrifting(steering, track) {
        // AI drift handling
        if (Math.abs(steering) > 0.7 && this.car.speed > 200) {
            if (Math.random() < this.params.driftSkill) {
                this.car.isDrifting = true;
            }
        } else {
            this.car.isDrifting = false;
        }
    }

    processPendingActions(dt) {
        // Process delayed actions based on reaction time
        for (let i = this.pendingActions.length - 1; i >= 0; i--) {
            this.pendingActions[i].delay -= dt;
            if (this.pendingActions[i].delay <= 0) {
                this.pendingActions[i].action();
                this.pendingActions.splice(i, 1);
            }
        }
    }

    queueAction(action, delay) {
        this.pendingActions.push({ action, delay: delay || this.params.reactionTime });
    }
}

// AI Manager for managing all AI cars
class AIManager {
    constructor() {
        this.controllers = [];
    }

    init(cars, difficulty = 'medium') {
        this.controllers = [];
        for (const car of cars) {
            if (car.isAI) {
                this.controllers.push(new AIController(car, difficulty));
            }
        }
    }

    createController(car, difficulty = 'medium') {
        const controller = new AIController(car, difficulty);
        this.controllers.push(controller);
        return controller;
    }

    update(dt, track, cars, playerCar) {
        // Calculate player's position progress for rubber banding
        let playerProgress = 0;
        if (playerCar) {
            playerProgress = playerCar.lap * 100 + playerCar.checkpoint;
        }

        for (const controller of this.controllers) {
            controller.update(dt, track, cars, playerProgress);
        }
    }

    cleanup() {
        this.controllers = [];
    }
}

const AIMgr = new AIManager();
