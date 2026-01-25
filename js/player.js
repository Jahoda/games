// Player class for Counter-Strike Clone

class Player {
    constructor(team = 'ct') {
        this.team = team;

        // Position and movement
        this.x = 0;
        this.y = 0;
        this.angle = 0; // Looking direction
        this.pitch = 0; // Vertical look (limited)

        // Movement state
        this.velocity = new Vector2D();
        this.isMoving = false;
        this.isWalking = false;
        this.isCrouching = false;
        this.isJumping = false;
        this.jumpVelocity = 0;
        this.height = 1; // 1 = standing, 0.6 = crouching

        // Stats
        this.health = 100;
        this.maxHealth = 100;
        this.isAlive = true;

        // Inventory
        this.inventory = new Inventory();
        this.money = 800;

        // Input state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            walk: false,
            crouch: false,
            jump: false,
            fire: false,
            reload: false,
            scope: false
        };

        // Mouse
        this.mouseSensitivity = 0.002;
        this.mouseX = 0;
        this.mouseY = 0;

        // Combat
        this.lastDamageTime = 0;
        this.lastDamageDirection = 0;
        this.kills = 0;
        this.deaths = 0;

        // Animation
        this.bobPhase = 0;
        this.weaponBobY = 0;
        this.weaponBobX = 0;

