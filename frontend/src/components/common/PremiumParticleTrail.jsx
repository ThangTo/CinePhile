/**
 * PremiumParticleTrail
 *
 * Hiệu ứng kim tuyến Tết khi di chuột — CHỈ dành cho tài khoản Premium.
 * Con trỏ vẽ ra các nét cát màu vàng/lửa lấp lánh.
 * Nét vẽ biến mất từ đầu → cuối sau ~1 giây (kiểu "đốt dây pháo").
 *
 * Màu chủ đạo Tết: vàng #ffd875, cam #f59e0b, trắng #ffffff
 */

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "contexts/AuthContext";
import { isPremiumActive } from "utils/premiumUtils";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Thời gian (ms) để nét vẽ biến mất hoàn toàn kể từ lúc được tạo */
const TRAIL_LIFETIME_MS = 1000;

/** Số hạt kim tuyến được tạo mỗi lần emit */
const PARTICLES_PER_BATCH = 3;

/** Xác suất (0–1) mỗi batch có màu "đỏ may mắn" Tết */
const LUCKY_RED_CHANCE = 0; // Đỏ đã ẩn

/** Bảng màu kim tuyến Tết — vàng → cam → trắng */
const GLITTER_PALETTE = [
  "#ffd875", // vàng gold
  "#ffe39f", // vàng nhạt
  "#fbbf24", // amber
  "#f59e0b", // cam
  "#ffffff", // trắng lấp lánh
  "#fde68a", // vàng kem
];

/** Kích thước hạt kim tuyến */
const MIN_PARTICLE_SIZE = 0.5;
const MAX_PARTICLE_SIZE = 2.0;

// ─── Particle ─────────────────────────────────────────────────────────────────

class GlitterParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    // Vận tốc ban đầu — nhẹ nhàng tỏa ra
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 1.5 + 0.3;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.size = Math.random() * (MAX_PARTICLE_SIZE - MIN_PARTICLE_SIZE) + MIN_PARTICLE_SIZE;
    this.birthTime = performance.now();
    this.maxLife = TRAIL_LIFETIME_MS;

    // Chu kỳ nhấp nháy riêng
    this.flickerPhase = Math.random() * Math.PI * 2;
    this.flickerSpeed = Math.random() * 0.08 + 0.04;

    // Màu sắc: ưu tiên vàng/cam
    this.color =
      Math.random() < LUCKY_RED_CHANCE
        ? GLITTER_PALETTE[GLITTER_PALETTE.length - 3] // đỏ (không bao giờ chọn vì LUCKY_RED_CHANCE = 0)
        : GLITTER_PALETTE[Math.floor(Math.random() * 4)]; // vàng/cam/trắng
  }

  /**
   * Tính opacity còn lại theo tuổi thọ.
   * Fade out nhanh ở cuối đời, để lại vệt mờ trước khi biến mất.
   */
  opacity(now) {
    const age = now - this.birthTime;
    const progress = Math.min(age / this.maxLife, 1);
    const fade = 1 - progress * progress; // ease-out quadratic
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

    // Glow effect
    ctx.shadowBlur = this.size * 4;
    ctx.shadowColor = this.color;

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    // Thêm "sao" lấp lánh 4 cánh cho hạt lớn hơn một chút
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

// ─── Component ───────────────────────────────────────────────────────────────

const PremiumParticleTrail = () => {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);

  // mouseRef: lưu vị trí frame trước — chỉ được ghi bởi mousemove, đọc bởi RAF
  const mouseRef = useRef({ x: 0, y: 0, px: 0, py: 0 });
  // needsEmit: cờ — mousemove bật, RAF tắt và emit
  const needsEmitRef = useRef(false);

  // ── Canvas setup ────────────────────────────────────────────────────────────

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  // ── Render loop — emit + draw gộp vào đây, chạy đúng 60fps ──────────────

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const now = performance.now();

    // Nếu có di chuyển → emit particles từ vị trí cũ → mới
    if (needsEmitRef.current) {
      needsEmitRef.current = false;

      const { x, y, px, py } = mouseRef.current;
      const dx = x - px;
      const dy = y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= 3) {
        // Chỉ emit tối đa 5 batches bất kể tốc độ di chuột
        const batches = 5;
        for (let i = 1; i <= batches; i++) {
          const t = i / (batches + 1);
          const bx = px + dx * t;
          const by = py + dy * t;
          for (let j = 0; j < PARTICLES_PER_BATCH; j++) {
            particlesRef.current.push(new GlitterParticle(bx, by));
          }
        }
      }

      // Cập nhật vị trí "cũ" sau khi emit
      mouseRef.current.px = mouseRef.current.x;
      mouseRef.current.py = mouseRef.current.y;

      // Giới hạn tổng hạt
      if (particlesRef.current.length > 1500) {
        particlesRef.current = particlesRef.current.slice(-1200);
      }
    }

    // Fade overlay — giữ vệt visible khoảng 1s
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cập nhật và vẽ từng hạt
    particlesRef.current = particlesRef.current.filter((p) => p.isAlive(now));
    for (const p of particlesRef.current) {
      p.update();
      p.draw(ctx, now);
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isPremiumActive(user)) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    rafRef.current = requestAnimationFrame(animate);

    // mousemove CHỈ bật cờ — không làm gì khác
    const onMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      needsEmitRef.current = true;
    };

    const onTouchMove = (e) => {
      const t = e.touches[0];
      mouseRef.current.x = t.clientX;
      mouseRef.current.y = t.clientY;
      needsEmitRef.current = true;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [user, resizeCanvas, animate]);

  if (!user || !isPremiumActive(user)) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 99998,
        mixBlendMode: "screen",
      }}
      aria-hidden="true"
    />
  );
};

export default PremiumParticleTrail;
