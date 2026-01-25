// Utility functions for Counter-Strike Clone

const Utils = {
    // Angle utilities
    degToRad: (deg) => deg * Math.PI / 180,
    radToDeg: (rad) => rad * 180 / Math.PI,

    // Normalize angle to 0-2PI
    normalizeAngle: (angle) => {
        while (angle < 0) angle += Math.PI * 2;
        while (angle >= Math.PI * 2) angle -= Math.PI * 2;
        return angle;
    },

    // Distance between two points
    distance: (x1, y1, x2, y2) => {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    // Lerp
    lerp: (a, b, t) => a + (b - a) * t,

    // Clamp value
    clamp: (val, min, max) => Math.max(min, Math.min(max, val)),

    // Random integer
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,

    // Random float
    randomFloat: (min, max) => Math.random() * (max - min) + min,

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

    // Point in rectangle
    pointInRect: (px, py, rx, ry, rw, rh) => {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },

    // Circle collision
    circleCollision: (x1, y1, r1, x2, y2, r2) => {
        return Utils.distance(x1, y1, x2, y2) < r1 + r2;
    },

    // Get angle between two points
    angleBetween: (x1, y1, x2, y2) => {
        return Math.atan2(y2 - y1, x2 - x1);
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
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },

    // Shade color
    shadeColor: (color, percent) => {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 +
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)
        ).toString(16).slice(1);
    }
};

// Vector2D class
class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
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
        return new Vector2D(this.x / s, this.y / s);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const len = this.length();
        if (len === 0) return new Vector2D();
        return this.div(len);
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2D(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }

    clone() {
        return new Vector2D(this.x, this.y);
    }
}
