# Power-ups — base técnica

Esta rama (`feature/power-ups`) **solo** contiene la infraestructura. Cada power-up se
implementa en su propia subrama a partir de aquí.

## Regla de oro

Una rama hija añade **un archivo nuevo** (`powerups/<id>.js`) y **una línea** en
`index.html`, entre los marcadores `powerups:inicio` / `powerups:fin`. No debe tocar
`game.js` ni `powerups.js`: así cinco ramas paralelas mergean sin conflictos.

Si un power-up necesita algo que la base no expone, se añade el hook a `powerups.js` +
`game.js` **en esta rama padre** y se rebasan las hijas — no se parchea desde la hija.

## Anatomía

- `powerups.js` — registro, ítem recogible (`PowerUpItem`), gestor de efectos activos
  (`powerUps`) y sorteo de drops (`intentarSoltarPowerUp`, 12 % por asteroide destruido).
- `game.js` — llama a los hooks. Los puntos de enganche ya están puestos.
- El ítem se dibuja como polígono regular giratorio que parpadea en sus últimos 3 s, con
  una letra al centro. `lados` y `color` definen su identidad visual.

Ciclo de vida: asteroide destruido → sorteo → `PowerUpItem` a la deriva (12 s) → la nave
lo toca → `powerUps.activar(def)` → si `duracion > 0` entra en `powerUps.activos` y aparece
en el HUD con su barra de tiempo; si `duracion === 0` solo corre `alActivar`.

Los efectos activos se pierden al morir la nave. Los ítems sin recoger se limpian al
cambiar de nivel.

## Contrato de `registerPowerUp`

```js
registerPowerUp({
  id:       'escudo',      // obligatorio y único
  nombre:   'ESCUDO',      // texto del HUD
  letra:    'E',           // letra dentro del ítem
  lados:    6,             // lados del polígono
  color:    '#5cf',
  duracion: 5,             // segundos; 0 = instantáneo
  peso:     1,             // probabilidad relativa frente a los demás
  apilable: false,         // false = recogerlo otra vez reinicia el contador

  // — Hooks, todos opcionales —
  alActivar(juego, efecto) {},          // al recogerlo
  actualizar(dt, juego, efecto) {},     // cada frame mientras dure
  alExpirar(juego, efecto) {},          // al agotarse o terminar

  ajustarNave(stats, efecto) {},        // mutar { rot, thrust, drag, velMax, cadencia }
  transformarDisparo(balas, nave, efecto) { return balas; },
  escalaTiempo(objetivo, efecto) { return 1; }, // 'nave'|'asteroides'|'balas'|'particulas'
  absorbeImpacto(juego, efecto, asteroide) { return false; }, // true = la nave no muere

  dibujarNave(nave, efecto) {},         // dibujo encima de la nave
  dibujarMundo(efecto) {},              // dibujo a pantalla completa
});
```

`efecto` es `{ def, restante, total, datos }`. `datos` es un objeto libre por activación:
guarda ahí cargas, contadores o estado propio. Para terminar antes de tiempo:
`powerUps.terminar('escudo', juego)`.

## El objeto `juego`

Contexto que reciben los hooks. Las listas son *getters* porque `game.js` las reasigna al
filtrar cada frame: **mutarlas in situ** (marcar `dead = true`), nunca reasignarlas.

| Miembro | Uso |
| --- | --- |
| `juego.nave` | la nave |
| `juego.asteroides`, `juego.balas`, `juego.particulas` | listas vivas |
| `juego.nivel`, `juego.puntaje` | lectura |
| `juego.sumarPuntos(n)` | suma al marcador |
| `juego.explotar(x, y, n)` | partículas |
| `juego.desintegrar(a)` | destruye un asteroide **sin partirlo**, con puntos y explosión |

## Probar

`DEBUG_POWERUPS` está en `true` en `powerups.js`: las teclas **1–9** activan el power-up
registrado n-ésimo sin esperar al drop. Sube `PROB_DROP` si quieres probar la recogida real.

## Esqueleto por rama

Los cinco encajan en la base sin ampliarla. Hook principal de cada uno:

| Power-up | Rama | Hook | Figura sugerida |
| --- | --- | --- | --- |
| Escudo temporal (5 s / 1 golpe) | `feature/powerup-escudo` | `absorbeImpacto` + `dibujarNave` | hexágono |
| Disparo triple (10 s) | `feature/powerup-disparo-triple` | `transformarDisparo` | triángulo |
| Slow motion (6 s) | `feature/powerup-slow-motion` | `escalaTiempo('asteroides')` | rombo (4 lados) |
| Bomba Nova (instantáneo) | `feature/powerup-nova` | `alActivar` | octágono |
| Hiperpropulsión (8 s) | `feature/powerup-hiperpropulsion` | `ajustarNave` | pentágono |

Ejemplo completo (`powerups/escudo.js`) — sirve de plantilla:

```js
'use strict';

registerPowerUp({
  id: 'escudo', nombre: 'ESCUDO', letra: 'E',
  lados: 6, color: '#5cf', duracion: 5,

  absorbeImpacto(juego, efecto) {
    juego.explotar(juego.nave.x, juego.nave.y, 10);
    juego.nave.invincible = 1.2;      // respiro tras el impacto
    powerUps.terminar('escudo', juego);
    return true;                       // la nave sobrevive
  },

  dibujarNave(nave, efecto) {
    const alpha = efecto.restante < 1.5 && Math.floor(efecto.restante * 8) % 2 === 0 ? 0.2 : 0.8;
    ctx.save();
    ctx.strokeStyle = `rgba(85,204,255,${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(nave.x, nave.y, nave.radius + 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
});
```

Y su línea en `index.html`:

```html
<script src="powerups/escudo.js"></script>
```

Notas por power-up:

- **Disparo triple**: `transformarDisparo` recibe la bala central ya creada; devuelve las
  tres. Reutiliza `new Bullet(x, y, nave.angle ± 0.22)` calculando el morro igual que
  `Ship.tryShoot`.
- **Slow motion**: devolver `0.5` solo para `objetivo === 'asteroides'` y `1` para el
  resto; la nave conserva su velocidad. Los ítems se mueven con esa misma escala.
- **Bomba Nova**: en `alActivar`, recorrer `juego.asteroides` llamando
  `juego.desintegrar(a)` (no `split()`, la idea es limpiar la pantalla). Con `duracion: 0`
  no aparece en el HUD; usar `peso` bajo (p. ej. `0.4`) para que sea escaso.
- **Hiperpropulsión**: en `ajustarNave`, subir `stats.thrust` y `stats.rot`; `velMax` es
  `Infinity` por defecto, así que solo hace falta tocarlo si se quiere un tope duro.
