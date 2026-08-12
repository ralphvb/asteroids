'use strict';

// ── Disparo triple ────────────────────────────────────────────────────────────
// Cada disparo sale en abanico: la bala de siempre más dos laterales abiertas
// ±ABANICO. Ideal para barrer grupos de asteroides.

const TRIPLE_ABANICO = 0.22;   // radianes de apertura de cada bala lateral
const TRIPLE_GUIA    = 21;     // origen de las guías del dibujo (a la altura del morro)

registerPowerUp({
  id: 'disparo-triple', nombre: 'TRIPLE', letra: 'T',
  lados: 3, color: '#fd6', duracion: 10, peso: 1,

  // Por cada bala que llega se añaden dos copias giradas. Se toman la posición y
  // el ángulo de la propia bala —no los de la nave— para no duplicar el morro de
  // `Ship.tryShoot` y para componer con cualquier otro `transformarDisparo`.
  transformarDisparo(balas) {
    const laterales = [];
    for (const b of balas) {
      const angulo = Math.atan2(b.vy, b.vx);
      laterales.push(
        new Bullet(b.x, b.y, angulo - TRIPLE_ABANICO),
        new Bullet(b.x, b.y, angulo + TRIPLE_ABANICO),
      );
    }
    return balas.concat(laterales);
  },

  // Dos guías finas en el morro que marcan la apertura del abanico
  dibujarNave(nave, efecto) {
    // Mismo parpadeo que `Ship.draw` durante la invencibilidad: sin nave, sin guías
    if (nave.invincible > 0 && Math.floor(nave.invincible * 8) % 2 === 0) return;

    const alpha = efecto.restante < 2 && Math.floor(efecto.restante * 8) % 2 === 0 ? 0.15 : 0.55;
    ctx.save();
    ctx.translate(nave.x, nave.y);
    ctx.rotate(nave.angle);
    ctx.strokeStyle = `rgba(255,221,102,${alpha})`;
    ctx.lineWidth   = 1;
    for (const signo of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(TRIPLE_GUIA, 0);
      ctx.lineTo(
        TRIPLE_GUIA + Math.cos(signo * TRIPLE_ABANICO) * 14,
        Math.sin(signo * TRIPLE_ABANICO) * 14,
      );
      ctx.stroke();
    }
    ctx.restore();
  },
});
