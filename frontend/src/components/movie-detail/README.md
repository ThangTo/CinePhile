# Movie Detail Components

Modular and reusable components for the Movie Detail page.

## Architecture

```
MovieDetail (Page)
├── useMovieDetail (Hook) - State management
├── LoadingState - Loading UI
├── ErrorState - Error UI
├── Header - Global header
├── MobileLayout - Mobile-specific layout
│   ├── MobileMovieHero - Hero section
│   └── MovieDetailContent - Shared content
│       ├── DetailTabs - Tab navigation
│       ├── TabContent - Tab panels
│       │   ├── EpisodesSection
│       │   ├── CastSection
│       │   └── MovieInfo
│       └── CommentsSection
│           ├── CommentInput
│           ├── CommentsList
│           └── CommentItem
├── DesktopLayout - Desktop-specific layout
│   ├── DesktopHero - Background banner
│   ├── SidebarInfo - Left sidebar
│   │   ├── Poster
│   │   ├── MovieInfo
│   │   ├── GenreTag
│   │   ├── Synopsis
│   │   └── CastSection
│   ├── ActionButtons - Action bar
│   └── MovieDetailContent - Shared content
│       └── (same as mobile)
└── SiteFooter - Global footer
```

## Component Responsibilities

### Layout Components

#### `MobileLayout.jsx`

- Renders mobile-specific layout (vertical stack)
- Shows/hides based on screen size (`lg:hidden`)
- Uses `MobileMovieHero` and `MovieDetailContent`

#### `DesktopLayout.jsx`

- Renders desktop-specific layout (grid-based)
- Shows/hides based on screen size (`hidden lg:block`)
- Uses `DesktopHero`, `SidebarInfo`, `ActionButtons`, and `MovieDetailContent`

#### `MovieDetailContent.jsx`

- **Reusable** component for both mobile and desktop
- Contains tabs, tab content, and comments section
- Receives `commentsSectionClass` prop for mobile/desktop distinction

### Hero Components

#### `MobileMovieHero.jsx`

- Mobile hero section with poster, rating, actions
- Includes expandable "Thông tin phim" dropdown
- Reuses components from `BannerHome`

#### `DesktopHero.jsx`

- Desktop background banner
- Fixed height (675px)
- Uses `BannerBackground` component

### Content Components

#### `SidebarInfo.jsx`

- Desktop sidebar with poster and movie details
- Sticky positioning (can be enabled)
- Displays: poster, title, info badges, genres, synopsis, details, cast

#### `ActionButtons.jsx`

- Action bar with buttons (watch, favorite, add, share, comment, rate)
- Integrates with `useAuth` for authentication
- Smooth scroll to comments section

#### `DetailTabs.jsx`

- Tab navigation (Episodes, Cast, Details)
- Responsive design

#### `TabContent.jsx`

- Renders content based on active tab
- Conditional rendering for different tab panels

#### `CommentsSection.jsx`

- Toggle between comments and ratings
- Desktop/mobile specific UI
- Uses `CommentInput`, `CommentsList`, `CommentItem`

### State Components

#### `LoadingState.jsx`

- Reusable loading UI with spinner
- Accepts custom message and className

#### `ErrorState.jsx`

- Reusable error UI
- Accepts custom message, className, and retry callback

## Custom Hooks

### `useMovieDetail.js`

Centralizes all state management for MovieDetail page:

- Fetches movie data
- Manages loading/error states
- Manages active tab state
- Manages audio type state

See `useMovieDetail.README.md` for detailed documentation.

## Props Flow

### Shared Props (layoutProps)

```jsx
{
  movie: Object,           // Movie data
  activeTab: string,       // Current active tab
  setActiveTab: Function,  // Tab setter
  audioType: string,       // Audio type
  onAudioTypeChange: Function // Audio type setter
}
```

### Component-Specific Props

**CommentsSection**

- `className`: CSS class for mobile/desktop distinction
  - Mobile: `"comments-section-mobile"`
  - Desktop: `"comments-section-desktop"`

## Benefits

### 1. Reusability

- `MovieDetailContent` is shared between mobile and desktop
- State components (`LoadingState`, `ErrorState`) can be used anywhere
- `useMovieDetail` hook can be reused for similar pages

### 2. Maintainability

- Clear separation of concerns
- Each component has single responsibility
- Easy to locate and fix bugs

### 3. Flexibility

- Easy to swap layouts
- Can add new layouts (tablet, etc.) without changing content
- Props-based configuration

### 4. Testability

- Small, focused components
- Hook can be tested independently
- Easy to mock dependencies

### 5. Performance

- No duplicate code
- Efficient re-renders
- Lazy loading potential

## Usage Example

```jsx
import { useParams } from "react-router-dom";
import { MobileLayout, DesktopLayout } from "../components/movie-detail";
import { LoadingState, ErrorState } from "../components/common";
import useMovieDetail from "../hooks/useMovieDetail";

const MovieDetail = () => {
  const { id } = useParams();
  const { movie, loading, error, activeTab, setActiveTab, audioType, setAudioType } =
    useMovieDetail(id);

  if (loading) return <LoadingState />;
  if (error || !movie) return <ErrorState message={error || "Not found"} />;

  const layoutProps = {
    movie,
    activeTab,
    setActiveTab,
    audioType,
    onAudioTypeChange: setAudioType,
  };

  return (
    <div className="min-h-screen bg-bgColor overflow-x-hidden">
      <Header />
      <MobileLayout {...layoutProps} />
      <DesktopLayout {...layoutProps} />
      <SiteFooter />
    </div>
  );
};
```

## File Structure

```
src/
├── pages/
│   └── MovieDetail.jsx (38 lines) ✨ Clean & simple
├── components/
│   ├── common/
│   │   ├── LoadingState.jsx
│   │   ├── ErrorState.jsx
│   │   └── index.js
│   └── movie-detail/
│       ├── MobileLayout.jsx
│       ├── DesktopLayout.jsx
│       ├── MovieDetailContent.jsx
│       ├── DesktopHero.jsx
│       ├── MobileMovieHero.jsx
│       ├── SidebarInfo.jsx
│       ├── ActionButtons.jsx
│       ├── DetailTabs.jsx
│       ├── TabContent.jsx
│       ├── EpisodesSection.jsx
│       ├── CastSection.jsx
│       ├── MovieInfo.jsx
│       ├── CommentsSection.jsx
│       ├── CommentInput.jsx
│       ├── CommentsList.jsx
│       ├── CommentItem.jsx
│       ├── index.js
│       └── README.md (this file)
└── hooks/
    ├── useMovieDetail.js
    └── useMovieDetail.README.md
```

## Key Improvements from Original

1. **135 lines → 38 lines** in MovieDetail.jsx (71% reduction)
2. **Zero code duplication** between mobile and desktop
3. **Custom hook** for state management
4. **Reusable state components** (Loading, Error)
5. **Clear component hierarchy**
6. **Better props organization** (layoutProps object)
7. **Comprehensive documentation**

## Future Enhancements

- Add PropTypes or TypeScript for type safety
- Implement React.memo for performance optimization
- Add unit tests for components and hook
- Implement lazy loading for heavy components
- Add animation transitions between layouts
