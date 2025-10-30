import React from "react";
import { useParams } from "react-router-dom";
import Header from "./Header";
import SiteFooter from "./SiteFooter";
import MovieCard from "./MovieCard";
import Pagination from "./common/Pagination";
import usePagination from "../hooks/usePagination";
import { mockTop10Movies, mockSectionMovies } from "../data/mockData";
import { GENRE_CATEGORIES, COUNTRY_CATEGORIES } from "./Header/constants";

const collectAllMovies = () => {
  const sections = [];
  if (mockSectionMovies.trending) sections.push(...mockSectionMovies.trending);
  if (mockSectionMovies.newReleases) sections.push(...mockSectionMovies.newReleases);
  return [...mockTop10Movies, ...sections];
};

const slugify = (str = "") =>
  String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");

const FilteredMovies = ({ pageType = "genre" }) => {
  const { slug } = useParams();
  const raw = decodeURIComponent(slug || "");

  const allMovies = React.useMemo(() => collectAllMovies(), []);

  const headerLabelMap = React.useMemo(() => {
    const toPairs = (arr) =>
      (arr || []).map((item) => {
        const parts = (item.href || "").split("/");
        const key = parts[parts.length - 1];
        return [key, item.label];
      });
    return {
      genre: new Map(toPairs(GENRE_CATEGORIES)),
      country: new Map(toPairs(COUNTRY_CATEGORIES)),
    };
  }, []);

  const labelMap = React.useMemo(() => {
    const map = new Map();
    if (pageType === "genre") {
      allMovies.forEach((m) => {
        (m.genres || []).forEach((g) => {
          const key = slugify(g);
          if (!map.has(key)) map.set(key, g);
        });
      });
    } else if (pageType === "country") {
      allMovies.forEach((m) => {
        const c = m.country;
        if (!c) return;
        const key = slugify(c);
        if (!map.has(key)) map.set(key, c);
      });
    }
    return map;
  }, [allMovies, pageType]);

  const requestedKey = slugify(raw);
  const displayLabel =
    labelMap.get(requestedKey) ||
    (pageType === "genre"
      ? headerLabelMap.genre.get(requestedKey)
      : headerLabelMap.country.get(requestedKey)) ||
    requestedKey.replace(/-/g, " ");

  const filtered = React.useMemo(() => {
    if (pageType === "genre") {
      return allMovies.filter((m) => {
        if (!m.genres || !Array.isArray(m.genres)) return false;
        return m.genres.some((g) => slugify(g) === requestedKey);
      });
    }
    return allMovies.filter((m) => slugify(m.country || "") === requestedKey);
  }, [allMovies, requestedKey, pageType]);

  const { page, totalPages, paginatedData: paginatedMovies, handlePrev, handleNext } =
    usePagination(filtered, 8);

  const emptyText = pageType === "genre" ? "Không tìm thấy phim cho thể loại này." : "Không tìm thấy phim cho quốc gia này.";

  return (
    <div className="min-h-screen bg-bgColor">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-20">
        <h1 className="text-fluid-2xl leading-fluid-tight font-bold text-white mb-6">Phim {displayLabel}</h1>

        {filtered.length === 0 ? (
          <p className="text-gray-300">{emptyText}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {paginatedMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  hoverVisibleAt="md"
                  hoverCardClass="w-[300px] max-h-[360px] overflow-hidden"
                  compact
                />
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} onPrev={handlePrev} onNext={handleNext} />
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default FilteredMovies;


