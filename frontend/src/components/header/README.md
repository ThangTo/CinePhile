# Header Component Structure

## Overview

The Header component has been refactored into smaller, reusable sub-components to improve maintainability and reduce code duplication.

## File Structure

```
Header/
├── Header.jsx                 # Main header component
├── MobileUserMenu.jsx         # Mobile menu with user info
├── DesktopUserMenu.jsx        # Desktop dropdown menu
├── NavigationLinks.jsx        # Navigation links for mobile menu
├── SearchBar.jsx              # Reusable search input
├── constants.js               # Shared constants and CSS classes
└── README.md                  # This file
```

## Components

### `Header.jsx`

Main header component that orchestrates all sub-components.

**Features:**

- Responsive layout (mobile/desktop)
- Scroll-based background transparency
- Mobile menu and search overlays
- User authentication state management

### `MobileUserMenu.jsx`

Mobile-specific user menu with premium upgrade banner.

**Sub-components:**

- `UserInfoCard` - User avatar and premium upgrade section
- `UserStats` - Coin balance and recharge button

**Props:**

- `user` - User object (null if not logged in)
- `onLogout` - Logout handler
- `onOpenAuth` - Open authentication modal handler
- `onClose` - Close menu handler

### `DesktopUserMenu.jsx`

Desktop dropdown menu with user profile and navigation.

**Sub-components:**

- `PremiumBanner` - Premium upgrade section
- `UserStats` - Coin balance display

**Props:**

- `user` - User object
- `showUserMenu` - Boolean to control dropdown visibility
- `onToggle` - Toggle dropdown handler
- `onLogout` - Logout handler
- `menuRef` - Ref for click-outside detection

### `NavigationLinks.jsx`

Grid of navigation links for mobile menu.

**Props:**

- `className` - Additional CSS classes

### `SearchBar.jsx`

Reusable search input component.

**Props:**

- `className` - Additional CSS classes
- `placeholder` - Input placeholder text

### `constants.js`

Shared constants to avoid duplication.

**Exports:**

- `USER_MENU_ITEMS` - Menu items for mobile
- `DESKTOP_MENU_ITEMS` - Menu items for desktop
- `MOBILE_MENU_ITEM_CLASS` - CSS classes for mobile menu items
- `DESKTOP_MENU_ITEM_CLASS` - CSS classes for desktop menu items

## Benefits of This Structure

1. **Reusability**: Components like `SearchBar` can be used in multiple places
2. **Maintainability**: Easier to locate and fix bugs in specific components
3. **Testability**: Each component can be tested independently
4. **Consistency**: Shared constants ensure UI consistency
5. **Readability**: Smaller files are easier to understand
6. **DRY Principle**: No duplicate code for menu items or CSS classes

## Usage Example

```jsx
import Header from "./components/Header";

function App() {
  return (
    <>
      <Header />
      {/* Rest of your app */}
    </>
  );
}
```

## Future Improvements

- Add TypeScript types for better type safety
- Create unit tests for each component
- Add Storybook stories for component documentation
- Implement keyboard navigation for dropdown menus
- Add animation transitions for mobile menu
