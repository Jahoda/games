// Weapon system for Counter-Strike Clone

const WeaponTypes = {
    KNIFE: 'knife',
    PISTOL: 'pistol',
    SMG: 'smg',
    RIFLE: 'rifle',
    SNIPER: 'sniper',
    EQUIPMENT: 'equipment'
};

const WeaponSlots = {
    KNIFE: 3,
    PISTOL: 2,
    PRIMARY: 1,
    GRENADE: 4
};

// Weapon definitions
const Weapons = {
    knife: {
        name: 'Nůž',
        type: WeaponTypes.KNIFE,
        slot: WeaponSlots.KNIFE,
        damage: 40,
        damageAlt: 65, // Secondary attack
        range: 50,
        fireRate: 400,
        price: 0,
        clipSize: Infinity,
        reserveAmmo: Infinity,
        reloadTime: 0,
        accuracy: 1,
        moveSpeed: 250,
        penetration: 0,
        color: '#888888'
    },
    glock: {
        name: 'Glock 18',
        type: WeaponTypes.PISTOL,
        slot: WeaponSlots.PISTOL,
        damage: 25,
        range: 800,
        fireRate: 150,
        price: 400,
        clipSize: 20,
        reserveAmmo: 120,
        reloadTime: 2200,
        accuracy: 0.92,
        moveSpeed: 240,
        penetration: 1,
        color: '#444444',
        team: 't'
    },
    usp: {
        name: 'USP',
        type: WeaponTypes.PISTOL,
        slot: WeaponSlots.PISTOL,
        damage: 30,
        range: 850,
        fireRate: 170,
        price: 500,
        clipSize: 12,
        reserveAmmo: 100,
        reloadTime: 2400,
        accuracy: 0.94,
        moveSpeed: 240,
        penetration: 1,
        color: '#333333',
        team: 'ct'
    },
    deagle: {
        name: 'Desert Eagle',
        type: WeaponTypes.PISTOL,
        slot: WeaponSlots.PISTOL,
        damage: 54,
        range: 900,
        fireRate: 270,
        price: 650,
        clipSize: 7,
        reserveAmmo: 35,
        reloadTime: 2200,
        accuracy: 0.88,
        moveSpeed: 230,
        penetration: 2,
        color: '#C0C0C0'
    },
    mp5: {
        name: 'MP5',
        type: WeaponTypes.SMG,
        slot: WeaponSlots.PRIMARY,
        damage: 26,
        range: 700,
        fireRate: 80,
        price: 1500,
        clipSize: 30,
        reserveAmmo: 120,
        reloadTime: 3000,
        accuracy: 0.85,
        moveSpeed: 230,
        penetration: 1,
        automatic: true,
        color: '#2a2a2a'
    },
    ak47: {
        name: 'AK-47',
        type: WeaponTypes.RIFLE,
        slot: WeaponSlots.PRIMARY,
        damage: 36,
        range: 1000,
        fireRate: 100,
        price: 2500,
        clipSize: 30,
        reserveAmmo: 90,
        reloadTime: 2500,
        accuracy: 0.80,
        moveSpeed: 215,
        penetration: 2,
        automatic: true,
        color: '#8B4513',
        team: 't'
    },
    m4a1: {
        name: 'M4A1',
        type: WeaponTypes.RIFLE,
        slot: WeaponSlots.PRIMARY,
        damage: 33,
        range: 1000,
        fireRate: 90,
        price: 3100,
        clipSize: 30,
        reserveAmmo: 90,
        reloadTime: 3100,
        accuracy: 0.88,
        moveSpeed: 220,
        penetration: 2,
        automatic: true,
        color: '#2F4F4F',
        team: 'ct'
    },
    awp: {
        name: 'AWP',
        type: WeaponTypes.SNIPER,
        slot: WeaponSlots.PRIMARY,
        damage: 115,
        range: 2000,
        fireRate: 1500,
        price: 4750,
        clipSize: 10,
        reserveAmmo: 30,
        reloadTime: 3700,
        accuracy: 0.99,
        moveSpeed: 200,
        penetration: 3,
        scoped: true,
        color: '#006400'
    },
    kevlar: {
        name: 'Kevlar Vest',
        type: WeaponTypes.EQUIPMENT,
        price: 650,
        armor: 100
    },
    helmet: {
        name: 'Kevlar + Helmet',
        type: WeaponTypes.EQUIPMENT,
        price: 1000,
        armor: 100,
        helmet: true
    },
    defuse: {
        name: 'Defuse Kit',
        type: WeaponTypes.EQUIPMENT,
        price: 200,
        team: 'ct'
    }
};

