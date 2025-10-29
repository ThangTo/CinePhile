import React from "react";
import { Link } from "react-router-dom";

const chips = ["Marvel", "4K", "Sitcom", "Lồng Tiếng", "Xuyên Không", "Cổ Trang", "+4 chủ đề"];

const colors = [
  "from-indigo-500 to-blue-500",
  "from-purple-500 to-indigo-500",
  "from-emerald-500 to-cyan-500",
  "from-violet-500 to-fuchsia-500",
  "from-orange-500 to-rose-500",
  "from-amber-500 to-pink-500",
  "from-slate-600 to-slate-500",
];

// tạo slug an toàn cho URL, loại dấu và ký tự đặc biệt
const slugify = (str = "") =>
  String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");

const CategoryChips = () => {
  return (
    <section className="w-full py-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 px-4">Bạn đang quan tâm gì?</h2>

      {/* Mobile: Horizontal Scroll */}
      <div className="sm:hidden overflow-x-auto scrollbar-hide px-4">
        <div className="flex gap-2 pb-2">
          {chips.map((c, idx) => (
            <Link
              key={c}
              to={`/genre/${slugify(c)}`}
              className={`relative flex flex-col items-center justify-center flex-shrink-0 w-[120px] rounded-xl p-3 text-white bg-gradient-to-br ${
                colors[idx % colors.length]
              } overflow-hidden`}
            >
              <div className="text-base font-semibold text-center">{c}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop: Grid */}
      <div className="hidden sm:block px-4">
        <div className="grid grid-cols-3 lg:grid-cols-7 wrap gap-3">
          {chips.map((c, idx) => (
            <Link
              key={c}
              to={`/genre/${slugify(c)}`}
              className={`flex flex-col items-start justify-end rounded-xl p-6 text-white bg-gradient-to-br hover:translate-y-[-5px] transition-all duration-300 ${
                colors[idx % colors.length]
              } overflow-hidden`}
            >
              <div className="text-xl font-bold">{c}</div>
              <div className="mt-2 text-sm opacity-90">Xem chủ đề →</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryChips;
