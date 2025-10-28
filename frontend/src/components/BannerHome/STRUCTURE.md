# BannerHome Component Structure

## 📊 Component Hierarchy

```
BannerHome (Main)
│
├── BannerBackground
│   ├── Background Image
│   └── Gradient Overlays (3 layers)
│
└── BannerContent
    ├── MovieTitle (Mobile/Tablet only)
    │   ├── Main Title (h1)
    │   └── Short Title (h2)
    │
    ├── MovieLogo (Desktop only)
    │   └── Logo Image with Link
    │
    ├── MovieInfo
    │   └── InfoBadge[] (IMDb, Age, Year, Duration, Quality)
    │
    ├── GenreList (Desktop only)
    │   └── GenreTag[] (Clickable genre links)
    │
    ├── MovieDescription (Desktop only)
    │   └── Description Text
    │
    └── ActionButtons (Desktop only)
        └── ActionButton[] (Play, Favorite, Info)
```

---

## 🗂️ File Organization

### **Core Components** (User-facing)

```
BannerHome.jsx              # Main component
├── imports BannerBackground
├── imports BannerContent
├── uses useBannerConfig hook
└── uses defaultBannerMovie data
```

### **Layout Components**

```
BannerBackground.jsx        # Background + Gradients
BannerContent.jsx           # Content container
```

### **Display Components** (Atomic)

```
InfoBadge.jsx              # Single info badge
GenreTag.jsx               # Single genre tag
ActionButton.jsx           # Single action button
MovieTitle.jsx             # Title + subtitle
MovieLogo.jsx              # Logo image
MovieDescription.jsx       # Description text
```

### **Container Components** (Composite)

```
MovieInfo.jsx              # Group of InfoBadges
GenreList.jsx              # Group of GenreTags
ActionButtons.jsx          # Group of ActionButtons
```

### **Logic & Data**

```
useBannerConfig.js         # Custom hook (navigation, toast)
mockBannerData.js          # Default movie data
```

### **Exports & Docs**

```
index.js                   # Central export point
README.md                  # Full documentation
STRUCTURE.md              # This file
```

---

## 🔄 Data Flow

```
1. BannerHome receives `movie` prop (optional)
   ↓
2. Falls back to `defaultBannerMovie` if not provided
   ↓
3. `useBannerConfig(movieData)` generates:
   - infoBadges[]
   - actionButtons[]
   ↓
4. BannerBackground renders with:
   - movieData.backgroundImage
   - movieData.title
   ↓
5. BannerContent renders with:
   - movieData
   - infoBadges
   - actionButtons
   ↓
6. Sub-components render individual elements
```

---

## 🎨 Responsive Strategy

### **Mobile First Approach**

```
base (< 640px)
├── Background: Mobile optimized
├── Title: Text only (centered)
├── Info: Visible
├── Genres: Hidden
├── Description: Hidden
└── Actions: Hidden

md (640px - 1024px)
├── Title: Text only
├── Genres: Visible
├── Description: Visible
└── Actions: Visible

lg (≥ 1024px)
├── Title: Logo only (text hidden)
├── All elements: Visible
└── Layout: Left-aligned
```

---

## 🧩 Component Relationships

### **Independent Components** (No internal dependencies)

- `InfoBadge.jsx`
- `GenreTag.jsx`
- `ActionButton.jsx`
- `MovieTitle.jsx`
- `MovieLogo.jsx`
- `MovieDescription.jsx`
- `BannerBackground.jsx`

### **Composite Components** (Use atomic components)

- `MovieInfo.jsx` → uses `InfoBadge`
- `GenreList.jsx` → uses `GenreTag`
- `ActionButtons.jsx` → uses `ActionButton`

### **Container Components** (Use composite + atomic)

- `BannerContent.jsx` → uses all display/container components

### **Main Component** (Orchestrates everything)

- `BannerHome.jsx` → uses layout components + hook + data

---

## 📦 Import Patterns

### **Option 1: Main Component Only** (Recommended)

```jsx
import BannerHome from "./components/BannerHome";

<BannerHome movie={movieData} />;
```

### **Option 2: Named Exports** (Advanced)

```jsx
import {
  BannerBackground,
  InfoBadge,
  ActionButton,
  useBannerConfig,
} from "./components/BannerHome";
```

### **Option 3: Individual Imports** (Direct)

```jsx
import InfoBadge from "./components/BannerHome/InfoBadge";
import GenreTag from "./components/BannerHome/GenreTag";
```

---

## 🔧 Customization Points

### **1. Styling**

Each component accepts Tailwind classes. To customize:

- Edit component files directly
- Or wrap with custom styles

### **2. Behavior**

Customize via `useBannerConfig` hook:

```jsx
const { infoBadges, actionButtons } = useBannerConfig(movieData);

// Add custom badges
const custom = [...infoBadges, { label: "New" }];
```

### **3. Layout**

Modify `BannerContent.jsx` to change:

- Component order
- Responsive breakpoints
- Spacing/padding

### **4. Data**

Update `mockBannerData.js` for:

- Default fallback data
- Testing scenarios
- Development mode

---

## ✅ Best Practices

### **When to use sub-components directly:**

- Building custom banner variants
- Reusing elements in other pages
- Creating specialized layouts

### **When to use main component:**

- Standard banner display
- Quick implementation
- Consistent styling needed

### **When to modify:**

- **Atomic components**: For styling changes
- **Composite components**: For grouping logic
- **Container components**: For layout changes
- **Main component**: For prop interfaces
- **Hook**: For behavior/side effects

---

## 🚀 Adding New Features

### **Step 1: Create Component**

```jsx
// BannerHome/NewComponent.jsx
const NewComponent = ({ prop }) => <div>{prop}</div>;
export default NewComponent;
```

### **Step 2: Export**

```jsx
// BannerHome/index.js
export { default as NewComponent } from "./NewComponent";
```

### **Step 3: Use**

```jsx
// BannerContent.jsx or BannerHome.jsx
import NewComponent from "./NewComponent";

<NewComponent prop={value} />;
```

### **Step 4: Document**

Update README.md with:

- Component description
- Props
- Usage example

---

## 📝 Maintenance Checklist

- [ ] All components have JSDoc comments
- [ ] Props are clearly documented
- [ ] Responsive behavior is tested
- [ ] No linter errors
- [ ] README is up to date
- [ ] Export in index.js
- [ ] Follows existing patterns

---

## 🎯 Design Principles

1. **Single Responsibility**: Each component does one thing
2. **Composition**: Build complex UIs from simple parts
3. **Reusability**: Components work in multiple contexts
4. **Flexibility**: Easy to customize and extend
5. **Maintainability**: Clear structure and documentation
6. **Performance**: Minimal re-renders with useMemo
7. **Accessibility**: ARIA labels and semantic HTML

---

## 📚 Related Components

- `Header` - Navigation component
- `MovieCard` - Movie card with hover
- `SectionRow` - Horizontal movie list
- `CategoryChips` - Category selection

These can potentially reuse:

- `InfoBadge` (for movie metadata)
- `GenreTag` (for genre filters)
- `ActionButton` (for CTAs)
