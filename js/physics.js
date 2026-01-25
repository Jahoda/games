// Physics engine for RC Revolt
// Handles car physics, collisions, and track interactions

class PhysicsEngine {
    constructor() {
        this.gravity = 980; // pixels per second squared
        this.airDrag = 0.98;
        this.groundFriction = 0.95;
        this.driftFriction = 0.85;
        this.bounceFactor = 0.5;
        this.rotationDrag = 0.92;
    }

    // Update car physics
    updateCar(car, track, dt) {
        // Convert dt to seconds
        const deltaTime = dt / 1000;

        // Store previous position for collision detection
        const prevX = car.x;
        const prevY = car.y;

        // Apply steering
        this.applySteering(car, deltaTime);

        // Apply acceleration/braking
        this.applyAcceleration(car, deltaTime);

        // Apply physics
        this.applyDrag(car, deltaTime);

        // Update position
        car.x += car.velocityX * deltaTime;
        car.y += car.velocityY * deltaTime;

        // Check track collisions
        const collision = this.checkTrackCollision(car, track, prevX, prevY);
        if (collision) {
            this.resolveTrackCollision(car, collision, prevX, prevY);
        }

        // Check surface type
        const surface = this.getSurfaceAt(car.x, car.y, track);
        this.applySurfaceEffects(car, surface, deltaTime);

        // Update car state
        car.speed = Math.sqrt(car.velocityX * car.velocityX + car.velocityY * car.velocityY);
        car.rpm = this.calculateRPM(car);

        // Check if car is on track
        car.onTrack = this.isOnTrack(car.x, car.y, track);

        // Apply off-track penalty
        if (!car.onTrack) {
            car.velocityX *= 0.98;
            car.velocityY *= 0.98;
        }

        // Check boost effects
        if (car.boostTime > 0) {
            car.boostTime -= dt;
            if (car.boostTime <= 0) {
                car.maxSpeed = car.baseMaxSpeed;
            }
        }

        // Check invincibility
        if (car.invincibleTime > 0) {
            car.invincibleTime -= dt;
        }

        // Check spin out
        if (car.spinTime > 0) {
            car.spinTime -= dt;
            car.angle += car.spinDirection * 8 * deltaTime;
        }
    }

    applySteering(car, dt) {
        if (car.spinTime > 0) return;

        const steerAmount = car.steering * car.handling * dt;
        const speedFactor = Math.min(1, car.speed / 100);

        // Only steer when moving
        if (car.speed > 5) {
            // Check if we're going forward or backward
            const forwardX = Math.cos(car.angle);
            const forwardY = Math.sin(car.angle);
            const dot = car.velocityX * forwardX + car.velocityY * forwardY;
            const direction = dot >= 0 ? 1 : -1;

            car.angle += steerAmount * speedFactor * direction;
        }

        // Apply drift physics
        if (car.isDrifting && car.speed > 50) {
            const driftAngle = car.steering * 0.5;
            car.driftAngle = Utils.lerp(car.driftAngle || 0, driftAngle, 0.1);
        } else {
            car.driftAngle = Utils.lerp(car.driftAngle || 0, 0, 0.2);
        }
    }

    applyAcceleration(car, dt) {
        if (car.spinTime > 0) {
            car.throttle = 0;
            car.brake = 0;
            return;
        }

        const forwardX = Math.cos(car.angle);
        const forwardY = Math.sin(car.angle);

        // Calculate current speed in forward direction
        const forwardSpeed = car.velocityX * forwardX + car.velocityY * forwardY;

        // Apply throttle
        if (car.throttle > 0) {
            const acceleration = car.acceleration * car.throttle;
            const maxSpeed = car.boostTime > 0 ? car.maxSpeed * 1.5 : car.maxSpeed;

            if (forwardSpeed < maxSpeed) {
                car.velocityX += forwardX * acceleration * dt;
                car.velocityY += forwardY * acceleration * dt;
            }
        }

        // Apply reverse
        if (car.reverse > 0) {
            const reverseAccel = car.acceleration * 0.5 * car.reverse;
            const minSpeed = -car.maxSpeed * 0.3;

            if (forwardSpeed > minSpeed) {
                car.velocityX -= forwardX * reverseAccel * dt;
                car.velocityY -= forwardY * reverseAccel * dt;
            }
        }

        // Apply braking
        if (car.brake > 0) {
            const brakeForce = 1 - (car.braking * car.brake * dt);
            car.velocityX *= brakeForce;
            car.velocityY *= brakeForce;
        }
    }

