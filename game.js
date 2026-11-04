const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game States stored strictly in browser memory (RAM)
let currentLevelIndex = 0;
let deathCount = 0;

const keys = {};

// Player Object
let player = {
    x: 50,
    y: 260,
    width: 16,
    height: 16,
    vx: 0,
    vy: 0,
    speed: 3,
    jumpForce: -8.5,
    gravity: 0.45,
    grounded: false
};

// Level definitions with dynamic traps
const levels = [
    // Level 1: The False Security
    {
        spawn: { x: 50, y: 260 },
        platforms: [
            { x: 0, y: 300, w: 640, h: 60, type: "normal" },
            { x: 250, y: 240, w: 100, h: 20, type: "drop", triggered: false },
            { x: 450, y: 180, w: 120, h: 20, type: "normal" }
        ],
        hazards: [
            { x: 280, y: 280, w: 20, h: 20, type: "spike" }
        ],
        door: { x: 500, y: 120, w: 24, h: 36, active: true }
    },
    // Level 2: The Moving Door Trap
    {
        spawn: { x: 50, y: 260 },
        platforms: [
            { x: 0, y: 300, w: 640, h: 60, type: "normal" },
            { x: 200, y: 220, w: 80, h: 20, type: "normal" },
            { x: 380, y: 160, w: 80, h: 20, type: "normal" }
        ],
        hazards: [
            { x: 220, y: 300, w: 40, h: 20, type: "spike" }
        ],
        door: { x: 400, y: 100, w: 24, h: 36, active: true, runAway: true }
    },
    // Level 3: Sudden Ceiling Drop
    {
        spawn: { x: 50, y: 260 },
        platforms: [
            { x: 0, y: 300, w: 640, h: 60, type: "normal" },
            { x: 150, y: 250, w: 300, h: 20, type: "normal" }
        ],
        hazards: [
            { x: 200, y: 0, w: 40, h: 50, type: "falling_ceiling", triggered: false, targetY: 250 }
        ],
        door: { x: 550, y: 264, w: 24, h: 36, active: true }
    }
];

let activeLevel = JSON.parse(JSON.stringify(levels[currentLevelIndex]));

// Keyboard Event Listeners
window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (e.code === "KeyR") {
        resetPlayer();
        deathCount++;
        updateHUD();
    }
});

window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
});

function resetPlayer() {
    player.x = activeLevel.spawn.x;
    player.y = activeLevel.spawn.y;
    player.vx = 0;
    player.vy = 0;
}

function updateHUD() {
    document.getElementById("level-display").innerText = `STAGE: ${currentLevelIndex + 1}`;
    document.getElementById("death-display").innerText = `DEATHS: ${deathCount}`;
}

// AABB Collision Detection Helper
function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.w &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.h &&
        rect1.y + rect1.height > rect2.y
    );
}

function updateGame() {
    // Horizontal Movement
    player.vx = 0;
    if (keys["ArrowLeft"] || keys["KeyA"]) {
        player.vx = -player.speed;
    }
    if (keys["ArrowRight"] || keys["KeyD"]) {
        player.vx = player.speed;
    }

    player.x += player.vx;

    // Horizontal Screen Boundaries
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // Apply Gravity
    player.vy += player.gravity;
    player.y += player.vy;
    player.grounded = false;

    // Platform Collisions
    activeLevel.platforms.forEach(plat => {
        // Drop floor trap trigger
        if (plat.type === "drop" && !plat.triggered) {
            if (checkCollision(player, { x: plat.x, y: plat.y - 5, w: plat.w, h: 5 })) {
                plat.triggered = true;
            }
        }

        if (plat.triggered && plat.type === "drop") {
            plat.y += 3; // falls down
        }

        // Standard Landing
        if (
            player.x + player.width > plat.x &&
            player.x < plat.x + plat.w &&
            player.y + player.height >= plat.y &&
            player.y + player.height - player.vy <= plat.y &&
            player.vy >= 0
        ) {
            player.y = plat.y - player.height;
            player.vy = 0;
            player.grounded = true;
        }
    });

    // Jump Input
    if ((keys["ArrowUp"] || keys["KeyW"] || keys["Space"]) && player.grounded) {
        player.vy = player.jumpForce;
        player.grounded = false;
    }

    // Hazard Trap Mechanics & Collisions
    activeLevel.hazards.forEach(haz => {
        if (haz.type === "falling_ceiling" && !haz.triggered) {
            if (player.x > 180) {
                haz.triggered = true;
            }
        }
        if (haz.triggered && haz.type === "falling_ceiling") {
            if (haz.y < haz.targetY) haz.y += 4;
        }

        if (checkCollision(player, haz)) {
            triggerDeath();
        }
    });

    // Pitfall Death (Falling off screen bottom)
    if (player.y > canvas.height) {
        triggerDeath();
    }

    // Door Trap Mechanics & Win Condition
    let door = activeLevel.door;
    if (door.runAway && player.x > door.x - 60) {
        door.x += 3; // Door runs away from player!
    }

    if (checkCollision(player, door)) {
        currentLevelIndex++;
        if (currentLevelIndex >= levels.length) {
            alert("CONGRATULATIONS! You beat Trolley Pixel!");
            currentLevelIndex = 0;
            deathCount = 0;
        }
        activeLevel = JSON.parse(JSON.stringify(levels[currentLevelIndex]));
        resetPlayer();
        updateHUD();
    }
}

function triggerDeath() {
    deathCount++;
    updateHUD();
    resetPlayer();
    // Reset level state elements (traps, dropped floors)
    activeLevel = JSON.parse(JSON.stringify(levels[currentLevelIndex]));
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Platforms
    activeLevel.platforms.forEach(plat => {
        ctx.fillStyle = plat.type === "drop" ? "#9999aa" : "#c0c0c0";
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = "#2b2b2b";
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    });

    // Draw Hazards (Spikes / Ceilings)
    activeLevel.hazards.forEach(haz => {
        ctx.fillStyle = "#ff2a2a";
        ctx.fillRect(haz.x, haz.y, haz.w, haz.h);
    });

    // Draw Door Exit
    let door = activeLevel.door;
    ctx.fillStyle = "#00ff66";
    ctx.fillRect(door.x, door.y, door.w, door.h);
    ctx.strokeStyle = "#004411";
    ctx.strokeRect(door.x, door.y, door.w, door.h);

    // Draw Player Character (Pixel Cube with Eyes)
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Tiny Pixel Eyes
    ctx.fillStyle = "#000000";
    ctx.fillRect(player.x + 9, player.y + 3, 2, 2);
    ctx.fillRect(player.x + 13, player.y + 3, 2, 2);
}

function gameLoop() {
    updateGame();
    drawGame();
    requestAnimationFrame(gameLoop);
}

// Initialize Game Loop
updateHUD();
gameLoop();