// Weapon class
class Weapon {
    constructor(weaponId) {
        const data = Weapons[weaponId];
        if (!data) throw new Error(`Unknown weapon: ${weaponId}`);

        this.id = weaponId;
        this.name = data.name;
        this.type = data.type;
        this.slot = data.slot;
        this.damage = data.damage;
        this.damageAlt = data.damageAlt || data.damage;
        this.range = data.range;
        this.fireRate = data.fireRate;
        this.price = data.price;
        this.clipSize = data.clipSize;
        this.reserveAmmo = data.reserveAmmo;
        this.reloadTime = data.reloadTime;
        this.accuracy = data.accuracy;
        this.moveSpeed = data.moveSpeed;
        this.penetration = data.penetration || 0;
        this.automatic = data.automatic || false;
        this.scoped = data.scoped || false;
        this.color = data.color || '#666666';

        // Current state
        this.currentClip = this.clipSize;
        this.currentReserve = this.reserveAmmo;
        this.isReloading = false;
        this.reloadStartTime = 0;
        this.lastFireTime = 0;
        this.isScoped = false;

        // Recoil
        this.recoilPattern = this.generateRecoilPattern();
        this.currentRecoilIndex = 0;
        this.recoilResetTime = 0;
    }

    generateRecoilPattern() {
        const pattern = [];
        const length = this.clipSize || 30;

        for (let i = 0; i < length; i++) {
            // Vertical recoil increases with shots
            const vertical = 0.01 + (i * 0.003);
            // Horizontal recoil is semi-random
            const horizontal = (Math.random() - 0.5) * 0.02 * (1 + i * 0.1);
            pattern.push({ x: horizontal, y: -vertical });
        }

        return pattern;
    }

    canFire(currentTime) {
        if (this.isReloading) return false;
        if (this.currentClip <= 0) return false;
        if (currentTime - this.lastFireTime < this.fireRate) return false;
        return true;
    }

    fire(currentTime) {
        if (!this.canFire(currentTime)) {
            if (this.currentClip <= 0 && !this.isReloading) {
                Audio.playEmpty();
            }
            return false;
        }

        this.currentClip--;
        this.lastFireTime = currentTime;

        // Play sound
        Audio.playGunshot(this.id);

        // Update recoil
        if (currentTime - this.recoilResetTime > 300) {
            this.currentRecoilIndex = 0;
        }
        this.recoilResetTime = currentTime;

        return true;
    }

    getRecoil() {
        if (this.currentRecoilIndex < this.recoilPattern.length) {
            return this.recoilPattern[this.currentRecoilIndex++];
        }
        return this.recoilPattern[this.recoilPattern.length - 1];
    }

    getSpread() {
        // Base spread based on accuracy
        const baseSpread = (1 - this.accuracy) * 0.1;
        // Increase spread with continuous fire
        const fireSpread = this.currentRecoilIndex * 0.005;
        return baseSpread + fireSpread;
    }

    startReload(currentTime) {
        if (this.isReloading) return false;
        if (this.currentClip >= this.clipSize) return false;
        if (this.currentReserve <= 0) return false;
        if (this.clipSize === Infinity) return false;

        this.isReloading = true;
        this.reloadStartTime = currentTime;
        Audio.playReload();
        return true;
    }

