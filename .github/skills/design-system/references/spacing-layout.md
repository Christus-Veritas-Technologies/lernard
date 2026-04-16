# Spacing & Layout

## Spacing Scale

Base unit: 4px. All spacing uses Tailwind's default scale (1 unit = 0.25rem = 4px).

| Tailwind | Pixels | Use |
|---|---|---|
| `1` | 4px | Tight inline gaps (icon + label) |
| `2` | 8px | Compact element spacing, pill padding-x |
| `3` | 12px | Between items in a list, card gap in tight layouts |
| `4` | 16px | Standard card padding, between related elements |
| `5` | 20px | Card padding (generous), section heading margin-bottom |
| `6` | 24px | Section gap (standard), card padding (spacious) |
| `8` | 32px | Section gap (generous), screen top padding |
| `10` | 40px | Major section separation |
| `12` | 48px | Screen-level vertical separation |
| `16` | 64px | Hero section spacing (web only) |
| `20` | 80px | Landing page section gap (web only) |

**Rule:** Never use arbitrary spacing (`p-[13px]`). Always use the scale tokens above.

## Card Anatomy

Cards are the primary compositional unit in Lernard. Every piece of content lives in a card.

```
┌─────────────────────────────────────────┐
│  p-4 to p-6                             │  ← Inner padding
│                                         │
│  Title                    text-lg       │
│  gap-1                                  │
│  Description              text-sm       │
│  gap-3                                  │
│  [Content area]                         │
│  gap-3                                  │
│  [CTA row]                              │
│                                         │
└─────────────────────────────────────────┘
   rounded-2xl (16px)
   bg-surface
   shadow-sm (light mode only)
   border border-border (dark mode only)
```

### Card Variants

| Variant | Padding | Corner Radius | Shadow |
|---|---|---|---|
| Standard card | `p-4` | `rounded-2xl` | `shadow-sm` |
| Compact card (list item) | `p-3` | `rounded-xl` | `shadow-sm` |
| Feature card (hero/CTA) | `p-6` | `rounded-2xl` | `shadow-md` |
| Inline card (embedded) | `p-3` | `rounded-lg` | none |
| Sheet/Modal | `p-6` | `rounded-t-3xl` (native) / `rounded-2xl` (web) | `shadow-lg` |

**Rules:**
- Cards always have `bg-surface` — never transparent or `bg-background`
- Between cards: `gap-3` (12px) in lists, `gap-4` (16px) in grids
- Card corner radius is always `rounded-2xl` (16px) minimum — friendly, approachable feel
- Nested cards (card inside card) use `rounded-xl` (12px) to create hierarchy

## Screen Layout

### Screen Edge Padding

| Platform / Viewport | Horizontal Padding | Tailwind |
|---|---|---|
| Mobile (native) | 16px | `px-4` |
| Mobile web (<640px) | 16px | `px-4` |
| Tablet (640-1024px) | 24px | `sm:px-6` |
| Desktop (1024-1280px) | 32px | `lg:px-8` |
| Wide desktop (>1280px) | 64px | `xl:px-16` |

### Content Max Width

On desktop web, content must be constrained:

```html
<main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
```

Max content width: `max-w-6xl` (1152px). Beyond this, content centers with background extending to edges.

### Vertical Screen Structure

Every screen follows this vertical flow:

```
┌──────────────────────────────┐
│  Safe area / status bar      │  ← Native only
├──────────────────────────────┤
│  Header / greeting (80-120px)│  ← py-6 to py-8
├──────────────────────────────┤
│  Content area (scrollable)   │  ← gap-6 between sections
│    Section 1                 │
│    Section 2                 │
│    Section 3                 │
├──────────────────────────────┤
│  Bottom navigation           │  ← Fixed, 56-64px
└──────────────────────────────┘
```

**Rules:**
- Header/greeting section: always present on main screens, `py-6` padding, contains personalized greeting or screen title
- Content sections separated by `gap-6` (24px) or `gap-8` (32px)
- Bottom padding on scrollable content: `pb-24` (96px) to clear bottom navigation
- No horizontal scrolling — ever. Content wraps or truncates

## Responsive Grid

### Mobile (< 640px)
Single column. Full-width cards with `gap-3`.

```html
<div className="flex flex-col gap-3">
```

### Tablet (640px - 1024px)
Two columns for card grids. Full-width for content readers (lessons, quizzes).

```html
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

### Desktop (> 1024px)
Three to four columns for card grids. Sidebar navigation.

```html
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

**Rules:**
- Lesson reader, quiz, and chat screens are always single-column (max-w-2xl centered)
- Dashboard/home screens use the responsive grid
- Grid items should be equal height within a row — use `items-stretch`

## Navigation

### Mobile (Native)
Bottom tab bar with 5 tabs: Home, Learn, Quiz, Progress, Chat.

```
Tab bar height: 56px (h-14)
Icon size: 24px
Label: text-xs
Active: primary-400
Inactive: text-secondary
```

### Mobile Web (< 768px)
Bottom navigation bar matching native tab layout.

### Desktop Web (≥ 1024px)
Fixed left sidebar, 240px wide.

```
Sidebar width: 240px (w-60)
Sidebar bg: surface
Item height: 40px (h-10)
Item padding: px-3
Active item: bg-primary-50 text-primary-400 rounded-lg
Inactive item: text-secondary hover:bg-background-subtle rounded-lg
```

### Tablet Web (768px - 1024px)
Collapsed sidebar (icons only, 64px wide) or bottom bar. Expand on hover.

## Touch Targets

All interactive elements must meet minimum touch target sizes:

| Element | Minimum Size | Tailwind |
|---|---|---|
| Button | 44×44px | `min-h-11 min-w-11` |
| Icon button | 44×44px | `h-11 w-11` (with padding around icon) |
| List item | 44px height | `min-h-11` |
| Tab bar item | 44px height | `min-h-11` |
| Checkbox / Radio | 44×44px touch area | Wrapper `p-2` around 20px control |

**Rule:** If a tap target is smaller than 44px, add transparent padding to reach 44px. This is non-negotiable for accessibility and usability on mobile.

## Common Layout Patterns

### Home Screen
```
[Greeting header]                    py-6
[Continue Learning card]             Feature card (p-6)
  gap-4
[Daily Goal ring + streak]           Compact card (p-4)
  gap-6
[Subject cards grid]                 2-col grid, gap-3
  gap-6
[Recent sessions]                    List with compact cards
  pb-24
```

### Lesson Reader
```
[Progress bar]                       Fixed top, h-1
[Content area]                       max-w-2xl mx-auto px-4
  [Hook section]                     gap-6 between sections
  [Concept sections]                 gap-4 between numbered items
  [Examples]                         gap-4
  [Recap bullets]                    gap-2 between bullets
  pb-32
[Bottom CTA bar]                     Fixed bottom, p-4
```

### Quiz
```
[Progress indicator]                 Fixed top, p-4
[Question card]                      max-w-2xl mx-auto, p-6
  [Question text]
  gap-4
  [Answer options]                   gap-3 between options
[Bottom area]                        Fixed, p-4
```

## Anti-Patterns

- **Never use arbitrary spacing** (`mt-[13px]`) — always use scale tokens
- **Never skip the card wrapper** — content should never float directly on the background
- **Never exceed max-w-6xl** for main content on desktop
- **Never use horizontal scroll** — wrap, truncate, or paginate instead
- **Never place interactive elements closer than 8px apart** — thumb-friendly spacing
- **Never mix grid and flex for the same layout level** — choose one per container
- **Never put more than 5 items in bottom navigation** — cognitive overload
