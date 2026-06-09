import React, { useState, useEffect, useRef } from "react";
import { useVoice } from "contexts/VoiceContext";

// ====================================================================
// TIMI ONBOARDING - Hướng dẫn sử dụng 3 bước (chỉ hiện lần đầu)
// Thiết kế Glassmorphism sang trọng, màu chủ đạo primaryColor
// ====================================================================

const STEPS = [
  {
    icon: "fa-microphone",
    title: 'Gọi "Hey Timi"',
    description:
      'Khi đang xem phim, chỉ cần nói "Hey Timi" để đánh thức trợ lý. Bạn sẽ nghe tiếng Ting! khi Timi sẵn sàng nhận lệnh.',
    tip: "Nói bằng giọng bình thường, không cần la to.",
  },
  {
    icon: "fa-brain",
    title: "Trí tuệ Nhân tạo",
    description:
      "Timi được tích hợp AI thông minh! Bạn không cần nói các lệnh cứng nhắc để điều khiển, cứ nói chuyện tự nhiên như bình thường là được.",
    commands: [
      { cmd: '"Mở phim Mai lồng tiếng"', desc: "Tìm & bật phim ẩn" },
      { cmd: '"Tìm kiếm phim Conan"', desc: "Tìm kiếm phim" },
      { cmd: '"Tua tới giữa phim đi"', desc: "Tua theo ngữ cảnh" },
      { cmd: '"Dừng phim / phát tiếp"', desc: "Tạm dừng / Phát tiếp" },
      { cmd: '"Chuyển sang tập 5"', desc: "Chuyển tập phim" },
      { cmd: '"Chuyển sang bản vietsub"', desc: "Tự đổi định dạng audio" },
      { cmd: '"Lưu phim này vào tủ"', desc: "Tương tác phim đang xem" },
      { cmd: '"Bình luận phim rất hay"', desc: "Tự động viết review" },
    ],
  },
  {
    icon: "fa-rotate",
    title: "Timi tự động quay lại",
    description:
      'Sau khi thực hiện lệnh, Timi sẽ tự động quay lại trạng thái lắng nghe. Bạn có thể gọi "Hey Timi" bất kỳ lúc nào!',
    tip: 'Nếu sau 7 giây bạn không nói gì, Timi sẽ tự tắt micro và đợi bạn gọi lại.',
  },
];

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

