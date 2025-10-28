# Header Dropdown Components

Modular and reusable dropdown navigation system supporting both mobile and desktop layouts.

## 📁 Structure

```
Header/
├── index.js                    # Central export point
├── DropdownMenu.jsx            # Main dropdown component
├── DropdownGrid.jsx            # Reusable grid layout
├── NavigationLinks.jsx         # Navigation wrapper
└── constants.js                # Categories data
```

---

## 🎯 Main Components

### 1. DropdownMenu

The core dropdown component that adapts to mobile and desktop.

```jsx
import { DropdownMenu } from "./components/Header";

// Desktop (hover-based)
<DropdownMenu
  label="Thể loại"
  items={GENRE_CATEGORIES}
  isMobile={false}
/>

// Mobile (click-based)
<DropdownMenu
  label="Thể loại"
  items={GENRE_CATEGORIES}
  isMobile={true}
/>
```

**Props:**

- `label` (string, required): Dropdown trigger label
- `items` (Array, required): Array of `{ label, href }` objects
- `isMobile` (boolean, optional): Mobile or desktop layout (default: `false`)
- `className` (string, optional): Additional CSS classes

**Features:**

- ✅ Desktop: Hover-triggered with `::after` arrow
- ✅ Mobile: Click-triggered with chevron icon
- ✅ Auto-closes on outside click (mobile)
- ✅ Smooth animations (fade, rotate)
- ✅ Responsive grid layout

---

### 2. DropdownGrid

Reusable grid component for displaying dropdown items.

```jsx
import { DropdownGrid } from "./components/Header";

<DropdownGrid items={items} columns={4} onItemClick={() => console.log("clicked")} />;
```

**Props:**

- `items` (Array, required): Array of `{ label, href }` objects
- `columns` (number, optional): Number of columns (2-5, default: 4)
- `onItemClick` (Function, optional): Callback when item is clicked
- `className` (string, optional): Additional CSS classes

**Features:**

- ✅ Responsive grid (2-5 columns)
- ✅ Hover effects (background, border, text color)
- ✅ Text ellipsis for long labels
- ✅ `title` attribute for tooltips

---

### 3. NavigationLinks

Wrapper component that renders navigation links with dropdowns.

```jsx
import { NavigationLinks } from "./components/Header";

// Desktop
<NavigationLinks
  className="flex items-center gap-5"
  isMobile={false}
/>

// Mobile
<NavigationLinks
  className="space-y-2"
  isMobile={true}
/>
```

**Props:**

- `className` (string, optional): Additional CSS classes
- `isMobile` (boolean, optional): Mobile or desktop layout (default: `false`)

**Features:**

- ✅ Automatically renders dropdowns for "Thể loại" and "Quốc gia"
- ✅ Simple links for other navigation items
- ✅ Type-based rendering (`link` vs `dropdown`)

---

## 🔄 Component Hierarchy

```
NavigationLinks
│
├── For each link:
│   │
│   ├── IF type === "dropdown"
│   │   └── DropdownMenu
│   │       ├── Trigger (link/button with ::after arrow)
│   │       └── Dropdown Container
│   │           └── DropdownGrid
│   │               └── Items (grid of links)
│   │
│   └── IF type === "link"
│       └── Simple <a> tag
```

---

## 🎨 Desktop vs Mobile

### Desktop Behavior

**Trigger:**

```jsx
<a className="dropdown-link">
  Thể loại
  {/* ::after arrow */}
</a>
```

**Dropdown:**

- ✅ Hover to open (`group-hover`)
- ✅ Arrow rotates 180° on hover
- ✅ 4-column grid layout
- ✅ Fade in/out animation
- ✅ Max width: `min(90vw, 48rem)`
- ✅ Max height: `60vh` with scroll

**CSS `::after`:**

```css
.dropdown-link::after {
  content: "";
  border-top: 4px solid currentColor;
  /* Creates triangle pointing down */
}

.group:hover .dropdown-link::after {
  transform: rotate(180deg);
  /* Points up on hover */
}
```

---

### Mobile Behavior

**Trigger:**

```jsx
<button onClick={toggle}>
  Thể loại
  <i className="fa-chevron-down" />
</button>
```

**Dropdown:**

- ✅ Click to toggle (`useState`)
- ✅ Chevron icon rotates 180° when open
- ✅ 2-column grid layout
- ✅ Closes on outside click
- ✅ Closes when item is clicked
- ✅ Max height: `300px` with scroll

---

## 📊 Data Structure

### Links Configuration

