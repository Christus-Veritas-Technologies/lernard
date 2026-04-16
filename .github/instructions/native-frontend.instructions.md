---
description: "Use when creating or editing components, screens, navigation, hooks, or styles in the Expo React Native mobile app. Covers Expo Router, NativeWind, React Native Reusables, HugeIcons, Zustand, safe areas, and component patterns."
applyTo: "apps/native/**"
---

# Native Frontend (Expo)

## Styling

**NativeWind (Tailwind CSS for React Native) is the only styling approach.**

```tsx
// ✅ Correct — NativeWind className
<View className="flex-1 bg-background px-4 pt-6">
  <Text className="text-2xl font-bold text-primary">Hello</Text>
</View>

// ❌ Wrong — StyleSheet.create
const styles = StyleSheet.create({ container: { flex: 1 } })
<View style={styles.container} />
```

Only use `style` prop when NativeWind cannot handle a value (dynamic animation values, transforms with interpolation). Comment why when you do.

## Components

Use **React Native Reusables** (`@rnr/`) as the base component library:

```tsx
import { Button } from '@rnr/button'
import { Card, CardContent, CardHeader, CardTitle } from '@rnr/card'
import { Input } from '@rnr/input'
import { Progress } from '@rnr/progress'
import { Switch } from '@rnr/switch'
import { Text } from '@rnr/text'
```

Build on top of these primitives — don't recreate them. Extend via `className` prop and composition.

## Icons

**HugeIcons React Native only.** Never use FontAwesome, Ionicons, MaterialIcons, or Lucide.

```tsx
import { Home01Icon, BookOpen01Icon, MessageSquare01Icon } from 'hugeicons-react-native'

<Home01Icon size={24} color="#7B8EC8" />
```

Icon sizes: 20px inline, 24px navigation/cards, 32px feature highlights.

## Navigation

Expo Router with file-based routing:

```
app/
  _layout.tsx               → Root Stack (SafeArea + GestureHandler)
  (auth)/
    welcome.tsx
    login.tsx
    register.tsx
    account-type.tsx
  (onboarding)/
    profile-setup.tsx
    first-look.tsx
  (app)/
    _layout.tsx             → Bottom Tab Navigator (5 tabs)
    (home)/
      index.tsx             → HomeScreen
    (learn)/
      index.tsx             → TopicEntryScreen
      [lessonId]/
        loading.tsx
        index.tsx           → LessonReaderScreen
        complete.tsx
    (quiz)/
      index.tsx             → QuizEntryScreen
      [quizId]/
        loading.tsx
        index.tsx           → QuizScreen
        results.tsx
    (progress)/
      index.tsx
      [subjectId].tsx
      history.tsx
    (chat)/
      index.tsx
      [conversationId].tsx
    settings/
      index.tsx
      profile.tsx
      subjects.tsx
      preferences.tsx
      mode.tsx
      companion-controls.tsx
    guardian/
      index.tsx
      [childId]/
        index.tsx
        companion.tsx
```

## State Management

**Zustand** for client-only state. One store per domain, minimal:

```tsx
// store/auth.ts
import { create } from 'zustand'

interface AuthState {
  token: string | null
  setToken: (token: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
}))
```

Server data comes from API calls via `@lernard/api-client` — never duplicate in Zustand.

## Safe Areas

Always wrap root layout with `SafeAreaProvider`. Use `useSafeAreaInsets()` for manual inset handling:

```tsx
import { SafeAreaView } from 'react-native-safe-area-context'

<SafeAreaView className="flex-1 bg-background" edges={['top']}>
  {children}
</SafeAreaView>
```

## Component Structure

One component per file. Co-locate feature-specific hooks.

```
components/
  LessonCard.tsx         ← one component, named export
  SubjectChip.tsx
  StreakRing.tsx
  SlotRenderer.tsx
hooks/
  useAuth.ts
  usePagePayload.ts
app/(app)/(home)/
  hooks/
    useHomeData.ts       ← co-located with feature
```

**Rules:**
- Named exports only: `export function LessonCard() { ... }`
- Props interface defined in same file: `interface LessonCardProps { ... }`
- No barrel `index.tsx` in component folders — import directly from file

## Patterns

### Screen Layout
```tsx
export function HomeScreen() {
  const { data, loading } = usePagePayload<HomeContent>(ROUTES.HOME.PAYLOAD)

  if (loading) return <HomeScreenSkeleton />

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
      <GreetingHeader greeting={data.content.greeting} />
      <ContinueLearningCard lesson={data.content.lastLesson} />
      <SubjectGrid subjects={data.content.subjects} />
    </ScrollView>
  )
}
```

### Card Pattern
```tsx
<Card className="rounded-2xl bg-surface p-4 shadow-sm">
  <CardHeader>
    <CardTitle className="text-lg font-semibold text-primary">
      {title}
    </CardTitle>
  </CardHeader>
  <CardContent className="gap-3">
    {children}
  </CardContent>
</Card>
```

## Platform-Specific Code

Only use `.ios.tsx` / `.android.tsx` when behaviour is genuinely platform-specific (haptics, specific native APIs). For styling differences, use NativeWind's `ios:` and `android:` prefixes.
