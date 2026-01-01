import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiFilter,
  FiX,
  FiChevronDown,
  FiCalendar,
  FiStar,
  FiGlobe,
  FiLayers,
  FiMonitor,
  FiShield,
  FiFilm,
  FiCheck,
  FiSearch,
} from "react-icons/fi";
import useFilterOptions from "hooks/useFilterOptions";
import useMovieTaxonomies from "hooks/useMovieTaxonomies";
import { COUNTRY_CATEGORIES } from "components/header/constants";

/**
 * Component MovieFilter
 * @param {Object} filters - Current applied filters
 * @param {Function} onFilterChange - Callback when filters are applied
 * @param {Object} options - Component options
 * @param {string} options.pageType - Current page type: "genre", "country", "type"
 * @param {string} options.slug - Current slug (genre/country/type slug)
 */
const MovieFilter = ({ filters = {}, onFilterChange, options = {} }) => {
  const {
    compact = false,
    pageType,
    slug,
    navigateOnApply = false,
    searchQuery,
    defaultCollapsed,
  } = options;
  const navigate = useNavigate();
  const { options: filterOptions, loading: optionsLoading } = useFilterOptions();
  const { countries: taxonomyCountries, loading: taxonomyLoading } = useMovieTaxonomies();
  const [isExpanded, setIsExpanded] = useState(false); // For compact mode
  // Use localStorage to persist collapse state across filter changes and component remounts
  // This ensures the filter stays open/closed when filters are applied
  // If defaultCollapsed is explicitly set, use it instead of localStorage
  const COLLAPSE_STORAGE_KEY = "movieFilter.collapsed";
  const getStoredCollapseState = () => {
    // If defaultCollapsed is explicitly provided, use it
    if (defaultCollapsed !== undefined) {
      return defaultCollapsed;
    }
    // Otherwise, use localStorage
    try {
      const stored = localStorage.getItem(COLLAPSE_STORAGE_KEY);
      return stored !== null ? JSON.parse(stored) : true; // Default to collapsed
    } catch {
      return true;
    }
  };
  const [isCollapsed, setIsCollapsed] = useState(getStoredCollapseState);

  // Reset collapse state when defaultCollapsed prop changes
  useEffect(() => {
    if (defaultCollapsed !== undefined) {
      setIsCollapsed(defaultCollapsed);
    }
  }, [defaultCollapsed]);

  // Update localStorage and state when user toggles
  // Only update localStorage if defaultCollapsed is not explicitly set
  const handleToggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    // Only save to localStorage if defaultCollapsed is not explicitly set
    if (defaultCollapsed === undefined) {
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(newState));
      } catch {
        // Ignore localStorage errors
      }
    }
  };

  // Merge countries from taxonomies with fallback to COUNTRY_CATEGORIES
  // Format: { name: string, slug: string }
  const availableCountries = useMemo(() => {
    // Use taxonomy countries if available, otherwise use COUNTRY_CATEGORIES
    const countries = taxonomyCountries.length > 0 ? taxonomyCountries : COUNTRY_CATEGORIES;

    // Convert to format { name, slug } for consistency
    return countries.map((country) => {
      // If it's already in { name, slug } format from taxonomy
      if (country.name && country.slug) {
        return country;
      }
      // If it's from COUNTRY_CATEGORIES with { label, href }
      if (country.label && country.href) {
        const slug = country.href.replace("/country/", "");
        return {
          name: country.label,
          slug: slug,
        };
      }
      // Fallback
      return {
        name: country.label || country.name || country,
        slug: country.slug || country.href?.replace("/country/", "") || "",
      };
    });
  }, [taxonomyCountries]);

  // Determine default type - always return empty string (tất cả) by default
  const getDefaultType = () => {
    return filters.type || "";
  };

  // Determine default genre/country based on pageType
  const getDefaultGenre = () => {
    if (pageType === "genre" && slug) {
      return filters.genres?.includes(slug) ? filters.genres : [slug];
    }
    return filters.genres || [];
  };

  const getDefaultCountry = () => {
    if (pageType === "country" && slug) {
      return filters.countries?.includes(slug) ? filters.countries : [slug];
    }
    return filters.countries || [];
  };

  // Initialize state with defaults
  const [localFilters, setLocalFilters] = useState(() => ({
    genres: getDefaultGenre(),
    countries: getDefaultCountry(),
    year: filters.year || "",
    yearFrom: filters.yearFrom || "",
    yearTo: filters.yearTo || "",
    quality: filters.quality || "",
    type: getDefaultType(),
    ageRating: filters.ageRating || "",
    status: filters.status || "",
    ratingMin: filters.ratingMin || "",
    ratingMax: filters.ratingMax || "",
    sort: filters.sort || "newest",
    lang: filters.lang || "",
  }));

  useEffect(() => {
    // Only update if filters prop changes (when applied), but preserve defaults from pageType
    const defaultType = getDefaultType();
    const defaultGenre = getDefaultGenre();
    const defaultCountry = getDefaultCountry();

    setLocalFilters((prev) => ({
      ...prev,
      genres: filters.genres?.length ? filters.genres : defaultGenre,
      countries: filters.countries?.length ? filters.countries : defaultCountry,
      year: filters.year !== undefined ? filters.year : prev.year,
      yearFrom: filters.yearFrom !== undefined ? filters.yearFrom : prev.yearFrom,
      yearTo: filters.yearTo !== undefined ? filters.yearTo : prev.yearTo,
      quality: filters.quality !== undefined ? filters.quality : prev.quality,
      type: filters.type !== undefined ? filters.type : defaultType || "",
      ageRating: filters.ageRating !== undefined ? filters.ageRating : prev.ageRating,
      status: filters.status !== undefined ? filters.status : prev.status,
      ratingMin: filters.ratingMin !== undefined ? filters.ratingMin : prev.ratingMin,
      ratingMax: filters.ratingMax !== undefined ? filters.ratingMax : prev.ratingMax,
      sort: filters.sort || prev.sort || "newest",
      lang: filters.lang !== undefined ? filters.lang : prev.lang,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pageType, slug]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    // Don't call onFilterChange immediately - wait for user to click "Apply" button
  };

  const handleApplyFilters = () => {
    // If navigateOnApply is true, navigate to /filter with query params
    if (navigateOnApply) {
      const params = new URLSearchParams();

      // Include search query if available
      if (searchQuery) {
        params.set("q", searchQuery);
      }

      if (localFilters.genres?.length) params.set("genres", localFilters.genres.join(","));
      if (localFilters.countries?.length) params.set("countries", localFilters.countries.join(","));
      if (localFilters.year) params.set("year", localFilters.year);
      if (localFilters.yearFrom) params.set("yearFrom", localFilters.yearFrom);
      if (localFilters.yearTo) params.set("yearTo", localFilters.yearTo);
      if (localFilters.quality) params.set("quality", localFilters.quality);
      if (localFilters.type) params.set("type", localFilters.type);
      if (localFilters.ageRating) params.set("ageRating", localFilters.ageRating);
      if (localFilters.status) params.set("status", localFilters.status);
      if (localFilters.ratingMin) params.set("ratingMin", localFilters.ratingMin);
      if (localFilters.ratingMax) params.set("ratingMax", localFilters.ratingMax);
      if (localFilters.sort) params.set("sort", localFilters.sort);
      if (localFilters.lang) params.set("lang", localFilters.lang);

      params.set("page", "1");

      navigate(`/filter?${params.toString()}`);
    } else {
      // Apply filters when user clicks the button
      onFilterChange(localFilters);
    }
  };

  const clearFilters = () => {
    // Reset to defaults based on pageType
    const defaultType = getDefaultType();
    const defaultGenre = getDefaultGenre();
    const defaultCountry = getDefaultCountry();

    const clearedFilters = {
      genres: defaultGenre,
      countries: defaultCountry,
      year: "",
      yearFrom: "",
      yearTo: "",
      quality: "",
      type: defaultType,
      ageRating: "",
      status: "",
      ratingMin: "",
      ratingMax: "",
      sort: "newest",
      lang: "",
    };
    setLocalFilters(clearedFilters);
    // Apply cleared filters immediately when clearing
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = () => {
    return Object.values(localFilters).some((val) => (Array.isArray(val) ? val.length > 0 : !!val));
  };

  // Count active filters from props (already applied)
  const activeFilterCount = () => {
    let count = 0;
    if (filters.genres?.length) count += filters.genres.length;
    if (filters.countries?.length) count += filters.countries.length;
    ["year", "quality", "type", "ageRating", "status"].forEach((k) => {
      if (filters[k]) count++;
    });
    if (filters.yearFrom || filters.yearTo) count++;
    if (filters.ratingMin || filters.ratingMax) count++;
    return count;
  };

  // Count pending filters from localFilters (not yet applied)
  const pendingFilterCount = () => {
    let count = 0;
    if (localFilters.genres?.length) count += localFilters.genres.length;
    if (localFilters.countries?.length) count += localFilters.countries.length;
    ["year", "quality", "type", "ageRating", "status"].forEach((k) => {
      if (localFilters[k]) count++;
    });
    if (localFilters.yearFrom || localFilters.yearTo) count++;
    if (localFilters.ratingMin || localFilters.ratingMax) count++;
    return count;
  };

  const renderFilterContent = () => (
    <div className="space-y-5 animate-fade-in">
      {/* 1. Country Filter - Chip Buttons */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
          <FiGlobe className="text-primaryColor" size={14} /> Quốc gia
        </label>
        {taxonomyLoading ? (
          <div className="h-10 w-full bg-white/5 animate-pulse rounded-lg"></div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleFilterChange("countries", [])}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                !localFilters.countries?.length
                  ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                  : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
              }`}
            >
              Tất cả
            </button>
            {availableCountries
              .filter((country) => {
                const countryName = country.name || country.label || "";
                const countrySlug = country.slug || "";
                return countryName.trim() && countrySlug;
              })
              .map((country) => {
                const countryName = country.name || country.label || "Không có tên";
                const countrySlug = country.slug || country.name || "";
                const isActive = localFilters.countries?.includes(countrySlug);
                return (
                  <button
                    key={countrySlug}
                    type="button"
                    onClick={() => {
                      const current = localFilters.countries || [];
                      const newValue = isActive
                        ? current.filter((c) => c !== countrySlug)
                        : [...current, countrySlug];
                      handleFilterChange("countries", newValue);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                        : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {isActive && <FiCheck size={12} />}
                    {countryName}
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {/* 2. Film Type - Chip Buttons */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
          <FiFilm className="text-primaryColor" size={14} /> Loại phim
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleFilterChange("type", "")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              !localFilters.type
                ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange("type", "single")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
              localFilters.type === "single"
                ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
            }`}
          >
            {localFilters.type === "single" && <FiCheck size={12} />}
            Phim lẻ
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange("type", "series")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
              localFilters.type === "series"
                ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
            }`}
          >
            {localFilters.type === "series" && <FiCheck size={12} />}
            Phim bộ
          </button>
        </div>
      </div>

      {/* 3. Rating/Age Rating - Chip Buttons */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
          <FiShield className="text-primaryColor" size={14} /> Xếp hạng
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleFilterChange("ageRating", "")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              !localFilters.ageRating
                ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange("ageRating", "T12")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
              localFilters.ageRating === "T12"
                ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
            }`}
          >
            {localFilters.ageRating === "T12" && <FiCheck size={12} />}
            T12 (13 tuổi trở lên)
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange("ageRating", "T16")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
              localFilters.ageRating === "T16"
                ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
            }`}
          >
            {localFilters.ageRating === "T16" && <FiCheck size={12} />}
            T16 (16 tuổi trở lên)
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange("ageRating", "18+")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
              localFilters.ageRating === "18+"
                ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
            }`}
          >
            {localFilters.ageRating === "18+" && <FiCheck size={12} />}
            T18 (18 tuổi trở lên)
          </button>
        </div>
      </div>

      {/* 4. Genre Filter - Chip Buttons */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
          <FiLayers className="text-primaryColor" size={14} /> Thể loại
        </label>
        {optionsLoading ? (
          <div className="h-10 w-full bg-white/5 animate-pulse rounded-lg"></div>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
            <button
              type="button"
              onClick={() => handleFilterChange("genres", [])}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                !localFilters.genres?.length
                  ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                  : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
              }`}
            >
              Tất cả
            </button>
            {filterOptions.genres
              ?.filter((genre) => {
                const genreName = genre.name || genre.label || "";
                const genreSlug = genre.slug || "";
                return genreName.trim() && genreSlug;
              })
              .map((genre) => {
                const genreName = genre.name || genre.label || "Không có tên";
                const genreSlug = genre.slug || genre.name || "";
                const isActive = localFilters.genres?.includes(genreSlug);
                return (
                  <button
                    key={genreSlug}
                    type="button"
                    onClick={() => {
                      const current = localFilters.genres || [];
                      const newValue = isActive
                        ? current.filter((g) => g !== genreSlug)
                        : [...current, genreSlug];
                      handleFilterChange("genres", newValue);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                        : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {isActive && <FiCheck size={12} />}
                    {genreName}
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {/* 5. Version/Lang Filter - Chip Buttons */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
          <FiMonitor className="text-primaryColor" size={14} /> Phiên bản
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleFilterChange("lang", "")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              !localFilters.lang
                ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange("lang", "subtitle")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
              localFilters.lang === "subtitle"
                ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
            }`}
          >
            {localFilters.lang === "subtitle" && <FiCheck size={12} />}
            Phụ đề
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange("lang", "thuyet-minh")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
              localFilters.lang === "thuyet-minh"
                ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
            }`}
          >
            {localFilters.lang === "thuyet-minh" && <FiCheck size={12} />}
            Thuyết minh
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange("lang", "dubbed")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
              localFilters.lang === "dubbed"
                ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
            }`}
          >
            {localFilters.lang === "dubbed" && <FiCheck size={12} />}
            Lồng tiếng
          </button>
        </div>
      </div>

      {/* 6. Production Year - Chip Buttons + Input */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
          <FiCalendar className="text-primaryColor" size={14} /> Năm sản xuất
        </label>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={() => handleFilterChange("year", "")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              !localFilters.year
                ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
            }`}
          >
            Tất cả
          </button>
          {/* Generate year buttons from current year down to 2011 */}
          {Array.from({ length: Math.min(new Date().getFullYear() - 2010, 16) }, (_, i) => {
            const year = new Date().getFullYear() - i;
            return (
              <button
                key={year}
                type="button"
                onClick={() => handleFilterChange("year", year.toString())}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
                  localFilters.year === year.toString()
                    ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                    : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
                }`}
              >
                {localFilters.year === year.toString() && <FiCheck size={12} />}
                {year}
              </button>
            );
          })}
          {/* Year Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-500" size={16} />
            </div>
            <input
              type="number"
              placeholder="Nhập năm"
              min="1900"
              max={new Date().getFullYear() + 1}
              value={localFilters.year || ""}
              onChange={(e) => handleFilterChange("year", e.target.value)}
              className="w-full max-w-[140px] bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primaryColor focus:ring-1 focus:ring-primaryColor/50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* 7. Sort Options - Chip Buttons */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
          <FiStar className="text-primaryColor" size={14} /> Sắp xếp
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "newest", label: "Mới nhất" },
            { value: "updated", label: "Mới cập nhật" },
            { value: "imdb", label: "Điểm IMDb" },
            { value: "views", label: "Lượt xem" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleFilterChange("sort", option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
                localFilters.sort === option.value
                  ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                  : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
              }`}
            >
              {localFilters.sort === option.value && <FiCheck size={12} />}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t border-white/5">
        {hasActiveFilters() && (
          <button
            type="button"
            onClick={clearFilters}
            className="group px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/50 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
          >
            <FiX size={14} className="group-hover:rotate-90 transition-transform" />
            Xóa bộ lọc
          </button>
        )}
        <button
          type="button"
          onClick={handleApplyFilters}
          className="ml-auto px-6 py-2.5 rounded-lg bg-primaryColor text-black font-bold hover:bg-primaryColor/90 transition-all flex items-center gap-2 shadow-lg shadow-primaryColor/20 hover:shadow-primaryColor/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>Lọc kết quả</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );

  // --- RENDER COMPACT MODE ---
  if (compact) {
    return (
      <div
        className={`bg-bgColor3 border transition-all duration-300 rounded-2xl shadow-lg ${
          isExpanded
            ? "border-primaryColor/30 shadow-primaryColor/5"
            : "border-white/5 hover:border-white/10"
        }`}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 text-white hover:text-primaryColor transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                activeFilterCount() > 0 ? "bg-primaryColor text-black" : "bg-white/5 text-gray-400"
              }`}
            >
              <FiFilter size={18} />
            </div>
            <div className="text-left">
              <span className="block font-bold text-sm">Bộ Lọc Phim</span>
              <span className="text-xs text-gray-500 block font-medium">
                {activeFilterCount() > 0
                  ? `Đang áp dụng ${activeFilterCount()} tiêu chí`
                  : pendingFilterCount() > 0
                  ? `${pendingFilterCount()} tiêu chí chờ áp dụng`
                  : "Chưa có bộ lọc nào"}
              </span>
            </div>
          </div>
          <div className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
            <FiChevronDown />
          </div>
        </button>

        <div
          className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${
            isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="p-4 pt-0 border-t border-white/5 mt-2">
            <div className="pt-4">{renderFilterContent()}</div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER DEFAULT MODE ---
  return (
    <div className="bg-bgColor3 border border-white/5 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div
        onClick={handleToggleCollapse}
        className="flex items-center cursor-pointer justify-between p-5 border-b border-white/5 bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <div className="bg-primaryColor/10 p-2 rounded-lg text-primaryColor border-primaryColor/20">
            <FiFilter size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg leading-none">Bộ Lọc Phim</h3>
            {/* <p className="text-xs text-gray-500 mt-1 font-medium">
              Tìm kiếm phim theo sở thích của bạn
            </p> */}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeFilterCount() > 0 && (
            <span className="bg-primaryColor text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-primaryColor/20">
              {activeFilterCount()} Đã áp dụng
            </span>
          )}
          {pendingFilterCount() > 0 && pendingFilterCount() !== activeFilterCount() && (
            <span className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full border border-yellow-500/30">
              {pendingFilterCount()} Chờ áp dụng
            </span>
          )}
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            title={isCollapsed ? "Mở rộng bộ lọc" : "Thu gọn bộ lọc"}
          >
            <div className={`transition-transform duration-300 ${isCollapsed ? "" : "rotate-180"}`}>
              <FiChevronDown size={20} />
            </div>
          </button>
        </div>
      </div>

      {/* Body - Collapsible */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isCollapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
        }`}
      >
        <div className="p-5 md:p-6">{renderFilterContent()}</div>
      </div>
    </div>
  );
};

export default MovieFilter;