    updateReload(currentTime) {
        if (!this.isReloading) return;

        if (currentTime - this.reloadStartTime >= this.reloadTime) {
            const needed = this.clipSize - this.currentClip;
            const available = Math.min(needed, this.currentReserve);
            this.currentClip += available;
            this.currentReserve -= available;
            this.isReloading = false;
            this.currentRecoilIndex = 0;
        }
    }

    cancelReload() {
        this.isReloading = false;
    }

    getReloadProgress(currentTime) {
        if (!this.isReloading) return 0;
        return Math.min(1, (currentTime - this.reloadStartTime) / this.reloadTime);
    }

    toggleScope() {
        if (!this.scoped) return false;
        this.isScoped = !this.isScoped;
        return true;
    }

    reset() {
        this.currentClip = this.clipSize;
        this.currentReserve = this.reserveAmmo;
        this.isReloading = false;
        this.isScoped = false;
        this.currentRecoilIndex = 0;
    }

    // Draw weapon sprite (simple representation)
    draw(ctx, screenWidth, screenHeight, bobOffset = 0) {
        const weaponWidth = screenWidth * 0.3;
        const weaponHeight = screenHeight * 0.25;
        const x = screenWidth * 0.65;
        const y = screenHeight - weaponHeight + bobOffset;

        ctx.save();

        // Weapon body
        ctx.fillStyle = this.color;

        switch (this.type) {
            case WeaponTypes.KNIFE:
                this.drawKnife(ctx, x, y, weaponWidth, weaponHeight);
                break;
            case WeaponTypes.PISTOL:
                this.drawPistol(ctx, x, y, weaponWidth, weaponHeight);
                break;
            case WeaponTypes.SMG:
            case WeaponTypes.RIFLE:
                this.drawRifle(ctx, x, y, weaponWidth, weaponHeight);
                break;
            case WeaponTypes.SNIPER:
                this.drawSniper(ctx, x, y, weaponWidth, weaponHeight);
                break;
        }

        ctx.restore();

        // Reload indicator
        if (this.isReloading) {
            const progress = this.getReloadProgress(performance.now());
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(screenWidth / 2 - 50, screenHeight - 80, 100, 10);
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(screenWidth / 2 - 50, screenHeight - 80, 100 * progress, 10);
        }
    }

