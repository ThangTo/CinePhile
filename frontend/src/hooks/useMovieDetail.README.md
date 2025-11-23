# useMovieDetail Hook

Custom React hook for managing movie detail page state and data fetching.

## Purpose

Centralizes all state management and data fetching logic for the MovieDetail page, making the component cleaner and more maintainable.

## Usage

```jsx
import useMovieDetail from "../hooks/useMovieDetail";

const MovieDetail = () => {
  const { id } = useParams();
  const { movie, loading, error, activeTab, setActiveTab, audioType, setAudioType } =
    useMovieDetail(id);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return <div>{/* render movie details */}</div>;
};
```

## Parameters

| Parameter | Type   | Description       |
| --------- | ------ | ----------------- |
| `id`      | string | Movie ID to fetch |

## Returns

| Property       | Type     | Description                            |
| -------------- | -------- | -------------------------------------- |
| `movie`        | Object   | Movie data object                      |
| `loading`      | boolean  | Loading state                          |
| `error`        | string   | Error message (null if no error)       |
| `activeTab`    | string   | Current active tab ("episodes", etc.)  |
| `setActiveTab` | Function | Function to update active tab          |
| `audioType`    | string   | Current audio type ("subtitle", "dub") |
| `setAudioType` | Function | Function to update audio type          |

## Features

- **Automatic data fetching**: Fetches movie data when component mounts or ID changes
- **Loading state management**: Tracks loading state during API calls
- **Error handling**: Catches and reports errors
- **Tab state**: Manages active tab state (episodes, cast, etc.)
- **Audio type state**: Manages audio preference (subtitle/dub)
- **Simulated API delay**: 500ms delay for realistic UX

## Benefits

1. **Separation of Concerns**: Business logic separated from UI
2. **Reusability**: Can be used in multiple components if needed
3. **Testability**: Easy to test hook logic independently
4. **Maintainability**: All state management in one place
5. **Type Safety**: Clear return types for better IDE support

## Implementation Details

- Uses `useState` for local state management
- Uses `useEffect` for data fetching side effects
- Fetches data from centralized `mockData.js`
- Includes error boundaries for failed requests
- Auto-resets state on ID change
