import { useRouter } from 'expo-router';

import { FeaturePlaceholderScreen } from '@/components/FeaturePlaceholderScreen';

export default function SubjectsScreen() {
    const router = useRouter();

    return (
        <FeaturePlaceholderScreen
            actionTitle="Open main settings"
            badge="Subjects"
            description="Subject management will become a focused route here once the mobile settings stack is split more cleanly."
            eyebrow="Settings detail"
            items={[
                {
                    title: 'Current state',
                    description: 'Live Home and Learn already read subject priorities',
                    detail: 'The native Home and Learn screens now use live subject data, even though this focused editing page is still deferred.',
                    tone: 'primary',
                },
                {
                    title: 'Later',
                    description: 'This page can handle reordering and cleanup',
                    detail: 'The route remains ready so subject management can land here without disturbing the current shell.',
                    tone: 'cool',
                },
            ]}
            noteDescription="This route now matches the shell visually and directs attention back to the live settings page instead of ending at a bare placeholder."
            noteTitle="Shell-aligned"
            onActionPress={() => router.push('/settings')}
            title="Subject editing is parked behind the live settings page"
        />
    );
}
