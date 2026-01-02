import React, { useEffect, useRef } from "react";

/**
 * ThemeDecorations - Hiển thị các decorations theo theme
 */
const ThemeDecorations = ({ theme }) => {
  const containerRef = useRef(null);
  const intervalRef = useRef(null);
  const cherryBlossomIntervalRef = useRef(null);
  const mouseMoveHandlerRef = useRef(null);
  const lastPetalTimeRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Clear existing decorations và intervals
    container.innerHTML = "";
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (cherryBlossomIntervalRef.current) {
      clearInterval(cherryBlossomIntervalRef.current);
      cherryBlossomIntervalRef.current = null;
    }
    if (mouseMoveHandlerRef.current) {
      document.removeEventListener("mousemove", mouseMoveHandlerRef.current);
      mouseMoveHandlerRef.current = null;
    }

    if (theme === "tet") {
      // Tạo hoa đào floating
      for (let i = 0; i < 5; i++) {
        const flower = document.createElement("div");
        flower.className = "tet-flower";
        flower.textContent = "🌸";
        flower.style.cssText = `
          position: fixed;
          font-size: ${20 + Math.random() * 20}px;
          left: ${Math.random() * 100}%;
          top: ${Math.random() * 50}%;
          opacity: ${0.2 + Math.random() * 0.3};
          pointer-events: none;
          z-index: 1;
          animation: float-peach ${4 + Math.random() * 4}s ease-in-out infinite;
          animation-delay: ${Math.random() * 2}s;
        `;
        container.appendChild(flower);
      }

      // Tạo cánh hoa anh đào rơi (SVG)
      const createCherryBlossom = () => {
        const petal = document.createElement("div");
        petal.className = "tet-cherry-blossom";
        petal.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 100 
                     C 20 80 0 50 0 30 
                     C 0 10 20 0 40 10 
                     C 45 12 50 20 50 20 
                     C 50 20 55 12 60 10 
                     C 80 0 100 10 100 30 
                     C 100 50 80 80 50 100 Z" 
                  fill="#FFB7C5" stroke="none" />
          </svg>
        `;
        const size = 15 + Math.random() * 20; // 15-35px
        const leftPos = Math.random() * 100; // Random horizontal position
        const duration = 8 + Math.random() * 7; // 8-15 seconds
        const delay = Math.random() * 5; // Random delay 0-5 seconds

        petal.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          left: ${leftPos}%;
          top: -50px;
          opacity: ${0.4 + Math.random() * 0.4};
          animation-duration: ${duration}s;
          animation-delay: ${delay}s;
        `;
        container.appendChild(petal);

        // Remove petal after animation completes
        setTimeout(() => {
          if (petal.parentNode) {
            petal.parentNode.removeChild(petal);
          }
        }, (duration + delay) * 1000);
      };

      // Tạo cánh hoa liên tục
      cherryBlossomIntervalRef.current = setInterval(() => {
        if (container.parentNode) {
          createCherryBlossom();
        } else {
          if (cherryBlossomIntervalRef.current) {
            clearInterval(cherryBlossomIntervalRef.current);
            cherryBlossomIntervalRef.current = null;
          }
        }
      }, 800); // Tạo cánh hoa mới mỗi 0.8 giây

      // Tạo một số cánh hoa ban đầu
      for (let i = 0; i < 8; i++) {
        setTimeout(() => createCherryBlossom(), i * 500);
      }

      // Tạo cánh hoa theo con trỏ chuột
      const createMousePetal = (x, y) => {
        const petal = document.createElement("div");
        petal.className = "tet-cherry-blossom-mouse";
        petal.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 100 
                     C 20 80 0 50 0 30 
                     C 0 10 20 0 40 10 
                     C 45 12 50 20 50 20 
                     C 50 20 55 12 60 10 
                     C 80 0 100 10 100 30 
                     C 100 50 80 80 50 100 Z" 
                  fill="#FFB7C5" stroke="none" />
          </svg>
        `;
        const size = 12 + Math.random() * 15; // 12-27px
        const duration = 3 + Math.random() * 4; // 3-7 seconds
        const randomX = (Math.random() - 0.5) * 50; // -25px to 25px (di chuyển ngang khi rơi)
        const fallDistance = 200 + Math.random() * 300; // 200-500px rơi xuống

        petal.style.cssText = `
          position: fixed;
          width: ${size}px;
          height: ${size}px;
          left: ${x}px;
          top: ${y}px;
          opacity: ${0.6 + Math.random() * 0.3};
          pointer-events: none;
          z-index: 2;
        `;
        petal.style.setProperty("--start-x", "0px");
        petal.style.setProperty("--start-y", "0px");
        petal.style.setProperty("--end-x", `${randomX}px`);
        petal.style.setProperty("--end-y", `${fallDistance}px`);
        petal.style.setProperty("--rotation", `${Math.random() * 360}deg`);
        petal.style.animation = `cherry-blossom-fall-from-mouse ${duration}s ease-out forwards`;
        container.appendChild(petal);

        // Remove petal after animation completes
        setTimeout(() => {
          if (petal.parentNode) {
            petal.parentNode.removeChild(petal);
          }
        }, duration * 1000);
      };

      // Throttle để không tạo quá nhiều cánh hoa
      mouseMoveHandlerRef.current = (e) => {
        const now = Date.now();
        // Tạo cánh hoa mỗi 50ms (20 lần/giây)
        if (now - lastPetalTimeRef.current >= 50) {
          lastPetalTimeRef.current = now;
          createMousePetal(e.clientX, e.clientY);
        }
      };

      document.addEventListener("mousemove", mouseMoveHandlerRef.current);

      //   // Tạo hoa mai màu vàng (SVG)
      //   for (let i = 0; i < 8; i++) {
      //     const maiFlower = document.createElement("div");
      //     maiFlower.className = "tet-mai-flower";
      //     maiFlower.innerHTML = `
      //       <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      //         <path d="M50 50 C50 20 70 20 70 50 C90 50 90 70 65 65 C75 85 55 90 50 70 C45 90 25 85 35 65 C10 70 10 50 30 50 C30 20 50 20 50 50 Z"
      //               fill="#FFD700" stroke="#FFA500" stroke-width="2"/>
      //         <circle cx="50" cy="55" r="5" fill="#FF4500" />
      //       </svg>
      //     `;
      //     maiFlower.style.cssText = `
      //       position: fixed;
      //       width: ${20 + Math.random() * 20}px;
      //       height: ${20 + Math.random() * 20}px;
      //       left: ${Math.random() * 100}%;
      //       top: ${Math.random() * 60}%;
      //       opacity: ${0.4 + Math.random() * 0.5};
      //       pointer-events: none;
      //       z-index: 1;
      //       animation: float-mai ${5 + Math.random() * 3}s ease-in-out infinite;
      //       animation-delay: ${Math.random() * 2.5}s;
      //       filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.7)) drop-shadow(0 0 12px rgba(255, 165, 0, 0.4));
      //     `;
      //     container.appendChild(maiFlower);
      //   }

      //   // Tạo cành mai ở góc màn hình với hoa mai
      //   const corners = [
      //     { left: "0%", top: "70%", angle: 45 }, // Góc dưới trái
      //     { left: "100%", top: "70%", angle: 135 }, // Góc dưới phải
      //     { left: "0%", top: "85%", angle: 30 }, // Góc dưới trái thứ 2
      //   ];

      //   corners.forEach((corner, i) => {
      //     // Tạo cành (đường thẳng màu nâu)
      //     const branch = document.createElement("div");
      //     branch.className = "tet-mai-branch";
      //     branch.style.cssText = `
      //       position: fixed;
      //       left: ${corner.left};
      //       top: ${corner.top};
      //       width: 4px;
      //       height: 120px;
      //       background: linear-gradient(180deg, rgba(101, 67, 33, 0.95) 0%, rgba(139, 69, 19, 0.6) 100%);
      //       transform: rotate(${corner.angle}deg);
      //       transform-origin: bottom center;
      //       pointer-events: none;
      //       z-index: 1;
      //       border-radius: 2px;
      //       box-shadow: 0 0 3px rgba(101, 67, 33, 0.6);
      //     `;
      //     container.appendChild(branch);

      //     // Thêm hoa mai trên cành (4-5 hoa)
      //     const flowersOnBranch = 4 + Math.floor(Math.random() * 2);
      //     for (let j = 0; j < flowersOnBranch; j++) {
      //       const flowerOnBranch = document.createElement("div");
      //       flowerOnBranch.innerHTML = `
      //         <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      //           <path d="M50 50 C50 20 70 20 70 50 C90 50 90 70 65 65 C75 85 55 90 50 70 C45 90 25 85 35 65 C10 70 10 50 30 50 C30 20 50 20 50 50 Z"
      //                 fill="#FFD700" stroke="#FFA500" stroke-width="2"/>
      //           <circle cx="50" cy="55" r="5" fill="#FF4500" />
      //         </svg>
      //       `;
      //       const flowerDistance = 15 + j * 20; // Khoảng cách từ gốc cành
      //       const angleRad = ((corner.angle - 90) * Math.PI) / 180; // Điều chỉnh góc
      //       const flowerX = Math.cos(angleRad) * flowerDistance;
      //       const flowerY = Math.sin(angleRad) * flowerDistance;

      //       const baseRotate = corner.angle + (j % 2 === 0 ? 8 : -8);
      //       flowerOnBranch.style.cssText = `
      //         position: fixed;
      //         left: ${corner.left};
      //         top: ${corner.top};
      //         width: ${18 + Math.random() * 10}px;
      //         height: ${18 + Math.random() * 10}px;
      //         transform: translate(${flowerX}px, ${flowerY}px) rotate(${baseRotate}deg);
      //         opacity: ${0.6 + Math.random() * 0.3};
      //         pointer-events: none;
      //         z-index: 2;
      //         filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 12px rgba(255, 165, 0, 0.5));
      //         animation: mai-branch-sway-simple ${3 + i * 0.4}s ease-in-out infinite;
      //         animation-delay: ${j * 0.3}s;
      //         transform-origin: center center;
      //       `;
      //       container.appendChild(flowerOnBranch);
      //     }
      //   });

      // Tạo tiền vàng rơi
      //   for (let i = 0; i < 3; i++) {
      //     const coin = document.createElement("div");
      //     coin.className = "tet-gold-coin";
      //     coin.style.cssText = `
      //       left: ${Math.floor(Math.random() * 100)}%;
      //       animation-delay: ${i * 1}s;
      //     `;
      //     container.appendChild(coin);
      //   }

      // Tạo pháo hoa với các tia sáng
      const createFirework = () => {
        const leftPos = 20 + Math.random() * 60; // 20-80%
        const topPos = 10 + Math.random() * 40; // 10-50%

        // Container cho pháo hoa
        const firework = document.createElement("div");
        firework.className = "tet-firework";
        firework.style.cssText = `
          left: ${leftPos}%;
          top: ${topPos}%;
        `;

        // Điểm nổ trung tâm
        const center = document.createElement("div");
        center.className = "tet-firework-center";
        center.style.cssText = `
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        `;
        firework.appendChild(center);

        // Màu sắc cho các tia pháo hoa
        const colors = [
          { main: "#fbbf24", trail: "#f59e0b" }, // Vàng
          { main: "#dc2626", trail: "#991b1b" }, // Đỏ
          { main: "#ec4899", trail: "#db2777" }, // Hồng
          { main: "#22c55e", trail: "#16a34a" }, // Xanh lá
          { main: "#3b82f6", trail: "#2563eb" }, // Xanh dương
          { main: "#a855f7", trail: "#9333ea" }, // Tím
        ];

        // Số lượng tia sáng (12-20 tia)
        const sparkCount = 12 + Math.floor(Math.random() * 9);
        const angleStep = (360 / sparkCount) * (Math.PI / 180);

        // Tạo các tia sáng tỏa ra
        for (let i = 0; i < sparkCount; i++) {
          const angle = i * angleStep;
          const distance = 60 + Math.random() * 40; // 60-100px
          const sparkX = Math.cos(angle) * distance;
          const sparkY = Math.sin(angle) * distance;

          // Màu ngẫu nhiên
          const colorSet = colors[Math.floor(Math.random() * colors.length)];

          // Tia sáng chính (hạt)
          const spark = document.createElement("div");
          spark.className = "tet-firework-spark";
          spark.style.cssText = `
            left: 50%;
            top: 50%;
            background: ${colorSet.main};
            box-shadow: 0 0 6px ${colorSet.main}, 0 0 12px ${colorSet.main};
          `;
          spark.style.setProperty("--spark-x", `${sparkX}px`);
          spark.style.setProperty("--spark-y", `${sparkY}px`);
          firework.appendChild(spark);

          // Đuôi tia sáng (trail)
          const trail = document.createElement("div");
          trail.className = "tet-firework-trail";
          const trailLength = 15 + Math.random() * 10;
          const trailX = Math.cos(angle) * (distance * 0.3);
          const trailY = Math.sin(angle) * (distance * 0.3);
          const trailAngle = (angle * 180) / Math.PI;
          trail.style.cssText = `
            left: 50%;
            top: 50%;
            background: linear-gradient(to bottom, ${colorSet.main} 0%, ${colorSet.trail} 50%, transparent 100%);
            height: ${trailLength}px;
            box-shadow: 0 0 4px ${colorSet.main};
          `;
          trail.style.setProperty("--trail-x", `${trailX}px`);
          trail.style.setProperty("--trail-y", `${trailY}px`);
          trail.style.setProperty("--trail-angle", `${trailAngle}deg`);
          firework.appendChild(trail);
        }

        container.appendChild(firework);

        // Xóa sau khi animation kết thúc
        setTimeout(() => {
          if (firework.parentNode) {
            firework.remove();
          }
        }, 1200);
      };

      // Tạo pháo hoa ngay lập tức và sau đó mỗi 2-4 giây
      createFirework();
      intervalRef.current = setInterval(() => {
        createFirework();
      }, 2000 + Math.random() * 2000);

      // Tạo lồng đèn treo (sử dụng emoji 🏮)
      for (let i = 0; i < 6; i++) {
        const lantern = document.createElement("div");
        lantern.className = "tet-lantern";
        const isLeft = i % 2 === 0;
        const topPos = 5 + i * 15;
        const leftPos = isLeft ? "2%" : "96%";

        lantern.textContent = "🏮";
        lantern.style.cssText = `
          position: fixed;
          top: ${topPos}%;
          left: ${leftPos};
          font-size: ${35 + Math.random() * 10}px;
          filter: 
            drop-shadow(0 0 8px rgba(220, 38, 38, 1))
            drop-shadow(0 0 16px rgba(220, 38, 38, 0.8))
            drop-shadow(0 0 24px rgba(251, 191, 36, 0.6))
            drop-shadow(0 0 32px rgba(251, 191, 36, 0.4))
            drop-shadow(0 0 40px rgba(220, 38, 38, 0.3));
          animation: lantern-sway ${
            3 + i * 0.3
          }s ease-in-out infinite, lantern-glow 2s ease-in-out infinite;
          animation-delay: ${i * 0.4}s, ${i * 0.2}s;
          pointer-events: none;
          z-index: 1;
          transform-origin: top center;
          line-height: 1;
        `;

        // Thêm dây treo
        const string = document.createElement("div");
        string.style.cssText = `
          position: fixed;
          top: ${topPos}%;
          left: calc(${leftPos} + ${isLeft ? "0%" : "3%"});
          width: 3px;
          height: 25px;
          background: linear-gradient(180deg, rgba(139, 69, 19, 0.9) 0%, rgba(139, 69, 19, 0.3) 100%);
          transform: translateX(${isLeft ? "18px" : "-18px"}) translateY(-25px);
          pointer-events: none;
          z-index: 1;
          border-radius: 2px;
        `;
        container.appendChild(string);
        container.appendChild(lantern);
      }
    } else if (theme === "christmas") {
      // Tạo tuyết rơi
      for (let i = 0; i < 20; i++) {
        const snowflake = document.createElement("div");
        snowflake.textContent = "❄";
        snowflake.style.cssText = `
          position: fixed;
          font-size: ${10 + Math.random() * 10}px;
          left: ${Math.random() * 100}%;
          top: -10px;
          opacity: ${0.5 + Math.random() * 0.5};
          pointer-events: none;
          z-index: 1;
          animation: snow-fall ${5 + Math.random() * 5}s linear infinite;
          animation-delay: ${Math.random() * 2}s;
        `;
        container.appendChild(snowflake);
      }
    } else if (theme === "newyear") {
      // Tạo confetti
      const colors = ["#fbbf24", "#ec4899", "#6366f1", "#22c55e", "#f97316"];
      for (let i = 0; i < 30; i++) {
        const confetti = document.createElement("div");
        confetti.className = "newyear-confetti";
        confetti.style.cssText = `
          left: ${Math.random() * 100}%;
          background: ${colors[Math.floor(Math.random() * colors.length)]};
          width: ${5 + Math.random() * 10}px;
          height: ${5 + Math.random() * 10}px;
          border-radius: ${Math.random() > 0.5 ? "50%" : "0"};
          animation-delay: ${Math.random() * 2}s;
        `;
        container.appendChild(confetti);
      }
    }

    return () => {
      if (container) {
        container.innerHTML = "";
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (cherryBlossomIntervalRef.current) {
        clearInterval(cherryBlossomIntervalRef.current);
        cherryBlossomIntervalRef.current = null;
      }
      if (mouseMoveHandlerRef.current) {
        document.removeEventListener("mousemove", mouseMoveHandlerRef.current);
        mouseMoveHandlerRef.current = null;
      }
    };
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className={`theme-decorations ${theme}-particles`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
        overflow: "hidden",
      }}
    />
  );
};

export default ThemeDecorations;
