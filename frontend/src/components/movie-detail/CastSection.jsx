import React from "react";

const CastSection = ({ movie, layout = "default" }) => {
  const gridClass =
    layout === "vertical"
      ? "grid-cols-3"
      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7";

  return (
    <div>
      <h3 className="text-xl font-bold mb-5 text-gray-100">Diễn viên:</h3>

      <div className={`grid ${gridClass} gap-6`}>
        {movie.cast.map((actor, index) => (
          <div key={index} className="text-center">
            <div className="mx-auto mb-2 h-20 w-20 overflow-hidden rounded-full ring-1 ring-white/10">
              <img src={actor.avatar} alt={actor.name} className="h-full w-full object-cover" />
            </div>
            <div className="text-sm font-semibold text-gray-200">{actor.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CastSection;
