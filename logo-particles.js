const canvas = document.getElementById("logoParticles");
const ctx = canvas.getContext("2d");
const logo = document.querySelector(".sv-logo");

let particles = [];

function resizeLogoCanvas() {
    const rect = logo.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

resizeLogoCanvas();
window.addEventListener("resize", resizeLogoCanvas);

function spawnParticle() {
    particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        dx: (Math.random() - 0.5) * 1.5,
        dy: (Math.random() - 0.5) * 1.5,
        r: Math.random() * 2 + 1,
        life: 100,
        hue: Math.random() * 360
    });
}

function animateLogoParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (particles.length < 80) spawnParticle();

    particles.forEach((p, i) => {
        p.x += p.dx;
        p.y += p.dy;
        p.life--;

        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue},100%,70%,0.8)`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        if (p.life <= 0) particles.splice(i, 1);
    });

    requestAnimationFrame(animateLogoParticles);
}

animateLogoParticles();
logo.addEventListener("mousemove", e => {
    const rect = logo.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let i = 0; i < 6; i++) {
        particles.push({
            x,
            y,
            dx: (Math.random() - 0.5) * 3,
            dy: (Math.random() - 0.5) * 3,
            r: Math.random() * 2 + 1,
            life: 60,
            hue: Math.random() * 360
        });
    }
});
