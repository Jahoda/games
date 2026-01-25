// Track definitions and generation for RC Revolt

const TrackDefinitions = [
    {
        id: 'living_room',
        name: 'Obývací pokoj',
        description: 'Závodní okruh mezi nábytkem v obýváku',
        difficulty: 1,
        laps: 3,
        environment: 'indoor',
        trackColor: '#8B4513',
        borderColor: '#654321',
        bgColor: '#DEB887'
    },
    {
        id: 'garden_path',
        name: 'Zahradní stezka',
        description: 'Venkovní okruh mezi záhony a keři',
        difficulty: 2,
        laps: 3,
        environment: 'outdoor',
        trackColor: '#808080',
        borderColor: '#606060',
        bgColor: '#228B22'
    },
    {
        id: 'supermarket',
        name: 'Supermarket',
        description: 'Závod mezi regály v obchodě',
        difficulty: 2,
        laps: 3,
        environment: 'indoor',
        trackColor: '#C0C0C0',
        borderColor: '#A0A0A0',
        bgColor: '#F5F5DC'
    },
    {
        id: 'toy_workshop',
        name: 'Dílna hraček',
        description: 'Nebezpečný okruh mezi nástroji',
        difficulty: 3,
        laps: 4,
        environment: 'indoor',
        trackColor: '#A0522D',
        borderColor: '#8B4513',
        bgColor: '#D2B48C'
    },
    {
        id: 'beach_resort',
        name: 'Pláž',
        description: 'Písčitá trať u bazénu',
        difficulty: 2,
        laps: 3,
        environment: 'outdoor',
        trackColor: '#F4A460',
        borderColor: '#DEB887',
        bgColor: '#87CEEB'
    },
    {
        id: 'museum',
        name: 'Muzeum',
        description: 'Závod mezi exponáty',
        difficulty: 3,
        laps: 4,
        environment: 'indoor',
        trackColor: '#696969',
        borderColor: '#505050',
        bgColor: '#DCDCDC'
    }
];

class Track {
    constructor(definition) {
        this.definition = definition;
        this.id = definition.id;
        this.name = definition.name;
        this.laps = definition.laps;

        this.trackWidth = 80;
        this.waypoints = [];
        this.walls = [];
        this.checkpoints = [];
        this.startPositions = [];
        this.powerupSpawns = [];
        this.obstacles = [];
        this.surfaces = [];
        this.decorations = [];

        this.trackColor = definition.trackColor;
        this.borderColor = definition.borderColor;
        this.bgColor = definition.bgColor;

        // Track bounds for minimap
        this.bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

        // Generate track
        this.generate();
    }

    generate() {
        // Generate track based on definition
        switch (this.id) {
            case 'living_room':
                this.generateLivingRoom();
                break;
            case 'garden_path':
                this.generateGardenPath();
                break;
            case 'supermarket':
                this.generateSupermarket();
                break;
            case 'toy_workshop':
                this.generateToyWorkshop();
                break;
            case 'beach_resort':
                this.generateBeachResort();
                break;
            case 'museum':
                this.generateMuseum();
                break;
            default:
                this.generateDefaultTrack();
        }

        // Calculate bounds
        this.calculateBounds();

        // Generate walls from waypoints
        this.generateWallsFromWaypoints();

        // Generate checkpoints
        this.generateCheckpoints();
    }

    generateDefaultTrack() {
        // Simple oval track
        const cx = 800;
        const cy = 600;
        const rx = 400;
        const ry = 250;
        const points = 32;

        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            this.waypoints.push({
                x: cx + Math.cos(angle) * rx,
                y: cy + Math.sin(angle) * ry,
                width: this.trackWidth
            });
        }

        // Start positions
        for (let i = 0; i < 8; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            this.startPositions.push({
                x: cx + rx - 100 - row * 50,
                y: cy - 20 + col * 40,
                angle: Math.PI
            });
        }

