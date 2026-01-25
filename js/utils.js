// Utility functions for RC Revolt

const Utils = {
    // Angle utilities
    degToRad: (deg) => deg * Math.PI / 180,
    radToDeg: (rad) => rad * 180 / Math.PI,

    // Normalize angle to -PI to PI
    normalizeAngle: (angle) => {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    },

    // Distance between two points
    distance: (x1, y1, x2, y2) => {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    // Lerp
    lerp: (a, b, t) => a + (b - a) * t,

    // Smooth lerp (ease in/out)
    smoothLerp: (a, b, t) => {
        t = t * t * (3 - 2 * t);
        return a + (b - a) * t;
    },

    // Clamp value
    clamp: (val, min, max) => Math.max(min, Math.min(max, val)),

    // Random integer
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,

    // Random float
    randomFloat: (min, max) => Math.random() * (max - min) + min,

    // Random from array
    randomChoice: (arr) => arr[Math.floor(Math.random() * arr.length)],

    // Shuffle array
    shuffle: (arr) => {
        const newArr = [...arr];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    },

    // Check line intersection
    lineIntersection: (x1, y1, x2, y2, x3, y3, x4, y4) => {
        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        if (Math.abs(denom) < 0.0001) return null;

        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
        const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

        if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
            return {
                x: x1 + ua * (x2 - x1),
                y: y1 + ua * (y2 - y1),
                t: ua
            };
        }
        return null;
    },

    // Line segment to circle collision
    lineCircleIntersection: (x1, y1, x2, y2, cx, cy, r) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const fx = x1 - cx;
        const fy = y1 - cy;

        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = fx * fx + fy * fy - r * r;

        let discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return null;

        discriminant = Math.sqrt(discriminant);
        const t1 = (-b - discriminant) / (2 * a);
        const t2 = (-b + discriminant) / (2 * a);

        if (t1 >= 0 && t1 <= 1) {
            return { x: x1 + t1 * dx, y: y1 + t1 * dy, t: t1 };
        }
        if (t2 >= 0 && t2 <= 1) {
            return { x: x1 + t2 * dx, y: y1 + t2 * dy, t: t2 };
        }
        return null;
    },

    // Point in rectangle
    pointInRect: (px, py, rx, ry, rw, rh) => {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },

    // Point in polygon
    pointInPolygon: (px, py, polygon) => {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    },

    // Circle collision
    circleCollision: (x1, y1, r1, x2, y2, r2) => {
        return Utils.distance(x1, y1, x2, y2) < r1 + r2;
    },

    // Rectangle collision (AABB)
    rectCollision: (r1, r2) => {
        return r1.x < r2.x + r2.w &&
               r1.x + r1.w > r2.x &&
               r1.y < r2.y + r2.h &&
               r1.y + r1.h > r2.y;
    },

    // Get angle between two points
    angleBetween: (x1, y1, x2, y2) => {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    // Angle difference (shortest path)
    angleDifference: (a1, a2) => {
        let diff = a2 - a1;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return diff;
    },

    // Format race time as MM:SS.mmm
    formatRaceTime: (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const millis = Math.floor(ms % 1000);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
    },

    // Format time as MM:SS
    formatTime: (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    // Create color from RGB
    rgbToHex: (r, g, b) => {
        return '#' + [r, g, b].map(x => {
            const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },

    // Parse hex to RGB
    hexToRgb: (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    // Shade color
    shadeColor: (color, percent) => {
        const rgb = Utils.hexToRgb(color);
        if (!rgb) return color;
        const factor = percent / 100;
        return Utils.rgbToHex(
            rgb.r + (255 - rgb.r) * factor,
            rgb.g + (255 - rgb.g) * factor,
            rgb.b + (255 - rgb.b) * factor
        );
    },

    // Darken color
    darkenColor: (color, percent) => {
        const rgb = Utils.hexToRgb(color);
        if (!rgb) return color;
        const factor = 1 - percent / 100;
        return Utils.rgbToHex(
            rgb.r * factor,
            rgb.g * factor,
            rgb.b * factor
        );
    },

    // Bezier curve point
    bezierPoint: (t, p0, p1, p2, p3) => {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;
        return {
            x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
            y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
        };
    },

    // Catmull-Rom spline interpolation
    catmullRom: (t, p0, p1, p2, p3) => {
        const t2 = t * t;
        const t3 = t2 * t;
        return {
            x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
            y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
        };
    },

    // Rotate point around origin
    rotatePoint: (x, y, angle, cx = 0, cy = 0) => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const nx = (x - cx) * cos - (y - cy) * sin + cx;
        const ny = (x - cx) * sin + (y - cy) * cos + cy;
        return { x: nx, y: ny };
    },

    // Get rotated rectangle corners
    getRotatedRectCorners: (x, y, w, h, angle) => {
        const hw = w / 2;
        const hh = h / 2;
        const corners = [
            { x: -hw, y: -hh },
            { x: hw, y: -hh },
            { x: hw, y: hh },
            { x: -hw, y: hh }
        ];
        return corners.map(c => Utils.rotatePoint(c.x + x, c.y + y, angle, x, y));
    },

    // SAT collision for rotated rectangles
    rotatedRectCollision: (r1, r2) => {
        const corners1 = Utils.getRotatedRectCorners(r1.x, r1.y, r1.w, r1.h, r1.angle);
        const corners2 = Utils.getRotatedRectCorners(r2.x, r2.y, r2.w, r2.h, r2.angle);

        const axes = [];
        for (let i = 0; i < 4; i++) {
            const p1 = corners1[i];
            const p2 = corners1[(i + 1) % 4];
            axes.push({ x: -(p2.y - p1.y), y: p2.x - p1.x });

            const p3 = corners2[i];
            const p4 = corners2[(i + 1) % 4];
            axes.push({ x: -(p4.y - p3.y), y: p4.x - p3.x });
        }

        for (const axis of axes) {
            const len = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
            axis.x /= len;
            axis.y /= len;

            let min1 = Infinity, max1 = -Infinity;
            let min2 = Infinity, max2 = -Infinity;

            for (const c of corners1) {
                const proj = c.x * axis.x + c.y * axis.y;
                min1 = Math.min(min1, proj);
                max1 = Math.max(max1, proj);
            }
            for (const c of corners2) {
                const proj = c.x * axis.x + c.y * axis.y;
                min2 = Math.min(min2, proj);
                max2 = Math.max(max2, proj);
            }

            if (max1 < min2 || max2 < min1) return false;
        }
        return true;
    },

    // Easing functions
    easeInQuad: (t) => t * t,
    easeOutQuad: (t) => t * (2 - t),
    easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: (t) => t * t * t,
    easeOutCubic: (t) => (--t) * t * t + 1,
    easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeOutElastic: (t) => {
        if (t === 0 || t === 1) return t;
        return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
    },
    easeOutBounce: (t) => {
        if (t < 1 / 2.75) return 7.5625 * t * t;
        if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
};

// Vector2D class
class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    static fromAngle(angle, length = 1) {
        return new Vector2D(Math.cos(angle) * length, Math.sin(angle) * length);
    }

    add(v) {
        return new Vector2D(this.x + v.x, this.y + v.y);
    }

    sub(v) {
        return new Vector2D(this.x - v.x, this.y - v.y);
    }

    mul(s) {
        return new Vector2D(this.x * s, this.y * s);
    }

    div(s) {
        if (s === 0) return new Vector2D();
        return new Vector2D(this.x / s, this.y / s);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    cross(v) {
        return this.x * v.y - this.y * v.x;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    lengthSq() {
        return this.x * this.x + this.y * this.y;
    }

    normalize() {
        const len = this.length();
        if (len === 0) return new Vector2D();
        return this.div(len);
    }

    setLength(len) {
        return this.normalize().mul(len);
    }

    limit(max) {
        if (this.lengthSq() > max * max) {
            return this.setLength(max);
        }
        return this.clone();
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2D(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    angleTo(v) {
        return Math.atan2(v.y - this.y, v.x - this.x);
    }

    distanceTo(v) {
        return this.sub(v).length();
    }

    lerp(v, t) {
        return new Vector2D(
            Utils.lerp(this.x, v.x, t),
            Utils.lerp(this.y, v.y, t)
        );
    }

    reflect(normal) {
        const d = this.dot(normal) * 2;
        return this.sub(normal.mul(d));
    }

    perpendicular() {
        return new Vector2D(-this.y, this.x);
    }

    clone() {
        return new Vector2D(this.x, this.y);
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    equals(v) {
        return this.x === v.x && this.y === v.y;
    }

    toString() {
        return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }
}

// Object pool for performance
class ObjectPool {
    constructor(createFn, resetFn, initialSize = 10) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = [];

        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn());
        }
    }

    get() {
        let obj = this.pool.pop();
        if (!obj) {
            obj = this.createFn();
        }
        this.active.push(obj);
        return obj;
    }

    release(obj) {
        const index = this.active.indexOf(obj);
        if (index !== -1) {
            this.active.splice(index, 1);
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }

    releaseAll() {
        while (this.active.length > 0) {
            this.release(this.active[0]);
        }
    }
}

// Simple event emitter
class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    emit(event, ...args) {
        if (!this.events[event]) return;
        this.events[event].forEach(cb => cb(...args));
    }
}
