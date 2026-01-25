// Map system for Counter-Strike Clone
// Tile-based map with different wall types

const TileTypes = {
    EMPTY: 0,
    WALL: 1,
    WALL_BRICK: 2,
    WALL_CONCRETE: 3,
    WALL_METAL: 4,
    DOOR: 5,
    WINDOW: 6,
    CRATE: 7,
    BARREL: 8,
    CT_SPAWN: 10,
    T_SPAWN: 11,
    BOMB_SITE_A: 12,
    BOMB_SITE_B: 13,
    BUY_ZONE_CT: 14,
    BUY_ZONE_T: 15
};

// Tile colors for rendering
const TileColors = {
    [TileTypes.EMPTY]: '#555555',
    [TileTypes.WALL]: '#8B4513',
    [TileTypes.WALL_BRICK]: '#A0522D',
    [TileTypes.WALL_CONCRETE]: '#808080',
    [TileTypes.WALL_METAL]: '#4682B4',
    [TileTypes.DOOR]: '#654321',
    [TileTypes.WINDOW]: '#87CEEB',
    [TileTypes.CRATE]: '#DEB887',
    [TileTypes.BARREL]: '#2F4F4F',
    [TileTypes.CT_SPAWN]: '#1E90FF',
    [TileTypes.T_SPAWN]: '#FF6347',
    [TileTypes.BOMB_SITE_A]: '#FFD700',
    [TileTypes.BOMB_SITE_B]: '#FFA500',
    [TileTypes.BUY_ZONE_CT]: '#4169E1',
    [TileTypes.BUY_ZONE_T]: '#DC143C'
};

// Is tile solid (blocks movement)
const isSolid = (tile) => {
    return tile >= TileTypes.WALL && tile <= TileTypes.BARREL;
};

// Is tile a wall (blocks vision and bullets)
const isWall = (tile) => {
    return tile >= TileTypes.WALL && tile <= TileTypes.WALL_METAL;
};

