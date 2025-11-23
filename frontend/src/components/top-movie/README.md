# Top10Movie Components

Components for displaying Top 10 movies with clipped corners and gradient borders.

## Components

### Top10Card

Main card component for Top 10 movies.

**Props:**

- `movie` (Object) - Movie data: `{ title, englishTitle, poster, episode }`
- `rank` (number) - Movie rank (1-10)
- `compact` (boolean) - Compact layout for mobile (default: false)

**Usage:**

```jsx
<Top10Card movie={movieData} rank={1} compact={isMobile} />
```

### RankBadge

Gradient text badge for displaying rank number.

**Props:**

- `rank` (number) - Rank number
- `size` (string) - Size variant: 'sm' | 'md' | 'lg' (default: 'md')

**Usage:**

```jsx
<RankBadge rank={1} size="lg" />
```

### ClippedPoster

Poster image with clipped corner and gradient border.

**Props:**

- `src` (string) - Image source URL
- `alt` (string) - Image alt text
- `isOdd` (boolean) - Clip left (true) or right (false) corner

**Usage:**

```jsx
<ClippedPoster src="/poster.jpg" alt="Movie Title" isOdd={false} />
```

## Features

- ✨ **Alternating Clip Direction**: Odd/even cards have different corner clips
- 🎨 **Gradient Border**: SVG-based gradient border with unique IDs
- 📱 **Responsive**: Compact mode for mobile, full mode for desktop
- ♿ **Accessible**: Proper alt text and ARIA labels

## Layout Modes

### Compact (Mobile)

- Smaller text sizes
- Minimal info (title + english title only)
- Width: `w-11/12`

### Full (Desktop)

- Larger text sizes
- Complete info (title + english title + episode)
- Width: `relative` (grid-based)
