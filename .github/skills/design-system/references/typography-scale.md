# Typography Scale

## Philosophy

Typography in a learning app must do two things: be effortlessly readable (students spend long periods reading lessons) and create clear hierarchy (so eyes know where to go). Lernard uses a constrained type scale — no arbitrary sizes, no font soup.

## Font Families

### Native (Expo / React Native)
System defaults via NativeWind — no custom fonts needed:
- **iOS:** SF Pro Text (body), SF Pro Display (headings ≥20px)
- **Android:** Roboto (body + headings)

NativeWind maps these automatically. Do not import or configure custom fonts in the native app unless a future brand refresh requires it.

### Web (Next.js)
- **Primary:** Geist Sans — already configured in `apps/web/app/layout.tsx` as `--font-geist-sans`
- **Monospace:** Geist Mono — for code blocks only, `--font-geist-mono`

Apply via Tailwind: `font-sans` resolves to Geist Sans. No need for `font-[family]` overrides.

## Type Scale

Base: 16px (1rem). All sizes are rem-based for accessibility (respects user font-size preferences).

| Token | Size | Tailwind | Use |
|---|---|---|---|
| `xs` | 12px / 0.75rem | `text-xs` | Captions, timestamps, legal text |
| `sm` | 14px / 0.875rem | `text-sm` | Secondary labels, hint text, metadata |
| `base` | 16px / 1rem | `text-base` | Body text, input values, chat messages |
| `lg` | 18px / 1.125rem | `text-lg` | Card titles, section labels, emphasized body |
| `xl` | 20px / 1.25rem | `text-xl` | Screen subtitles, feature headings |
| `2xl` | 24px / 1.5rem | `text-2xl` | Screen titles, dashboard headings |
| `3xl` | 32px / 2rem | `text-3xl` | Hero text on home/welcome screens |
| `4xl` | 40px / 2.5rem | `text-4xl` | Landing page hero (web only) |

**Rule:** Never use arbitrary font sizes (`text-[17px]`). Always use the scale tokens above.

## Font Weights

| Token | Weight | Tailwind | Use |
|---|---|---|---|
| Regular | 400 | `font-normal` | Body copy, descriptions, chat messages |
| Medium | 500 | `font-medium` | Button labels, input labels, navigation items, pills/chips |
| Semibold | 600 | `font-semibold` | Card titles, section headings, screen titles |
| Bold | 700 | `font-bold` | Hero text, greeting names, XP count, streak numbers |

**Rule:** Heading hierarchy is expressed through weight + size together, never weight alone. A `text-lg font-semibold` card title and `text-2xl font-semibold` screen title are both semibold but clearly different in hierarchy.

## Line Heights

| Context | Value | Tailwind |
|---|---|---|
| Body text | 1.5 (150%) | `leading-normal` |
| Headings | 1.3 (130%) | `leading-snug` |
| Hero / Display | 1.2 (120%) | `leading-tight` |
| Single-line labels | 1 (100%) | `leading-none` |

**Rule:** Multi-line body text (lessons, chat, descriptions) always uses `leading-normal`. Never tighten body line-height — readability for extended reading is critical in a learning app.

## Letter Spacing

| Context | Value | Tailwind |
|---|---|---|
| Body | Default (0) | — |
| Uppercase labels | 0.05em | `tracking-wide` |
| Hero text | -0.01em | `tracking-tight` |

**Rule:** Only use `tracking-wide` on ALL-CAPS labels (rare). Default tracking for everything else.

## Responsive Typography

Mobile-first. Scale up at breakpoints for web — native stays consistent across device sizes.

### Web Breakpoint Scaling

| Element | Mobile (base) | Tablet (md:) | Desktop (lg:) |
|---|---|---|---|
| Screen title | `text-2xl` | `text-3xl` | `text-3xl` |
| Hero text | `text-3xl` | `text-4xl` | `text-4xl` |
| Body text | `text-base` | `text-base` | `text-base` |
| Card title | `text-lg` | `text-lg` | `text-xl` |

**Rule:** Body text never scales — 16px is optimal for reading at all viewport sizes. Only headings and hero text scale up on larger screens.

### Native Sizing

Native app uses fixed sizes — no responsive scaling. The type scale above applies directly. React Native's text rendering + system fonts handle readability across phone and tablet screen densities.

## Common Patterns

### Greeting Header
```
"Good morning, Kin."       → text-2xl font-bold text-primary
"Ready to pick up where    → text-base font-normal text-secondary
 we left off?"
```

### Card Anatomy
```
Card Title                 → text-lg font-semibold text-primary
Description or metadata    → text-sm font-normal text-secondary
CTA label                  → text-sm font-medium text-primary-400
```

### Lesson Content
```
Section heading            → text-xl font-semibold text-primary
Body paragraph             → text-base font-normal text-primary leading-normal
Key term (inline)          → text-base font-medium text-primary-400
Caption / source           → text-xs font-normal text-secondary
```

### Quiz Question
```
Question text              → text-lg font-medium text-primary
Answer option              → text-base font-normal text-primary
Feedback text              → text-sm font-normal text-secondary
```

### Navigation
```
Active tab label           → text-xs font-medium text-primary-400
Inactive tab label         → text-xs font-normal text-secondary
Sidebar item (web)         → text-sm font-medium text-primary
```

## Anti-Patterns

- **Never use `text-[17px]`** or any arbitrary size — always use the scale
- **Never use bold for body text** — bold is for headings and emphasis numbers only
- **Never combine two custom sizes in one component** — use scale tokens
- **Never use color alone for emphasis** — combine with weight change
- **Never set line-height below 1.3 on multi-line text** — readability is sacred in a learning app
