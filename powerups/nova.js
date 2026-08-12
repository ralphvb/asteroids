'use strict';

// ── Bomba Nova ────────────────────────────────────────────────────────────────
// Ítem escaso de un solo uso: al recogerlo detona al instante y desintegra todos
// los asteroides que haya en pantalla en ese momento. No los parte: los borra.
// Al ser instantáneo (`duracion: 0`) no entra en la lista de efectos activos ni
// aparece en el HUD.

registerPowerUp({
  id:       'nova',
  nombre:   'BOMBA NOVA',
  letra:    'N',
  lados:    8,        // octágono
  color:    '#f96',
  duracion: 0,        // instantáneo
  peso:     0.4,      // escaso frente a los power-ups normales (peso 1)

  alActivar(juego) {
    // Destello de la detonación en la propia nave
    juego.explotar(juego.nave.x, juego.nave.y, 26);

    // Copia de la lista: `desintegrar` marca `dead` y game.js la reconstruye
    for (const a of juego.asteroides.slice()) juego.desintegrar(a);
  },
});
