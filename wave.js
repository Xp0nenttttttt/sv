const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let running = false;
let pressing = false;
let score = 0;

const wave = {
    x: 80,
    y: 200,
    size: 8,
    speed: 3
};

let obstacles = [];

function spawnObstacle() {
    const gap = 110;
    const topHeight = Math.random() * 200 + 20;

    obstacles.push({
        x: canvas.width,
        top: topHeight,
        bottom: topHeight + gap,
        width: 30
    });
}

function resetGame() {
    wave.y = 200;
    obstacles = [];
    score = 0;
    running = true;
    document.getElementById('hint').textContent = '';
}

function update() {
    if (!running) return;

    // mouvement wave
    wave.y += pressing ? -4 : 4;

    // gravité / limites
    if (wave.y < 0 || wave.y > canvas.height) {
        gameOver();
    }

    // obstacles
    if (Math.random() < 0.02) spawnObstacle();

    obstacles.forEach(o => o.x -= wave.speed);

    // collision
    obstacles.forEach(o => {
        if (
            wave.x + wave.size > o.x &&
            wave.x - wave.size < o.x + o.width &&
            (wave.y < o.top || wave.y > o.bottom)
        ) {
            gameOver();
        }
    });

    obstacles = obstacles.filter(o => o.x + o.width > 0);

    score++;
    document.getElementById('score').textContent = `Score : ${score}`;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // wave
    ctx.fillStyle = '#667eea';
    ctx.fillRect(wave.x, wave.y, wave.size, wave.size);

    // obstacles
    ctx.fillStyle = '#ff5c5c';
    obstacles.forEach(o => {
        ctx.fillRect(o.x, 0, o.width, o.top);
        ctx.fillRect(o.x, o.bottom, o.width, canvas.height);
    });
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function gameOver() {
    running = false;
    document.getElementById('hint').textContent =
        `💀 Game Over — clique pour recommencer`;
}

document.addEventListener('mousedown', () => {
    pressing = true;
    if (!running) resetGame();
});
document.addEventListener('mouseup', () => pressing = false);

document.addEventListener('keydown', e => {
    if (e.code === 'Space') {
        pressing = true;
        if (!running) resetGame();
    }
});
document.addEventListener('keyup', e => {
    if (e.code === 'Space') pressing = false;
});

loop();

