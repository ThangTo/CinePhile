import React from 'react';

const items = new Array(5).fill(0).map((_, i) => ({
  id: i + 1,
  title: ['Nhập Thanh Vân','Thần Đèn Ơi, Ước Đi','Nhất Tiếu Tùy Ca','Hãy Lấy Em Đi','Trăm Mảnh Ký Ức','Yến Ngô Vĩnh An'][i],
  poster: `https://static.nutscdn.com/vimg/400-0/578c5ff63df52ac7ef86bfc0e84a5638.jpg`,
  tags: i % 2 ? ['T13'] : ['TM.20'],
}));

const Top10Row = () => {
  return (
    <section className="container mx-auto px-4 py-8">
      <h3 className="text-2xl font-bold mb-5">Top 10 phim bộ hôm nay</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {items.map((it, idx) => (
          <div key={it.id} className="relative">
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <img src={it.poster} alt={it.title} className="w-full h-auto object-cover" />
            </div>
            <div className="absolute -left-3 -top-3 h-10 w-10 rounded-full bg-amber-500 text-white font-extrabold flex items-center justify-center shadow-xl">{idx+1}</div>
            <div className="mt-3">
              <div className="text-white font-semibold line-clamp-1">{it.title}</div>
              <div className="mt-1 text-xs text-gray-400">T16 • Phần 1 • Tập {idx+5}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Top10Row;


