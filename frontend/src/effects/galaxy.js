/**
 * Cursor Effect: Galaxy — Dải Ngân Hà
 *
 * Hạt tím xanh dương pha chút hồng, vẽ ra những vệt sáng dài
 * như đuôi sao băng vũ trụ. Fade chậm ~1.5s.
 */

import { registerCursorEffect } from "contexts/CursorEffectContext";

const TRAIL_LIFETIME_MS = 1500;
const PARTICLES_PER_BATCH = 3;

const GALAXY_PALETTE = [
  "#a855f7", // tím
  "#7c3aed", // tím đậm
  "#6366f1", // indigo
  "#818cf8", // indigo nhạt
  "#ec4899", // hồng
  "#f472b6", // hồng nhạt
  "#ffffff", // trắng sáng
];

const MIN_PARTICLE_SIZE = 0.8;
const MAX_PARTICLE_SIZE = 2.5;

class GalaxyParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    // Hướng ngược với đuôi (để đuôi hướng về phía di chuyển)
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 1.0 + 0.2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    // Đuôi dài
    this.prevX = x - this.vx * 3;
    this.prevY = y - this.vy * 3;

    this.size = Math.random() * (MAX_PARTICLE_SIZE - MIN_PARTICLE_SIZE) + MIN_PARTICLE_SIZE;
    this.birthTime = performance.now();
    this.maxLife = TRAIL_LIFETIME_MS + Math.random() * 300;
    this.flickerPhase = Math.random() * Math.PI * 2;
    this.flickerSpeed = Math.random() * 0.04 + 0.02;
    this.color = GALAXY_PALETTE[Math.floor(Math.random() * GALAXY_PALETTE.length)];
    this.trailAlpha = 0.3 + Math.random() * 0.3;
  }

  opacity(now) {
    const progress = (now - this.birthTime) / this.maxLife;
    if (progress >= 1) return 0;
    const fade = 1 - progress;
    const flicker = 0.6 + (0.4 * (Math.sin(this.flickerPhase + now * this.flickerSpeed) + 1)) / 2;
    return fade * flicker;
  }

  isAlive(now) {
    return now - this.birthTime < this.maxLife;
  }

  update() {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.97;
    this.vy *= 0.97;
  }

  draw(ctx, now) {
    const op = this.opacity(now);
    if (op <= 0) return;

    ctx.save();
    ctx.globalAlpha = op * this.trailAlpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.size * 0.6;
    ctx.lineCap = "round";
    ctx.shadowBlur = this.size * 8;
    ctx.shadowColor = this.color;

    // Đuôi sao băng
    ctx.beginPath();
    ctx.moveTo(this.prevX, this.prevY);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();

    // Đầu sáng
    ctx.globalAlpha = op;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    // Lõi trắng
    ctx.globalAlpha = op * 0.8;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

const GalaxyEffectFactory = (ctx) => {
  const particles = [];
  const { canvas, mouseRef, needsEmitRef } = ctx;

  const animate = () => {
    const c = canvas;
    if (!c) return;
    const context = c.getContext("2d");
    const now = performance.now();

    if (needsEmitRef.current) {
      needsEmitRef.current = false;

      const { x, y, px, py } = mouseRef.current;
      const dx = x - px;
      const dy = y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= 3) {
        const batches = 5;
        for (let i = 1; i <= batches; i++) {
          const t = i / (batches + 1);
          const bx = px + dx * t;
          const by = py + dy * t;
          for (let j = 0; j < PARTICLES_PER_BATCH; j++) {
            particles.push(new GalaxyParticle(bx, by));
          }
        }
      }

      mouseRef.current.px = mouseRef.current.x;
      mouseRef.current.py = mouseRef.current.y;

      if (particles.length > 1500) {
        particles.splice(0, particles.length - 1200);
      }
    }

    // Fade overlay mạnh hơn vì đuôi dài
    context.fillStyle = "rgba(0, 0, 0, 0.15)";
    context.fillRect(0, 0, c.width, c.height);

    const alive = particles.filter((p) => p.isAlive(now));
    particles.length = 0;
    alive.forEach((p) => {
      p.update();
      p.draw(context, now);
      particles.push(p);
    });
  };

  ctx.registerAnimation(animate);

  return () => {
    particles.length = 0;
  };
};

registerCursorEffect("galaxy", GalaxyEffectFactory);
