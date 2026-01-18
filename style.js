window.addEventListener("load", () => {
    // TOUT le code des étoiles ici

    const starCanvas = document.getElementById("starCanvas");
    const ctx = starCanvas.getContext("2d");
    const header = document.querySelector("header");
    const logo = document.querySelector(".sv-logo");

    let stars = [];
    const MAX_STARS = 120;

    function resizeStars() {
        const rect = header.getBoundingClientRect();
        starCanvas.width = rect.width;
        starCanvas.height = rect.height;
    }
    resizeStars();
    window.addEventListener("resize", resizeStars);

    // Position du "trou noir" = centre du logo
    function getAttractor() {
        const rect = logo.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2 - headerRect.left,
            y: rect.top + rect.height / 2 - headerRect.top
        };
    }

    function spawnStar() {
        const edge = Math.floor(Math.random() * 4);
        let x, y;

        if (edge === 0) { x = Math.random() * starCanvas.width; y = -10; }
        if (edge === 1) { x = starCanvas.width + 10; y = Math.random() * starCanvas.height; }
        if (edge === 2) { x = Math.random() * starCanvas.width; y = starCanvas.height + 10; }
        if (edge === 3) { x = -10; y = Math.random() * starCanvas.height; }

        stars.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            size: Math.random() * 2 + 1,
            life: 1
        });
    }

    function drawStar(x, y, r) {
        ctx.beginPath();
        ctx.moveTo(x - r, y);
        ctx.lineTo(x + r, y);
        ctx.moveTo(x, y - r);
        ctx.lineTo(x, y + r);
        ctx.stroke();
    }

    function animateStars() {
        ctx.clearRect(0, 0, starCanvas.width, starCanvas.height);
        const attractor = getAttractor();

        if (stars.length < MAX_STARS) spawnStar();

        stars.forEach((s, i) => {
            const dx = attractor.x - s.x;
            const dy = attractor.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;

            // Gravité
            const force = Math.min(0.05, 1 / dist);
            s.vx += dx * force * 0.01;
            s.vy += dy * force * 0.01;

            s.x += s.vx;
            s.y += s.vy;
            s.life -= 0.002;

            ctx.strokeStyle = `hsla(${200 + dist % 120},100%,70%,0.8)`;
            ctx.lineWidth = 1;
            drawStar(s.x, s.y, s.size);

            // Absorption par le logo
            if (dist < 20 || s.life <= 0) {
                stars.splice(i, 1);
            }
        });

        requestAnimationFrame(animateStars);
    }

    animateStars();
});