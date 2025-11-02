# 📁 CinePhile - Project Structure

## 🗂️ Cấu Trúc Thư Mục Sau Refactor

```
src/
├── components/           # UI Components
│   ├── admin/           # Admin Dashboard Components
│   │   ├── AdminSidebar.jsx
│   │   ├── StatCard.jsx
│   │   ├── MovieTable.jsx
│   │   ├── UserTable.jsx
│   │   ├── MovieFormModal.jsx
│   │   └── UserFormModal.jsx
│   │
│   ├── auth/            # Authentication Components
│   │   ├── AuthModal.jsx
│   │   ├── README.md
│   │   └── USER_AUTH_GUIDE.md
│   │
│   ├── common/          # Reusable Components
│   │   ├── Pagination.jsx
│   │   ├── ResponsiveGrid.jsx
│   │   ├── ScrollContainer.jsx
│   │   ├── SectionHeader.jsx
│   │   ├── Toast.jsx
│   │   ├── ToastContainer.jsx
│   │   ├── WithHoverCard.jsx
│   │   └── ...
│   │
│   ├── Header/          # Header Components
│   │   ├── constants.js          # GENRE_CATEGORIES, COUNTRY_CATEGORIES
│   │   ├── DesktopUserMenu.jsx
│   │   ├── MobileUserMenu.jsx
│   │   ├── SearchBar.jsx
│   │   └── ...
│   │
│   ├── movie-detail/    # Movie Detail Components
│   ├── MovieCard/       # Movie Card Components
│   ├── BannerHome/      # Banner Components
│   ├── Top10Movie/      # Top 10 Components
│   ├── watch/           # Watch Page Components
│   ├── account/         # Account Page Components
│   │
│   ├── FilteredMovies.jsx      # Reusable filtered page (genre/country)
│   ├── ProtectedRoute.jsx      # Route protection with role check
│   └── ...
│
├── pages/               # Page Components (Routes)
│   ├── HomePage.jsx
│   ├── GenrePage.jsx           # Wrapper for FilteredMovies
│   ├── CountryPage.jsx         # Wrapper for FilteredMovies
│   ├── MovieDetail.jsx
│   ├── WatchPage.jsx
│   ├── AccountPage.jsx
│   └── AdminDashboard.jsx
│
├── services/            # API Services
│   ├── authService.js          # Authentication API
│   ├── adminService.js         # Admin CRUD API
│   └── api.js                  # General API client
│
├── hooks/               # Custom React Hooks
│   ├── useAuth.js              # Authentication hook
│   ├── useToast.js             # Toast notifications
│   ├── usePagination.js        # Pagination logic
│   └── useMovieHover.js        # Hover card logic
│
├── data/                # Mock Data
│   ├── mockData.js             # Movies, comments, sections
│   ├── mockUsers.js            # User database, templates
│   ├── adminMockData.js        # Admin stats, charts
│   └── README.md
│
├── constants/           # Constants & Configuration
│   ├── auth.js                 # Auth constants, validation rules
│   └── admin.js                # Admin tabs, permissions, options
│
├── utils/               # Utility Functions
│   └── slugify.js              # String utilities (slugify, buildSlugMap)
│
├── styles/              # Global Styles
│   ├── Toast.css
│   ├── TopMovie.css
│   └── FONT_CONFIG.md
│
└── assets/              # Static Assets
    └── images/
```

---

## 📦 File Organization Principles

### 1. **Separation of Concerns**

#### Data Layer (`data/`)
- `mockData.js` - Movies, banners, comments cho frontend
- `mockUsers.js` - User database, avatar helpers
- `adminMockData.js` - Admin-specific stats, charts

#### Constants (`constants/`)
- `auth.js` - API URLs, validation rules, error messages
- `admin.js` - Dashboard config, permissions, options

#### Utils (`utils/`)
- `slugify.js` - String manipulation, slug generation
- Future: `formatters.js`, `validators.js`, `dateUtils.js`

#### Services (`services/`)
- `authService.js` - Login, register, logout
- `adminService.js` - Admin CRUD operations
- `api.js` - Base API client

---

## 🔄 Import Patterns

### ✅ Good Examples

```javascript
// Import utilities
import { slugify, buildSlugMap } from "../utils/slugify";

// Import constants
import { AUTH_ERRORS, VALIDATION_RULES } from "../constants/auth";
import { ADMIN_TABS, ADMIN_MENU_ITEMS } from "../constants/admin";

// Import data
import { MOCK_USERS, DEFAULT_USER_TEMPLATE } from "../data/mockUsers";
import { MOCK_ADMIN_STATS } from "../data/adminMockData";

// Import services
import * as authService from "../services/authService";
import { movieAPI, userAPI } from "../services/adminService";
```

