/**
 * ========================================
 * FONDO ÉPICO
 * ========================================
 * Escenario de show animado detrás de toda la app: reflectores móviles que
 * barren el humo, haces de colores y polvo flotando. Es solo decoración:
 * no recibe clicks, se pausa con la pestaña oculta y respeta a quien tiene
 * activado "reducir movimiento" (queda quieto).
 */

const FondoEpico = {

    canvas: null,
    ctx: null,
    haces: [],
    polvo: [],
    w: 0,
    h: 0,
    t: 0,
    raf: null,
    quieto: false,

    COLORES: [
        [255, 193, 7],    // ámbar tungsteno
        [59, 130, 246],   // azul
        [217, 70, 239],   // magenta
        [34, 211, 238],   // cian
        [255, 255, 255]   // blanco
    ],

    init() {
        if (this.canvas) return;
        this.quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'fondo-epico';
        this.canvas.setAttribute('aria-hidden', 'true');
        document.body.prepend(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.armar();
        window.addEventListener('resize', () => this.armar());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) cancelAnimationFrame(this.raf);
            else this.loop();
        });
        this.loop();
    },

    armar() {
        // Resolución moderada: es un fondo, no hace falta nitidez de pixel.
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        this.w = window.innerWidth;
        this.h = window.innerHeight;
        this.canvas.width = Math.round(this.w * dpr);
        this.canvas.height = Math.round(this.h * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const cant = this.w < 700 ? 5 : 9;
        this.haces = Array.from({ length: cant }, (_, i) => ({
            x: (i + 0.5) / cant,
            fase: Math.random() * Math.PI * 2,
            vel: 0.25 + Math.random() * 0.35,
            amp: 0.35 + Math.random() * 0.35,
            ancho: 0.05 + Math.random() * 0.05,
            color: this.COLORES[i % this.COLORES.length]
        }));

        const nPolvo = this.w < 700 ? 40 : 90;
        this.polvo = Array.from({ length: nPolvo }, () => ({
            x: Math.random() * this.w,
            y: Math.random() * this.h,
            r: Math.random() * 1.6 + 0.3,
            vy: -(Math.random() * 0.18 + 0.04),
            vx: (Math.random() - 0.5) * 0.12,
            a: Math.random() * 0.5 + 0.15
        }));

        this.dibujar();
    },

    loop() {
        cancelAnimationFrame(this.raf);
        if (this.quieto) { this.dibujar(); return; }
        const paso = () => {
            this.t += 0.016;
            this.dibujar();
            this.raf = requestAnimationFrame(paso);
        };
        this.raf = requestAnimationFrame(paso);
    },

    dibujar() {
        const { ctx, w, h, t } = this;

        // Base: noche con un resplandor azul desde abajo
        const fondo = ctx.createLinearGradient(0, 0, 0, h);
        fondo.addColorStop(0, '#070b16');
        fondo.addColorStop(0.6, '#0d1526');
        fondo.addColorStop(1, '#16223f');
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = fondo;
        ctx.fillRect(0, 0, w, h);

        // Haces de luz (se suman entre sí: donde se cruzan brillan más)
        ctx.globalCompositeOperation = 'lighter';
        const largo = h * 1.25;
        this.haces.forEach(b => {
            const origenX = b.x * w;
            const ang = Math.sin(t * b.vel + b.fase) * b.amp + (b.x - 0.5) * -0.5;
            const pulso = 0.75 + 0.25 * Math.sin(t * 1.3 + b.fase * 2);
            const ancho = b.ancho * Math.min(w, 1200);
            const [r, g, bl] = b.color;

            ctx.save();
            ctx.translate(origenX, -20);
            ctx.rotate(ang);
            const gr = ctx.createLinearGradient(0, 0, 0, largo);
            gr.addColorStop(0, `rgba(${r},${g},${bl},${0.34 * pulso})`);
            gr.addColorStop(0.55, `rgba(${r},${g},${bl},${0.09 * pulso})`);
            gr.addColorStop(1, `rgba(${r},${g},${bl},0)`);
            ctx.fillStyle = gr;
            ctx.beginPath();
            ctx.moveTo(-6, 0);
            ctx.lineTo(6, 0);
            ctx.lineTo(ancho * 2.6, largo);
            ctx.lineTo(-ancho * 2.6, largo);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Punto de luz en el cabezal del reflector
            const foco = ctx.createRadialGradient(origenX, 0, 0, origenX, 0, 38);
            foco.addColorStop(0, `rgba(${r},${g},${bl},${0.55 * pulso})`);
            foco.addColorStop(1, `rgba(${r},${g},${bl},0)`);
            ctx.fillStyle = foco;
            ctx.fillRect(origenX - 40, -40, 80, 80);
        });

        // Humo bajo: neblina que respira al pie de la pantalla
        const humo = ctx.createRadialGradient(w * (0.5 + 0.2 * Math.sin(t * 0.2)), h * 1.05, 0, w * 0.5, h * 1.05, h * 0.7);
        humo.addColorStop(0, 'rgba(70,110,190,0.20)');
        humo.addColorStop(1, 'rgba(70,110,190,0)');
        ctx.fillStyle = humo;
        ctx.fillRect(0, 0, w, h);

        // Polvo en suspensión
        ctx.globalCompositeOperation = 'source-over';
        this.polvo.forEach(p => {
            if (!this.quieto) {
                p.x += p.vx + Math.sin(t + p.y * 0.01) * 0.08;
                p.y += p.vy;
                if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
                if (p.x < -5) p.x = w + 5;
                if (p.x > w + 5) p.x = -5;
            }
            ctx.fillStyle = `rgba(255,236,190,${p.a * (0.6 + 0.4 * Math.sin(t * 2 + p.x))})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // Viñeta para que las tarjetas lean bien
        const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.95);
        vig.addColorStop(0, 'rgba(5,8,18,0)');
        vig.addColorStop(1, 'rgba(5,8,18,0.55)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
    }
};
