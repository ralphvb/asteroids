'use strict';

// ── Escudo temporal ───────────────────────────────────────────────────────────
// Rodea la nave con un círculo de energía que absorbe UN impacto de asteroide.
// Dura 5 s o hasta recibir el golpe, lo que ocurra primero.
//
// El anillo no es sólo decorativo: lo que lo toca se desintegra ahí mismo, sin
// esperar a que llegue al casco. Así lo que se ve coincide con lo que pasa.

const ESCUDO_HOLGURA  = 9;      // separación entre el casco y el anillo
const ESCUDO_LATIDO   = 1.5;    // amplitud del pulso del anillo
const ESCUDO_DESCARGA = 0.28;   // duración del destello al absorber (s)
const ESCUDO_RESPIRO  = 1.2;    // invencibilidad regalada tras el golpe (s)

// Radio efectivo del campo. Lo comparten el dibujo y la detección para que no
// se separen nunca.
function radioEscudo(nave, pulso) {
  return nave.radius + ESCUDO_HOLGURA + Math.sin(pulso * 4) * ESCUDO_LATIDO;
}

// Consume la única carga del escudo contra un asteroide y arranca el destello.
function absorberConEscudo(juego, efecto, asteroide) {
  const nave = juego.nave;

  // Las partículas salen del punto de contacto, no del centro de la nave
  let px = nave.x;
  let py = nave.y;
  if (asteroide) {
    const dx = asteroide.x - nave.x;
    const dy = asteroide.y - nave.y;
    const d  = Math.hypot(dx, dy) || 1;
    const r  = radioEscudo(nave, efecto.datos.pulso || 0);
    px = nave.x + (dx / d) * r;
    py = nave.y + (dy / d) * r;
  }

  juego.explotar(px, py, 14);
  if (asteroide) juego.desintegrar(asteroide);
  nave.invincible = ESCUDO_RESPIRO;

  efecto.datos.cargas   = 0;
  efecto.datos.descarga = ESCUDO_DESCARGA;
  // El efecto sigue vivo lo justo para dibujar el destello; se asegura de que
  // el temporizador no lo expire antes de tiempo.
  efecto.restante = Math.max(efecto.restante, ESCUDO_DESCARGA);
}

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
    // El pulso NO se reinicia: al refrescar el escudo el latido sigue su curso
    efecto.datos.pulso    = efecto.datos.pulso || 0;
    efecto.datos.cargas   = 1;
    efecto.datos.descarga = 0;
  },

  actualizar(dt, juego, efecto) {
    const datos = efecto.datos;
    datos.pulso = (datos.pulso || 0) + dt;

    // Fase de destello: al terminar, el escudo se apaga
    if (datos.descarga > 0) {
      datos.descarga -= dt;
      if (datos.descarga <= 0) powerUps.terminar(efecto.def.id, juego);
      return;
    }

    if (datos.cargas <= 0 || juego.nave.dead) return;

    // Lo que roza el anillo muere ahí. Corre antes del filtro de asteroides de
    // game.js, así que el desintegrado desaparece en este mismo frame.
    const radio = radioEscudo(juego.nave, datos.pulso);
    for (const a of juego.asteroides) {
      if (!a.dead && dist(juego.nave, a) < radio + a.radius) {
        absorberConEscudo(juego, efecto, a);
        return;
      }
    }
  },

  // Red de seguridad: `dist` no es toroidal, así que un asteroide que cruza el
  // borde junto a la nave puede llegar al casco sin haber tocado el anillo.
  absorbeImpacto(juego, efecto, asteroide) {
    if (efecto.datos.cargas <= 0) return false;   // escudo ya gastado
    absorberConEscudo(juego, efecto, asteroide);
    return true;   // la nave sobrevive
  },

  dibujarNave(nave, efecto) {
    const pulso = efecto.datos.pulso || 0;
    const radio = radioEscudo(nave, pulso);

    // Destello de choque: anillo que crece y se desvanece
    if (efecto.datos.descarga > 0) {
      const t = 1 - efecto.datos.descarga / ESCUDO_DESCARGA;
      ctx.save();
      ctx.strokeStyle = `rgba(85,204,255,${(0.9 * (1 - t)).toFixed(2)})`;
      ctx.lineWidth   = 2.5 * (1 - t) + 0.5;
      ctx.beginPath();
      ctx.arc(nave.x, nave.y, radio * (1 + 1.2 * t), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Si la nave está oculta por su parpadeo de invencibilidad, el aro también:
    // misma condición que Ship.draw() en game.js.
    if (nave.invincible > 0 && Math.floor(nave.invincible * 8) % 2 === 0) return;

    // Parpadea en el último segundo y medio para avisar de que se acaba
    const agotandose = efecto.restante < 1.5;
    const alpha = agotandose && Math.floor(efecto.restante * 8) % 2 === 0 ? 0.2 : 0.8;

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