    applyDrag(car, dt) {
        // Air resistance (increases with speed squared)
        const speedSq = car.velocityX * car.velocityX + car.velocityY * car.velocityY;
        const airDragForce = 0.0001 * speedSq;
        const dragFactor = Math.max(0.9, 1 - airDragForce * dt);

        car.velocityX *= dragFactor;
        car.velocityY *= dragFactor;

        // Ground friction
        if (!car.throttle && !car.reverse && !car.brake) {
            const friction = car.isDrifting ? this.driftFriction : this.groundFriction;
            car.velocityX *= friction;
            car.velocityY *= friction;
        }

        // Lateral friction (prevents sideways sliding)
        const forwardX = Math.cos(car.angle);
        const forwardY = Math.sin(car.angle);
        const rightX = -forwardY;
        const rightY = forwardX;

        const lateralSpeed = car.velocityX * rightX + car.velocityY * rightY;
        const lateralFriction = car.isDrifting ? 0.9 : 0.7;

        car.velocityX -= rightX * lateralSpeed * (1 - lateralFriction);
        car.velocityY -= rightY * lateralSpeed * (1 - lateralFriction);
    }

    calculateRPM(car) {
        // Simulate RPM based on speed and throttle
        const speedPercent = car.speed / car.maxSpeed;
        const baseRPM = 1000;
        const maxRPM = 8000;

        let rpm = baseRPM + (speedPercent * (maxRPM - baseRPM));

        // Add throttle response
        if (car.throttle > 0) {
            rpm *= 1 + (car.throttle * 0.2);
        }

        return Utils.clamp(rpm, baseRPM, maxRPM);
    }

    checkTrackCollision(car, track, prevX, prevY) {
        if (!track || !track.walls) return null;

        const carCorners = this.getCarCorners(car);

        for (const wall of track.walls) {
            // Check each corner against each wall segment
            for (let i = 0; i < carCorners.length; i++) {
                const corner = carCorners[i];

                // Point to wall distance
                const dist = this.pointToLineDistance(
                    corner.x, corner.y,
                    wall.x1, wall.y1, wall.x2, wall.y2
                );

                if (dist < 5) {
                    // Get wall normal
                    const wallDx = wall.x2 - wall.x1;
                    const wallDy = wall.y2 - wall.y1;
                    const wallLen = Math.sqrt(wallDx * wallDx + wallDy * wallDy);
                    const normalX = -wallDy / wallLen;
                    const normalY = wallDx / wallLen;

                    return {
                        point: corner,
                        normal: { x: normalX, y: normalY },
                        wall: wall,
                        penetration: 5 - dist
                    };
                }
            }
        }

        return null;
    }

    resolveTrackCollision(car, collision, prevX, prevY) {
        // Push car out of wall
        car.x += collision.normal.x * collision.penetration;
        car.y += collision.normal.y * collision.penetration;

        // Reflect velocity
        const dot = car.velocityX * collision.normal.x + car.velocityY * collision.normal.y;
        car.velocityX -= 2 * dot * collision.normal.x * this.bounceFactor;
        car.velocityY -= 2 * dot * collision.normal.y * this.bounceFactor;

        // Reduce speed on impact
        const impactSpeed = Math.abs(dot);
        if (impactSpeed > 100) {
            car.velocityX *= 0.7;
            car.velocityY *= 0.7;

            // Play collision sound
            Audio.playCollision(Math.min(1, impactSpeed / 300));
        }
    }

