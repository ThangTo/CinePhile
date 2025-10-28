# 🎣 Custom Hooks Documentation

## 📚 Available Hooks

### `useMovieHover` - Movie Hover Card Logic

Custom hook để quản lý logic hover cho movie cards với smooth animations và debounced behavior.

---

## 📖 Documentation Files

| File                           | Purpose                                    |
| ------------------------------ | ------------------------------------------ |
| `useMovieHover.js`             | ✅ Production hook (use this!)             |
| `useMovieHover.debug.js`       | 🐛 Debug version với detailed console logs |
| `useMovieHover.explanation.md` | 📚 Chi tiết giải thích cách hoạt động      |
| `useMovieHover.diagram.md`     | 🎨 Visual diagrams và flow charts          |

---

## 🚀 Quick Start

```javascript
import { useMovieHover } from "../hooks/useMovieHover";

const MyComponent = () => {
  const { showHoverCard, isAnimating, handleMouseEnter, handleMouseLeave } = useMovieHover(
    500,
    100
  );

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {/* Your content */}

      {showHoverCard && (
        <div className={isAnimating ? "animate-pop-up" : "opacity-0"}>
          {/* Hover card content */}
        </div>
      )}
    </div>
  );
};
```

---

## 🎯 useMovieHover API

### Parameters

```typescript
useMovieHover(
  showDelay?: number,  // Default: 500ms
  hideDelay?: number   // Default: 100ms
)
```

### Returns

```typescript
{
  showHoverCard: boolean,        // Should hover card be visible?
  isAnimating: boolean,          // Is animation active?
  handleMouseEnter: () => void,  // Mouse enter handler
  handleMouseLeave: () => void   // Mouse leave handler
}
```

---

## 💡 How It Works - ELI5

### 🎯 **useRef KHÔNG phải để "detect" hover!**

**Browser events** (`onMouseEnter`, `onMouseLeave`) mới detect hover.

**useRef** chỉ là "storage box" để lưu timeout ID.

### 🔄 Simple Flow:

```
1. User hovers
   → Browser detects → calls handleMouseEnter()
   → Schedule show after 500ms
   → Save timeout ID in ref

2. 500ms later
   → Timeout executes → Show hover card

3. User leaves
   → Browser detects → calls handleMouseLeave()
   → Cancel pending show (if any)
   → Schedule hide after 100ms
```

### 📦 What's in the Refs?

```javascript
hoverTimeoutRef.current = 123; // ← Timeout ID (number)
hideTimeoutRef.current = 456; // ← Timeout ID (number)

// NOT DOM elements!
// Just numbers to identify timers
```

---

## 🤔 Why useRef and not useState?

### ❌ Bad: useState

```javascript
const [timeoutId, setTimeoutId] = useState(null);

handleMouseEnter() {
  setTimeoutId(setTimeout(...));  // ⚠️ Triggers re-render
}

handleMouseLeave() {
  clearTimeout(timeoutId);  // ⚠️ Might be stale
  setTimeoutId(null);       // ⚠️ Another re-render
}
```

**Problems:**

- 🐌 Unnecessary re-renders
- 🐛 Async updates (stale values)
- 🐛 Closure issues

### ✅ Good: useRef

```javascript
const timeoutRef = useRef(null);

handleMouseEnter() {
  timeoutRef.current = setTimeout(...);  // ✅ No re-render
}

handleMouseLeave() {
  clearTimeout(timeoutRef.current);  // ✅ Always latest
  timeoutRef.current = null;         // ✅ No re-render
}
```

**Benefits:**

- ⚡ No unnecessary re-renders
- ✅ Synchronous updates
- ✅ No closure issues
- 🎯 Perfect for IDs, timers

---

## 🎬 Scenarios

### Scenario 1: User hovers and waits

```
t=0ms:   User hovers → Schedule show
t=500ms: Timeout executes → Card shows ✅
```

### Scenario 2: User hovers but leaves quickly

```
t=0ms:   User hovers → Schedule show (ID: 123)
t=200ms: User leaves → Cancel 123 ❌
Result:  Card NEVER shows ✅
```

### Scenario 3: Moving between card and hover card

```
t=0ms:    User hovers card → Schedule show
t=500ms:  Card shows
t=1000ms: User moves to hover card
          • Leave event → Schedule hide (ID: 456)
          • Enter event → Cancel 456 ❌
Result:   Card stays visible ✅
```

---

## 🐛 Debug Mode

Want to see what's happening? Use debug version:

```javascript
// Change this:
import { useMovieHover } from "../hooks/useMovieHover";

// To this:
import { useMovieHoverDebug as useMovieHover } from "../hooks/useMovieHover.debug";
```

Then open browser console and hover! You'll see detailed logs:

```
============================================================
🖱️  MOUSE ENTER EVENT TRIGGERED
============================================================
📊 Current state:
   - showHoverCard: false
   - isAnimating: false
   - hoverTimeoutRef.current: null
   - hideTimeoutRef.current: null

✓ No pending hide timeout to cancel

⏳ Creating new SHOW timeout (500ms delay)...
✅ Stored timeout ID in ref: 123
============================================================
```

---

## 📚 Learn More

### For Detailed Explanation:

Read `useMovieHover.explanation.md` - Full deep dive with examples

### For Visual Diagrams:

Read `useMovieHover.diagram.md` - Flow charts and timelines

### For Debugging:

Use `useMovieHover.debug.js` - Version with console logs

---

## 🎯 TL;DR

1. **useRef** = Storage box cho timeout IDs, KHÔNG phải để detect hover
2. **Browser events** = Detect hover thực sự (`onMouseEnter/Leave`)
3. **Delays** = 500ms để show, 100ms buffer để move to hover card
4. **No re-render** = useRef không trigger re-render khi lưu ID
5. **Cancellation** = Clear timeout nếu user moves away quickly

---

## 🔗 Related Components

- `WithHoverCard.jsx` - HOC sử dụng hook này
- `MovieCard.jsx` - Example usage
- `Top10Card.jsx` - Another example

---

## 💬 Questions?

Read the detailed explanation files or check the debug version!

**Key insight:** Browser events tell us WHEN hover happens, useRef just stores timeout IDs for cancellation. That's it! 🎉