        // Footsteps
        this.lastFootstepTime = 0;
        this.footstepInterval = 400;
    }

    spawn(spawnPoint, angle = 0) {
        this.x = spawnPoint.x;
        this.y = spawnPoint.y;
        this.angle = angle;
        this.pitch = 0;
        this.health = this.maxHealth;
        this.isAlive = true;
        this.velocity = new Vector2D();
        this.isJumping = false;
        this.jumpVelocity = 0;
        this.height = 1;
        this.isCrouching = false;
    }

    reset(keepMoney = false) {
        this.health = this.maxHealth;
        this.isAlive = true;
        if (!keepMoney) {
            this.money = 800;
        }
        this.inventory.reset(this.team);
    }

    update(deltaTime, map) {
        if (!this.isAlive) return;

        const dt = deltaTime / 1000;

        // Update weapon reload
        const weapon = this.inventory.getCurrentWeapon();
        if (weapon) {
            weapon.updateReload(performance.now());
        }

        // Calculate movement
        this.updateMovement(dt, map);

        // Update animations
        this.updateAnimations(dt);

        // Play footsteps
        this.updateFootsteps();
    }

    updateMovement(dt, map) {
        // Get base speed from weapon
        let speed = this.inventory.getMoveSpeed();

        // Modify speed based on state
        if (this.isWalking) speed *= 0.5;
        if (this.isCrouching) speed *= 0.33;

        // Calculate movement direction
        let moveX = 0;
        let moveY = 0;

        if (this.keys.forward) {
            moveX += Math.cos(this.angle);
            moveY += Math.sin(this.angle);
        }
        if (this.keys.backward) {
            moveX -= Math.cos(this.angle);
            moveY -= Math.sin(this.angle);
        }
        if (this.keys.left) {
            moveX += Math.cos(this.angle - Math.PI / 2);
            moveY += Math.sin(this.angle - Math.PI / 2);
        }
        if (this.keys.right) {
            moveX += Math.cos(this.angle + Math.PI / 2);
            moveY += Math.sin(this.angle + Math.PI / 2);
        }

        // Normalize diagonal movement
        const moveLen = Math.sqrt(moveX * moveX + moveY * moveY);
        if (moveLen > 0) {
            moveX /= moveLen;
            moveY /= moveLen;
            this.isMoving = true;
        } else {
            this.isMoving = false;
        }

        // Apply movement with acceleration
        const targetVelX = moveX * speed;
        const targetVelY = moveY * speed;

        const acceleration = 10;
        const friction = 8;

        if (this.isMoving) {
            this.velocity.x = Utils.lerp(this.velocity.x, targetVelX, acceleration * dt);
            this.velocity.y = Utils.lerp(this.velocity.y, targetVelY, acceleration * dt);
        } else {
            this.velocity.x = Utils.lerp(this.velocity.x, 0, friction * dt);
            this.velocity.y = Utils.lerp(this.velocity.y, 0, friction * dt);
        }

        // Crouch handling
        if (this.keys.crouch && !this.isCrouching) {
            this.isCrouching = true;
        } else if (!this.keys.crouch && this.isCrouching) {
            this.isCrouching = false;
        }

        // Smooth height change
        const targetHeight = this.isCrouching ? 0.6 : 1;
        this.height = Utils.lerp(this.height, targetHeight, 10 * dt);

        // Jump handling
        if (this.keys.jump && !this.isJumping) {
            this.isJumping = true;
            this.jumpVelocity = 300;
        }

        if (this.isJumping) {
            this.jumpVelocity -= 800 * dt; // Gravity
            this.height += this.jumpVelocity * dt / 200;

            if (this.height <= (this.isCrouching ? 0.6 : 1)) {
                this.height = this.isCrouching ? 0.6 : 1;
                this.isJumping = false;
                this.jumpVelocity = 0;
            }
        }

        // Apply collision detection
        const newX = this.x + this.velocity.x * dt;
        const newY = this.y + this.velocity.y * dt;

        const radius = 15; // Player collision radius

        // Check X movement
        if (!map.isSolidAt(newX + radius, this.y) &&
            !map.isSolidAt(newX - radius, this.y)) {
            this.x = newX;
        } else {
            this.velocity.x = 0;
        }

        // Check Y movement
        if (!map.isSolidAt(this.x, newY + radius) &&
            !map.isSolidAt(this.x, newY - radius)) {
            this.y = newY;
        } else {
            this.velocity.y = 0;
        }

        // Check corners
        if (map.isSolidAt(this.x + radius, this.y + radius) ||
            map.isSolidAt(this.x - radius, this.y + radius) ||
            map.isSolidAt(this.x + radius, this.y - radius) ||
            map.isSolidAt(this.x - radius, this.y - radius)) {
            // Slide along wall
            if (Math.abs(this.velocity.x) > Math.abs(this.velocity.y)) {
                this.velocity.y = 0;
            } else {
                this.velocity.x = 0;
            }
        }

        // Walk mode
        this.isWalking = this.keys.walk;
    }

    updateAnimations(dt) {
        // Weapon bob when moving
        if (this.isMoving && !this.isCrouching) {
            const speed = this.isWalking ? 4 : 8;
            this.bobPhase += speed * dt;

            this.weaponBobY = Math.sin(this.bobPhase * 2) * 5;
            this.weaponBobX = Math.cos(this.bobPhase) * 3;
        } else {
            this.bobPhase = 0;
            this.weaponBobY = Utils.lerp(this.weaponBobY, 0, 10 * dt);
            this.weaponBobX = Utils.lerp(this.weaponBobX, 0, 10 * dt);
        }
    }

    updateFootsteps() {
        if (!this.isMoving || this.isCrouching || this.isWalking) return;

        const now = performance.now();
        const interval = this.isWalking ? this.footstepInterval * 1.5 : this.footstepInterval;

        if (now - this.lastFootstepTime > interval) {
            Audio.playFootstep();
            this.lastFootstepTime = now;
        }
    }

    handleMouseMove(dx, dy) {
        if (!this.isAlive) return;

        // Apply sensitivity
        this.angle += dx * this.mouseSensitivity;

        // Normalize angle
        this.angle = Utils.normalizeAngle(this.angle);

        // Vertical look (limited)
        this.pitch -= dy * this.mouseSensitivity * 0.5;
        this.pitch = Utils.clamp(this.pitch, -0.5, 0.5);
    }

    fire() {
        if (!this.isAlive) return null;

        const weapon = this.inventory.getCurrentWeapon();
        if (!weapon) return null;

        const now = performance.now();

        if (weapon.fire(now)) {
            // Get recoil and apply to view
            const recoil = weapon.getRecoil();
            this.angle += recoil.x;
            this.pitch += recoil.y * 0.5;
            this.pitch = Utils.clamp(this.pitch, -0.5, 0.5);

            // Calculate spread
            const spread = weapon.getSpread();
            const spreadAngle = (Math.random() - 0.5) * spread;

            return {
                weapon: weapon,
                angle: this.angle + spreadAngle,
                x: this.x,
                y: this.y,
                damage: weapon.damage,
                range: weapon.range
            };
        }

        return null;
    }

    reload() {
        if (!this.isAlive) return;

        const weapon = this.inventory.getCurrentWeapon();
        if (weapon) {
            weapon.startReload(performance.now());
        }
    }

    toggleScope() {
        if (!this.isAlive) return;

        const weapon = this.inventory.getCurrentWeapon();
        if (weapon && weapon.scoped) {
            weapon.toggleScope();
        }
    }

    takeDamage(damage, direction, attacker = null) {
        if (!this.isAlive) return 0;

        // Apply armor reduction
        let actualDamage = damage;
        if (this.inventory.armor > 0) {
            const armorAbsorption = 0.5;
            const armorDamage = Math.min(this.inventory.armor, damage * armorAbsorption);
            this.inventory.armor -= armorDamage;
            actualDamage = damage - armorDamage * armorAbsorption;
        }

        this.health -= actualDamage;
        this.lastDamageTime = performance.now();
        this.lastDamageDirection = direction;

        Audio.playHit(actualDamage > 50);

        if (this.health <= 0) {
            this.health = 0;
            this.die(attacker);
            return actualDamage;
        }

        return actualDamage;
    }

    die(killer = null) {
        this.isAlive = false;
        this.deaths++;
        Audio.playDeath();

        // Drop weapon
        const primary = this.inventory.weapons[WeaponSlots.PRIMARY];
        if (primary) {
            // Could spawn dropped weapon here
        }
    }

    buyWeapon(weaponId) {
        const weaponData = Weapons[weaponId];
        if (!weaponData) return false;

        if (this.money < weaponData.price) return false;

        if (weaponData.type === WeaponTypes.EQUIPMENT) {
            if (this.inventory.buyEquipment(weaponId)) {
                this.money -= weaponData.price;
                Audio.playBuy();
                return true;
            }
        } else {
            if (this.inventory.addWeapon(weaponId)) {
                this.money -= weaponData.price;
                Audio.playBuy();
                return true;
            }
        }

        return false;
    }

    earnMoney(amount) {
        this.money = Math.min(16000, this.money + amount);
    }

    getState() {
        return {
            x: this.x,
            y: this.y,
            angle: this.angle,
            health: this.health,
            armor: this.inventory.armor,
            team: this.team,
            isAlive: this.isAlive,
            weapon: this.inventory.getCurrentWeapon()?.name,
            kills: this.kills,
            deaths: this.deaths
        };
    }
}
