'use strict';

// ── Base técnica de power-ups ─────────────────────────────────────────────────
// Este archivo es la infraestructura COMPARTIDA. Las ramas hijas no deberían
// tocarlo: cada power-up vive en su propio `powerups/<id>.js` y se registra con
// `registerPowerUp({...})`. Ver docs/POWERUPS.md para el contrato completo.

// Con true, las teclas Digit1..Digit9 activan el power-up registrado n-ésimo.
// Ayuda a probar un efecto sin esperar a que caiga del cielo.
const DEBUG_POWERUPS = true;

// Probabilidad de que un asteroide destruido suelte un ítem
const PROB_DROP = 0.12;

// ── Registro ──────────────────────────────────────────────────────────────────
const POWERUPS = [];

function registerPowerUp(def) {
  if (!def || !def.id) throw new Error('registerPowerUp: falta el id');
  if (POWERUPS.some(p => p.id === def.id))
    throw new Error(`registerPowerUp: id duplicado "${def.id}"`);

  POWERUPS.push(Object.assign({
    nombre:    def.id.toUpperCase(),
    letra:     def.id[0].toUpperCase(),
    lados:     6,       // lados del polígono del ítem
    color:     '#fff',
    duracion:  0,       // 0 = efecto instantáneo, no entra en la lista de activos
    peso:      1,       // probabilidad relativa frente a los demás power-ups
    apilable:  false,   // si ya está activo: false = reinicia el tiempo restante
  }, def));
}

function powerUpPorId(id) {
  return POWERUPS.find(p => p.id === id) || null;
}

// Elige un power-up al azar respetando `peso`
function powerUpAleatorio() {
  if (POWERUPS.length === 0) return null;
  const total = POWERUPS.reduce((s, p) => s + p.peso, 0);
  let r = Math.random() * total;
  for (const p of POWERUPS) {
    r -= p.peso;
    if (r <= 0) return p;
  }
  return POWERUPS[POWERUPS.length - 1];
}

// ── Ítem recogible ────────────────────────────────────────────────────────────
// Figura geométrica giratoria que parpadea antes de desaparecer, en la línea
// wireframe del resto del juego.
class PowerUpItem {
  constructor(x, y, def) {
    this.x   = x;
    this.y   = y;
    this.def = def;

    const angle = rand(0, Math.PI * 2);
    const speed = rand(18, 42);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.rot      = rand(0, Math.PI * 2);
    this.rotSpeed = rand(-1.6, 1.6);
    this.radius   = 13;
    this.vida     = 12;    // segundos en pantalla
    this.ttl      = this.vida;
    this.dead     = false;
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  // Parpadea en los últimos 3 segundos
  get visible() {
    return this.ttl > 3 || Math.floor(this.ttl * 6) % 2 === 0;
  }

  draw() {
    if (!this.visible) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = this.def.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    dibujarPoligono(this.def.lados, this.radius);
    ctx.stroke();
    ctx.restore();

    // La letra no gira, para que siempre se lea
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = this.def.color;
    ctx.font      = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.def.letra, 0, 1);
    ctx.restore();
  }
}

