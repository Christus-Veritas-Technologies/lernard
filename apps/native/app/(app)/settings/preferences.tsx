import { useRouter } from 'expo-router';

import { FeaturePlaceholderScreen } from '@/components/FeaturePlaceholderScreen';

export default function PreferencesScreen() {
    const router = useRouter();

    return (
        <FeaturePlaceholderScreen
            actionTitle="Open main settings"
            badge="Preferences"
            description="Appearance and daily-goal controls already work on the main settings screen, so this route now acts as a clean signpost instead of a dead end."
            eyebrow="Settings detail"
            items={[
                {
                    title: 'Current state',
                    description: 'Appearance and goal controls are already live',
                    detail: 'Those settings now save directly to the backend from the main settings page.',
                    tone: 'primary',
                },
                {
                    title: 'Later',
                    description: 'This page can become a focused preferences editor',
                    detail: 'The route stays in place so the stack can deepen later without reshaping navigation.',
                    tone: 'cool',
                },
            ]}
            noteDescription="This settings leaf is intentionally shell-ready rather than fully live, because the real controls already moved into the main settings screen."
            noteTitle="Live elsewhere"
            onActionPress={() => router.push('/settings')}
            title="Preferences are currently handled on the main settings page"
        />
    );
}
