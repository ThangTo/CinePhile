# Font Configuration

## Font Family

The project uses a system font stack for optimal performance and native look across different platforms.

### Font Stack

```
system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans",
"Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
"Segoe UI Symbol", "Noto Color Emoji"
```

### Configuration

**Location:** `tailwind.config.js`

```javascript
fontFamily: {
  sans: [
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Noto Sans",
    "Liberation Sans",
    "Arial",
    "sans-serif",
    "Apple Color Emoji",
    "Segoe UI Emoji",
    "Segoe UI Symbol",
    "Noto Color Emoji",
  ],
}
```

### Usage

The font is automatically applied to the entire application via the `body` element in `index.css`:

```css
@layer base {
  body {
    @apply bg-[#0b1220] text-white font-sans;
  }
}
```

### Font Fallback Order

1. **system-ui** - Uses the system's default UI font
2. **-apple-system** - Apple system font (San Francisco on macOS/iOS)
3. **Segoe UI** - Windows system font
4. **Roboto** - Android system font
5. **Helvetica Neue** - Fallback for older macOS
6. **Noto Sans** - Google's font for international support
7. **Liberation Sans** - Linux fallback
8. **Arial** - Universal fallback
9. **sans-serif** - Generic sans-serif fallback
10. **Emoji fonts** - For proper emoji rendering

### Benefits

- ✅ **Performance**: No external font loading required
- ✅ **Native Look**: Uses platform-specific fonts
- ✅ **Fast Loading**: Zero network requests
- ✅ **Accessibility**: System fonts are optimized for readability
- ✅ **Emoji Support**: Proper emoji rendering across platforms
- ✅ **Consistency**: Tailwind's `font-sans` utility can be used anywhere

### Custom Usage

You can use the font family anywhere in your components:

```jsx
// Using Tailwind class
<div className="font-sans">Content</div>

// It's already applied globally, so no need to add it manually
<p>This text uses the system font stack</p>
```

### Override for Specific Elements

If you need a different font for specific elements:

```jsx
// Use a different font family
<div className="font-mono">Code content</div>
<div className="font-serif">Serif content</div>
```

## Notes

- The font stack is designed to work across all major platforms
- No need to import external fonts (Google Fonts, etc.)
- Reduces page load time and improves performance
- Provides a consistent, native experience for users
