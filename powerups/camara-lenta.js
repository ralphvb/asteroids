'use strict';

// ── Cámara lenta ──────────────────────────────────────────────────────────────
// Los asteroides (y los ítems a la deriva, que comparten su escala de tiempo)
// se arrastran a la mitad de velocidad mientras la nave, las balas y las
// partículas siguen a ritmo normal. Un respiro en los niveles saturados.

const LENTO_FACTOR = 0.5;    // multiplicador de dt de los asteroides
const LENTO_MARGEN = 2.5;    // separación del marco respecto al borde del canvas

registerPowerUp({
  id: 'camara-lenta', nombre: 'LENTITUD', letra: 'L',
  lados: 4, color: '#9cf', duracion: 6, peso: 1,

  // Solo se frena el mundo: 'nave', 'balas' y 'particulas' conservan su dt.
  escalaTiempo(objetivo) {
    return objetivo === 'asteroides' ? LENTO_FACTOR : 1;
  },

  // Marco tenue pegado al borde: recuerda que el tiempo está alterado sin
  // ensuciar los trazos blancos de las entidades.
  dibujarMundo(efecto) {
    const alpha = efecto.restante < 1.5 && Math.floor(efecto.restante * 8) % 2 === 0 ? 0.12 : 0.4;
    ctx.save();
    ctx.strokeStyle = `rgba(153,204,255,${alpha})`;
    ctx.lineWidth   = 2;
    ctx.strokeRect(
      LENTO_MARGEN, LENTO_MARGEN,
      W - LENTO_MARGEN * 2, H - LENTO_MARGEN * 2,
    );
    ctx.restore();
  },
});
