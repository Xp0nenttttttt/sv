const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");

let w, h, particles = [];
const topClanCard = document.getElementById("topClanCard");
topClanCard.style.display = "block";
function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

for (let i = 0; i < 80; i++) {
    particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2 + 1,
        dx: (Math.random() - 0.5) * 0.6,
        dy: (Math.random() - 0.5) * 0.6
    });
}

function animate() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(42,250,223,0.7)";
    particles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > w) p.dx *= -1;
        if (p.y < 0 || p.y > h) p.dy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
    });
    requestAnimationFrame(animate);
}
animate();
document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("particles");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let w, h;

    const mouse = {
        x: null,
        y: null,
        radius: 120
    };

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    window.addEventListener("mousemove", e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener("mouseleave", () => {
        mouse.x = null;
        mouse.y = null;
    });

    const particles = [];
    const COUNT = 90;

    for (let i = 0; i < COUNT; i++) {
        particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 2 + 1,
            baseR: Math.random() * 2 + 1,
            dx: (Math.random() - 0.5) * 0.6,
            dy: (Math.random() - 0.5) * 0.6,
            hue: Math.random() * 360
        });
    }

    function animate() {
        ctx.clearRect(0, 0, w, h);

        particles.forEach((p, i) => {
            p.x += p.dx;
            p.y += p.dy;

            if (p.life !== undefined) {
                p.life--;
                p.r *= 0.96;
                if (p.life <= 0) particles.splice(i, 1);
            }

            // dessin
            ctx.beginPath();
            ctx.fillStyle = `hsla(${p.hue},100%,70%,0.9)`;
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        });
        const card = document.getElementById("topClanCard");
        card.classList.add("top-victory");

        const rect = card.getBoundingClientRect();
        victoryExplosion(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
        );


        requestAnimationFrame(animate);
    }

    animate();
});


function victoryExplosion(x, y) {
    const count = 40;
    for (let i = 0; i < count; i++) {
        particles.push({
            x,
            y,
            r: Math.random() * 3 + 2,
            baseR: Math.random() * 2 + 1,
            dx: (Math.random() - 0.5) * 6,
            dy: (Math.random() - 0.5) * 6,
            hue: Math.random() * 360,
            life: 60
        });
    }
}