        // Powerup spawns
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            this.powerupSpawns.push({
                x: cx + Math.cos(angle) * (rx - 20),
                y: cy + Math.sin(angle) * (ry - 20)
            });
        }
    }

    generateLivingRoom() {
        // Figure-8 track around furniture
        const waypoints = [
            { x: 300, y: 200 },
            { x: 500, y: 150 },
            { x: 700, y: 200 },
            { x: 850, y: 350 },
            { x: 800, y: 500 },
            { x: 600, y: 550 },
            { x: 500, y: 500 },
            { x: 400, y: 550 },
            { x: 200, y: 500 },
            { x: 150, y: 350 },
            { x: 200, y: 250 }
        ];

        // Smooth the path
        this.waypoints = this.smoothPath(waypoints, 4);

        // Add width to waypoints
        this.waypoints.forEach(wp => wp.width = this.trackWidth);

        // Start positions on right side
        for (let i = 0; i < 8; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            this.startPositions.push({
                x: 700 - row * 45,
                y: 180 + col * 35,
                angle: Math.PI * 0.8
            });
        }

        // Powerups around the track
        this.powerupSpawns = [
            { x: 350, y: 180 },
            { x: 800, y: 400 },
            { x: 600, y: 520 },
            { x: 200, y: 400 }
        ];

        // Obstacles (furniture)
        this.obstacles = [
            { type: 'sofa', x: 500, y: 350, width: 150, height: 60, angle: 0 },
            { type: 'table', x: 300, y: 400, width: 80, height: 80, angle: 0.2 },
            { type: 'lamp', x: 750, y: 250, radius: 20 },
            { type: 'plant', x: 180, y: 280, radius: 25 }
        ];

        // Decorations
        this.decorations = [
            { type: 'carpet', x: 500, y: 350, width: 300, height: 200, color: '#8B0000' },
            { type: 'rug', x: 250, y: 450, width: 100, height: 60, color: '#4B0082' }
        ];

        // Add surfaces (carpet is slower)
        this.surfaces = [
            {
                type: 'carpet',
                polygon: [
                    { x: 350, y: 250 },
                    { x: 650, y: 250 },
                    { x: 650, y: 450 },
                    { x: 350, y: 450 }
                ]
            }
        ];
    }

    generateGardenPath() {
        // Winding path through a garden
        const waypoints = [
            { x: 200, y: 300 },
            { x: 350, y: 200 },
            { x: 550, y: 180 },
            { x: 700, y: 250 },
            { x: 800, y: 400 },
            { x: 750, y: 550 },
            { x: 550, y: 600 },
            { x: 350, y: 580 },
            { x: 200, y: 500 },
            { x: 150, y: 400 }
        ];

        this.waypoints = this.smoothPath(waypoints, 3);
        this.waypoints.forEach(wp => wp.width = this.trackWidth);

        // Start positions
        for (let i = 0; i < 8; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            this.startPositions.push({
                x: 250 + row * 45,
                y: 280 + col * 35,
                angle: -0.5
            });
        }

        // Powerups
        this.powerupSpawns = [
            { x: 500, y: 180 },
            { x: 780, y: 420 },
            { x: 450, y: 590 },
            { x: 170, y: 440 }
        ];

        // Obstacles (garden elements)
        this.obstacles = [
            { type: 'tree', x: 450, y: 380, radius: 40 },
            { type: 'tree', x: 600, y: 400, radius: 35 },
            { type: 'rock', x: 300, y: 420, radius: 25 },
            { type: 'fountain', x: 500, y: 450, radius: 45 }
        ];

        // Grass surfaces (slows down)
        this.surfaces = [
            {
                type: 'grass',
                polygon: [
                    { x: 400, y: 320 },
                    { x: 600, y: 320 },
                    { x: 600, y: 500 },
                    { x: 400, y: 500 }
                ]
            }
        ];

        // Boost pad
        this.surfaces.push({
            type: 'boost',
            polygon: [
                { x: 680, y: 240 },
                { x: 720, y: 260 },
                { x: 700, y: 290 },
                { x: 660, y: 270 }
            ]
        });
    }

    generateSupermarket() {
        // Track through store aisles
        const waypoints = [
            { x: 150, y: 200 },
            { x: 400, y: 180 },
            { x: 600, y: 200 },
            { x: 750, y: 300 },
            { x: 700, y: 450 },
            { x: 550, y: 500 },
            { x: 400, y: 480 },
            { x: 300, y: 400 },
            { x: 350, y: 300 },
            { x: 250, y: 350 },
            { x: 150, y: 300 }
        ];

        this.waypoints = this.smoothPath(waypoints, 3);
        this.waypoints.forEach(wp => wp.width = this.trackWidth - 10);

        // Start positions
        for (let i = 0; i < 8; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            this.startPositions.push({
                x: 200 + row * 45,
                y: 185 + col * 30,
                angle: 0
            });
        }

        // Powerups
        this.powerupSpawns = [
            { x: 500, y: 190 },
            { x: 720, y: 380 },
            { x: 450, y: 490 },
            { x: 300, y: 340 }
        ];

        // Obstacles (shopping carts, displays)
        this.obstacles = [
            { type: 'cart', x: 500, y: 350, width: 30, height: 20, angle: 0.3 },
            { type: 'display', x: 600, y: 350, width: 60, height: 40, angle: 0 },
            { type: 'shelf', x: 200, y: 450, width: 80, height: 20, angle: 0 }
        ];
    }

    generateToyWorkshop() {
        // Complex track with tight corners
        const waypoints = [
            { x: 200, y: 150 },
            { x: 450, y: 120 },
            { x: 650, y: 150 },
            { x: 750, y: 250 },
            { x: 700, y: 350 },
            { x: 550, y: 380 },
            { x: 600, y: 480 },
            { x: 500, y: 550 },
            { x: 300, y: 520 },
            { x: 250, y: 400 },
            { x: 350, y: 320 },
            { x: 300, y: 250 },
            { x: 150, y: 250 }
        ];

        this.waypoints = this.smoothPath(waypoints, 3);
        this.waypoints.forEach(wp => wp.width = this.trackWidth);

        // Start positions
        for (let i = 0; i < 8; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            this.startPositions.push({
                x: 280 + row * 45,
                y: 135 + col * 30,
                angle: 0
            });
        }

        // Powerups
        this.powerupSpawns = [
            { x: 550, y: 140 },
            { x: 720, y: 300 },
            { x: 550, y: 510 },
            { x: 300, y: 360 }
        ];

        // Obstacles (tools, toy parts)
        this.obstacles = [
            { type: 'toolbox', x: 450, y: 280, width: 50, height: 30, angle: 0 },
            { type: 'saw', x: 380, y: 450, width: 40, height: 10, angle: 0.5 }
        ];

        // Oil slick hazard
        this.surfaces.push({
            type: 'oil',
            polygon: [
                { x: 580, y: 360 },
                { x: 620, y: 370 },
                { x: 610, y: 400 },
                { x: 570, y: 390 }
            ]
        });
    }

    generateBeachResort() {
        // Sandy track with water hazards
        const waypoints = [
            { x: 200, y: 250 },
            { x: 400, y: 180 },
            { x: 650, y: 200 },
            { x: 800, y: 320 },
            { x: 750, y: 480 },
            { x: 550, y: 550 },
            { x: 300, y: 520 },
            { x: 150, y: 400 }
        ];

        this.waypoints = this.smoothPath(waypoints, 3);
        this.waypoints.forEach(wp => wp.width = this.trackWidth + 10);

        // Start positions
        for (let i = 0; i < 8; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            this.startPositions.push({
                x: 280 + row * 50,
                y: 220 + col * 35,
                angle: -0.3
            });
        }

        // Powerups
        this.powerupSpawns = [
            { x: 550, y: 190 },
            { x: 780, y: 400 },
            { x: 420, y: 540 },
            { x: 180, y: 340 }
        ];

        // Sand surfaces (slow)
        this.surfaces.push({
            type: 'sand',
            polygon: [
                { x: 450, y: 300 },
                { x: 650, y: 320 },
                { x: 620, y: 450 },
                { x: 430, y: 420 }
            ]
        });

        // Jump ramp
        this.surfaces.push({
            type: 'jump',
            polygon: [
                { x: 760, y: 340 },
                { x: 790, y: 350 },
                { x: 780, y: 380 },
                { x: 750, y: 370 }
            ]
        });

        // Obstacles (beach items)
        this.obstacles = [
            { type: 'umbrella', x: 500, y: 380, radius: 30 },
            { type: 'ball', x: 350, y: 350, radius: 15 }
        ];
    }

    generateMuseum() {
        // Track around museum exhibits
        const waypoints = [
            { x: 180, y: 200 },
            { x: 400, y: 150 },
            { x: 600, y: 180 },
            { x: 780, y: 280 },
            { x: 750, y: 420 },
            { x: 600, y: 500 },
            { x: 400, y: 550 },
            { x: 250, y: 480 },
            { x: 200, y: 350 }
        ];

        this.waypoints = this.smoothPath(waypoints, 4);
        this.waypoints.forEach(wp => wp.width = this.trackWidth);

        // Start positions
        for (let i = 0; i < 8; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            this.startPositions.push({
                x: 250 + row * 50,
                y: 170 + col * 35,
                angle: -0.2
            });
        }

        // Powerups
        this.powerupSpawns = [
            { x: 500, y: 165 },
            { x: 760, y: 350 },
            { x: 500, y: 530 },
            { x: 220, y: 420 }
        ];

        // Obstacles (exhibits, pedestals)
        this.obstacles = [
            { type: 'pedestal', x: 500, y: 350, width: 50, height: 50, angle: 0 },
            { type: 'statue', x: 350, y: 320, radius: 25 },
            { type: 'display', x: 600, y: 380, width: 60, height: 40, angle: 0.1 }
        ];

        // Marble floor (ice-like)
        this.surfaces.push({
            type: 'ice',
            polygon: [
                { x: 380, y: 280 },
                { x: 620, y: 280 },
                { x: 620, y: 420 },
                { x: 380, y: 420 }
            ]
        });
    }

    smoothPath(points, iterations = 2) {
        let smoothed = [...points];

        for (let iter = 0; iter < iterations; iter++) {
            const newPoints = [];

            for (let i = 0; i < smoothed.length; i++) {
                const p0 = smoothed[(i - 1 + smoothed.length) % smoothed.length];
                const p1 = smoothed[i];
                const p2 = smoothed[(i + 1) % smoothed.length];

                // Add point between p0 and p1
                newPoints.push({
                    x: (p0.x + p1.x) / 2,
                    y: (p0.y + p1.y) / 2
                });

                // Add original point
                newPoints.push({
                    x: p1.x,
                    y: p1.y
                });
            }

            smoothed = newPoints;
        }

        return smoothed;
    }

    generateWallsFromWaypoints() {
        this.walls = [];

        for (let i = 0; i < this.waypoints.length; i++) {
            const wp1 = this.waypoints[i];
            const wp2 = this.waypoints[(i + 1) % this.waypoints.length];

            // Calculate perpendicular direction
            const dx = wp2.x - wp1.x;
            const dy = wp2.y - wp1.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len === 0) continue;

            const perpX = -dy / len;
            const perpY = dx / len;

            const halfWidth1 = wp1.width / 2;
            const halfWidth2 = wp2.width / 2;

            // Inner wall segment
            this.walls.push({
                x1: wp1.x + perpX * halfWidth1,
                y1: wp1.y + perpY * halfWidth1,
                x2: wp2.x + perpX * halfWidth2,
                y2: wp2.y + perpY * halfWidth2,
                side: 'inner'
            });

            // Outer wall segment
            this.walls.push({
                x1: wp1.x - perpX * halfWidth1,
                y1: wp1.y - perpY * halfWidth1,
                x2: wp2.x - perpX * halfWidth2,
                y2: wp2.y - perpY * halfWidth2,
                side: 'outer'
            });
        }
    }

    generateCheckpoints() {
        this.checkpoints = [];

        // Create checkpoint every few waypoints
        const interval = Math.max(3, Math.floor(this.waypoints.length / 8));

        for (let i = 0; i < this.waypoints.length; i += interval) {
            const wp = this.waypoints[i];
            const wpNext = this.waypoints[(i + 1) % this.waypoints.length];

            const dx = wpNext.x - wp.x;
            const dy = wpNext.y - wp.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len === 0) continue;

            const perpX = -dy / len;
            const perpY = dx / len;
            const halfWidth = wp.width / 2 + 10;

            this.checkpoints.push({
                x1: wp.x + perpX * halfWidth,
                y1: wp.y + perpY * halfWidth,
                x2: wp.x - perpX * halfWidth,
                y2: wp.y - perpY * halfWidth,
                index: this.checkpoints.length,
                isFinishLine: this.checkpoints.length === 0
            });
        }
    }

    calculateBounds() {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const wp of this.waypoints) {
            minX = Math.min(minX, wp.x - wp.width);
            minY = Math.min(minY, wp.y - wp.width);
            maxX = Math.max(maxX, wp.x + wp.width);
            maxY = Math.max(maxY, wp.y + wp.width);
        }

        this.bounds = { minX, minY, maxX, maxY };
    }

    getStartPosition(index) {
        if (index < this.startPositions.length) {
            return { ...this.startPositions[index] };
        }

        // Generate additional positions if needed
        const basePos = this.startPositions[0];
        const row = Math.floor(index / 2);
        const col = index % 2;

        return {
            x: basePos.x - row * 50,
            y: basePos.y + (col * 2 - 1) * 20,
            angle: basePos.angle
        };
    }

    render(ctx, camera) {
        // Draw background
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw decorations (under track)
        this.renderDecorations(ctx, camera);

        // Draw track surface
        this.renderTrack(ctx, camera);

        // Draw special surfaces
        this.renderSurfaces(ctx, camera);

        // Draw obstacles
        this.renderObstacles(ctx, camera);

        // Draw checkpoints (debug)
        // this.renderCheckpoints(ctx, camera);

        // Draw walls (debug)
        // this.renderWalls(ctx, camera);
    }

    renderTrack(ctx, camera) {
        if (this.waypoints.length < 2) return;

        ctx.save();
        ctx.translate(-camera.x + ctx.canvas.width / 2, -camera.y + ctx.canvas.height / 2);

        // Draw track outer edge
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = this.trackWidth + 10;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
        for (let i = 1; i < this.waypoints.length; i++) {
            ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw track surface
        ctx.strokeStyle = this.trackColor;
        ctx.lineWidth = this.trackWidth;

        ctx.beginPath();
        ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
        for (let i = 1; i < this.waypoints.length; i++) {
            ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw center line (dashed)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([20, 20]);

        ctx.beginPath();
        ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
        for (let i = 1; i < this.waypoints.length; i++) {
            ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.setLineDash([]);

        // Draw finish line
        if (this.checkpoints.length > 0) {
            const finish = this.checkpoints[0];
            this.drawFinishLine(ctx, finish);
        }

        ctx.restore();
    }

    drawFinishLine(ctx, checkpoint) {
        const dx = checkpoint.x2 - checkpoint.x1;
        const dy = checkpoint.y2 - checkpoint.y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const segments = Math.floor(len / 10);

        for (let i = 0; i < segments; i++) {
            const t = i / segments;
            const x = checkpoint.x1 + dx * t;
            const y = checkpoint.y1 + dy * t;

            ctx.fillStyle = (i % 2 === 0) ? '#ffffff' : '#000000';
            ctx.fillRect(x - 5, y - 5, 10, 10);
        }
    }

    renderSurfaces(ctx, camera) {
        ctx.save();
        ctx.translate(-camera.x + ctx.canvas.width / 2, -camera.y + ctx.canvas.height / 2);

        for (const surface of this.surfaces) {
            ctx.beginPath();
            ctx.moveTo(surface.polygon[0].x, surface.polygon[0].y);
            for (let i = 1; i < surface.polygon.length; i++) {
                ctx.lineTo(surface.polygon[i].x, surface.polygon[i].y);
            }
            ctx.closePath();

            switch (surface.type) {
                case 'grass':
                    ctx.fillStyle = '#228B22';
                    break;
                case 'sand':
                    ctx.fillStyle = '#DEB887';
                    break;
                case 'ice':
                    ctx.fillStyle = 'rgba(200, 220, 255, 0.6)';
                    break;
                case 'oil':
                    ctx.fillStyle = 'rgba(20, 20, 30, 0.7)';
                    break;
                case 'boost':
                    ctx.fillStyle = '#00ff00';
                    break;
                case 'jump':
                    ctx.fillStyle = '#ffcc00';
                    break;
                case 'carpet':
                    ctx.fillStyle = 'rgba(139, 0, 0, 0.5)';
                    break;
                default:
                    ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
            }

            ctx.fill();

            // Add pattern for boost pads
            if (surface.type === 'boost') {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;

                // Draw arrows
                const cx = surface.polygon.reduce((s, p) => s + p.x, 0) / surface.polygon.length;
                const cy = surface.polygon.reduce((s, p) => s + p.y, 0) / surface.polygon.length;

                ctx.beginPath();
                ctx.moveTo(cx - 10, cy);
                ctx.lineTo(cx + 10, cy);
                ctx.lineTo(cx + 5, cy - 5);
                ctx.moveTo(cx + 10, cy);
                ctx.lineTo(cx + 5, cy + 5);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    renderObstacles(ctx, camera) {
        ctx.save();
        ctx.translate(-camera.x + ctx.canvas.width / 2, -camera.y + ctx.canvas.height / 2);

        for (const obs of this.obstacles) {
            ctx.save();
            ctx.translate(obs.x, obs.y);

            if (obs.angle) {
                ctx.rotate(obs.angle);
            }

            switch (obs.type) {
                case 'sofa':
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
                    ctx.fillStyle = '#A0522D';
                    ctx.fillRect(-obs.width / 2 + 5, -obs.height / 2 + 5, obs.width - 10, obs.height - 20);
                    break;

                case 'table':
                    ctx.fillStyle = '#654321';
                    ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
                    ctx.strokeStyle = '#4a3219';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
                    break;

                case 'tree':
                    // Trunk
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(-5, -5, 10, 10);
                    // Foliage
                    ctx.fillStyle = '#228B22';
                    ctx.beginPath();
                    ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'rock':
                    ctx.fillStyle = '#696969';
                    ctx.beginPath();
                    ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#505050';
                    ctx.beginPath();
                    ctx.arc(-obs.radius * 0.3, -obs.radius * 0.3, obs.radius * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'lamp':
                case 'plant':
                    ctx.fillStyle = obs.type === 'lamp' ? '#FFD700' : '#228B22';
                    ctx.beginPath();
                    ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'fountain':
                    ctx.fillStyle = '#4169E1';
                    ctx.beginPath();
                    ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#87CEEB';
                    ctx.beginPath();
                    ctx.arc(0, 0, obs.radius * 0.6, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'umbrella':
                    ctx.fillStyle = '#FF4500';
                    ctx.beginPath();
                    ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#FFFFFF';
                    for (let i = 0; i < 8; i += 2) {
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.arc(0, 0, obs.radius, i * Math.PI / 4, (i + 1) * Math.PI / 4);
                        ctx.fill();
                    }
                    break;

                case 'ball':
                    ctx.fillStyle = '#FF6347';
                    ctx.beginPath();
                    ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, obs.radius, 0, Math.PI);
                    ctx.stroke();
                    break;

                default:
                    if (obs.radius) {
                        ctx.fillStyle = '#808080';
                        ctx.beginPath();
                        ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        ctx.fillStyle = '#808080';
                        ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
                    }
            }

            ctx.restore();
        }

        ctx.restore();
    }

    renderDecorations(ctx, camera) {
        ctx.save();
        ctx.translate(-camera.x + ctx.canvas.width / 2, -camera.y + ctx.canvas.height / 2);

        for (const dec of this.decorations) {
            ctx.fillStyle = dec.color || '#808080';
            ctx.fillRect(dec.x - dec.width / 2, dec.y - dec.height / 2, dec.width, dec.height);
        }

        ctx.restore();
    }

    renderCheckpoints(ctx, camera) {
        ctx.save();
        ctx.translate(-camera.x + ctx.canvas.width / 2, -camera.y + ctx.canvas.height / 2);

        for (const cp of this.checkpoints) {
            ctx.strokeStyle = cp.isFinishLine ? '#00ff00' : '#ffff00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cp.x1, cp.y1);
            ctx.lineTo(cp.x2, cp.y2);
            ctx.stroke();
        }

        ctx.restore();
    }

    renderWalls(ctx, camera) {
        ctx.save();
        ctx.translate(-camera.x + ctx.canvas.width / 2, -camera.y + ctx.canvas.height / 2);

        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;

        for (const wall of this.walls) {
            ctx.beginPath();
            ctx.moveTo(wall.x1, wall.y1);
            ctx.lineTo(wall.x2, wall.y2);
            ctx.stroke();
        }

        ctx.restore();
    }

    renderMinimap(ctx, cars, playerCar) {
        const padding = 10;
        const scale = Math.min(
            (ctx.canvas.width - padding * 2) / (this.bounds.maxX - this.bounds.minX),
            (ctx.canvas.height - padding * 2) / (this.bounds.maxY - this.bounds.minY)
        );

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.save();
        ctx.translate(padding, padding);
        ctx.scale(scale, scale);
        ctx.translate(-this.bounds.minX, -this.bounds.minY);

        // Draw track outline
        ctx.strokeStyle = this.trackColor;
        ctx.lineWidth = this.trackWidth * 0.5 / scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
        for (let i = 1; i < this.waypoints.length; i++) {
            ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw cars
        for (const car of cars) {
            ctx.fillStyle = car === playerCar ? '#00ffff' : (car.isAI ? '#ffff00' : '#ff0000');
            ctx.beginPath();
            ctx.arc(car.x, car.y, 8 / scale, 0, Math.PI * 2);
            ctx.fill();

            // Draw direction indicator
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2 / scale;
            ctx.beginPath();
            ctx.moveTo(car.x, car.y);
            ctx.lineTo(
                car.x + Math.cos(car.angle) * 15 / scale,
                car.y + Math.sin(car.angle) * 15 / scale
            );
            ctx.stroke();
        }

        ctx.restore();
    }
}

// Track factory
const TrackFactory = {
    createTrack(trackId) {
        const definition = TrackDefinitions.find(t => t.id === trackId);
        if (!definition) {
            console.warn(`Track definition not found: ${trackId}`);
            return new Track(TrackDefinitions[0]);
        }
        return new Track(definition);
    },

    getTrackById(trackId) {
        return TrackDefinitions.find(t => t.id === trackId);
    },

    getAllTracks() {
        return [...TrackDefinitions];
    },

    getTracksByDifficulty(difficulty) {
        return TrackDefinitions.filter(t => t.difficulty === difficulty);
    }
};