// Traza un polígono regular centrado en el origen (no hace stroke/fill)
function dibujarPoligono(lados, radio) {
  ctx.beginPath();
  for (let i = 0; i < lados; i++) {
    const a = -Math.PI / 2 + (i / lados) * Math.PI * 2;
    const px = Math.cos(a) * radio;
    const py = Math.sin(a) * radio;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// ── Gestor de efectos activos ─────────────────────────────────────────────────
// Un "efecto" es { def, restante, total, datos }. `datos` es un objeto libre
// donde cada power-up guarda su estado propio (cargas, contadores, etc.).
const powerUps = {
  activos: [],

  reset() {
    this.activos.length = 0;
  },

  activo(id) {
    return this.activos.find(e => e.def.id === id) || null;
  },

  // Activa un power-up por id. `juego` es el contexto que expone game.js.
  activar(id, juego) {
    const def = typeof id === 'string' ? powerUpPorId(id) : id;
    if (!def) return null;

    let efecto = null;
    if (def.duracion > 0) {
      const previo = this.activo(def.id);
      if (previo && !def.apilable) {
        // Refrescar en vez de duplicar
        previo.restante = def.duracion;
        previo.total    = def.duracion;
        efecto = previo;
      } else {
        efecto = { def, restante: def.duracion, total: def.duracion, datos: {} };
        this.activos.push(efecto);
      }
    } else {
      efecto = { def, restante: 0, total: 0, datos: {} };
    }

    if (def.alActivar) def.alActivar(juego, efecto);
    return efecto;
  },

  // Termina un efecto antes de tiempo (lo usa, p. ej., el escudo al absorber)
  terminar(id, juego) {
    const efecto = this.activo(id);
    if (!efecto) return;
    efecto.restante = 0;
    this.expirar(efecto, juego);
  },

  expirar(efecto, juego) {
    const i = this.activos.indexOf(efecto);
    if (i === -1) return;
    this.activos.splice(i, 1);
    if (efecto.def.alExpirar) efecto.def.alExpirar(juego, efecto);
  },

  update(dt, juego) {
    for (const efecto of this.activos.slice()) {
      efecto.restante -= dt;
      if (efecto.def.actualizar) efecto.def.actualizar(dt, juego, efecto);
      if (efecto.restante <= 0) this.expirar(efecto, juego);
    }
  },

  // ── Hooks consultados por game.js ───────────────────────────────────────────

  // Deja que cada efecto modifique las constantes de la nave (mutar `stats`)
  statsNave(stats) {
    for (const efecto of this.activos)
      if (efecto.def.ajustarNave) efecto.def.ajustarNave(stats, efecto);
    return stats;
  },

  // Cada efecto puede reemplazar la lista de balas del disparo
  transformarDisparo(balas, nave) {
    for (const efecto of this.activos)
      if (efecto.def.transformarDisparo)
        balas = efecto.def.transformarDisparo(balas, nave, efecto) || balas;
    return balas;
  },

  // Multiplicador de dt por objetivo: 'nave' | 'asteroides' | 'balas' | 'particulas'
  escalaTiempo(objetivo) {
    let escala = 1;
    for (const efecto of this.activos)
      if (efecto.def.escalaTiempo)
        escala *= efecto.def.escalaTiempo(objetivo, efecto);
    return escala;
  },

  // Devuelve true si algún efecto absorbe el impacto y la nave NO debe morir
  intentarAbsorber(juego, asteroide) {
    for (const efecto of this.activos)
      if (efecto.def.absorbeImpacto && efecto.def.absorbeImpacto(juego, efecto, asteroide))
        return true;
    return false;
  },

  // Dibujo encima de la nave (escudo, estela, etc.)
  dibujarNave(nave) {
    for (const efecto of this.activos)
      if (efecto.def.dibujarNave) efecto.def.dibujarNave(nave, efecto);
  },

  // Dibujo a pantalla completa (destellos, tintes)
  dibujarMundo() {
    for (const efecto of this.activos)
      if (efecto.def.dibujarMundo) efecto.def.dibujarMundo(efecto);
  },

  // HUD: icono + barra de tiempo restante, apilados abajo a la izquierda
  dibujarHUD() {
    let y = H - 20;
    for (const efecto of this.activos) {
      const { def } = efecto;

      ctx.save();
      ctx.translate(22, y - 5);
      ctx.strokeStyle = def.color;
      ctx.lineWidth   = 1.2;
      ctx.lineJoin    = 'round';
      dibujarPoligono(def.lados, 8);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle    = def.color;
      ctx.font         = '11px monospace';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(def.nombre, 38, y - 8);

      // Barra de tiempo restante
      const ANCHO = 90;
      const frac  = Math.max(0, efecto.restante / efecto.total);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth   = 1;
      ctx.strokeRect(38.5, y - 4.5, ANCHO, 4);
      ctx.fillStyle = def.color;
      ctx.fillRect(39, y - 4, (ANCHO - 1) * frac, 3);

      y -= 26;
    }
  },
};

// ── Drops ─────────────────────────────────────────────────────────────────────
// Llamado por game.js cuando una bala destruye un asteroide.
function intentarSoltarPowerUp(x, y) {
  if (POWERUPS.length === 0) return null;
  if (Math.random() > PROB_DROP) return null;
  const def = powerUpAleatorio();
  return def ? new PowerUpItem(x, y, def) : null;
}
