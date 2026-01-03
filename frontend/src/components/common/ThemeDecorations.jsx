import React, { useEffect, useRef } from "react";

/**
 * ThemeDecorations - Hiển thị các decorations theo theme
 */
const ThemeDecorations = ({ theme }) => {
  const containerRef = useRef(null);
  const intervalRef = useRef(null);
  const fallingFlowerRef = useRef(null);
  const mouseMoveHandlerRef = useRef(null);
  const lastPetalTimeRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Kiểm tra mobile
    const isMobile =
      window.innerWidth <= 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // --- CLEANUP ---
    const cleanup = () => {
      container.innerHTML = "";
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (fallingFlowerRef.current) clearInterval(fallingFlowerRef.current);
      if (mouseMoveHandlerRef.current) {
        document.removeEventListener("mousemove", mouseMoveHandlerRef.current);
      }
    };
    cleanup();

    if (isMobile && theme === "tet") return;

    try {
      if (theme === "tet") {
        // --- A. Cành cây ---
        const createBranches = () => {
          const leftBranch = document.createElement("div");
          leftBranch.className = "tet-branch branch-left";
          container.appendChild(leftBranch);

          const rightBranch = document.createElement("div");
          rightBranch.className = "tet-branch branch-right";
          container.appendChild(rightBranch);
        };
        createBranches();

        // --- HÀM XỬ LÝ KÉO THẢ 360 ĐỘ (LOGIC MỚI) ---
        const attachDragEvent = (element, rope, anchor, originalHeight) => {
          let isDragging = false;

          const startDrag = (e) => {
            isDragging = true;
            e.preventDefault(); // Ngăn scroll trên mobile

            // Tắt animation và transition để kéo mượt theo chuột
            rope.style.animation = "none";
            rope.style.transition = "none";
          };

          const onDrag = (e) => {
            if (!isDragging) return;

            // Lấy vị trí chuột/touch hiện tại
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            // Lấy vị trí điểm neo (Gốc tọa độ)
            const anchorRect = anchor.getBoundingClientRect();
            const anchorX = anchorRect.left + anchorRect.width / 2;
            const anchorY = anchorRect.top; // Điểm trên cùng của dây

            // Tính toán Vector khoảng cách (dx, dy)
            const dx = clientX - anchorX;
            const dy = clientY - anchorY;

            // 1. Tính Góc xoay (Angle)
            // Math.atan2(dy, dx) trả về góc radian so với trục hoành (3 giờ).
            // Trừ 90 độ (PI/2) để đưa về trục tung hướng xuống (6 giờ).
            const angleRad = Math.atan2(dy, dx);
            const angleDeg = (angleRad * 180) / Math.PI - 90;

            // 2. Tính Độ dài dây mới (Length) - Pitago
            // Giới hạn độ dài tối đa để không kéo dây quá dài (max 300px)
            const distance = Math.sqrt(dx * dx + dy * dy);
            const newHeight = Math.min(distance, 300);

            // Chỉ cho phép kéo nếu chuột nằm dưới điểm neo một chút (tránh lật ngược dây lên trời)
            if (dy > -20) {
              rope.style.height = `${Math.max(newHeight, 20)}px`; // Min height 20px
              rope.style.transform = `rotate(${angleDeg}deg)`;
            }
          };

          const endDrag = () => {
            if (!isDragging) return;
            isDragging = false;

            // Hiệu ứng đàn hồi khi thả tay (Snap back)
            rope.style.transition = "all 0.8s cubic-bezier(0.5, -0.5, 0.2, 1.5)"; // Hiệu ứng nảy lò xo

            // Trả về trạng thái ban đầu
            rope.style.height = `${originalHeight}px`;
            rope.style.transform = "rotate(0deg)";

            // Bật lại animation đung đưa sau khi ổn định
            setTimeout(() => {
              rope.style.transition = "";
              rope.style.animation = "";
            }, 800);
          };

          element.addEventListener("mousedown", startDrag);
          element.addEventListener("touchstart", startDrag);
          window.addEventListener("mousemove", onDrag);
          window.addEventListener("mouseup", endDrag);
          window.addEventListener("touchmove", onDrag);
          window.addEventListener("touchend", endDrag);
        };

        // --- B. Lồng đèn (Treo 2 bên) ---
        const createLanterns = () => {
          const totalLanterns = 6;
          for (let i = 0; i < totalLanterns; i++) {
            const isLeft = i < 3;
            const indexInSide = i % 3;
            const sideGap = 4 + indexInSide * 7;
            const initialHeight = isLeft ? [80, 60, 90][indexInSide] : [80, 60, 90][indexInSide];

            const anchor = document.createElement("div");
            anchor.className = "tet-lantern-anchor";
            anchor.style.cssText = `
                    position: fixed; top: 0;
                    ${isLeft ? "left" : "right"}: ${sideGap}%;
                    z-index: 100001;
                `;

            const rope = document.createElement("div");
            rope.className = "tet-lantern-rope";
            rope.style.height = `${initialHeight + Math.random() * 10}px`;
            rope.style.animationDelay = `${Math.random() * 2}s`;

            const lantern = document.createElement("div");
            lantern.className = "tet-lantern-body";
            lantern.textContent = "🏮";
            lantern.style.fontSize = `${30 + Math.random() * 5}px`;

            // Truyền thêm anchor và chiều dài gốc vào hàm xử lý
            const currentHeight = parseFloat(rope.style.height);
            attachDragEvent(lantern, rope, anchor, currentHeight);

            rope.appendChild(lantern);
            anchor.appendChild(rope);

            if (isMobile) anchor.style.display = "none";
            container.appendChild(anchor);
          }
        };

        // --- C. Bao Lì Xì (Treo xen kẽ) ---
        const createRedEnvelopes = () => {
          const positions = [7.5, 14.5];
          ["left", "right"].forEach((side) => {
            positions.forEach((pos) => {
              const anchor = document.createElement("div");
              anchor.className = "tet-lantern-anchor";
              anchor.style.cssText = `
                        position: fixed; top: 0;
                        ${side}: ${pos}%; z-index: 100001;
                    `;
              const rope = document.createElement("div");
              rope.className = "tet-lantern-rope";
              // Random chiều dài dây lì xì
              const initialHeight = 50 + Math.random() * 20;
              rope.style.height = `${initialHeight}px`;
              rope.style.animationDelay = `${Math.random() * 2}s`;

              const envelope = document.createElement("div");
              envelope.className = "tet-red-envelope";
              envelope.innerHTML = `<div class="envelope-body"><span class="gold-text">Tết</span></div>`;

              // Truyền thêm anchor và chiều dài gốc
              attachDragEvent(envelope, rope, anchor, initialHeight);

              rope.appendChild(envelope);
              anchor.appendChild(rope);
              if (isMobile) anchor.style.display = "none";
              container.appendChild(anchor);
            });
          });
        };

        // --- D. Hoa Tĩnh (Floating Flowers) ---
        const createStaticFlowers = () => {
          for (let i = 0; i < 7; i++) {
            const flower = document.createElement("div");
            flower.className = "tet-flower";
            flower.textContent = "🌸";
            flower.style.cssText = `
                    position: fixed;
                    font-size: ${20 + Math.random() * 20}px;
                    left: ${Math.random() * 100}%;
                    top: ${Math.random() * 80}%;
                    opacity: ${0.3 + Math.random() * 0.4};
                    pointer-events: none;
                    z-index: -1;
                    animation: float-peach ${4 + Math.random() * 4}s ease-in-out infinite;
                    animation-delay: ${Math.random() * 2}s;
                `;
            container.appendChild(flower);
          }
        };

        // --- E. Hoa Rơi (Falling Flowers) ---
        const createFallingFlower = () => {
          const petal = document.createElement("div");
          petal.innerHTML = `
              <svg width="20" height="20" viewBox="0 0 100 100" fill="none">
                 <path d="M50 100 C 20 80 0 50 0 30 C 0 10 20 0 40 10 C 45 12 50 20 50 20 C 50 20 55 12 60 10 C 80 0 100 10 100 30 C 100 50 80 80 50 100 Z" 
                 fill="#FFB7C5" />
              </svg>
             `;
          petal.className = "tet-falling-flower";

          const size = 10 + Math.random() * 15;
          const leftPos = Math.random() * 100;
          const duration = 8 + Math.random() * 7;

          petal.style.cssText = `
                position: fixed; top: -20px; left: ${leftPos}%;
                width: ${size}px; height: ${size}px;
                opacity: ${0.6 + Math.random() * 0.4};
                animation: tet-fall ${duration}s linear forwards;
                z-index: 1; pointer-events: none;
             `;
          container.appendChild(petal);
          setTimeout(() => {
            if (petal.parentNode) petal.remove();
          }, duration * 1000);
        };

        // --- F. Hoa theo chuột (Mouse Trail) ---
        const createMousePetal = (x, y) => {
          const petal = document.createElement("div");
          petal.className = "tet-cherry-blossom-mouse";
          petal.innerHTML = `
              <svg width="20" height="20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 100 C 20 80 0 50 0 30 C 0 10 20 0 40 10 C 45 12 50 20 50 20 C 50 20 55 12 60 10 C 80 0 100 10 100 30 C 100 50 80 80 50 100 Z" fill="#FFB7C5" stroke="none" />
              </svg>
             `;
          const size = 12 + Math.random() * 15;
          const duration = 3 + Math.random() * 4;
          const randomX = (Math.random() - 0.5) * 50;
          const fallDistance = 200 + Math.random() * 300;

          petal.style.cssText = `
                position: fixed; width: ${size}px; height: ${size}px;
                left: ${x}px; top: ${y}px;
                opacity: ${0.6 + Math.random() * 0.3};
                pointer-events: none; z-index: 2;
             `;
          petal.style.setProperty("--end-x", `${randomX}px`);
          petal.style.setProperty("--end-y", `${fallDistance}px`);
          petal.style.setProperty("--rotation", `${Math.random() * 360}deg`);
          petal.style.animation = `cherry-blossom-fall-from-mouse ${duration}s ease-out forwards`;

          container.appendChild(petal);
          setTimeout(() => {
            if (petal.parentNode) petal.remove();
          }, duration * 1000);
        };

        if (!isMobile) {
          mouseMoveHandlerRef.current = (e) => {
            const now = Date.now();
            if (now - lastPetalTimeRef.current >= 50) {
              lastPetalTimeRef.current = now;
              createMousePetal(e.clientX, e.clientY);
            }
          };
          document.addEventListener("mousemove", mouseMoveHandlerRef.current);
        }

        // --- G. Pháo hoa ---
        const createFirework = () => {
          const leftPos = 20 + Math.random() * 60;
          const topPos = 10 + Math.random() * 40;
          const firework = document.createElement("div");
          firework.className = "tet-firework";
          firework.style.cssText = `left: ${leftPos}%; top: ${topPos}%;`;

          const center = document.createElement("div");
          center.className = "tet-firework-center";
          firework.appendChild(center);

          const colors = [
            { main: "#fbbf24", trail: "#f59e0b" },
            { main: "#dc2626", trail: "#991b1b" },
            { main: "#ec4899", trail: "#db2777" },
            { main: "#22c55e", trail: "#16a34a" },
            { main: "#3b82f6", trail: "#2563eb" },
            { main: "#a855f7", trail: "#9333ea" },
          ];
          const sparkCount = 12 + Math.floor(Math.random() * 9);
          const angleStep = (360 / sparkCount) * (Math.PI / 180);

          for (let i = 0; i < sparkCount; i++) {
            const angle = i * angleStep;
            const distance = 60 + Math.random() * 40;
            const sparkX = Math.cos(angle) * distance;
            const sparkY = Math.sin(angle) * distance;
            const colorSet = colors[Math.floor(Math.random() * colors.length)];

            const spark = document.createElement("div");
            spark.className = "tet-firework-spark";
            spark.style.cssText = `left: 50%; top: 50%; background: ${colorSet.main}; box-shadow: 0 0 6px ${colorSet.main};`;
            spark.style.setProperty("--spark-x", `${sparkX}px`);
            spark.style.setProperty("--spark-y", `${sparkY}px`);
            firework.appendChild(spark);

            const trail = document.createElement("div");
            trail.className = "tet-firework-trail";
            const trailAngle = (angle * 180) / Math.PI;
            trail.style.cssText = `
                    left: 50%; top: 50%;
                    background: linear-gradient(to bottom, ${colorSet.main} 0%, ${colorSet.trail} 50%, transparent 100%);
                    box-shadow: 0 0 4px ${colorSet.main};
                `;
            trail.style.setProperty("--trail-x", `${sparkX * 0.3}px`);
            trail.style.setProperty("--trail-y", `${sparkY * 0.3}px`);
            trail.style.setProperty("--trail-angle", `${trailAngle}deg`);
            firework.appendChild(trail);
          }

          container.appendChild(firework);
          setTimeout(() => {
            if (firework.parentNode) firework.remove();
          }, 1200);
        };

        // --- INIT TET ---
        createLanterns();
        createRedEnvelopes();
        createStaticFlowers();

        createFirework();
        intervalRef.current = setInterval(() => {
          createFirework();
        }, 2000 + Math.random() * 2000);

        fallingFlowerRef.current = setInterval(() => {
          createFallingFlower();
        }, 2500 + Math.random() * 1000);
      }

      // ===========================
      // 2. THEME CHRISTMAS
      // ===========================
      else if (theme === "christmas") {
        const createLights = () => {
          const wire = document.createElement("div");
          wire.className = "xmas-light-wire";
          for (let i = 0; i < 20; i++) {
            const bulb = document.createElement("div");
            bulb.className = `xmas-bulb color-${i % 4}`;
            bulb.style.animationDelay = `${Math.random()}s`;
            wire.appendChild(bulb);
          }
          container.appendChild(wire);
        };
        const createSnowflake = () => {
          const snowflake = document.createElement("div");
          snowflake.textContent = "❄";
          const size = 5 + Math.random() * 15;
          const leftPos = Math.random() * 100;
          const duration = 5 + Math.random() * 10;
          snowflake.style.cssText = `
                position: fixed; top: -20px; left: ${leftPos}%;
                font-size: ${size}px;
                color: rgba(255, 255, 255, ${0.4 + Math.random() * 0.6});
                animation: xmas-snow-fall ${duration}s linear infinite;
                z-index: ${Math.random() > 0.5 ? 1 : 0}; pointer-events: none;
            `;
          container.appendChild(snowflake);
        };
        const createSanta = () => {
          const santa = document.createElement("div");
          santa.className = "xmas-santa";
          santa.textContent = "🎅🛷🦌";
          container.appendChild(santa);
          setTimeout(() => santa.remove(), 10000);
        };

        if (!isMobile) createLights();
        for (let i = 0; i < (isMobile ? 20 : 50); i++)
          setTimeout(createSnowflake, Math.random() * 5000);
        intervalRef.current = setInterval(() => {
          if (Math.random() > 0.8) createSanta();
        }, 15000);
      }

      // ===========================
      // 3. THEME NEW YEAR
      // ===========================
      else if (theme === "newyear") {
        const createBalloon = () => {
          const balloon = document.createElement("div");
          balloon.className = "ny-balloon";
          balloon.textContent = ["🎈", "🎆", "🥂"][Math.floor(Math.random() * 3)];
          const leftPos = Math.random() * 100;
          const duration = 6 + Math.random() * 6;
          balloon.style.cssText = `
                left: ${leftPos}%; font-size: ${20 + Math.random() * 20}px;
                animation: ny-float-up ${duration}s ease-in forwards;
            `;
          container.appendChild(balloon);
          setTimeout(() => balloon.remove(), duration * 1000);
        };
        const createConfetti = () => {
          const colors = ["#FFD700", "#FF0000", "#00FF00", "#0000FF", "#FF00FF"];
          const conf = document.createElement("div");
          conf.className = "ny-confetti";
          conf.style.cssText = `
                left: ${Math.random() * 100}%; background: ${
            colors[Math.floor(Math.random() * colors.length)]
          };
                animation: ny-confetti-fall ${3 + Math.random() * 2}s linear forwards;
            `;
          container.appendChild(conf);
          setTimeout(() => conf.remove(), 5000);
        };
        const createFloatingText = () => {
          const text = document.createElement("div");
          text.className = "ny-floating-text";
          text.textContent = "2026";
          text.style.left = Math.random() * 80 + 10 + "%";
          container.appendChild(text);
          setTimeout(() => text.remove(), 4000);
        };
        intervalRef.current = setInterval(() => {
          createBalloon();
          createConfetti();
          createConfetti();
          if (Math.random() > 0.95) createFloatingText();
        }, 400);
      }
    } catch (error) {
      console.error("Error ThemeDecorations:", error);
    }
    return cleanup;
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className={`theme-decorations ${theme}-container`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 100001,
        overflow: "hidden",
      }}
    />
  );
};

export default ThemeDecorations;
