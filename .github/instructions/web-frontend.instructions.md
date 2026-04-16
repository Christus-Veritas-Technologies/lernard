---
description: "Use when creating or editing pages, components, layouts, API routes, or styles in the Next.js web app. Covers App Router, shadcn/ui, HugeIcons, Tailwind CSS, server/client component split, metadata, and responsive patterns."
applyTo: "apps/web/**"
---

# Web Frontend (Next.js)

## App Router

Server components by default. Add `"use client"` only when the component needs interactivity (state, effects, event handlers, browser APIs).

```tsx
// Server component (default) — data fetching
export default async function LearnPage() {
  const payload = await serverFetch<PagePayload<LearnContent>>(ROUTES.LEARN.PAYLOAD)
  return <LearnClient payload={payload} />
}

// Client component — interactivity
'use client'
function LearnClient({ payload }: { payload: PagePayload<LearnContent> }) {
  const [topic, setTopic] = useState('')
  return <TopicInput value={topic} onChange={setTopic} />
}
```

## Route Groups

```
app/
  (auth)/          → Login, register, welcome — no app shell
    layout.tsx     → Minimal layout, centered content
  (onboarding)/    → Profile setup, First Look — no app shell
    layout.tsx     → Progress-step layout
  (app)/           → Main app — sidebar/bottom nav
    layout.tsx     → Sidebar (desktop) / bottom bar (mobile)
```

## Components

**shadcn/ui** for all UI primitives. Install via CLI, customise via className:

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
```

## Icons

**HugeIcons React only.** Never use Lucide (even though shadcn defaults to it), FontAwesome, or Heroicons.

```tsx
import { Home01Icon, BookOpen01Icon, MessageSquare01Icon } from 'hugeicons-react'

<Home01Icon size={24} className="text-primary-400" />
```

## Styling

Tailwind CSS exclusively. Never inline styles. Never CSS modules for new code.

```tsx
// ✅ Tailwind
<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

// ❌ Inline styles
<div style={{ maxWidth: '1152px', margin: '0 auto' }}>

// ❌ CSS modules (legacy only)
<div className={styles.container}>
```

## Layout Patterns

### Page Max Width
```tsx
<main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
  {children}
</main>
```

### Responsive Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {subjects.map(s => <SubjectCard key={s.id} subject={s} />)}
</div>
```

### Single-Column Content (lessons, quizzes, chat)
```tsx
<div className="mx-auto max-w-2xl px-4">
  {children}
</div>
```

## Metadata

Every page exports metadata for SEO:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Home — Lernard',
  description: 'Your personal AI tutor. Always ready.',
}
```

Dynamic metadata for dynamic routes:

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `${lesson.topic} — Lernard` }
}
```

## Data Fetching

Server components fetch data directly. Client components receive data as props.

```tsx
// Server helper
async function serverFetch<T>(route: string): Promise<T> {
  const res = await fetch(`${process.env.API_URL}${route}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}
```

## Dark Mode

Class-based via `<html class="dark">`. Use Tailwind `dark:` prefix:

```tsx
<Card className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark">
  <CardTitle className="text-primary dark:text-primary-dark">
    {title}
  </CardTitle>
</Card>
```

## Navigation

### Desktop (≥1024px): Fixed left sidebar
```tsx
<aside className="fixed left-0 top-0 hidden h-full w-60 border-r bg-surface lg:block">
  <nav className="flex flex-col gap-1 p-3">
    <NavItem icon={Home01Icon} label="Home" href="/home" />
    <NavItem icon={BookOpen01Icon} label="Learn" href="/learn" />
    {/* ... */}
  </nav>
</aside>
<main className="lg:ml-60">{children}</main>
```

### Mobile (<1024px): Fixed bottom bar
```tsx
<nav className="fixed bottom-0 left-0 right-0 flex h-14 items-center justify-around border-t bg-surface lg:hidden">
  <TabItem icon={Home01Icon} label="Home" href="/home" />
  {/* ... */}
</nav>
```

## Component Structure

Same rules as native: one component per file, named exports only, co-located hooks.

```
components/
  ui/              ← shadcn/ui generated components
  LessonCard.tsx
  SubjectChip.tsx
  SlotRenderer.tsx
hooks/
  useAuth.ts
app/(app)/home/
  hooks/
    useHomeInteractions.ts   ← co-located
```
