'use strict';

// ── Hiperpropulsión ───────────────────────────────────────────────────────────
// Sube drásticamente aceleración y giro durante 8 s, con un tope duro de
// velocidad para que la nave siga siendo precisa al esquivar.

const HIPER_ESTELA = 12;   // puntos que recuerda la estela

registerPowerUp({
  id: 'hiperpropulsion', nombre: 'HIPERPROPULSION', letra: 'H',
  lados: 5, color: '#ffb347', duracion: 8,

  // Valores base de la nave: rot 3.5, thrust 260, drag 0.987, velMax Infinity
  ajustarNave(stats, efecto) {
    stats.thrust *= 2.6;    // aceleración brutal
    stats.rot    *= 1.35;   // sin más giro, la aceleración es ingobernable
    stats.drag    = 0.978;  // frena algo antes: cambios de rumbo más nítidos
    stats.velMax  = 520;    // tope duro; sin él el efecto se vuelve un rebote
  },

  actualizar(dt, juego, efecto) {
    const estela = efecto.datos.estela || (efecto.datos.estela = []);
    estela.unshift({ x: juego.nave.x, y: juego.nave.y });
    if (estela.length > HIPER_ESTELA) estela.length = HIPER_ESTELA;
  },

  dibujarNave(nave, efecto) {
    const estela = efecto.datos.estela;
    if (!estela || estela.length < 2) return;

    // Parpadeo de aviso en el último segundo y medio
    const apagado = efecto.restante < 1.5 && Math.floor(efecto.restante * 8) % 2 === 0;
    const base    = apagado ? 0.25 : 0.9;

    ctx.save();
    ctx.lineWidth = 2;
    ctx.lineCap   = 'round';
    for (let i = 0; i < estela.length - 1; i++) {
      const a = estela[i];
      const b = estela[i + 1];

      // Las posiciones envuelven por los bordes: un salto largo significa que
      // el segmento cruzaría toda la pantalla, así que se omite.
      if (Math.abs(a.x - b.x) > W / 2 || Math.abs(a.y - b.y) > H / 2) continue;

      const alpha = base * (1 - i / (estela.length - 1));
      ctx.strokeStyle = `rgba(255,179,71,${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  },
});