```javascript
const links = [
  {
    label: "Phim Lẻ",
    href: "/phim-le",
    type: "link",
  },
  {
    label: "Thể loại",
    type: "dropdown",
    items: GENRE_CATEGORIES,
  },
  // ...
];
```

**Types:**

- `link`: Simple anchor tag
- `dropdown`: Dropdown menu with items

### Category Data

```javascript
// constants.js
export const GENRE_CATEGORIES = [
  { label: "Anime", href: "/genre/anime" },
  { label: "Hành Động", href: "/genre/hanh-dong" },
  // ... 60 more
];

export const COUNTRY_CATEGORIES = [
  { label: "Hàn Quốc", href: "/country/han-quoc" },
  { label: "Mỹ", href: "/country/my" },
  // ... 10 more
];
```

---

## 🎯 Reusability Features

### 1. **Flexible Grid Columns**

```jsx
// Desktop: 4 columns
<DropdownGrid items={items} columns={4} />

// Mobile: 2 columns
<DropdownGrid items={items} columns={2} />

// Custom: 3 columns
<DropdownGrid items={items} columns={3} />
```

---

### 2. **Independent DropdownMenu**

Can be used anywhere, not just in navigation:

```jsx
// In sidebar
<DropdownMenu
  label="Filters"
  items={filterOptions}
  isMobile={false}
/>

// In footer
<DropdownMenu
  label="Categories"
  items={categories}
  isMobile={true}
/>
```

---

### 3. **Customizable Styling**

```jsx
<DropdownMenu
  label="Custom"
  items={items}
  className="custom-dropdown-trigger"
/>

<DropdownGrid
  items={items}
  className="custom-grid"
/>
```

---

## ✨ Key Benefits

### **1. Single Component, Dual Behavior** ⭐⭐⭐⭐⭐

```javascript
// Same component, different props
<DropdownMenu isMobile={false} /> // Desktop hover
<DropdownMenu isMobile={true} />  // Mobile click
```

### **2. Reusable Grid** ⭐⭐⭐⭐⭐

```javascript
// Used in desktop dropdown
<DropdownGrid columns={4} />

// Used in mobile dropdown
<DropdownGrid columns={2} />

// Can be used elsewhere
<DropdownGrid columns={3} items={customItems} />
```

### **3. Clean Separation** ⭐⭐⭐⭐⭐

```
NavigationLinks  → Navigation logic
  ↓
DropdownMenu    → Dropdown behavior
  ↓
DropdownGrid    → Grid layout
```

### **4. Easy to Extend** ⭐⭐⭐⭐⭐

```javascript
// Add new dropdown category
const links = [
  // ...existing
  {
    label: "New Category",
    type: "dropdown",
    items: NEW_ITEMS,
  },
];
```

---

## 🔧 Customization Examples

### Change Grid Columns

```jsx
// Desktop: 5 columns instead of 4
<DropdownGrid items={items} columns={5} />
```

### Add Click Handler

```jsx
<DropdownGrid
  items={items}
  onItemClick={(e) => {
    console.log("Item clicked:", e.target.textContent);
    // Custom analytics, etc.
  }}
/>
```

### Custom Dropdown Width

```jsx
// In DropdownMenu, change:
className = "w-[min(90vw,48rem)]"; // Current

// To:
className = "w-[min(90vw,60rem)]"; // Wider
```

### Custom Mobile Columns

```jsx
// In NavigationLinks mobile section:
<DropdownGrid items={link.items} columns={3} />
```

---

## 📱 Responsive Breakpoints

| Screen             | Layout         | Columns | Trigger |
| ------------------ | -------------- | ------- | ------- |
| **Mobile** (< lg)  | Vertical stack | 2       | Click   |
| **Desktop** (≥ lg) | Horizontal     | 4       | Hover   |

---

## 🎉 Summary

### **Components Created:**

1. ✅ `DropdownMenu.jsx` - Main dropdown logic
2. ✅ `DropdownGrid.jsx` - Reusable grid layout
3. ✅ Updated `NavigationLinks.jsx` - Integration
4. ✅ `index.js` - Central exports

### **Features:**

- ✅ Works on mobile (click) and desktop (hover)
- ✅ `::after` pseudo-class arrow
- ✅ Smooth animations
- ✅ Auto-close on outside click (mobile)
- ✅ Responsive grid (2-4 columns)
- ✅ Highly reusable components
- ✅ Clean separation of concerns
- ✅ Easy to customize and extend

### **Data:**

- ✅ 62 genre categories
- ✅ 12 country categories
- ✅ Centralized in `constants.js`

**Perfect for production use!** 🚀
