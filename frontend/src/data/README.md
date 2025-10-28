# Mock Data Documentation

## Overview

This directory contains centralized mock data for the entire CinePhine application. All components should import mock data from `mockData.js` rather than maintaining their own separate mock data files.

## File Structure

```
src/data/
├── mockData.js          # Centralized mock data (USE THIS)
└── README.md            # This file
```

## Data Categories

### 1. Banner Data (`defaultBannerMovie`)

Default banner movie for homepage hero section.

**Fields:**

- `id`, `title`, `shortTitle`, `englishTitle`
- `logoImage`, `backgroundImage`, `poster`, `backdropUrl`
- `rating`, `imdb`, `ageRating`, `year`, `duration`, `quality`
- `genres[]`, `description`, `overview`

**Usage:**

```javascript
import { defaultBannerMovie } from "../data/mockData";
```

### 2. Top 10 Movies (`mockTop10Movies`)

Array of 10 trending movies displayed in the Top 10 section.

**Fields (per movie):**

- Basic: `id`, `title`, `englishTitle`, `poster`, `backdropUrl`
- Ratings: `rating`, `ageRating`, `quality`
- Meta: `year`, `season`, `currentEpisode`, `totalEpisodes`, `views`
- Content: `genres[]`, `description`, `overview`, `status`
- Production: `country`, `networks`, `studios`, `director`, `duration`

**Usage:**

```javascript
import { mockTop10Movies, formatEpisodeInfo } from "../data/mockData";

const movies = mockTop10Movies.map((movie) => ({
  ...movie,
  episode: formatEpisodeInfo(movie),
}));
```

### 3. Section Movies (`mockSectionMovies`)

Object containing categorized movie lists.

**Categories:**

- `trending[]` - Trending movies
- `newReleases[]` - New release movies

**Usage:**

```javascript
import { mockSectionMovies } from "../data/mockData";

const trendingMovies = mockSectionMovies.trending;
const newReleases = mockSectionMovies.newReleases;
```

### 4. Movie Details (`mockMovieDetails`)

Detailed movie data for movie detail pages, including cast, episodes, and comments.

**Additional fields:**

- `cast[]` - Array of cast members with `name` and `avatar`
- `episodes[]` - Array of episode objects
- `comments[]` - Array of user comments
- `synopsis`, `production`, `part`, `episode`, `completed`

**Usage:**

```javascript
import { getMovieDetail } from "../data/mockData";

const movie = getMovieDetail(movieId); // Auto-fallback to other sources if not in mockMovieDetails
```

## Helper Functions

### `formatEpisodeInfo(movie)`

Formats episode information for display.

**Returns:** String like `"T16 • Phần 1 • Tập 24"`

### `formatViews(views)`

Formats view count for display.

**Returns:**

- `"2.5M lượt xem"` for >= 1M views
- `"500K lượt xem"` for >= 1K views
- `"500 lượt xem"` for < 1K views

### `getMovieDetail(id)`

Retrieves detailed movie data by ID with automatic fallback.

**Search order:**

1. `mockMovieDetails[id]` - Full detail data
2. `mockTop10Movies` - Top 10 movies with generated episodes/comments
3. `mockSectionMovies` - Section movies with generated episodes/comments

**Returns:** Movie object with full details or `null` if not found

## Migration Guide

### Before (Separate Mock Files)

```javascript
// ❌ OLD WAY - Don't do this
import { defaultBannerMovie } from "./BannerHome/mockBannerData";
```

### After (Centralized)

```javascript
// ✅ NEW WAY - Use centralized mockData
import { defaultBannerMovie } from "../data/mockData";
```

## Adding New Mock Data

When adding new mock data:

1. **Add to appropriate section** in `mockData.js`
2. **Export the data** at the top of the file
3. **Document the fields** in this README
4. **Update components** to use the centralized data

## Deprecated Files

The following files are deprecated and should not be used:

- `frontend/src/components/BannerHome/mockBannerData.js` ❌ (Use `mockData.js` instead)

## Notes

- All mock data uses **consistent field names** across different sections
- IDs can be **string or number** - `getMovieDetail()` handles both
- Mock data includes **Vietnamese and English** content
- Image URLs point to **real CDN resources** for realistic testing
