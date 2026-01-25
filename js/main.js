// Main entry point for Counter-Strike Clone

// Global game instance
let game = null;

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Counter-Strike 1.5 Clone');
    console.log('========================');
    console.log('Initializing game...');

    // Create game instance
    game = new Game();

    console.log('Game initialized!');
    console.log('Click "NOVÁ HRA" to start');

    // Prevent context menu on right click
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // Handle visibility change (pause when tab is hidden)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && game.state === GameState.PLAYING) {
            game.pause();
        }
    });

    // Prevent default browser shortcuts during gameplay
    document.addEventListener('keydown', (e) => {
        if (game.state === GameState.PLAYING) {
            // Prevent Tab from switching focus
            if (e.code === 'Tab') {
                e.preventDefault();
            }
            // Prevent F5 refresh
            if (e.code === 'F5') {
                e.preventDefault();
            }
        }
    });

    // Handle window blur
    window.addEventListener('blur', () => {
        if (game && game.player) {
            // Reset all keys when window loses focus
            game.player.keys = {
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
        }
    });
});

// Debug functions (available in console)
window.debug = {
    // Give player all weapons
    giveAll: () => {
        if (!game || !game.player) return;
        game.player.money = 16000;
        game.player.buyWeapon('ak47');
        game.player.buyWeapon('awp');
        game.player.buyWeapon('deagle');
        game.player.buyWeapon('helmet');
        console.log('All weapons given!');
    },

    // God mode
    godMode: () => {
        if (!game || !game.player) return;
        game.player.health = 99999;
        game.player.maxHealth = 99999;
        console.log('God mode enabled!');
    },

    // Spawn bot
    spawnBot: (team, difficulty) => {
        if (!game) return;
        const bot = game.botManager.addBot(team || 'ct', difficulty || 'MEDIUM');
        const spawn = game.map.getSpawnPoint(bot.team, Math.floor(Math.random() * 5));
        bot.spawn(spawn);
        console.log(`Bot spawned: ${bot.name}`);
    },

    // Teleport player
    teleport: (x, y) => {
        if (!game || !game.player) return;
        game.player.x = x;
        game.player.y = y;
        console.log(`Teleported to ${x}, ${y}`);
    },

    // Show FPS
    showFps: () => {
        if (!game) return;
        setInterval(() => {
            console.log(`FPS: ${game.fps}`);
        }, 1000);
    },

    // Show player position
    showPos: () => {
        if (!game || !game.player) return;
        console.log(`Position: ${game.player.x.toFixed(0)}, ${game.player.y.toFixed(0)}`);
        console.log(`Angle: ${game.player.angle.toFixed(2)}`);
    },

    // Kill all enemies
    killAll: () => {
        if (!game) return;
        game.botManager.bots.forEach(bot => {
            if (bot.team !== game.player.team) {
                bot.health = 0;
                bot.isAlive = false;
            }
        });
        console.log('All enemies killed!');
    },

    // Reset round
    resetRound: () => {
        if (!game) return;
        game.startRound();
        console.log('Round reset!');
    },

    // Add money
    addMoney: (amount) => {
        if (!game || !game.player) return;
        game.player.earnMoney(amount || 10000);
        console.log(`Money: $${game.player.money}`);
    }
};

console.log('Debug commands available: debug.giveAll(), debug.godMode(), debug.spawnBot(), debug.teleport(x,y), debug.showFps(), debug.showPos(), debug.killAll(), debug.resetRound(), debug.addMoney(amount)');
