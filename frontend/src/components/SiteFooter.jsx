import React from "react";

const menuLinks = ["Hỏi-Đáp", "Chính sách bảo mật", "Điều khoản sử dụng", "Giới thiệu", "Liên hệ"];
const topicTags = ["Dongphim", "Ghienphim", "Motphim", "Subnhanh"];

const SiteFooter = () => {
  return (
    <footer className="border-t border-white/5 bg-[#0F111A]">
      <div className="container mx-auto px-4 py-10">
        {/* Footer Element - Main Content */}
        <div className="footer-element flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          {/* Footer Side Left - Brand + Social Icons + Links */}
          <div className="footer-sideleft flex-1 max-w-3xl">
            {/* Brand Section */}
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <i className="fa-solid fa-play text-black text-xl"></i>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-white mb-1">
                  <span className="text-white">Cine</span>
                  <span className="text-cyan-400">Phine</span>
                </h3>
                <p className="text-sm text-gray-400">Phim hay có rồi</p>
              </div>
            </div>

            {/* Social Icons - Horizontal */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-3">
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
                  title="Telegram"
                >
                  <i className="fa-brands fa-telegram text-base"></i>
                </a>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
                  title="Discord"
                >
                  <i className="fa-brands fa-discord text-base"></i>
                </a>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
                  title="Twitter/X"
                >
                  <i className="fa-brands fa-x-twitter text-base"></i>
                </a>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
                  title="Facebook"
                >
                  <i className="fa-brands fa-facebook text-base"></i>
                </a>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
                  title="TikTok"
                >
                  <i className="fa-brands fa-tiktok text-base"></i>
                </a>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
                  title="YouTube"
                >
                  <i className="fa-brands fa-youtube text-base"></i>
                </a>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
                  title="Threads"
                >
                  <i className="fa-brands fa-threads text-base"></i>
                </a>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
                  title="Instagram"
                >
                  <i className="fa-brands fa-instagram text-base"></i>
                </a>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="mb-6">
              <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
                {menuLinks.map((link) => (
                  <a
                    key={link}
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    {link}
                  </a>
                ))}
              </nav>
            </div>

            {/* Topic Tags */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-3">
                {topicTags.map((tag) => (
                  <a
                    key={tag}
                    href="#"
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors duration-200"
                  >
                    {tag}
                  </a>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <p className="text-sm text-gray-500 leading-relaxed">
                CinePhine - Phim hay có rồi - Trang xem phim online chất lượng cao miễn phí Vietsub,
                thuyết minh, lồng tiếng full HD. Kho phim mới không lồ, phim chiếu rạp, phim bộ,
                phim lẻ từ nhiều quốc gia như Việt Nam, Hàn Quốc, Trung Quốc, Thái Lan, Nhật Bản, Âu
                Mỹ... đa dạng thể loại, khám phá nền tảng phim trực tuyến hay nhất 2024 chất lượng
                4K!
              </p>
            </div>

            {/* Copyright */}
            <div className="text-xs text-gray-600">© 2024 CinePhine</div>
          </div>

          {/* Footer Icon - Large Logo on Right */}
          <div className="footer-icon flex-shrink-0">
            <div className="relative group">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-2xl transition-all duration-300 hover:shadow-yellow-500/50 hover:scale-105">
                <i className="fa-solid fa-play text-black text-5xl"></i>
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-300 -z-10"></div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
