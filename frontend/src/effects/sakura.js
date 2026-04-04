/**
 * Cursor Effect: Sakura — Cánh Hoa Anh Đào
 *
 * Những cánh hoa hồng nhạt rơi chậm rãi theo con trỏ.
 * Mỗi cánh có hình oval nghiêng, xoay nhẹ và lệch hướng rơi.
 * Fade ~2s.
 */

import { registerCursorEffect } from "contexts/CursorEffectContext";

const TRAIL_LIFETIME_MS = 2000;
const PARTICLES_PER_BATCH = 2;

const SAKURA_PALETTE = [
  "#fda4af", // hồng đào
  "#fecdd3", // hồng nhạt
  "#fce7f3", // hồng phấn
  "#fda4af", // hồng
  "#ffb7c5", // cherry blossom
];

const MIN_PARTICLE_SIZE = 3.0;
const MAX_PARTICLE_SIZE = 6.0;

class SakuraParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    // Rơi chậm, lệch ngang nhẹ
    this.vx = (Math.random() - 0.5) * 0.6;
    this.vy = Math.random() * 0.5 + 0.2; // chủ yếu đi xuống

    this.size = Math.random() * (MAX_PARTICLE_SIZE - MIN_PARTICLE_SIZE) + MIN_PARTICLE_SIZE;
    this.birthTime = performance.now();
    this.maxLife = TRAIL_LIFETIME_MS + Math.random() * 500;
    this.rotation = Math.random() * Math.PI;
    this.rotSpeed = (Math.random() - 0.5) * 0.03;
    this.color = SAKURA_PALETTE[Math.floor(Math.random() * SAKURA_PALETTE.length)];

    // Thuộc tính cánh hoa
    this.widthRatio = 0.5 + Math.random() * 0.3; // bề ngang so với bề dọc
    this.driftPhase = Math.random() * Math.PI * 2;
    this.driftSpeed = Math.random() * 0.02 + 0.01;
  }

  opacity(now) {
    const progress = (now - this.birthTime) / this.maxLife;
    if (progress >= 1) return 0;

    // Fade in nhanh, giữ sáng, fade out chậm
    if (progress < 0.05) return progress / 0.05;
    if (progress > 0.8) return 1 - (progress - 0.8) / 0.2;
    return 1;
  }

  isAlive(now) {
    return now - this.birthTime < this.maxLife;
  }

  update() {
    // Gió ngang dao động
    this.driftPhase += this.driftSpeed;
    const drift = Math.sin(this.driftPhase) * 0.3;

    this.x += this.vx + drift;
    this.y += this.vy;
    this.vx *= 0.99;
    this.vy *= 0.995;
    this.rotation += this.rotSpeed;
  }

  draw(ctx, now) {
    const op = this.opacity(now);
    if (op <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = op;

    // Glow nhẹ
    ctx.shadowBlur = this.size * 1.5;
    ctx.shadowColor = this.color;

    // Vẽ cánh hoa (hình oval)
    const w = this.size * this.widthRatio;
    const h = this.size;

    ctx.fillStyle = this.color;

    // Cánh trước
    ctx.beginPath();
    ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
    ctx.fill();

    // Đường giữa cánh
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.8);
    ctx.lineTo(0, h * 0.8);
    ctx.stroke();

    // Thu hẹp đầu cánh
    ctx.globalAlpha = op * 0.8;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.7, w * 0.2, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

const SakuraEffectFactory = (ctx) => {
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
            particles.push(new SakuraParticle(bx, by));
          }
        }
      } else {
        // Đứng yên: thả cánh hoa tại chỗ
        for (let j = 0; j < PARTICLES_PER_BATCH; j++) {
          particles.push(new SakuraParticle(x, y));
        }
      }

      mouseRef.current.px = mouseRef.current.x;
      mouseRef.current.py = mouseRef.current.y;

      if (particles.length > 1000) {
        particles.splice(0, particles.length - 800);
      }
    }

    // Fade rất chậm để cánh hoa rơi lâu
    context.fillStyle = "rgba(0, 0, 0, 0.05)";
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

registerCursorEffect("sakura", SakuraEffectFactory);
