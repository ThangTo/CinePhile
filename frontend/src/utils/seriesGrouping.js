import movieService from "services/movie.service";

const PART_NAME_REGEX = /\(Phần\s*(\d+)\)/i;
const PART_SLUG_REGEX = /-phan-?(\d+)$/i;

export function extractPartInfo(movie) {
  const rawTitle = movie.title || movie.name || "";
  const rawSlug = movie.slug || "";

  // Try extract from name "(Phần X)"
  const nameMatch = rawTitle.match(PART_NAME_REGEX);
  if (nameMatch) {
    const partNumber = parseInt(nameMatch[1], 10) || 1;
    const baseTitle = rawTitle.replace(PART_NAME_REGEX, "").trim();
    const baseSlug = rawSlug.replace(PART_SLUG_REGEX, "").trim() || rawSlug;

    return {
      baseTitle,
      baseSlug,
      partNumber,
      hasExplicitPart: true,
    };
  }

  // Try extract from slug "...-phan-2"
  const slugMatch = rawSlug.match(PART_SLUG_REGEX);
  if (slugMatch) {
    const partNumber = parseInt(slugMatch[1], 10) || 1;
    const baseSlug = rawSlug.replace(PART_SLUG_REGEX, "").trim();
    const baseTitle = rawTitle || baseSlug;

    return {
      baseTitle,
      baseSlug,
      partNumber,
      hasExplicitPart: true,
    };
  }

  // Default: no explicit part info yet
  return {
    baseTitle: rawTitle,
    baseSlug: rawSlug,
    partNumber: 1,
    hasExplicitPart: false,
  };
}

export function groupSeriesMovies(movies) {
  if (!Array.isArray(movies)) return [];

  // First pass: collect by base key
  const groups = new Map();

  movies.forEach((movie) => {
    const info = extractPartInfo(movie);
    const key = (info.baseSlug || info.baseTitle || movie.id || "").toLowerCase();
    if (!key) {
      // Fallback: treat as its own group
      groups.set(movie.id, {
        base: movie,
        parts: [],
      });
      return;
    }

    const existing = groups.get(key) || { base: null, parts: [] };

    existing.parts.push({
      id: movie.id,
      title: movie.title || movie.name,
      slug: movie.slug,
      partNumber: info.partNumber,
      hasExplicitPart: info.hasExplicitPart,
    });

    // Choose a representative base movie:
    // - Prefer the one WITHOUT explicit "(Phần X)" to be base (clean title)
    // - Otherwise keep the first seen
    if (!existing.base) {
      existing.base = movie;
    } else if (!info.hasExplicitPart) {
      existing.base = movie;
    }

    groups.set(key, existing);
  });

  // Second pass: build final movie list
  const result = [];
  groups.forEach(({ base, parts }) => {
    if (!base) return;

    // If only one part, keep as-is
    if (parts.length <= 1) {
      result.push(base);
      return;
    }

    // Normalize part numbers:
    // - If some movies don't have explicit part (hasExplicitPart=false) but there are others that do,
    //   treat those as partNumber=1.
    const hasAnyExplicit = parts.some((p) => p.hasExplicitPart);
    const normalizedParts = parts.map((p) => {
      if (!p.hasExplicitPart && hasAnyExplicit) {
        return { ...p, partNumber: 1 };
      }
      return p;
    });

    // Sort parts by partNumber ascending, then by title
    normalizedParts.sort((a, b) => {
      if (a.partNumber !== b.partNumber) return a.partNumber - b.partNumber;
      return (a.title || "").localeCompare(b.title || "");
    });

    const partLabels = normalizedParts.map((p) => `Phần ${p.partNumber}`);

    // Build enriched movie object
    const groupedMovie = {
      ...base,
      // Override title to base title without "(Phần X)"
      title: extractPartInfo(base).baseTitle || base.title,
      part: normalizedParts[0] ? `Phần ${normalizedParts[0].partNumber}` : "Phần 1",
      parts: Array.from(new Set(partLabels)),
      // Optional: attach raw parts metadata if needed later
      seriesParts: normalizedParts,
    };

    result.push(groupedMovie);
  });

  return result;
}

export async function enrichMovieWithSeriesParts(movie) {
  if (!movie) return movie;

  const info = extractPartInfo(movie);
  const baseQuery = info.baseSlug || info.baseTitle || movie.title || movie.slug || "";

  if (!baseQuery) return movie;

  try {
    const res = await movieService.search(baseQuery, { limit: 50 });
    const list = res?.data || res || [];
    const grouped = groupSeriesMovies(list);

    const group = grouped.find((g) =>
      (g.seriesParts || []).some((p) => p.id === movie.id || (movie.slug && p.slug === movie.slug))
    );

    if (!group || !group.seriesParts || group.seriesParts.length <= 1) {
      return movie;
    }

    const currentPart =
      group.seriesParts.find((p) => p.id === movie.id || (movie.slug && p.slug === movie.slug)) ||
      group.seriesParts[0];
    const currentPartLabel = currentPart ? `Phần ${currentPart.partNumber}` : group.part;

    return {
      ...movie,
      title: group.title || movie.title,
      part: currentPartLabel,
      parts: group.parts,
      seriesParts: group.seriesParts,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to enrich movie with series parts:", error);
    return movie;
  }
}
