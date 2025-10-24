import React from 'react';

const chips = ['Marvel', '4K', 'Sitcom', 'Lồng Tiếng Cực Mạnh', 'Xuyên Không', 'Cổ Trang', '+4 chủ đề'];

const colors = [
  'from-indigo-500 to-blue-500',
  'from-purple-500 to-indigo-500',
  'from-emerald-500 to-cyan-500',
  'from-violet-500 to-fuchsia-500',
  'from-orange-500 to-rose-500',
  'from-amber-500 to-pink-500',
  'from-slate-600 to-slate-500',
];

const CategoryChips = () => {
  return (
    <section className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold mb-4">Bạn đang quan tâm gì?</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {chips.map((c, idx) => (
          <a key={c} href="#" className={`relative rounded-2xl p-6 text-white bg-gradient-to-br ${colors[idx % colors.length]} overflow-hidden`}> 
            <div className="text-xl font-semibold">{c}</div>
            <div className="mt-2 text-sm opacity-90">Xem chủ đề →</div>
          </a>
        ))}
      </div>
    </section>
  );
};

export default CategoryChips;


