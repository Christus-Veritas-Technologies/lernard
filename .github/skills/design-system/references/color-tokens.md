# Color Tokens

## Color Psychology for Learning

Every color choice serves a pedagogical purpose. Learning apps must feel safe, encouraging, and focused — never stressful. Colors signal meaning: progress is green (growth), errors are soft (correction, not punishment), primary actions are calm (trust, not urgency).

## Brand Palette

### Primary — Periwinkle / Lavender Blue

The signature Lernard color. Conveys trust, calm, intelligence.

| Token | Hex | Usage |
|---|---|---|
| `primary-50` | `#F0F2FA` | Hover backgrounds, subtle highlights |
| `primary-100` | `#E0E4F4` | Selected states, active backgrounds |
| `primary-200` | `#C1C9E9` | Borders on active elements |
| `primary-300` | `#A8B5E0` | Secondary buttons, tags |
| `primary-400` | `#7B8EC8` | Primary buttons, links, key icons |
| `primary-500` | `#6478B8` | Primary button hover |
| `primary-600` | `#4F62A3` | Primary button pressed |
| `primary-700` | `#3D4E8A` | Dark mode primary accents |
| `primary-800` | `#2C3A6E` | Dark mode primary surfaces |
| `primary-900` | `#1E2A54` | Dark mode deep backgrounds |

**Usage rules:**
- `primary-400` for all CTAs, links, and interactive elements
- `primary-100` / `primary-50` for selected or active backgrounds
- Never use primary for error states or warnings
- Max one primary CTA per card/section

### Surface & Background

| Token | Light | Dark | Usage |
|---|---|---|---|
| `surface` | `#FFFFFF` | `#1A1A2E` | Card backgrounds, modals, sheets |
| `surface-elevated` | `#FFFFFF` | `#232340` | Elevated cards (with shadow) |
| `background` | `#F0F2F8` | `#121220` | Page/screen background |
| `background-subtle` | `#E8ECF4` | `#1A1A2E` | Section dividers, inset areas |

**Usage rules:**
- Cards always use `surface` with `shadow-sm` in light mode
- Dark mode: no shadows, use `surface-elevated` for hierarchy
- Background is never white — always the soft lavender tint

### Accent Warm — Coral / Peach

Encouragement, energy, celebration. Used sparingly for positive reinforcement.

| Token | Hex | Usage |
|---|---|---|
| `accent-warm-100` | `#FFF0EC` | Badge backgrounds, celebration cards |
| `accent-warm-200` | `#FFD6CC` | Highlight borders |
| `accent-warm-300` | `#FFB7A5` | Icons in encouragement contexts |
| `accent-warm-400` | `#F4A896` | Accent buttons (secondary warm CTA) |
| `accent-warm-500` | `#E8937F` | Hover state for warm accents |

**Usage rules:**
- Streak celebrations, XP earned animations, "well done" cards
- Never for navigation or primary actions
- Max one warm accent element per screen

### Accent Cool — Mint / Sage

Growth, progress, health. Used for positive metrics and advancement.

| Token | Hex | Usage |
|---|---|---|
| `accent-cool-100` | `#EDF7F1` | Progress bar backgrounds |
| `accent-cool-200` | `#C8E6D0` | Growth area highlights |
| `accent-cool-300` | `#A8D8B9` | Progress indicators, strength badges |
| `accent-cool-400` | `#8DC5A3` | Growth icons, positive change arrows |
| `accent-cool-500` | `#72B08C` | Hover on cool accent elements |

**Usage rules:**
- Skill map "Confident" tier, progress bars, daily goal rings
- "Getting there" uses `accent-cool-200` (lighter = still growing)
- Never for errors or warnings

### Category Pastels

Used exclusively for subject/topic differentiation. Gentle — never competing with content.

| Token | Hex | Subject Example |
|---|---|---|
| `category-purple` | `#C4B5E0` | Maths, Logic |
| `category-green` | `#B5E0C4` | Science, Biology |
| `category-yellow` | `#E0D8B5` | History, Geography |
| `category-blue` | `#B5D0E0` | English, Languages |
| `category-pink` | `#E0B5D0` | Art, Music |
| `category-orange` | `#E0C8B5` | Technology, Computing |

