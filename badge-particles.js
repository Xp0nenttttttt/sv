class ParticleSystem {
    constructor(canvas, type) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.type = type;
        this.particles = [];
        this.animationId = null;

        // Configuration selon le type
        this.config = this.getConfig(type);

        // Initialiser les particules
        this.initParticles();

        // Démarrer l'animation
        this.animate();
    }

    getConfig(type) {
        const configs = {
            top1: {
                count: 45,
                color: ['#ffd700', '#fff4b0', '#ffeb66'],
                size: { min: 3, max: 6 },
                speed: { min: 0.35, max: 0.9 },
                twinkle: true,
                shape: 'star'
            },
            top2: {
                count: 40,
                color: ['#cfd8dc', '#b0bec5', '#eceff1'],
                size: { min: 3, max: 6 },
                speed: { min: 0.35, max: 0.9 },
                twinkle: true,
                shape: 'star'
            },
            top3: {
                count: 38,
                color: ['#d2a679', '#c48a5a', '#f2c094'],
                size: { min: 3, max: 6 },
                speed: { min: 0.35, max: 0.9 },
                twinkle: true,
                shape: 'star'
            },

        };
        return configs[type] || configs.featured;
    }

    initParticles() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        for (let i = 0; i < this.config.count; i++) {
            this.particles.push(this.createParticle(centerX, centerY));
        }
    }

    createParticle(centerX, centerY) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 60 + 10;

        return {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            size: Math.random() * (this.config.size.max - this.config.size.min) + this.config.size.min,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: -Math.random() * (this.config.speed.max - this.config.speed.min) - this.config.speed.min,
            color: this.config.color[Math.floor(Math.random() * this.config.color.length)],
            alpha: Math.random() * 0.5 + 0.5,
            angle: angle,
            angleSpeed: (Math.random() - 0.5) * 0.05,
            life: 1,
            decay: Math.random() * 0.005 + 0.005
        };
    }

    updateParticle(particle) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Mouvement identique pour tous : étoiles qui montent
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        particle.life -= particle.decay;
        particle.alpha = particle.life;

        // Respawn si la particule est morte ou hors écran
        if (particle.life <= 0 || particle.y < -10 || particle.x < -10 || particle.x > this.canvas.width + 10) {
            const newParticle = this.createParticle(centerX, centerY);
            Object.assign(particle, newParticle);
        }
    }

    drawParticle(particle) {
        this.ctx.save();
        this.ctx.globalAlpha = particle.alpha;

        // Toujours dessiner des étoiles
        this.drawStar(particle.x, particle.y, particle.size, particle.color);

        this.ctx.restore();
    }

    drawStar(x, y, size, color) {
        const spikes = 5;
        const outerRadius = size;
        const innerRadius = size / 2;

        this.ctx.fillStyle = color;
        this.ctx.beginPath();

        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;

            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }

        this.ctx.closePath();
        this.ctx.fill();

        // Glow
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = color;
        this.ctx.fill();
    }

    drawFlame(x, y, size, color) {
        // Forme de flamme simplifiée
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - size);
        this.ctx.quadraticCurveTo(x + size, y, x, y + size);
        this.ctx.quadraticCurveTo(x - size, y, x, y - size);
        this.ctx.fill();

        // Glow
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = color;
        this.ctx.fill();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach(particle => {
            this.updateParticle(particle);
            this.drawParticle(particle);
        });

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// Initialiser les particules pour tous les badges visibles
function initBadgeParticles() {
    document.querySelectorAll('.badge-canvas').forEach(canvas => {
        const type = canvas.dataset.topRank;
        // N'initialiser que pour les tops; le support badgeType reste possible si on ajoute data-top-rank plus tard
        if (type) {
            new ParticleSystem(canvas, type);
        }
    });
}

// Auto-initialisation au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBadgeParticles);
} else {
    initBadgeParticles();
}
