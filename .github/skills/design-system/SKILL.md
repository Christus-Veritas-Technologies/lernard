---
name: design-system
description: "Lernard design system — color tokens, typography scale, spacing, layout, responsive patterns, card-based composition. Use when building UI components, screens, pages, or styling for Lernard's native (Expo) or web (Next.js) frontends. Covers brand colors, dark mode, touch targets, grids, navigation patterns."
---

# Lernard Design System

## Design Philosophy

Lernard's UI must feel like a trusted friend, not a textbook. Every design decision serves the learning experience:

1. **Card-based composition** — every piece of content lives in a card. Cards are the atomic unit of layout. They create scannable, modular interfaces that work across screen sizes.

2. **Whitespace is a feature** — generous padding and spacing reduces cognitive load. Students spend extended time reading lessons — the UI must breathe.

3. **Friendly geometry** — large border radii (rounded-2xl minimum on cards), soft shadows, no sharp edges. The app should feel approachable, especially for younger students.

4. **Hierarchy through type, not color** — heading sizes and weights establish visual hierarchy. Color is reserved for meaning (actions, categories, semantic feedback), not decoration.

5. **Greeting-first pattern** — primary screens open with a personalised, warm greeting. "Good morning, Kin" comes before any data or CTAs. The student feels recognised before they start working.

6. **Progress without pressure** — visualise achievement (streak rings, XP badges, skill tiers) but never with urgency-inducing red or aggressive theming. Growth areas are opportunities, not failures.

7. **AI companion framing** — Lernard is presented as a buddy, not a tool. UI copy is conversational ("Building your lesson..." not "Loading..."). Loading states have personality.

## Component Libraries

| Platform | Component Library | Import |
|---|---|---|
| Native (Expo) | React Native Reusables | `@rnr/*` |
| Web (Next.js) | shadcn/ui | Local `@/components/ui/*` |
| Both | HugeIcons | `hugeicons-react-native` / `hugeicons-react` |

### Component Mapping

When building the same feature across platforms, use equivalent components:

| Concept | Web (shadcn/ui) | Native (RN Reusables) |
|---|---|---|
| Button | `<Button>` | `<Button>` from `@rnr/button` |
| Card | `<Card>` | `<Card>` from `@rnr/card` |
| Input | `<Input>` | `<Input>` from `@rnr/input` |
| Dialog / Modal | `<Dialog>` | `<AlertDialog>` from `@rnr/alert-dialog` |
| Bottom sheet | — | Bottom sheet via `@gorhom/bottom-sheet` |
| Select | `<Select>` | `<Select>` from `@rnr/select` |
| Progress bar | `<Progress>` | `<Progress>` from `@rnr/progress` |
| Tabs | `<Tabs>` | Tab navigator via Expo Router |
| Chip / Badge | `<Badge>` | Custom `<Chip>` with NativeWind |
| Toggle | `<Switch>` | `<Switch>` from `@rnr/switch` |

### Icons

Always use HugeIcons. Never use FontAwesome, Lucide, Ionicons, or MaterialIcons.

```tsx
// Web
import { Home01Icon } from 'hugeicons-react'
<Home01Icon size={24} className="text-primary-400" />

// Native
import { Home01Icon } from 'hugeicons-react-native'
<Home01Icon size={24} color="#7B8EC8" />
```

Icon sizing: 20px for inline, 24px for navigation/cards, 32px for feature highlights.

## Color System

See [full color tokens](./references/color-tokens.md) for the complete palette with hex values, dark mode variants, and usage rules.

**Key principles:**
- Primary (periwinkle) for interactive elements — CTAs, links, active states
- Pastel accents for subject categories — gentle differentiation
- Semantic colors carry meaning — success (achievement), warning (attention), error (correction without shame)
- Dark mode is a separate considered palette, not an inversion
- Max 3 non-neutral colors per screen

## Typography

See [full typography scale](./references/typography-scale.md) for the complete scale, weight mapping, and responsive rules.

**Key principles:**
- 8-step scale from xs(12px) to 4xl(40px) — never use arbitrary sizes
- Hierarchy through size + weight, not color
- Body text stays at 16px across all viewports — readability for extended reading is paramount
- System fonts on native (SF Pro / Roboto), Geist Sans on web

## Spacing & Layout

See [full spacing and layout reference](./references/spacing-layout.md) for the complete scale, card anatomy, responsive grid, and navigation patterns.

**Key principles:**
- 4px base unit, Tailwind default scale
- Cards: rounded-2xl, p-4 to p-6, bg-surface, shadow-sm (light) / border (dark)
- Screen padding: px-4 mobile → px-6 tablet → px-8 desktop
- Single column mobile, 2-col tablet, 3-col desktop
- Max content width: max-w-6xl (1152px)
- Touch targets: 44px minimum — non-negotiable

## Slot Rendering

Dynamic UI slots are AI-populated content areas. Frontend rules:

1. **AI owns content, frontend owns presentation** — a slot provides data (text, type, metadata), never styling directives
2. **Every slot has a null state** — if slot data is null/undefined, collapse the space cleanly. No empty boxes, no "loading" spinners for missing slots
3. **Unknown slot types render nothing** — if the slot type isn't recognised by the frontend, silently skip it. Never crash
4. **Slots never block page load** — content and permissions load first, slots resolve after with an 800ms timeout

## Accessibility

1. **Touch targets ≥ 44px** on all interactive elements
2. **Color contrast** — WCAG AA minimum for all text (4.5:1 normal, 3:1 large). Prefer AAA where possible
3. **Screen reader labels** — every icon button has an `accessibilityLabel` (native) or `aria-label` (web)
4. **Focus indicators** — visible focus rings on all interactive elements (web: `focus-visible:ring-2 ring-primary-400`)
5. **Semantic HTML** (web) — use `<button>`, `<nav>`, `<main>`, `<section>`, `<h1>`-`<h6>` appropriately
6. **Text scalability** — rem-based sizing respects user font-size preferences

## Dark Mode

Fully supported on both platforms. Implementation:

- **Web:** Tailwind `dark:` prefix, class-based toggling via `<html class="dark">`
- **Native:** NativeWind dark mode with system preference detection

Every color token has explicit light and dark values. Never use a hardcoded hex in component code — always use the semantic token via Tailwind class.

```tsx
// Correct
<View className="bg-surface dark:bg-surface-dark">

// Wrong — hardcoded, breaks dark mode
<View style={{ backgroundColor: '#FFFFFF' }}>
```
