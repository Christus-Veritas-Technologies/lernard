import { useRouter } from 'expo-router';

import { FeaturePlaceholderScreen } from '@/components/FeaturePlaceholderScreen';

export default function CompanionControlsScreen() {
    const router = useRouter();

    return (
        <FeaturePlaceholderScreen
            actionTitle="Open main settings"
            badge="Companion controls"
            description="Your own companion defaults already save on the main settings page, so this route now acts as a focused signpost instead of a dead end."
            eyebrow="Settings detail"
            items={[
                {
                    title: 'Current state',
                    description: 'Your defaults already save live',
                    detail: 'Hints, answer reveals, and skip defaults now save directly on the main settings page.',
                    tone: 'primary',
                },
                {
                    title: 'Guardian controls',
                    description: 'Child-specific controls live in Household routes',
                    detail: 'The dedicated child companion control screens are already connected to the guardian endpoints.',
                    tone: 'cool',
                },
            ]}
            noteDescription="This route is shell-ready and points back to the live settings surface until a focused personal companion-controls page is worth adding."
            noteTitle="Live elsewhere"
            onActionPress={() => router.push('/settings')}
            title="Companion defaults are currently handled on the main settings page"
        />
    );
}
