/**
 * Cursor Effect: Firefly — Đom Đóm Bay
 *
 * Những chấm xanh vàng nhỏ như đom đóm, bay nhẹ nhàng lên cao
 * rồi tắt dần sau ~1.8s. Nhẹ nhàng và tự nhiên.
 */

import { registerCursorEffect } from "contexts/CursorEffectContext";

const TRAIL_LIFETIME_MS = 1800;
const PARTICLES_PER_BATCH = 2;

const FIREFLY_PALETTE = [
  "#fbbf24", // vàng
  "#a3e635", // xanh lá nhạt
  "#bef264", // xanh lá
  "#fde047", // vàng sáng
  "#fef08a", // vàng kem
];

const MIN_PARTICLE_SIZE = 1.0;
const MAX_PARTICLE_SIZE = 2.2;

class FireflyParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    // Bay lên nhẹ nhàng với góc nghiêng ngẫu nhiên
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2; // chủ yếu đi lên
    const speed = Math.random() * 1.0 + 0.3;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.size = Math.random() * (MAX_PARTICLE_SIZE - MIN_PARTICLE_SIZE) + MIN_PARTICLE_SIZE;
    this.birthTime = performance.now();
    this.maxLife = TRAIL_LIFETIME_MS + Math.random() * 400;

    // Nhấp nháy tự nhiên
    this.flickerPhase = Math.random() * Math.PI * 2;
    this.flickerSpeed = Math.random() * 0.03 + 0.01;
    this.color = FIREFLY_PALETTE[Math.floor(Math.random() * FIREFLY_PALETTE.length)];
  }

  opacity(now) {
    const progress = (now - this.birthTime) / this.maxLife;
    if (progress >= 1) return 0;

    // Fade in nhanh, fade out chậm
    if (progress < 0.1) {
      return progress / 0.1; // fade in
    }
    const fadeOut = 1 - (progress - 0.1) / 0.9;
    const flicker = 0.5 + (0.5 * (Math.sin(this.flickerPhase + now * this.flickerSpeed) + 1)) / 2;
    return fadeOut * flicker;
  }

  isAlive(now) {
    return now - this.birthTime < this.maxLife;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    // Chậm dần, có gió ngẫu nhiên
    this.vx += (Math.random() - 0.5) * 0.03;
    this.vy *= 0.995;
  }

  draw(ctx, now) {
    const op = this.opacity(now);
    if (op <= 0) return;

    ctx.save();
    ctx.globalAlpha = op;

    // Glow lớn
    ctx.shadowBlur = this.size * 12;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    // Lõi trắng sáng
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

const FireflyEffectFactory = (ctx) => {
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
            particles.push(new FireflyParticle(bx, by));
          }
        }
      } else {
        // Di chậm hoặc đứng yên: vẫn tỏa ra vài con
        for (let j = 0; j < PARTICLES_PER_BATCH; j++) {
          particles.push(new FireflyParticle(x, y));
        }
      }

      mouseRef.current.px = mouseRef.current.x;
      mouseRef.current.py = mouseRef.current.y;

      if (particles.length > 2000) {
        particles.splice(0, particles.length - 1600);
      }
    }

    // Fade chậm để đom đóm bay lâu
    context.fillStyle = "rgba(0, 0, 0, 0.08)";
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

registerCursorEffect("firefly", FireflyEffectFactory);