    drawKnife(ctx, x, y, w, h) {
        // Handle
        ctx.fillStyle = '#654321';
        ctx.fillRect(x + w * 0.3, y + h * 0.6, w * 0.15, h * 0.35);

        // Blade
        ctx.fillStyle = '#C0C0C0';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.35, y + h * 0.6);
        ctx.lineTo(x + w * 0.6, y + h * 0.2);
        ctx.lineTo(x + w * 0.4, y + h * 0.6);
        ctx.closePath();
        ctx.fill();
    }

    drawPistol(ctx, x, y, w, h) {
        // Grip
        ctx.fillRect(x + w * 0.35, y + h * 0.55, w * 0.12, h * 0.35);

        // Body
        ctx.fillRect(x + w * 0.25, y + h * 0.4, w * 0.35, h * 0.18);

        // Barrel
        ctx.fillRect(x + w * 0.55, y + h * 0.42, w * 0.2, h * 0.1);

        // Trigger guard
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + w * 0.38, y + h * 0.58, w * 0.06, 0, Math.PI);
        ctx.stroke();
    }

    drawRifle(ctx, x, y, w, h) {
        // Stock
        ctx.fillRect(x, y + h * 0.4, w * 0.2, h * 0.15);

        // Body
        ctx.fillRect(x + w * 0.15, y + h * 0.35, w * 0.4, h * 0.2);

        // Barrel
        ctx.fillRect(x + w * 0.5, y + h * 0.38, w * 0.35, h * 0.08);

        // Magazine
        ctx.fillStyle = '#222';
        ctx.fillRect(x + w * 0.35, y + h * 0.52, w * 0.08, h * 0.25);

        // Grip
        ctx.fillStyle = this.color;
        ctx.fillRect(x + w * 0.22, y + h * 0.52, w * 0.08, h * 0.2);
    }

    drawSniper(ctx, x, y, w, h) {
        // Stock
        ctx.fillRect(x - w * 0.1, y + h * 0.38, w * 0.35, h * 0.12);

        // Body
        ctx.fillRect(x + w * 0.2, y + h * 0.32, w * 0.35, h * 0.18);

        // Barrel (longer)
        ctx.fillRect(x + w * 0.5, y + h * 0.36, w * 0.5, h * 0.06);

        // Scope
        ctx.fillStyle = '#111';
        ctx.fillRect(x + w * 0.3, y + h * 0.22, w * 0.2, h * 0.12);
        ctx.fillStyle = '#4444ff';
        ctx.beginPath();
        ctx.arc(x + w * 0.35, y + h * 0.28, w * 0.03, 0, Math.PI * 2);
        ctx.fill();

        // Magazine
        ctx.fillStyle = '#222';
        ctx.fillRect(x + w * 0.35, y + h * 0.48, w * 0.1, h * 0.2);

        // Bipod
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.55, y + h * 0.42);
        ctx.lineTo(x + w * 0.5, y + h * 0.65);
        ctx.moveTo(x + w * 0.6, y + h * 0.42);
        ctx.lineTo(x + w * 0.65, y + h * 0.65);
        ctx.stroke();
    }

    // Draw scope overlay
    drawScope(ctx, screenWidth, screenHeight) {
        if (!this.isScoped) return;

        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;
        const radius = Math.min(screenWidth, screenHeight) * 0.4;

        // Black overlay outside scope
        ctx.fillStyle = '#000';

        // Top
        ctx.fillRect(0, 0, screenWidth, centerY - radius);
        // Bottom
        ctx.fillRect(0, centerY + radius, screenWidth, screenHeight - centerY - radius);
        // Left
        ctx.beginPath();
        ctx.rect(0, centerY - radius, centerX - radius, radius * 2);
        ctx.fill();
        // Right
        ctx.beginPath();
        ctx.rect(centerX + radius, centerY - radius, screenWidth - centerX - radius, radius * 2);
        ctx.fill();

        // Corners
        ctx.beginPath();
        ctx.moveTo(centerX - radius, centerY - radius);
        ctx.arcTo(centerX - radius, centerY, centerX, centerY, radius);
        ctx.lineTo(centerX - radius, centerY - radius);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(centerX + radius, centerY - radius);
        ctx.arcTo(centerX + radius, centerY, centerX, centerY, radius);
        ctx.lineTo(centerX + radius, centerY - radius);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(centerX - radius, centerY + radius);
        ctx.arcTo(centerX - radius, centerY, centerX, centerY, radius);
        ctx.lineTo(centerX - radius, centerY + radius);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(centerX + radius, centerY + radius);
        ctx.arcTo(centerX + radius, centerY, centerX, centerY, radius);
        ctx.lineTo(centerX + radius, centerY + radius);
        ctx.fill();

        // Scope circle
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshair
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(centerX - radius, centerY);
        ctx.lineTo(centerX - 20, centerY);
        ctx.moveTo(centerX + 20, centerY);
        ctx.lineTo(centerX + radius, centerY);
        ctx.stroke();

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius);
        ctx.lineTo(centerX, centerY - 20);
        ctx.moveTo(centerX, centerY + 20);
        ctx.lineTo(centerX, centerY + radius);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = '#f00';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Range markers
        ctx.fillStyle = '#000';
        ctx.font = '12px monospace';
        for (let i = 1; i <= 3; i++) {
            const y = centerY + i * 50;
            ctx.beginPath();
            ctx.moveTo(centerX - 10, y);
            ctx.lineTo(centerX + 10, y);
            ctx.stroke();
            ctx.fillText(`${i * 100}m`, centerX + 15, y + 4);
        }
    }
}

