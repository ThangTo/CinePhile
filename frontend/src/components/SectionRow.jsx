import React, { useRef } from 'react';
import MovieCard from './MovieCard';

const SectionRow = ({ title, movies = [] }) => {
  const scrollerRef = useRef(null);

  const scrollBy = (delta) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <section className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">{title}</h3>
        <a href="#" className="text-sm text-cyan-400 hover:text-cyan-300">Xem toàn bộ</a>
      </div>

      <div className="relative">
        <div ref={scrollerRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pr-10">
          {movies.map((m) => (
            <div key={m.id} className="shrink-0 w-[46%] sm:w-[30%] md:w-[22%] lg:w-[16%] snap-start">
              <MovieCard movie={m} />
            </div>
          ))}
        </div>
        <button onClick={() => scrollBy(-400)} className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15">‹</button>
        <button onClick={() => scrollBy(400)} className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15">›</button>
      </div>
    </section>
  );
};

export default SectionRow;