    getCarCorners(car) {
        const hw = car.width / 2;
        const hh = car.height / 2;

        const cos = Math.cos(car.angle);
        const sin = Math.sin(car.angle);

        return [
            {
                x: car.x + cos * hw - sin * hh,
                y: car.y + sin * hw + cos * hh
            },
            {
                x: car.x + cos * hw + sin * hh,
                y: car.y + sin * hw - cos * hh
            },
            {
                x: car.x - cos * hw + sin * hh,
                y: car.y - sin * hw - cos * hh
            },
            {
                x: car.x - cos * hw - sin * hh,
                y: car.y - sin * hw + cos * hh
            }
        ];
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;

        if (lenSq === 0) {
            return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
        }

        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));

        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;

        return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
    }

    getSurfaceAt(x, y, track) {
        if (!track || !track.surfaces) return 'road';

        for (const surface of track.surfaces) {
            if (Utils.pointInPolygon(x, y, surface.polygon)) {
                return surface.type;
            }
        }

        return 'road';
    }

    applySurfaceEffects(car, surface, dt) {
        switch (surface) {
            case 'grass':
                car.velocityX *= 0.98;
                car.velocityY *= 0.98;
                break;
            case 'sand':
                car.velocityX *= 0.95;
                car.velocityY *= 0.95;
                break;
            case 'ice':
                // Already handled by drift physics
                car.isDrifting = true;
                break;
            case 'oil':
                car.isDrifting = true;
                break;
            case 'boost':
                if (!car.onBoostPad) {
                    car.onBoostPad = true;
                    this.applyBoost(car, 1.5, 500);
                }
                break;
            case 'jump':
                if (!car.isJumping) {
                    car.isJumping = true;
                    car.jumpTime = 500;
                    car.jumpHeight = 0;
                }
                break;
            default:
                car.onBoostPad = false;
        }
    }

    isOnTrack(x, y, track) {
        if (!track || !track.trackBounds) return true;

        return Utils.pointInPolygon(x, y, track.trackBounds);
    }

    // Apply boost to car
    applyBoost(car, multiplier, duration) {
        car.boostTime = duration;
        car.maxSpeed = car.baseMaxSpeed * multiplier;

        // Add instant speed boost
        const forwardX = Math.cos(car.angle);
        const forwardY = Math.sin(car.angle);
        car.velocityX += forwardX * 100;
        car.velocityY += forwardY * 100;

        Audio.playBoost();
    }

    // Check car-to-car collision
    checkCarCollision(car1, car2) {
        const r1 = {
            x: car1.x,
            y: car1.y,
            w: car1.width,
            h: car1.height,
            angle: car1.angle
        };

        const r2 = {
            x: car2.x,
            y: car2.y,
            w: car2.width,
            h: car2.height,
            angle: car2.angle
        };

        return Utils.rotatedRectCollision(r1, r2);
    }

    // Resolve car-to-car collision
    resolveCarCollision(car1, car2) {
        // Calculate collision normal
        const dx = car2.x - car1.x;
        const dy = car2.y - car1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) return;

        const nx = dx / dist;
        const ny = dy / dist;

        // Relative velocity
        const dvx = car1.velocityX - car2.velocityX;
        const dvy = car1.velocityY - car2.velocityY;

        // Relative velocity along collision normal
        const dvn = dvx * nx + dvy * ny;

        // Only resolve if cars are approaching
        if (dvn > 0) return;

        // Coefficient of restitution
        const restitution = 0.5;

        // Calculate impulse
        const totalMass = car1.mass + car2.mass;
        const impulse = -(1 + restitution) * dvn / totalMass;

        // Apply impulse
        car1.velocityX += impulse * car2.mass * nx;
        car1.velocityY += impulse * car2.mass * ny;
        car2.velocityX -= impulse * car1.mass * nx;
        car2.velocityY -= impulse * car1.mass * ny;

        // Separate cars
        const overlap = (car1.width / 2 + car2.width / 2) - dist + 5;
        if (overlap > 0) {
            const separation = overlap / 2;
            car1.x -= nx * separation;
            car1.y -= ny * separation;
            car2.x += nx * separation;
            car2.y += ny * separation;
        }

        // Play collision sound
        const impactSpeed = Math.abs(dvn);
        Audio.playCollision(Math.min(1, impactSpeed / 200));
    }

    // Check powerup collision
    checkPowerupCollision(car, powerup) {
        const dx = car.x - powerup.x;
        const dy = car.y - powerup.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        return dist < (car.width / 2 + powerup.radius);
    }

    // Check checkpoint collision
    checkCheckpointCollision(car, checkpoint) {
        const corners = this.getCarCorners(car);

        for (const corner of corners) {
            const intersection = Utils.lineIntersection(
                corner.x, corner.y,
                car.x, car.y,
                checkpoint.x1, checkpoint.y1,
                checkpoint.x2, checkpoint.y2
            );

            if (intersection) return true;
        }

        return false;
    }

    // Spin out car
    spinOut(car, direction = null) {
        if (car.invincibleTime > 0) return;

        car.spinTime = 1000;
        car.spinDirection = direction || (Math.random() > 0.5 ? 1 : -1);
        car.velocityX *= 0.5;
        car.velocityY *= 0.5;
    }

    // Flip car
    flipCar(car) {
        car.velocityX = 0;
        car.velocityY = 0;
        car.angle = car.angle + Math.PI;
        car.isFlipped = false;
    }
}

const Physics = new PhysicsEngine();