### ❌ Avoid

```javascript
// Don't hardcode data in components
const users = [{id: 1, name: "Admin"}, ...]; // ❌

// Don't duplicate utility functions
const slugify = (str) => ...; // ❌ Use utils/slugify.js

// Don't mix constants with logic
const API_URL = "http://..."; // ❌ Use constants/auth.js
```

---

## 📊 Data Flow

### Authentication Flow
```
AuthModal (UI)
    ↓
authService.js (Business Logic)
    ↓
mockUsers.js (Data) + auth.js (Constants)
    ↓
useAuth.js (State Management)
    ↓
ProtectedRoute (Guard)
    ↓
AdminDashboard (Protected Page)
```

### Genre/Country Filtering Flow
```
GenrePage/CountryPage (Wrapper)
    ↓
FilteredMovies (Logic)
    ↓
slugify.js (Utils) + Header/constants.js (Labels)
    ↓
mockData.js (Movies)
    ↓
MovieCard (Display)
```

### Admin CRUD Flow
```
MovieTable/UserTable (UI)
    ↓
MovieFormModal/UserFormModal (Form)
    ↓
adminService.js (API)
    ↓
localStorage (Mock DB)
    ↓
Component State Update
```

---

## 🎯 Benefits of New Structure

### 1. **Maintainability**
- Easy to find where data/constants are defined
- Single source of truth
- No duplication

### 2. **Scalability**
- Add new utilities without touching components
- Extend constants without code changes
- Easy to swap mock → real API

### 3. **Testability**
- Mock data in one place → easy to update for tests
- Constants can be imported in tests
- Utils can be unit tested independently

### 4. **Readability**
- Clear separation: What vs How vs Where
- Imports tell the story
- Less code in components

### 5. **Collaboration**
- Team members know where to add new data
- Less merge conflicts
- Consistent patterns

---

## 🔧 Migration Guide (Mock → Real API)

### Step 1: Update Constants
```javascript
// constants/auth.js
export const USE_MOCK_AUTH = false; // Change to false
export const API_URL = "https://api.cinephile.com"; // Real URL
```

### Step 2: Update Services
```javascript
// services/authService.js
// Remove MOCK_USERS import
// Keep only real API calls (already there)
```

### Step 3: Backend Response Format
Ensure backend returns same structure:
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "username": "Admin",
    "email": "admin@example.com",
    "role": "admin",
    "avatar": "https://...",
    "premium": true,
    "coins": 9999
  }
}
```

---

## 📝 File Naming Conventions

### Components
- PascalCase: `MovieCard.jsx`, `AdminSidebar.jsx`
- Folder for related: `MovieCard/`, `admin/`

### Services
- camelCase: `authService.js`, `adminService.js`

### Data
- camelCase with prefix: `mockData.js`, `mockUsers.js`

### Constants
- camelCase: `auth.js`, `admin.js`
- Export UPPER_SNAKE_CASE: `AUTH_ERRORS`, `ADMIN_TABS`

### Utils
- camelCase: `slugify.js`, `formatters.js`

---

## 🚀 Quick Reference

### Need to add new genre?
→ `components/Header/constants.js` → `GENRE_CATEGORIES`

### Need to add test user?
→ `data/mockUsers.js` → `MOCK_USERS`

### Need to change validation rules?
→ `constants/auth.js` → `VALIDATION_RULES`

### Need to add admin permission?
→ `constants/admin.js` → `PERMISSIONS`

### Need to change error message?
→ `constants/auth.js` → `AUTH_ERRORS`

### Need string utility?
→ `utils/slugify.js` or create new util file

---

## ✨ Best Practices

1. **Don't hardcode** - Use constants
2. **Don't duplicate** - Use utils
3. **Don't mix concerns** - Separate data/logic/UI
4. **Do export clearly** - Named exports for multiple, default for single
5. **Do document** - JSDoc comments for public APIs

---

## 📚 Related Documentation

- `ADMIN_COMPLETE_GUIDE.md` - Admin features guide
- `LOGIN_CREDENTIALS.md` - Test accounts
- `HOW_TO_ACCESS_ADMIN.md` - Access instructions
- `components/auth/USER_AUTH_GUIDE.md` - Auth integration
- `data/README.md` - Mock data usage

---

**Cấu trúc mới giúp code dễ đọc, dễ maintain, và dễ scale! 🎉**

