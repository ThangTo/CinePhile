import React from "react";

const CastSection = ({ movie, layout = "default", title = true }) => {
  // Grid classes for different layouts
  const gridClass =
    layout === "vertical"
      ? "grid-cols-3"
      : layout === "detail"
      ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7";

  // Detail layout - card style with character name
  if (layout === "detail") {
    return (
      <div className="py-4">
        {title && <h3 className="text-xl font-bold mb-5 text-gray-100">Diễn viên</h3>}

        <div className={`grid ${gridClass} gap-4`}>
          {movie.cast.map((actor, index) => (
            <div
              key={index}
              className="bg-bgColor rounded-xl overflow-hidden transition-colors cursor-pointer"
            >
              {/* Actor Image */}
              <div className="aspect-[3/4] overflow-hidden bg-bgColor relative">
                <img
                  src={actor.avatar}
                  alt={actor.name}
                  className="w-full h-full object-cover hover:scale-105 hover:opacity-90 transition-transform duration-300"
                />
                <div className="absolute inset-0 z-0 bg-gradient-to-t from-bgColor via-bgColor/10 to-transparent" />
              </div>

              {/* Actor Info */}
              <div className="text-center">
                <div className="font-semibold text-white text-sm mb-1 truncate">{actor.name}</div>
                {actor.character && (
                  <div className="text-xs text-gray-400 truncate">{actor.character}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default/Vertical layout - circular avatars
  return (
    <div>
      {title && <h3 className="text-xl font-bold mb-5 text-gray-100">Diễn viên:</h3>}

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
