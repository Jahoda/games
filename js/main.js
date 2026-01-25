// Main entry point for RC Revolt

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('RC Revolt - RC Car Racing Game');
    console.log('===============================');
    console.log('Initializing game...');

    // Check for required browser features
    if (!window.AudioContext && !window.webkitAudioContext) {
        console.warn('Web Audio API not supported - audio will be disabled');
    }

    if (!document.createElement('canvas').getContext) {
        alert('Váš prohlížeč nepodporuje HTML5 Canvas. Prosím aktualizujte prohlížeč.');
        return;
    }

    // Initialize the game
    try {
        game.init();
        console.log('Game initialized successfully!');
        console.log('Click "NOVÝ ZÁVOD" to start racing');
    } catch (error) {
        console.error('Failed to initialize game:', error);
        alert('Nepodařilo se inicializovat hru. Zkuste obnovit stránku.');
    }
});

// Handle visibility change (pause when tab is hidden)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === 'racing') {
        game.pause();
    }
});

// Prevent context menu on right-click during game
document.addEventListener('contextmenu', (e) => {
    if (game.state === 'racing' || game.state === 'countdown') {
        e.preventDefault();
    }
});

// Handle beforeunload to warn about leaving during race
window.addEventListener('beforeunload', (e) => {
    if (game.state === 'racing') {
        e.preventDefault();
        e.returnValue = 'Opravdu chcete opustit rozehraný závod?';
        return e.returnValue;
    }
});

// Handle window blur - reset keys when window loses focus
window.addEventListener('blur', () => {
    if (game && game.playerCar) {
        game.playerCar.throttle = 0;
        game.playerCar.brake = 0;
        game.playerCar.reverse = 0;
        game.playerCar.steering = 0;
    }
});

// Prevent default browser shortcuts during gameplay
document.addEventListener('keydown', (e) => {
    if (game.state === 'racing' || game.state === 'countdown') {
        // Prevent Tab from switching focus
        if (e.code === 'Tab') {
            e.preventDefault();
        }
        // Prevent space from scrolling
        if (e.code === 'Space') {
            e.preventDefault();
        }
    }
});

// Debug functions (available in console)
window.debug = {
    // Show FPS
    showFps: () => {
        setInterval(() => {
            console.log(`FPS: ${Math.round(1000 / game.lastFrameTime)}`);
        }, 1000);
    },

    // Show player position
    showPos: () => {
        if (!game || !game.playerCar) return;
        const car = game.playerCar;
        console.log(`Position: ${car.x.toFixed(0)}, ${car.y.toFixed(0)}`);
        console.log(`Speed: ${car.speed.toFixed(0)}`);
        console.log(`Lap: ${car.lap} / Checkpoint: ${car.checkpoint}`);
    },

    // Give player a power-up
    givePowerup: (type) => {
        if (!game || !game.playerCar) return;
        const types = ['rocket', 'missile', 'bomb', 'shockwave', 'oil', 'shield', 'battery', 'boost', 'waterbomb', 'firework'];
        if (!types.includes(type)) {
            console.log('Available power-ups:', types.join(', '));
            return;
        }
        game.playerCar.powerup = type;
        UI.updatePowerup(type);
        console.log(`Power-up given: ${type}`);
    },

    // Teleport player to position
    teleport: (x, y) => {
        if (!game || !game.playerCar) return;
        game.playerCar.x = x;
        game.playerCar.y = y;
        console.log(`Teleported to ${x}, ${y}`);
    },

    // Set player speed
    setSpeed: (speed) => {
        if (!game || !game.playerCar) return;
        game.playerCar.speed = speed;
        console.log(`Speed set to ${speed}`);
    },

    // Skip to finish line
    finishRace: () => {
        if (!game || !game.playerCar) return;
        game.playerCar.lap = game.totalLaps;
        game.playerCar.checkpoint = game.track.checkpoints.length - 1;
        console.log('Skipped to finish!');
    },

    // Toggle god mode (invincibility)
    godMode: () => {
        if (!game || !game.playerCar) return;
        game.playerCar.invincible = !game.playerCar.invincible;
        game.playerCar.invincibleTime = game.playerCar.invincible ? 999999999 : 0;
        console.log(`God mode: ${game.playerCar.invincible ? 'ON' : 'OFF'}`);
    },

    // List all cars
    listCars: () => {
        console.log('Available cars:');
        CarDefinitions.forEach((car, i) => {
            console.log(`${i}: ${car.name} - Speed: ${car.maxSpeed}, Accel: ${car.acceleration}, Handling: ${car.handling}`);
        });
    },

    // List all tracks
    listTracks: () => {
        console.log('Available tracks:');
        TrackDefinitions.forEach((track, i) => {
            console.log(`${i}: ${track.name} - ${track.description}`);
        });
    },

    // Stop all AI cars
    stopAI: () => {
        if (!game || !game.cars) return;
        game.cars.forEach(car => {
            if (car.isAI) {
                car.speed = 0;
                car.throttle = 0;
            }
        });
        AIMgr.cleanup();
        console.log('All AI cars stopped');
    },

    // Add boost to player
    boost: () => {
        if (!game || !game.playerCar) return;
        game.playerCar.speed = Math.min(game.playerCar.speed + 200, 600);
        console.log('Boost applied!');
    }
};

console.log('Debug commands available:');
console.log('  debug.showFps() - Show FPS counter');
console.log('  debug.showPos() - Show player position');
console.log('  debug.givePowerup(type) - Give power-up');
console.log('  debug.teleport(x, y) - Teleport player');
console.log('  debug.setSpeed(speed) - Set player speed');
console.log('  debug.finishRace() - Skip to finish');
console.log('  debug.godMode() - Toggle invincibility');
console.log('  debug.listCars() - List all cars');
console.log('  debug.listTracks() - List all tracks');
console.log('  debug.stopAI() - Stop all AI cars');
console.log('  debug.boost() - Give speed boost');