**Usage rules:**
- Subject cards, category pills, chart segments
- Always at 100% on white surface, 80% opacity on colored backgrounds
- Text on category colors must be `text-primary` (dark charcoal), never white
- Category colors are assigned at subject creation, consistent per user

### Text

| Token | Light | Dark | Usage |
|---|---|---|---|
| `text-primary` | `#1A1A2E` | `#F0F2F8` | Headings, body text, primary labels |
| `text-secondary` | `#6B7280` | `#9CA3AF` | Descriptions, timestamps, hints |
| `text-tertiary` | `#9CA3AF` | `#6B7280` | Placeholders, disabled states |
| `text-inverse` | `#FFFFFF` | `#1A1A2E` | Text on primary-colored backgrounds |
| `text-link` | `#7B8EC8` | `#A8B5E0` | Inline links (matches primary) |

### Semantic

| Token | Light | Dark | Meaning |
|---|---|---|---|
| `success` | `#4CAF7D` | `#5BC98E` | Achievement, correct answer, mastery |
| `success-bg` | `#EDF7F1` | `#1A2E22` | Success card backgrounds |
| `warning` | `#E5A84B` | `#F0BE6A` | Attention needed, approaching limit |
| `warning-bg` | `#FFF8EC` | `#2E2A1A` | Warning card backgrounds |
| `error` | `#E07B7B` | `#F09090` | Incorrect answer, correction needed |
| `error-bg` | `#FFF0F0` | `#2E1A1A` | Error card backgrounds |

**Critical — error psychology for learning:**
- Error is SOFT red, not aggressive — correction, not punishment
- Error messages use encouraging language: "Not quite — let's try again" not "Wrong"
- Error bg is warm tint, not stark — feels like a nudge, not an alarm
- Quiz "Needs work" tier uses `warning`, not `error` — it's a growth signal

### Border & Divider

| Token | Light | Dark |
|---|---|---|
| `border` | `#E5E7EB` | `#2E2E4A` |
| `border-strong` | `#D1D5DB` | `#3E3E5A` |
| `divider` | `#F3F4F6` | `#1E1E36` |

## Tailwind Configuration

```js
// Extend in tailwind.config.js → theme.extend.colors
colors: {
  primary: {
    50: '#F0F2FA', 100: '#E0E4F4', 200: '#C1C9E9',
    300: '#A8B5E0', 400: '#7B8EC8', 500: '#6478B8',
    600: '#4F62A3', 700: '#3D4E8A', 800: '#2C3A6E',
    900: '#1E2A54',
  },
  surface: '#FFFFFF',
  background: '#F0F2F8',
  'background-subtle': '#E8ECF4',
  'accent-warm': {
    100: '#FFF0EC', 200: '#FFD6CC', 300: '#FFB7A5',
    400: '#F4A896', 500: '#E8937F',
  },
  'accent-cool': {
    100: '#EDF7F1', 200: '#C8E6D0', 300: '#A8D8B9',
    400: '#8DC5A3', 500: '#72B08C',
  },
  category: {
    purple: '#C4B5E0', green: '#B5E0C4', yellow: '#E0D8B5',
    blue: '#B5D0E0', pink: '#E0B5D0', orange: '#E0C8B5',
  },
}
```

## Usage Constraints

1. **Max 3 non-neutral colors per screen** — primary + one accent + one category OR semantic
2. **Primary is for actions** — buttons, links, toggles. Never decorative
3. **Background is never pure white** — always `background` (#F0F2F8) or `surface` (for cards)
4. **Dark mode is not an inversion** — it's a separate considered palette. Every token has an explicit dark variant
5. **Semantic colors carry meaning** — never use success green decoratively, never use error red for non-error states
6. **Category colors are stable per user** — once a subject gets `category-purple`, it stays purple
