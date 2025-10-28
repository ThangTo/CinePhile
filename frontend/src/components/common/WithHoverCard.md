# WithHoverCard Component

## Overview

`WithHoverCard` là một Higher-Order Component (HOC) cho phép thêm tính năng hover card vào bất kỳ movie card nào một cách dễ dàng và linh hoạt.

## Features

- ✅ Reusable hover logic với custom hook `useMovieHover`
- ✅ Configurable delays (show/hide)
- ✅ Smooth animations với `animate-pop-up`
- ✅ Responsive (chỉ hiện trên desktop - lg breakpoint)
- ✅ Flexible positioning
- ✅ Z-index tự động để hover card luôn nằm trên

## Usage

### Basic Usage

```jsx
import WithHoverCard from "./common/WithHoverCard";

const MyMovieCard = ({ movie }) => {
  return (
    <WithHoverCard movie={movie}>
      <div className="your-card-styles">{/* Your card content */}</div>
    </WithHoverCard>
  );
};
```

### With Custom Position

```jsx
<WithHoverCard
  movie={movie}
  hoverPosition="-left-20 -top-4" // Custom positioning
>
  <div className="your-card">...</div>
</WithHoverCard>
```

### With Custom Delays

```jsx
<WithHoverCard
  movie={movie}
  showDelay={300} // Show after 300ms
  hideDelay={150} // Hide after 150ms
>
  <div className="your-card">...</div>
</WithHoverCard>
```

## Props

| Prop            | Type      | Default                    | Description                          |
| --------------- | --------- | -------------------------- | ------------------------------------ |
| `children`      | ReactNode | required                   | Card content to wrap                 |
| `movie`         | Object    | required                   | Movie data for hover card            |
| `className`     | string    | `"relative flex-shrink-0"` | Additional classes for wrapper       |
| `hoverPosition` | string    | `"-left-20 -top-4"`        | Tailwind classes for positioning     |
| `showDelay`     | number    | `500`                      | Delay before showing hover card (ms) |
| `hideDelay`     | number    | `100`                      | Delay before hiding hover card (ms)  |

## Examples

### Example 1: MovieCard

```jsx
// frontend/src/components/MovieCard.jsx
import WithHoverCard from "./common/WithHoverCard";

const MovieCard = ({ movie }) => {
  return (
    <WithHoverCard movie={movie} hoverPosition="-left-20 -top-4">
      <div className="group relative rounded-lg overflow-visible bg-[#0f172a] border border-white/10 select-none">
        <div className="aspect-[2/3] w-full overflow-hidden rounded-lg">
          <img src={movie.posterUrl} alt={movie.title} />
        </div>
        {/* ... more content ... */}
      </div>
    </WithHoverCard>
  );
};
```

### Example 2: Top10Card

```jsx
// frontend/src/components/Top10Movie/Top10Card.jsx
import WithHoverCard from "../common/WithHoverCard";

const Top10Card = ({ movie, rank }) => {
  return (
    <WithHoverCard
      movie={movie}
      hoverPosition="-left-20 -top-4"
      className="relative flex-shrink-0 w-[70%] sm:w-[45%] md:w-[30%] lg:w-[19%] select-none"
    >
      <ClippedPoster src={movie.poster} alt={movie.title} />
      <RankBadge rank={rank} />
      {/* ... more content ... */}
    </WithHoverCard>
  );
};
```

## How It Works

### 1. useMovieHover Hook

```javascript
const { showHoverCard, isAnimating, handleMouseEnter, handleMouseLeave } = useMovieHover(
  showDelay,
  hideDelay
);
```

**States:**

- `showHoverCard`: Boolean để show/hide hover card
- `isAnimating`: Boolean để trigger animation class

**Handlers:**

- `handleMouseEnter`: Trigger khi hover vào
- `handleMouseLeave`: Trigger khi rời khỏi hover area

### 2. Timeout Logic

```
User hovers → Wait [showDelay]ms → Show card + Start animation
User leaves → Wait [hideDelay]ms → Stop animation → Remove from DOM
```

**Why hideDelay?**

- Cho phép user di chuyển chuột từ card sang hover card mà không bị mất
- Tạo UX mượt mà hơn

### 3. Z-Index Management

```jsx
style={{ zIndex: showHoverCard ? 10000 : 1 }}
```

- Khi hover: z-index = 10000 (luôn nằm trên)
- Khi không hover: z-index = 1 (normal)

## Positioning Guide

### Common Positions

```jsx
// Center aligned
hoverPosition = "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";

// Top-left offset
hoverPosition = "-left-20 -top-4";

// Top-center offset
hoverPosition = "left-1/2 -translate-x-1/2 -top-4";

// Right-aligned
hoverPosition = "-right-20 -top-4";
```

### Tips

- Sử dụng negative values (`-left-20`) để card vượt ra ngoài
- Combine với `translate` để center: `left-1/2 -translate-x-1/2`
- Test ở các vị trí khác nhau trong grid để tránh overflow

## Troubleshooting

### Hover card không hiện

1. Check `overflow-visible` ở parent containers
2. Verify mock data có đầy đủ fields (posterUrl, backdropUrl, genres)
3. Check responsive breakpoint (chỉ hiện ở `lg` trở lên)

### Hover card bị cắt

1. Add `overflow-visible` to parent sections
2. Add padding to ScrollContainer: `pb-80 pr-[250px]`
3. Add negative margin to offset: `-mb-80`

### Animation không mượt

1. Check animation trong `tailwind.config.js`
2. Verify `transformOrigin: "center center"`
3. Adjust `showDelay` và `hideDelay`

## Related Files

- `frontend/src/hooks/useMovieHover.js` - Custom hook
- `frontend/src/components/common/WithHoverCard.jsx` - HOC wrapper
- `frontend/src/components/MovieCard/MovieHoverCard.jsx` - Hover card content
- `frontend/tailwind.config.js` - Animation config