// de_dust style map (simplified)
const MapData = {
    name: 'de_dust',
    width: 32,
    height: 32,
    tileSize: 64,

    // Map layout (32x32)
    tiles: [
        // Row 0
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        // Row 1
        [1,15,15,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        // Row 2
        [1,15,11,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        // Row 3
        [1,15,15,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1],
        // Row 4
        [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,12,12,1,0,0,0,0,0,0,0,0,0,0,1],
        // Row 5
        [1,0,0,0,7,7,0,0,0,0,0,0,0,0,0,0,0,1,12,12,1,0,0,0,0,0,0,0,0,0,0,1],
        // Row 6
        [1,0,0,0,7,7,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0,0,0,1],
        // Row 7
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,0,0,0,1],
        // Row 8
        [1,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,0,0,0,1],
        // Row 9
        [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        // Row 10
        [1,1,1,1,0,0,0,0,0,1,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1],
        // Row 11
        [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        // Row 12
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        // Row 13
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        // Row 14
        [1,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,1],
        // Row 15
        [1,0,0,0,1,0,0,0,0,0,0,0,0,8,8,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
        // Row 16
        [1,0,0,0,1,0,0,0,0,0,0,0,0,8,8,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
        // Row 17
        [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
        // Row 18
        [1,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
        // Row 19
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,1,1,0,0,0,0,1],
        // Row 20
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
        // Row 21
        [1,0,0,0,0,0,0,0,7,7,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
        // Row 22
        [1,0,0,0,0,0,0,0,7,7,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        // Row 23
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        // Row 24
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1],
        // Row 25
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        // Row 26
        [1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        // Row 27
        [1,0,0,0,0,0,0,0,0,0,0,1,13,13,13,1,0,0,0,0,0,0,0,0,0,0,0,0,14,14,14,1],
        // Row 28
        [1,0,0,0,0,0,0,0,0,0,0,1,13,13,13,1,0,0,0,0,0,0,0,0,0,0,0,0,14,10,14,1],
        // Row 29
        [1,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,14,14,14,1],
        // Row 30
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        // Row 31
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],

    // Spawn points
    ctSpawns: [
        { x: 29 * 64 + 32, y: 28 * 64 + 32 },
        { x: 28 * 64 + 32, y: 28 * 64 + 32 },
        { x: 30 * 64 + 32, y: 28 * 64 + 32 },
        { x: 29 * 64 + 32, y: 29 * 64 + 32 },
        { x: 29 * 64 + 32, y: 27 * 64 + 32 }
    ],

    tSpawns: [
        { x: 2 * 64 + 32, y: 2 * 64 + 32 },
        { x: 1 * 64 + 32, y: 2 * 64 + 32 },
        { x: 3 * 64 + 32, y: 2 * 64 + 32 },
        { x: 2 * 64 + 32, y: 1 * 64 + 32 },
        { x: 2 * 64 + 32, y: 3 * 64 + 32 }
    ],

    // Bomb sites
    bombSites: {
        A: { x: 18 * 64 + 64, y: 4 * 64 + 64, width: 128, height: 128 },
        B: { x: 12 * 64 + 32, y: 27 * 64 + 32, width: 192, height: 192 }
    }
};

class GameMap {
    constructor(mapData) {
        this.name = mapData.name;
        this.width = mapData.width;
        this.height = mapData.height;
        this.tileSize = mapData.tileSize;
        this.tiles = mapData.tiles;
        this.ctSpawns = mapData.ctSpawns;
        this.tSpawns = mapData.tSpawns;
        this.bombSites = mapData.bombSites;

        // Create floor texture pattern
        this.floorPattern = this.createFloorPattern();
        this.ceilingPattern = this.createCeilingPattern();
    }

    createFloorPattern() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Stone floor pattern
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(0, 0, 64, 64);

        ctx.fillStyle = '#3d3d3d';
        ctx.fillRect(0, 0, 31, 31);
        ctx.fillRect(33, 33, 31, 31);

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 32, 32);
        ctx.strokeRect(32, 0, 32, 32);
        ctx.strokeRect(0, 32, 32, 32);
        ctx.strokeRect(32, 32, 32, 32);

        return canvas;
    }

    createCeilingPattern() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, 64, 64);

        // Add some detail
        ctx.fillStyle = '#252525';
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * 60;
            const y = Math.random() * 60;
            ctx.fillRect(x, y, 4, 4);
        }

        return canvas;
    }

    getTile(x, y) {
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);

        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return TileTypes.WALL;
        }

        return this.tiles[tileY][tileX];
    }

    getTileAt(tileX, tileY) {
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return TileTypes.WALL;
        }
        return this.tiles[tileY][tileX];
    }

    isSolidAt(x, y) {
        return isSolid(this.getTile(x, y));
    }

    isWallAt(x, y) {
        return isWall(this.getTile(x, y));
    }

    getColor(tile) {
        return TileColors[tile] || '#555555';
    }

    getSpawnPoint(team, index = 0) {
        const spawns = team === 'ct' ? this.ctSpawns : this.tSpawns;
        return spawns[index % spawns.length];
    }

    isInBuyZone(x, y, team) {
        const tile = this.getTile(x, y);
        if (team === 'ct') {
            return tile === TileTypes.BUY_ZONE_CT || tile === TileTypes.CT_SPAWN;
        } else {
            return tile === TileTypes.BUY_ZONE_T || tile === TileTypes.T_SPAWN;
        }
    }

    isInBombSite(x, y) {
        for (const site in this.bombSites) {
            const s = this.bombSites[site];
            if (x >= s.x - s.width / 2 && x <= s.x + s.width / 2 &&
                y >= s.y - s.height / 2 && y <= s.y + s.height / 2) {
                return site;
            }
        }
        return null;
    }

    // Ray casting for wall detection
    castRay(startX, startY, angle, maxDistance) {
        const rayDirX = Math.cos(angle);
        const rayDirY = Math.sin(angle);

        let mapX = Math.floor(startX / this.tileSize);
        let mapY = Math.floor(startY / this.tileSize);

        const deltaDistX = Math.abs(1 / rayDirX);
        const deltaDistY = Math.abs(1 / rayDirY);

        let stepX, stepY;
        let sideDistX, sideDistY;

        if (rayDirX < 0) {
            stepX = -1;
            sideDistX = (startX / this.tileSize - mapX) * deltaDistX;
        } else {
            stepX = 1;
            sideDistX = (mapX + 1 - startX / this.tileSize) * deltaDistX;
        }

        if (rayDirY < 0) {
            stepY = -1;
            sideDistY = (startY / this.tileSize - mapY) * deltaDistY;
        } else {
            stepY = 1;
            sideDistY = (mapY + 1 - startY / this.tileSize) * deltaDistY;
        }

        let hit = false;
        let side = 0;
        let distance = 0;
        let tile = TileTypes.EMPTY;

        while (!hit && distance < maxDistance / this.tileSize) {
            if (sideDistX < sideDistY) {
                sideDistX += deltaDistX;
                mapX += stepX;
                side = 0;
            } else {
                sideDistY += deltaDistY;
                mapY += stepY;
                side = 1;
            }

            tile = this.getTileAt(mapX, mapY);
            if (isSolid(tile)) {
                hit = true;
            }

            distance = side === 0
                ? (mapX - startX / this.tileSize + (1 - stepX) / 2) / rayDirX
                : (mapY - startY / this.tileSize + (1 - stepY) / 2) / rayDirY;
        }

        if (!hit) {
            return {
                hit: false,
                distance: maxDistance,
                tile: TileTypes.EMPTY,
                side: 0,
                mapX: mapX,
                mapY: mapY
            };
        }

        return {
            hit: true,
            distance: distance * this.tileSize,
            tile: tile,
            side: side,
            mapX: mapX,
            mapY: mapY,
            hitX: startX + rayDirX * distance * this.tileSize,
            hitY: startY + rayDirY * distance * this.tileSize
        };
    }

    // Check line of sight between two points
    hasLineOfSight(x1, y1, x2, y2) {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const distance = Utils.distance(x1, y1, x2, y2);
        const ray = this.castRay(x1, y1, angle, distance);

        return !ray.hit || ray.distance >= distance - 1;
    }

    // Draw minimap
    drawMinimap(ctx, playerX, playerY, playerAngle, entities, width, height) {
        const scale = width / (this.width * this.tileSize) * 3;
        const offsetX = width / 2 - playerX * scale;
        const offsetY = height / 2 - playerY * scale;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, width, height);
        ctx.clip();

        // Draw tiles
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];
                if (tile === TileTypes.EMPTY) continue;

                const drawX = x * this.tileSize * scale + offsetX;
                const drawY = y * this.tileSize * scale + offsetY;
                const size = this.tileSize * scale;

                // Skip tiles outside view
                if (drawX > width || drawY > height || drawX + size < 0 || drawY + size < 0) continue;

                ctx.fillStyle = this.getColor(tile);
                ctx.globalAlpha = 0.8;
                ctx.fillRect(drawX, drawY, size, size);
            }
        }

        ctx.globalAlpha = 1;

        // Draw entities (enemies, teammates)
        if (entities) {
            entities.forEach(entity => {
                if (!entity.isAlive) return;

                const ex = entity.x * scale + offsetX;
                const ey = entity.y * scale + offsetY;

                ctx.fillStyle = entity.team === 'ct' ? '#44aaff' : '#ffaa44';
                ctx.beginPath();
                ctx.arc(ex, ey, 4, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Draw player
        const px = playerX * scale + offsetX;
        const py = playerY * scale + offsetY;

        // Player direction
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(
            px + Math.cos(playerAngle) * 15,
            py + Math.sin(playerAngle) * 15
        );
        ctx.stroke();

        // Player dot
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
