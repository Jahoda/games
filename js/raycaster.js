// Raycaster 3D rendering engine for Counter-Strike Clone

class Raycaster {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Resolution
        this.width = 800;
        this.height = 600;

        // Camera settings
        this.fov = Math.PI / 3; // 60 degrees
        this.halfFov = this.fov / 2;
        this.numRays = 320; // Number of rays to cast (resolution)
        this.rayAngleStep = this.fov / this.numRays;

        // Rendering
        this.maxRenderDistance = 2000;
        this.wallHeight = 64;

        // Z-buffer for sprite rendering (pre-allocate max size)
        this.zBuffer = new Float32Array(2048);
        this.zBufferSize = this.numRays;

        // Textures (procedurally generated)
        this.textures = {};
        this.generateTextures();

        // Sprite rendering (reuse array)
        this.sprites = [];

        // Cached gradients (will be created on first use/resize)
        this.ceilingGradient = null;
        this.floorGradient = null;
        this.gradientsDirty = true;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.numRays = Math.floor(width / 2);
        this.rayAngleStep = this.fov / this.numRays;
        this.zBufferSize = this.numRays;

        // Reallocate z-buffer only if needed
        if (this.numRays > this.zBuffer.length) {
            this.zBuffer = new Float32Array(this.numRays);
        }

