import { useRouter } from 'expo-router';

import { FeaturePlaceholderScreen } from '@/components/FeaturePlaceholderScreen';

export default function ProfileScreen() {
    const router = useRouter();

    return (
        <FeaturePlaceholderScreen
            actionTitle="Open main settings"
            badge="Profile"
            description="Profile editing will eventually live here as a focused route once the mobile settings navigation is refined."
            eyebrow="Settings detail"
            items={[
                {
                    title: 'Current state',
                    description: 'Main settings are already live',
                    detail: 'Mode, appearance, daily goal, and companion defaults now save on the main settings screen.',
                    tone: 'primary',
                },
                {
                    title: 'Later',
                    description: 'This page can become a focused editor',
                    detail: 'Keeping the route in place makes it safe to split profile editing out later without changing the navigation tree.',
                    tone: 'cool',
                },
            ]}
            noteDescription="This leaf route is no longer a bare heading, but it intentionally points back to the live settings page until the focused profile editor is built."
            noteTitle="Shell-aligned"
            onActionPress={() => router.push('/settings')}
            title="Profile editing is parked behind the live settings page"
        />
    );
}
