/**
 * Cursor Effect: Crystal — Bông Tuyết
 *
 * Bông tuyết 6 cánh với nhánh phụ. Tối ưu bằng Path2D pre-built.
 * Fade ~1.2s.
 */

import { registerCursorEffect } from "contexts/CursorEffectContext";

const TRAIL_LIFETIME_MS = 1200;
const PARTICLES_PER_BATCH = 3;

const SNOWFLAKE_PALETTE = ["#bae6fd", "#7dd3fc", "#38bdf8", "#e0f2fe", "#f0f9ff"];

const MIN_SIZE = 3.5;
const MAX_SIZE = 6.0;

// ─── Pre-build Path2D cho nhanh ─────────────────────────────────────────────

/**
 * Tạo Path2D cho bông tuyết 6 cánh, 2 cấp nhánh
 */
const buildSnowflakePath = (size, depth) => {
  const path = new Path2D();
  const armLen = size;
  const subLen = armLen * 0.4;
  const subMid = armLen * 0.6;

  for (let i = 0; i < 6; i++) {
    const baseAngle = (Math.PI / 3) * i;

    const endX = Math.sin(baseAngle) * armLen;
    const endY = -Math.cos(baseAngle) * armLen;

    // Cánh chính
    path.moveTo(0, 0);
    path.lineTo(endX, endY);

    if (depth >= 2) {
      // Nhánh V ở 60%
      const mx = Math.sin(baseAngle) * subMid;
      const my = -Math.cos(baseAngle) * subMid;
      const a1 = baseAngle + Math.PI / 5;
      const a2 = baseAngle - Math.PI / 5;

      path.moveTo(mx, my);
      path.lineTo(mx + Math.sin(a1) * subLen, my - Math.cos(a1) * subLen);
      path.moveTo(mx, my);
      path.lineTo(mx + Math.sin(a2) * subLen, my - Math.cos(a2) * subLen);
    }

    if (depth >= 3) {
      // Nhánh đầu mút cho snowflake to
      const ex1 = endX + Math.sin(baseAngle + Math.PI / 3) * subLen * 0.5;
      const ey1 = endY - Math.cos(baseAngle + Math.PI / 3) * subLen * 0.5;
      const ex2 = endX + Math.sin(baseAngle - Math.PI / 3) * subLen * 0.5;
      const ey2 = endY - Math.cos(baseAngle - Math.PI / 3) * subLen * 0.5;

      path.moveTo(endX, endY);
      path.lineTo(ex1, ey1);
      path.moveTo(endX, endY);
      path.lineTo(ex2, ey2);
    }
  }

  return path;
};

class SnowflakeParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 0.6 + 0.1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.size = Math.random() * (MAX_SIZE - MIN_SIZE) + MIN_SIZE;
    this.depth = this.size > 5 ? 3 : 2;
    this.birthTime = performance.now();
    this.maxLife = TRAIL_LIFETIME_MS + Math.random() * 200;
    this.rotation = Math.random() * Math.PI;
    this.rotSpeed = (Math.random() - 0.5) * 0.02;
    this.color = SNOWFLAKE_PALETTE[Math.floor(Math.random() * SNOWFLAKE_PALETTE.length)];

    // Pre-build path — KHÔNG vẽ từng line trong draw()
    this.flakePath = buildSnowflakePath(this.size, this.depth);
    this.coreRadius = this.size * 0.2;
  }

  opacity(now) {
    const progress = (now - this.birthTime) / this.maxLife;
    if (progress >= 1) return 0;
    return (1 - progress * progress) * 0.85 + 0.15;
  }

  isAlive(now) {
    return now - this.birthTime < this.maxLife;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.97;
    this.vy *= 0.97;
    this.rotation += this.rotSpeed;
  }

  draw(ctx, now) {
    const op = this.opacity(now);
    if (op <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = op;

    // Glow
    ctx.shadowBlur = this.size * 2.5;
    ctx.shadowColor = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.size > 5 ? 0.8 : 0.6;
    ctx.lineCap = "round";

    // Vẽ path đã pre-built — chỉ 1 stroke() duy nhất
    ctx.stroke(this.flakePath);

    // Tâm sáng
    ctx.globalAlpha = op * 0.9;
    ctx.shadowBlur = this.size * 4;
    ctx.shadowColor = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, this.coreRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

const CrystalEffectFactory = (ctx) => {
  const particles = [];
  const { canvas, mouseRef, needsEmitRef } = ctx;

  const animate = () => {
    const c = canvas;
    if (!c) return;
    const ctx2 = c.getContext("2d");
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
          for (let j = 0; j < PARTICLES_PER_BATCH; j++) {
            particles.push(new SnowflakeParticle(px + dx * t, py + dy * t));
          }
        }
      }

      mouseRef.current.px = mouseRef.current.x;
      mouseRef.current.py = mouseRef.current.y;

      if (particles.length > 800) {
        particles.splice(0, particles.length - 600);
      }
    }

    ctx2.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx2.fillRect(0, 0, c.width, c.height);

    const alive = particles.filter((p) => p.isAlive(now));
    particles.length = 0;
    alive.forEach((p) => {
      p.update();
      p.draw(ctx2, now);
      particles.push(p);
    });
  };

  ctx.registerAnimation(animate);

  return () => {
    particles.length = 0;
  };
};

registerCursorEffect("crystal", CrystalEffectFactory);
