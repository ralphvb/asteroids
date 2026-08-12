'use strict';

// ── Escudo temporal ───────────────────────────────────────────────────────────
// Rodea la nave con un círculo de energía que absorbe UN impacto de asteroide.
// Dura 5 s o hasta recibir el golpe, lo que ocurra primero.

registerPowerUp({
  id:       'escudo',
  nombre:   'ESCUDO',
  letra:    'E',
  lados:    6,
  color:    '#5cf',
  duracion: 5,
  peso:     1,
  apilable: false,   // recogerlo otra vez reinicia los 5 s

  alActivar(juego, efecto) {
    efecto.datos.pulso = 0;   // fase de la animación del anillo
  },

  actualizar(dt, juego, efecto) {
    efecto.datos.pulso = (efecto.datos.pulso || 0) + dt;
  },

  // Un solo golpe: revienta el asteroide, da un respiro y se apaga
  absorbeImpacto(juego, efecto, asteroide) {
    juego.explotar(juego.nave.x, juego.nave.y, 14);
    if (asteroide) juego.desintegrar(asteroide);
    juego.nave.invincible = 1.2;
    powerUps.terminar('escudo', juego);
    return true;   // la nave sobrevive
  },

  dibujarNave(nave, efecto) {
    const pulso     = efecto.datos.pulso || 0;
    const agotandose = efecto.restante < 1.5;
    // Parpadea en el último segundo y medio para avisar de que se acaba
    const alpha = agotandose && Math.floor(efecto.restante * 8) % 2 === 0 ? 0.2 : 0.8;
    const radio = nave.radius + 9 + Math.sin(pulso * 4) * 1.5;

    ctx.save();
    ctx.strokeStyle = `rgba(85,204,255,${alpha})`;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(nave.x, nave.y, radio, 0, Math.PI * 2);
    ctx.stroke();

    // Halo interior tenue, para que se lea como campo de energía
    ctx.strokeStyle = `rgba(85,204,255,${alpha * 0.35})`;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.arc(nave.x, nave.y, radio - 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
});