        // Mark gradients for recreation
        this.gradientsDirty = true;
    }

    generateTextures() {
        const size = 64;

        // Brick texture
        this.textures.brick = this.createTexture(size, (ctx, x, y) => {
            const brickHeight = 8;
            const brickWidth = 16;
            const mortarSize = 1;

            const row = Math.floor(y / brickHeight);
            const offset = (row % 2) * (brickWidth / 2);
            const brickX = (x + offset) % brickWidth;
            const brickY = y % brickHeight;

            if (brickX < mortarSize || brickY < mortarSize) {
                return '#666666';
            }
            return `rgb(${160 + Math.random() * 20}, ${80 + Math.random() * 10}, ${60 + Math.random() * 10})`;
        });

        // Concrete texture
        this.textures.concrete = this.createTexture(size, (ctx, x, y) => {
            const noise = Math.random() * 30;
            const base = 130;
            return `rgb(${base + noise}, ${base + noise}, ${base + noise + 5})`;
        });

        // Metal texture
        this.textures.metal = this.createTexture(size, (ctx, x, y) => {
            const stripe = Math.floor(y / 8) % 2;
            const base = stripe ? 90 : 110;
            const noise = Math.random() * 10;
            return `rgb(${base + noise}, ${base + noise + 10}, ${base + noise + 20})`;
        });

        // Wood/crate texture
        this.textures.crate = this.createTexture(size, (ctx, x, y) => {
            const plankWidth = 16;
            const plankX = x % plankWidth;

            if (plankX === 0 || plankX === plankWidth - 1) {
                return '#5a4020';
            }

            const grain = Math.sin(y * 0.5 + Math.random() * 0.5) * 10;
            return `rgb(${180 + grain}, ${140 + grain}, ${80 + grain})`;
        });

        // Default wall
        this.textures.wall = this.createTexture(size, (ctx, x, y) => {
            const noise = Math.random() * 15;
            return `rgb(${120 + noise}, ${100 + noise}, ${70 + noise})`;
        });
    }

    createTexture(size, pixelFunc) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                ctx.fillStyle = pixelFunc(ctx, x, y);
                ctx.fillRect(x, y, 1, 1);
            }
        }

        return canvas;
    }

    getTextureForTile(tile) {
        switch (tile) {
            case TileTypes.WALL_BRICK:
                return this.textures.brick;
            case TileTypes.WALL_CONCRETE:
                return this.textures.concrete;
            case TileTypes.WALL_METAL:
                return this.textures.metal;
            case TileTypes.CRATE:
                return this.textures.crate;
            default:
                return this.textures.wall;
        }
    }

    render(player, map, entities = []) {
        const ctx = this.ctx;

        // Clear screen
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw ceiling
        this.drawCeiling(ctx, player);

        // Draw floor
        this.drawFloor(ctx, player, map);

        // Cast rays and draw walls
        this.castRays(player, map);

        // Collect and sort sprites (entities)
        this.collectSprites(player, entities);

        // Draw sprites
        this.drawSprites(player, map);

        // Draw weapon
        const weapon = player.inventory.getCurrentWeapon();
        if (weapon) {
            const bob = player.weaponBobY;

            // Check if scoped
            if (weapon.isScoped) {
                weapon.drawScope(ctx, this.width, this.height);
            } else {
                weapon.draw(ctx, this.width, this.height, bob);
            }
        }

        // Draw muzzle flash
        if (weapon && performance.now() - weapon.lastFireTime < 50) {
            this.drawMuzzleFlash(ctx);
        }

        // Draw damage overlay
        if (performance.now() - player.lastDamageTime < 300) {
            this.drawDamageOverlay(ctx, player);
        }
    }

    drawCeiling(ctx, player) {
        // Recreate gradients only when size changes
        if (this.gradientsDirty) {
            this.ceilingGradient = ctx.createLinearGradient(0, 0, 0, this.height / 2);
            this.ceilingGradient.addColorStop(0, '#111');
            this.ceilingGradient.addColorStop(1, '#2a2a2a');

            this.floorGradient = ctx.createLinearGradient(0, this.height / 2, 0, this.height);
            this.floorGradient.addColorStop(0, '#3a3a3a');
            this.floorGradient.addColorStop(1, '#1a1a1a');

            this.gradientsDirty = false;
        }

        ctx.fillStyle = this.ceilingGradient;
        ctx.fillRect(0, 0, this.width, this.height / 2);
    }

    drawFloor(ctx, player, map) {
        ctx.fillStyle = this.floorGradient;
        ctx.fillRect(0, this.height / 2, this.width, this.height / 2);
    }

    castRays(player, map) {
        const ctx = this.ctx;
        const stripWidth = Math.ceil(this.width / this.numRays);

        for (let i = 0; i < this.numRays; i++) {
            const rayAngle = player.angle - this.halfFov + i * this.rayAngleStep;
            const ray = map.castRay(player.x, player.y, rayAngle, this.maxRenderDistance);

            // Store in z-buffer
            this.zBuffer[i] = ray.distance;

            if (ray.hit) {
                // Fix fisheye effect
                const correctedDistance = ray.distance * Math.cos(rayAngle - player.angle);

                // Calculate wall height
                const wallHeight = (map.tileSize * this.height) / correctedDistance;
                const wallTop = (this.height - wallHeight * player.height) / 2 - player.pitch * this.height;
                const wallBottom = wallTop + wallHeight;

                // Get texture
                const texture = this.getTextureForTile(ray.tile);

                // Calculate texture X coordinate
                let texX;
                if (ray.side === 0) {
                    texX = ray.hitY % map.tileSize;
                } else {
                    texX = ray.hitX % map.tileSize;
                }
                texX = Math.floor(texX);

                // Draw wall strip with texture
                const x = i * stripWidth;

                // Shade based on distance and side
                let shade = 1 - (correctedDistance / this.maxRenderDistance) * 0.7;
                if (ray.side === 1) shade *= 0.8;
                shade = Math.max(0.2, shade);

                // Draw textured strip
                ctx.drawImage(
                    texture,
                    texX, 0, 1, texture.height,
                    x, wallTop, stripWidth, wallHeight
                );

                // Apply shading
                ctx.fillStyle = `rgba(0, 0, 0, ${1 - shade})`;
                ctx.fillRect(x, wallTop, stripWidth, wallHeight);
            }
        }
    }

    collectSprites(player, entities) {
        // Clear array without creating new one
        this.sprites.length = 0;

        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (!entity.isAlive) continue;
            if (entity === player) continue;

            const dx = entity.x - player.x;
            const dy = entity.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > this.maxRenderDistance) continue;

            // Calculate angle to entity
            const angle = Math.atan2(dy, dx);
            let relativeAngle = angle - player.angle;

            // Normalize angle
            while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
            while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;

            // Check if in view
            if (Math.abs(relativeAngle) < this.halfFov + 0.2) {
                this.sprites.push({
                    entity: entity,
                    distance: distance,
                    angle: relativeAngle
                });
            }
        }

        // Sort by distance (far to near)
        this.sprites.sort((a, b) => b.distance - a.distance);
    }

    drawSprites(player, map) {
        const ctx = this.ctx;

        this.sprites.forEach(sprite => {
            const entity = sprite.entity;
            const distance = sprite.distance;
            const angle = sprite.angle;

            // Calculate screen position
            const screenX = (0.5 + angle / this.fov) * this.width;

            // Check z-buffer
            const rayIndex = Math.floor(screenX / (this.width / this.numRays));
            if (rayIndex >= 0 && rayIndex < this.numRays) {
                if (this.zBuffer[rayIndex] < distance) {
                    return; // Behind wall
                }
            }

            // Calculate sprite size
            const spriteHeight = (map.tileSize * this.height) / distance;
            const spriteWidth = spriteHeight * 0.6;

            const drawX = screenX - spriteWidth / 2;
            const drawY = (this.height - spriteHeight * player.height) / 2 - player.pitch * this.height;

            // Draw entity
            this.drawEntity(ctx, entity, drawX, drawY, spriteWidth, spriteHeight, distance);
        });
    }

    drawEntity(ctx, entity, x, y, width, height, distance) {
        ctx.save();

        // Shade based on distance
        const shade = Math.max(0.2, 1 - distance / this.maxRenderDistance);

        // Body color based on team
        const bodyColor = entity.team === 'ct' ? '#1a4a7a' : '#7a4a1a';
        const headColor = entity.team === 'ct' ? '#2a5a8a' : '#8a5a2a';

        // Draw legs
        ctx.fillStyle = '#333';
        const legWidth = width * 0.2;
        const legHeight = height * 0.35;
        ctx.fillRect(x + width * 0.2, y + height * 0.65, legWidth, legHeight);
        ctx.fillRect(x + width * 0.6, y + height * 0.65, legWidth, legHeight);

        // Draw body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(x + width * 0.15, y + height * 0.25, width * 0.7, height * 0.45);

        // Draw arms
        const armWidth = width * 0.15;
        ctx.fillRect(x, y + height * 0.3, armWidth, height * 0.35);
        ctx.fillRect(x + width - armWidth, y + height * 0.3, armWidth, height * 0.35);

        // Draw head
        ctx.fillStyle = headColor;
        const headSize = width * 0.4;
        ctx.beginPath();
        ctx.arc(x + width / 2, y + height * 0.2, headSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw face direction indicator
        ctx.fillStyle = '#222';
        const faceAngle = entity.angle - Math.atan2(entity.y - this.lastPlayerY, entity.x - this.lastPlayerX);
        const eyeOffset = Math.cos(faceAngle) * headSize * 0.2;
        ctx.beginPath();
        ctx.arc(x + width / 2 + eyeOffset, y + height * 0.18, headSize * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Draw weapon
        ctx.fillStyle = '#444';
        ctx.fillRect(x + width - armWidth - width * 0.3, y + height * 0.35, width * 0.4, height * 0.08);

        // Apply shading
        ctx.fillStyle = `rgba(0, 0, 0, ${1 - shade})`;
        ctx.fillRect(x, y, width, height);

        // Health bar (only for enemies)
        if (entity.health < entity.maxHealth) {
            const barWidth = width * 0.8;
            const barHeight = 4;
            const barX = x + width * 0.1;
            const barY = y - 10;

            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            const healthPercent = entity.health / entity.maxHealth;
            ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : healthPercent > 0.25 ? '#ff0' : '#f00';
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        }

        ctx.restore();
    }

    drawMuzzleFlash(ctx) {
        const flashX = this.width * 0.65;
        const flashY = this.height * 0.5;
        const flashSize = 30 + Math.random() * 20;

        const gradient = ctx.createRadialGradient(flashX, flashY, 0, flashX, flashY, flashSize);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
        gradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(flashX, flashY, flashSize, 0, Math.PI * 2);
        ctx.fill();
    }

    drawDamageOverlay(ctx, player) {
        const elapsed = performance.now() - player.lastDamageTime;
        const alpha = Math.max(0, 0.5 - elapsed / 600);

        // Red vignette
        const gradient = ctx.createRadialGradient(
            this.width / 2, this.height / 2, this.height * 0.3,
            this.width / 2, this.height / 2, this.height
        );
        gradient.addColorStop(0, `rgba(255, 0, 0, 0)`);
        gradient.addColorStop(1, `rgba(255, 0, 0, ${alpha})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Direction indicator
        const dirAngle = player.lastDamageDirection - player.angle;
        const indicatorX = this.width / 2 + Math.cos(dirAngle) * 150;
        const indicatorY = this.height / 2 + Math.sin(dirAngle) * 150;

        ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 2})`;
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, 20, 0, Math.PI * 2);
        ctx.fill();
    }

    // Set player position for entity rendering
    setPlayerPosition(x, y) {
        this.lastPlayerX = x;
        this.lastPlayerY = y;
    }
}
