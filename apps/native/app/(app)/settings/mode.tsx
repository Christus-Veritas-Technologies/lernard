import { useRouter } from 'expo-router';

import { FeaturePlaceholderScreen } from '@/components/FeaturePlaceholderScreen';

export default function ModeScreen() {
    const router = useRouter();

    return (
        <FeaturePlaceholderScreen
            actionTitle="Open main settings"
            badge="Mode"
            description="Guide and Companion mode switching is already live on the main settings page, so this route now points there cleanly instead of stopping at a stub."
            eyebrow="Settings detail"
            items={[
                {
                    title: 'Current state',
                    description: 'Mode switching already works',
                    detail: 'The live settings page now saves Guide and Companion mode directly to the backend.',
                    tone: 'primary',
                },
                {
                    title: 'Later',
                    description: 'This page can become a dedicated mode explainer',
                    detail: 'Keeping the route means the mobile stack can deepen later without changing its public shape.',
                    tone: 'cool',
                },
            ]}
            noteDescription="This route is intentionally shell-aligned because the actual mode controls already live on the main settings page."
            noteTitle="Live elsewhere"
            onActionPress={() => router.push('/settings')}
            title="Learning mode is currently controlled on the main settings page"
        />
    );
}
