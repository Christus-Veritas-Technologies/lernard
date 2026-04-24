import { useRouter } from 'expo-router';

import { FeaturePlaceholderScreen } from '@/components/FeaturePlaceholderScreen';

export default function HistoryScreen() {
    const router = useRouter();

    return (
        <FeaturePlaceholderScreen
            actionTitle="Back to Progress"
            badge="History"
            description="This route is reserved for the full session timeline once the progress history service is live."
            eyebrow="Progress history"
            items={[
                {
                    title: 'Lessons and quizzes',
                    description: 'Recent sessions will group here',
                    detail: 'The route already exists so the navigation shape is stable before the history service lands.',
                    tone: 'cool',
                },
                {
                    title: 'Guardian review',
                    description: 'Parents will be able to scan recent work faster',
                    detail: 'History and progress details will connect cleanly with the Household views once the backend is ready.',
                    tone: 'primary',
                },
            ]}
            noteDescription="The progress history endpoint is present in the route constants, but the service is still not implemented."
            noteTitle="Waiting on backend"
            onActionPress={() => router.push('/progress')}
            title="Session history is waiting on the progress service"
        />
    );
}