const TimiOnboarding = () => {
  const { showOnboarding, dismissOnboarding } = useVoice();
  const [step, setStep] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(new Audio());

  // === XỬ LÝ ÂM THANH ELEVENLABS TỰ ĐỘNG ===
  useEffect(() => {
    // Dừng âm thanh nếu đóng modal hoặc bị mute
    if (!showOnboarding || isMuted) {
      audioRef.current.pause();
      return;
    }

    const currentText = STEPS[step].description;
    const audioElement = audioRef.current;
    let isActive = true; // Chống race condition khi bấm chuyển bước liên tục

    // Gọi API TTS (Tự động Cache trên R2 nhờ Backend)
    fetch(`${API_BASE_URL}/ai/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: currentText })
    })
      .then(res => res.json())
      .then(data => {
        if (!isActive) return;
        if (data.success && data.audioUrl && showOnboarding && !isMuted) {
          audioElement.src = data.audioUrl;
          audioElement.play().catch(e => console.log('Autoplay chặn:', e));
        }
      })
      .catch(err => console.error('TTS Error:', err));

    return () => {
      isActive = false;
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [step, showOnboarding, isMuted]);

  if (!showOnboarding) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100010] flex items-center justify-center safe-modal-padding">
      {/* ====== BACKDROP ====== */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={dismissOnboarding}
      />

      {/* ====== MODAL CONTAINER ====== */}
      <div className="relative w-full max-w-md bg-bgColor2/90 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl shadow-black/80 overflow-hidden animate-[scaleIn_0.3s_ease-out]">
        
        {/* Decorative glows (Hiệu ứng ánh sáng góc) */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-primaryColor/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-primaryColor/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header subtle glow bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primaryColor/50 to-transparent" />

        {/* Nút bật/tắt tiếng (Mute Toggle) */}
        <button
          onClick={() => setIsMuted(prev => !prev)}
          className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all z-20"
          title={isMuted ? "Bật âm thanh thuyết minh" : "Tắt âm thanh thuyết minh"}
        >
          <i className={`fa-solid ${isMuted ? 'fa-volume-xmark text-red-400' : 'fa-volume-high text-primaryColor'}`} />
        </button>

        {/* Close button */}
        <button
          onClick={dismissOnboarding}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors z-20"
        >
          <i className="fa-solid fa-xmark" />
        </button>

        <div className="relative p-6 px-8 pt-12 z-10">
          
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-8 bg-primaryColor shadow-[0_0_8px_currentColor]" // Chấm active phát sáng
                    : i < step
                    ? "w-4 bg-primaryColor/40" // Các bước đã qua
                    : "w-4 bg-white/10" // Các bước chưa tới
                }`}
              />
            ))}
          </div>

          {/* Icon Box */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primaryColor/10 border border-primaryColor/20 flex items-center justify-center shadow-lg shadow-primaryColor/5">
              <i className={`fa-solid ${current.icon} text-2xl text-primaryColor drop-shadow-md`} />
            </div>
          </div>

          {/* Step Text Info */}
          <p className="text-center text-primaryColor/70 text-[10px] font-bold tracking-widest uppercase mb-2">
            Bước {step + 1} / {STEPS.length}
          </p>

          <h2 className="text-center text-gray-100 text-xl font-bold mb-3">
            {current.title}
          </h2>

          <p className="text-center text-gray-400 text-sm leading-relaxed mb-6">
            {current.description}
          </p>

          {/* Tip Box (Glass style) */}
          {current.tip && (
            <div className="flex items-start gap-3 bg-primaryColor/5 border border-primaryColor/10 rounded-xl px-4 py-3 mb-6 shadow-inner">
              <i className="fa-solid fa-lightbulb text-primaryColor text-sm mt-0.5 shrink-0 drop-shadow-sm" />
              <p className="text-gray-300 text-xs leading-relaxed">{current.tip}</p>
            </div>
          )}

          {/* ====== Commands list (ĐÃ THIẾT KẾ LẠI CHO BƯỚC 2) ====== */}
          {current.commands && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {current.commands.map((c, i) => (
                <div
                  key={i}
                  className="flex flex-col items-start bg-white/5 border border-white/5 rounded-xl sm:px-3.5 px-3 py-2.5 hover:bg-white/10 transition-colors shadow-sm"
                >
                  <span className="text-primaryColor text-[11px] font-bold drop-shadow-sm mb-1">
                    {c.cmd}
                  </span>
                  <span className="text-gray-300 text-[10px] leading-snug">
                    {c.desc}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ====== NAVIGATION BUTTONS ====== */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm font-medium hover:bg-white/10 hover:text-white transition-all"
              >
                <i className="fa-solid fa-arrow-left mr-2" />
                Quay lại
              </button>
            )}
            
            <button
              onClick={() => {
                if (isLast) {
                  dismissOnboarding();
                } else {
                  setStep(step + 1);
                }
              }}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center active:scale-95 ${
                isLast
                  ? "bg-primaryColor text-gray-900 shadow-[0_0_15px_rgba(var(--primary-color-rgb),0.4)] hover:shadow-[0_0_25px_rgba(var(--primary-color-rgb),0.6)]"
                  : "bg-primaryColor/15 border border-primaryColor/30 text-primaryColor hover:bg-primaryColor hover:text-gray-900"
              }`}
            >
              {isLast ? (
                <>
                  <i className="fa-solid fa-check mr-2" />
                  Bắt đầu sử dụng!
                </>
              ) : (
                <>
                  Tiếp theo
                  <i className="fa-solid fa-arrow-right ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimiOnboarding;
