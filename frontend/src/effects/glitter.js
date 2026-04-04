/**
 * Cursor Effect: Glitter — Kim Tuyến Lấp Lánh
 *
 * Hiệu ứng kim tuyến Tết: hạt cát vàng/cam trắng lấp lánh.
 * Fade từ đầu → cuối sau ~1 giây (kiểu "đốt dây pháo").
 */

import { registerCursorEffect } from "contexts/CursorEffectContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRAIL_LIFETIME_MS = 1000;
const PARTICLES_PER_BATCH = 3;

const GLITTER_PALETTE = ["#ffd875", "#ffe39f", "#fbbf24", "#f59e0b", "#ffffff", "#fde68a"];

const MIN_PARTICLE_SIZE = 0.5;
const MAX_PARTICLE_SIZE = 2.0;

// ─── Particle ─────────────────────────────────────────────────────────────────

class GlitterParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 1.5 + 0.3;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.size = Math.random() * (MAX_PARTICLE_SIZE - MIN_PARTICLE_SIZE) + MIN_PARTICLE_SIZE;
    this.birthTime = performance.now();
    this.maxLife = TRAIL_LIFETIME_MS;

    this.flickerPhase = Math.random() * Math.PI * 2;
    this.flickerSpeed = Math.random() * 0.08 + 0.04;
    this.color = GLITTER_PALETTE[Math.floor(Math.random() * 4)];
  }

  opacity(now) {
    const age = now - this.birthTime;
    const progress = Math.min(age / this.maxLife, 1);
    const fade = 1 - progress * progress;
    const flicker = (Math.sin(this.flickerPhase + age * this.flickerSpeed) + 1) / 2;
    return fade * (0.4 + flicker * 0.6);
  }

  isAlive(now) {
    return now - this.birthTime < this.maxLife;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.96;
    this.vy *= 0.96;
  }

  draw(ctx, now) {
    const op = this.opacity(now);
    if (op <= 0) return;

    ctx.save();
    ctx.globalAlpha = op;
    ctx.shadowBlur = this.size * 4;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    if (this.size > 1.0) {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 0.5;
      const starSize = this.size * 2.5;
      ctx.beginPath();
      ctx.moveTo(this.x - starSize, this.y);
      ctx.lineTo(this.x + starSize, this.y);
      ctx.moveTo(this.x, this.y - starSize);
      ctx.lineTo(this.x, this.y + starSize);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

const GlitterEffectFactory = (ctx) => {
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
            particles.push(new GlitterParticle(bx, by));
          }
        }
      }

      mouseRef.current.px = mouseRef.current.x;
      mouseRef.current.py = mouseRef.current.y;

      if (particles.length > 1500) {
        particles.splice(0, particles.length - 1200);
      }
    }

    context.fillStyle = "rgba(0, 0, 0, 0.18)";
    context.fillRect(0, 0, c.width, c.height);

    // Filter dead particles
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

registerCursorEffect("glitter", GlitterEffectFactory);