// Inventory class
class Inventory {
    constructor() {
        this.weapons = {
            [WeaponSlots.KNIFE]: new Weapon('knife'),
            [WeaponSlots.PISTOL]: null,
            [WeaponSlots.PRIMARY]: null,
            [WeaponSlots.GRENADE]: null
        };
        this.currentSlot = WeaponSlots.KNIFE;
        this.armor = 0;
        this.hasHelmet = false;
        this.hasDefuseKit = false;
    }

    getCurrentWeapon() {
        return this.weapons[this.currentSlot];
    }

    switchToSlot(slot) {
        if (this.weapons[slot]) {
            const current = this.getCurrentWeapon();
            if (current) {
                current.cancelReload();
                current.isScoped = false;
            }
            this.currentSlot = slot;
            return true;
        }
        return false;
    }

    switchToNext() {
        const slots = [WeaponSlots.PRIMARY, WeaponSlots.PISTOL, WeaponSlots.KNIFE];
        const currentIndex = slots.indexOf(this.currentSlot);

        for (let i = 1; i <= slots.length; i++) {
            const nextIndex = (currentIndex + i) % slots.length;
            if (this.weapons[slots[nextIndex]]) {
                this.switchToSlot(slots[nextIndex]);
                return true;
            }
        }
        return false;
    }

    switchToPrevious() {
        const slots = [WeaponSlots.PRIMARY, WeaponSlots.PISTOL, WeaponSlots.KNIFE];
        const currentIndex = slots.indexOf(this.currentSlot);

        for (let i = slots.length - 1; i >= 1; i--) {
            const prevIndex = (currentIndex + i) % slots.length;
            if (this.weapons[slots[prevIndex]]) {
                this.switchToSlot(slots[prevIndex]);
                return true;
            }
        }
        return false;
    }

    addWeapon(weaponId) {
        const data = Weapons[weaponId];
        if (!data || data.type === WeaponTypes.EQUIPMENT) return false;

        const weapon = new Weapon(weaponId);

        // Drop existing weapon in same slot
        if (this.weapons[weapon.slot]) {
            this.dropWeapon(weapon.slot);
        }

        this.weapons[weapon.slot] = weapon;
        this.currentSlot = weapon.slot;
        return true;
    }

    dropWeapon(slot) {
        if (slot === WeaponSlots.KNIFE) return null; // Can't drop knife

        const weapon = this.weapons[slot];
        this.weapons[slot] = null;

        if (this.currentSlot === slot) {
            this.switchToSlot(WeaponSlots.KNIFE);
        }

        return weapon;
    }

    buyEquipment(equipmentId) {
        const data = Weapons[equipmentId];
        if (!data || data.type !== WeaponTypes.EQUIPMENT) return false;

        if (equipmentId === 'kevlar') {
            this.armor = data.armor;
        } else if (equipmentId === 'helmet') {
            this.armor = data.armor;
            this.hasHelmet = true;
        } else if (equipmentId === 'defuse') {
            this.hasDefuseKit = true;
        }

        return true;
    }

    getMoveSpeed() {
        const weapon = this.getCurrentWeapon();
        return weapon ? weapon.moveSpeed : 250;
    }

    reset(team) {
        this.weapons = {
            [WeaponSlots.KNIFE]: new Weapon('knife'),
            [WeaponSlots.PISTOL]: new Weapon(team === 'ct' ? 'usp' : 'glock'),
            [WeaponSlots.PRIMARY]: null,
            [WeaponSlots.GRENADE]: null
        };
        this.currentSlot = WeaponSlots.PISTOL;
        this.armor = 0;
        this.hasHelmet = false;
        this.hasDefuseKit = false;
    }

    // Keep weapons between rounds but refill ammo
    refillAmmo() {
        for (const slot in this.weapons) {
            const weapon = this.weapons[slot];
            if (weapon) {
                weapon.reset();
            }
        }
    }
}
