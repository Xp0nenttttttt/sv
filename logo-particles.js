const starCanvas = document.getElementById("starCanvas");
const starCtx = starCanvas.getContext("2d");
const header = document.querySelector("header");

let stars = [];
let mouse = { x: null, y: null };

function resizeStars() {
    const rect = header.getBoundingClientRect();
    starCanvas.width = rect.width;
    starCanvas.height = rect.height;
}

resizeStars();
window.addEventListener("resize", resizeStars);

header.addEventListener("mousemove", e => {
    const rect = header.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;

    for (let i = 0; i < 2; i++) {
        stars.push({
            x: mouse.x,
            y: mouse.y,
            dx: (Math.random() - 0.5) * 0.6,
            dy: (Math.random() - 0.5) * 0.6,
            size: Math.random() * 2 + 1.5,
            life: 60,
            rotation: Math.random() * Math.PI
        });
    }
});

function drawStar(x, y, r, rotation) {
    starCtx.save();
    starCtx.translate(x, y);
    starCtx.rotate(rotation);
    starCtx.beginPath();
    for (let i = 0; i < 4; i++) {
        starCtx.lineTo(0, r);
        starCtx.translate(0, r);
        starCtx.rotate(Math.PI / 2);
    }
    starCtx.closePath();
    starCtx.restore();
}

function animateStars() {
    starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);

    stars.forEach((s, i) => {
        s.x += s.dx;
        s.y += s.dy;
        s.life--;
        s.rotation += 0.05;

        starCtx.strokeStyle = `rgba(255,255,255,${s.life / 60})`;
        starCtx.lineWidth = 1;
        drawStar(s.x, s.y, s.size, s.rotation);
        starCtx.stroke();

        if (s.life <= 0) stars.splice(i, 1);
    });

    requestAnimationFrame(animateStars);
}

animateStars();
if (window.innerWidth < 768) stars = [];
