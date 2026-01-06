import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isBrowsePage = location.pathname === "/filter";
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

  // Determine default type based on pageType and slug
  const getDefaultType = () => {
    // Nếu ở trang /filter, đọc từ URL query params
    if (isBrowsePage) {
      return searchParams.get("type") || "";
    }

    // If pageType is "type" and slug exists, map slug to type filter
    if (pageType === "type" && slug) {
      const TYPE_MAP = {
        "phim-le": "single",
        "phim-bo": "series",
        anime: "hoathinh",
        tvshows: "tvshows",
      };
      const mappedType = TYPE_MAP[slug];
      if (mappedType) {
        return mappedType;
      }
    }
    // Otherwise, use filters.type or empty string
    return filters.type || "";
  };

  // Determine default subType
  const getDefaultSubType = () => {
    // Nếu ở trang /filter, đọc từ URL query params
    if (isBrowsePage) {
      return searchParams.get("subType") || "";
    }

    // Nếu ở trang Phim bộ/Phim lẻ, không có subType
    if (pageType === "type" && (slug === "phim-bo" || slug === "phim-le")) {
      return "";
    }

    // Mặc định không có subType
    return filters.subType || "";
  };

  // Determine default genre/country based on pageType
  const getDefaultGenre = () => {
    // Nếu ở trang /filter, đọc từ URL query params
    if (isBrowsePage) {
      const genresParam = searchParams.get("genres");
      return genresParam ? genresParam.split(",").filter(Boolean) : [];
    }

    if (pageType === "genre" && slug) {
      return filters.genres?.includes(slug) ? filters.genres : [slug];
    }
    return filters.genres || [];
  };

  const getDefaultCountry = () => {
    // Nếu ở trang /filter, đọc từ URL query params
    if (isBrowsePage) {
      const countriesParam = searchParams.get("countries");
      return countriesParam ? countriesParam.split(",").filter(Boolean) : [];
    }

    if (pageType === "country" && slug) {
      return filters.countries?.includes(slug) ? filters.countries : [slug];
    }
    return filters.countries || [];
  };

  // Helper function to get default value from URL or filters
  const getDefaultValue = (key, defaultValue = "") => {
    if (isBrowsePage) {
      const value = searchParams.get(key);
      return value || defaultValue;
    }
    return filters[key] !== undefined ? filters[key] : defaultValue;
  };

  // Helper function to get default array value from URL or filters
  const getDefaultArrayValue = (key, defaultValue = []) => {
    if (isBrowsePage) {
      const value = searchParams.get(key);
      return value ? value.split(",").filter(Boolean) : defaultValue;
    }
    if (Array.isArray(filters[key])) {
      return filters[key];
    }
    return filters[key] ? [filters[key]] : defaultValue;
  };

  // Initialize state with defaults
  const [localFilters, setLocalFilters] = useState(() => ({
    genres: getDefaultGenre(),
    countries: getDefaultCountry(),
    year: getDefaultArrayValue("year", []),
    yearFrom: getDefaultValue("yearFrom", ""),
    yearTo: getDefaultValue("yearTo", ""),
    quality: getDefaultValue("quality", ""),
    type: getDefaultType(),
    subType: getDefaultSubType(),
    ageRating: getDefaultArrayValue("ageRating", []),
    status: getDefaultValue("status", ""),
    ratingMin: getDefaultValue("ratingMin", ""),
    ratingMax: getDefaultValue("ratingMax", ""),
    sort: getDefaultValue("sort", "newest"),
    lang: getDefaultArrayValue("lang", []),
  }));

  useEffect(() => {
    // Khi ở trang /filter, luôn đọc từ URL query params để tránh dùng giá trị cũ
    if (isBrowsePage) {
      const defaultType = getDefaultType();
      const defaultSubType = getDefaultSubType();
      const defaultGenre = getDefaultGenre();
      const defaultCountry = getDefaultCountry();

      setLocalFilters({
        genres: defaultGenre,
        countries: defaultCountry,
        year: getDefaultArrayValue("year", []),
        yearFrom: getDefaultValue("yearFrom", ""),
        yearTo: getDefaultValue("yearTo", ""),
        quality: getDefaultValue("quality", ""),
        type: defaultType,
        subType: defaultSubType,
        ageRating: getDefaultArrayValue("ageRating", []),
        status: getDefaultValue("status", ""),
        ratingMin: getDefaultValue("ratingMin", ""),
        ratingMax: getDefaultValue("ratingMax", ""),
        sort: getDefaultValue("sort", "newest"),
        lang: getDefaultArrayValue("lang", []),
      });
      return;
    }

    // Ở các trang khác, chỉ update khi filters prop changes
    const defaultType = getDefaultType();
    const defaultSubType = getDefaultSubType();
    const defaultGenre = getDefaultGenre();
    const defaultCountry = getDefaultCountry();

    setLocalFilters((prev) => ({
      ...prev,
      genres: filters.genres?.length ? filters.genres : defaultGenre,
      countries: filters.countries?.length ? filters.countries : defaultCountry,
      year:
        filters.year !== undefined
          ? Array.isArray(filters.year)
            ? filters.year
            : filters.year
            ? [filters.year]
            : []
          : prev.year,
      yearFrom: filters.yearFrom !== undefined ? filters.yearFrom : prev.yearFrom,
      yearTo: filters.yearTo !== undefined ? filters.yearTo : prev.yearTo,
      quality: filters.quality !== undefined ? filters.quality : prev.quality,
      type: filters.type !== undefined ? filters.type : defaultType || "",
      subType: filters.subType !== undefined ? filters.subType : defaultSubType || "",
      ageRating:
        filters.ageRating !== undefined
          ? Array.isArray(filters.ageRating)
            ? filters.ageRating
            : filters.ageRating
            ? [filters.ageRating]
            : []
          : prev.ageRating,
      status: filters.status !== undefined ? filters.status : prev.status,
      ratingMin: filters.ratingMin !== undefined ? filters.ratingMin : prev.ratingMin,
      ratingMax: filters.ratingMax !== undefined ? filters.ratingMax : prev.ratingMax,
      sort: filters.sort || prev.sort || "newest",
      lang:
        filters.lang !== undefined
          ? Array.isArray(filters.lang)
            ? filters.lang
            : filters.lang
            ? [filters.lang]
            : []
          : prev.lang,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pageType, slug, isBrowsePage, searchParams]);

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

      // Đảm bảo year luôn là array trước khi join
      const yearArray = Array.isArray(localFilters.year)
        ? localFilters.year
        : localFilters.year
        ? [localFilters.year]
        : [];

      if (localFilters.genres?.length) params.set("genres", localFilters.genres.join(","));
      if (localFilters.countries?.length) params.set("countries", localFilters.countries.join(","));
      if (yearArray.length) params.set("year", yearArray.join(","));
      if (localFilters.yearFrom) params.set("yearFrom", localFilters.yearFrom);
      if (localFilters.yearTo) params.set("yearTo", localFilters.yearTo);
      if (localFilters.quality) params.set("quality", localFilters.quality);
      if (localFilters.type) params.set("type", localFilters.type);
      if (localFilters.subType) params.set("subType", localFilters.subType);
      if (localFilters.ageRating?.length) params.set("ageRating", localFilters.ageRating.join(","));
      if (localFilters.status) params.set("status", localFilters.status);
      if (localFilters.ratingMin) params.set("ratingMin", localFilters.ratingMin);
      if (localFilters.ratingMax) params.set("ratingMax", localFilters.ratingMax);
      if (localFilters.sort && localFilters.sort !== "newest")
        params.set("sort", localFilters.sort);
      if (localFilters.lang?.length) params.set("lang", localFilters.lang.join(","));

      params.set("page", "1");

      navigate(`/filter?${params.toString()}`);
    } else {
      // Apply filters when user clicks the button
      // Đảm bảo year luôn là array trước khi gửi
      const filtersToApply = {
        ...localFilters,
        year: Array.isArray(localFilters.year)
          ? localFilters.year
          : localFilters.year
          ? [localFilters.year]
          : [],
      };
      onFilterChange(filtersToApply);
    }
  };

  const clearFilters = () => {
    // Reset to defaults based on pageType
    // Khi ở trang /filter, reset về giá trị rỗng (không đọc từ URL)
    // Ở các trang khác, giữ lại giá trị mặc định của trang đó
    let defaultType = "";
    let defaultSubType = "";
    let defaultGenre = [];
    let defaultCountry = [];

    if (!isBrowsePage) {
      defaultType = getDefaultType();
      defaultSubType = getDefaultSubType();
      defaultGenre = getDefaultGenre();
      defaultCountry = getDefaultCountry();
    }

    const clearedFilters = {
      genres: defaultGenre,
      countries: defaultCountry,
      year: [],
      yearFrom: "",
      yearTo: "",
      quality: "",
      type: defaultType,
      subType: defaultSubType,
      ageRating: [],
      status: "",
      ratingMin: "",
      ratingMax: "",
      sort: "newest",
      lang: [],
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
    if (filters.year?.length) count += filters.year.length;
    if (filters.ageRating?.length) count += filters.ageRating.length;
    if (filters.lang?.length) count += filters.lang.length;
    if (filters.quality) count++;
    if (filters.type) count++;
    if (filters.status) count++;
    if (filters.yearFrom || filters.yearTo) count++;
    if (filters.ratingMin || filters.ratingMax) count++;
    if (filters.sort && filters.sort !== "newest") count++;
    return count;
  };

  // Count pending filters from localFilters (not yet applied)
  const pendingFilterCount = () => {
    let count = 0;
    if (localFilters.genres?.length) count += localFilters.genres.length;
    if (localFilters.countries?.length) count += localFilters.countries.length;
    if (localFilters.year?.length) count += localFilters.year.length;
    if (localFilters.ageRating?.length) count += localFilters.ageRating.length;
    if (localFilters.lang?.length) count += localFilters.lang.length;
    if (localFilters.quality) count++;
    if (localFilters.type) count++;
    if (localFilters.status) count++;
    if (localFilters.yearFrom || localFilters.yearTo) count++;
    if (localFilters.ratingMin || localFilters.ratingMax) count++;
    if (localFilters.sort && localFilters.sort !== "newest") count++;
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
          {(() => {
            // Kiểm tra xem có đang ở trang Anime/TVShows không
            const isAnimeOrTVShows =
              localFilters.type === "hoathinh" || localFilters.type === "tvshows";

            return (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (isAnimeOrTVShows) {
                      // Ở Anime/TVShows: clear subType, giữ type
                      handleFilterChange("subType", "");
                    } else {
                      // Ở Phim lẻ/Phim bộ: clear type
                      handleFilterChange("type", "");
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                    (isAnimeOrTVShows && !localFilters.subType) ||
                    (!isAnimeOrTVShows && !localFilters.type)
                      ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                      : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isAnimeOrTVShows) {
                      // Ở Anime/TVShows: set subType
                      handleFilterChange("subType", "single");
                    } else {
                      // Ở Phim lẻ/Phim bộ: set type
                      handleFilterChange("type", "single");
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
                    (isAnimeOrTVShows && localFilters.subType === "single") ||
                    (!isAnimeOrTVShows && localFilters.type === "single")
                      ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                      : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {((isAnimeOrTVShows && localFilters.subType === "single") ||
                    (!isAnimeOrTVShows && localFilters.type === "single")) && <FiCheck size={12} />}
                  Phim lẻ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isAnimeOrTVShows) {
                      // Ở Anime/TVShows: set subType
                      handleFilterChange("subType", "series");
                    } else {
                      // Ở Phim lẻ/Phim bộ: set type
                      handleFilterChange("type", "series");
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
                    (isAnimeOrTVShows && localFilters.subType === "series") ||
                    (!isAnimeOrTVShows && localFilters.type === "series")
                      ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                      : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {((isAnimeOrTVShows && localFilters.subType === "series") ||
                    (!isAnimeOrTVShows && localFilters.type === "series")) && <FiCheck size={12} />}
                  Phim bộ
                </button>
              </>
            );
          })()}
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
            onClick={() => handleFilterChange("ageRating", [])}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              !localFilters.ageRating?.length
                ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
            }`}
          >
            Tất cả
          </button>
          {["T12", "T16", "18+"].map((rating) => {
            const isActive = localFilters.ageRating?.includes(rating);
            const labels = {
              T12: "T12 (13 tuổi trở lên)",
              T16: "T16 (16 tuổi trở lên)",
              "18+": "T18 (18 tuổi trở lên)",
            };
            return (
              <button
                key={rating}
                type="button"
                onClick={() => {
                  const current = localFilters.ageRating || [];
                  const newValue = isActive
                    ? current.filter((r) => r !== rating)
                    : [...current, rating];
                  handleFilterChange("ageRating", newValue);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                    : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
                }`}
              >
                {isActive && <FiCheck size={12} />}
                {labels[rating]}
              </button>
            );
          })}
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
            onClick={() => handleFilterChange("lang", [])}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              !localFilters.lang?.length
                ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
            }`}
          >
            Tất cả
          </button>
          {[
            { value: "subtitle", label: "Phụ đề" },
            { value: "thuyet-minh", label: "Thuyết minh" },
            { value: "dubbed", label: "Lồng tiếng" },
          ].map((option) => {
            const isActive = localFilters.lang?.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  const current = localFilters.lang || [];
                  const newValue = isActive
                    ? current.filter((l) => l !== option.value)
                    : [...current, option.value];
                  handleFilterChange("lang", newValue);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                    : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
                }`}
              >
                {isActive && <FiCheck size={12} />}
                {option.label}
              </button>
            );
          })}
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
            onClick={() => handleFilterChange("year", [])}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              !localFilters.year?.length
                ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
            }`}
          >
            Tất cả
          </button>
          {/* Generate year buttons from current year down to 2011 */}
          {Array.from({ length: Math.min(new Date().getFullYear() - 2010, 16) }, (_, i) => {
            const year = new Date().getFullYear() - i;
            const yearStr = year.toString();
            const isActive = localFilters.year?.includes(yearStr);
            return (
              <button
                key={year}
                type="button"
                onClick={() => {
                  const current = localFilters.year || [];
                  const newValue = isActive
                    ? current.filter((y) => y !== yearStr)
                    : [...current, yearStr];
                  handleFilterChange("year", newValue);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                    : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
                }`}
              >
                {isActive && <FiCheck size={12} />}
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
              value={
                Array.isArray(localFilters.year) && localFilters.year.length === 1
                  ? localFilters.year[0]
                  : ""
              }
              onChange={(e) => {
                const value = e.target.value;
                // Nếu có giá trị, convert thành array, nếu không thì là array rỗng
                const newValue = value ? [value] : [];
                handleFilterChange("year", newValue);
              }}
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
            { value: "imdb", label: "Điểm đánh giá" },
            { value: "views", label: "Lượt xem" },
          ].map((option) => {
            const isActive = localFilters.sort === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  // Nếu click vào ô đang active và không phải "newest", thì reset về "newest"
                  if (isActive && option.value !== "newest") {
                    handleFilterChange("sort", "newest");
                  } else {
                    handleFilterChange("sort", option.value);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-primaryColor text-black border-primaryColor shadow-lg shadow-primaryColor/20"
                    : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
                }`}
              >
                {isActive && <FiCheck size={12} />}
                {option.label}
              </button>
            );
          })}
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
