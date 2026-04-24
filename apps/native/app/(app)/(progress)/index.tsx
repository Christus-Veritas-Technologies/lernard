import { useRouter } from 'expo-router';

import { FeaturePlaceholderScreen } from '@/components/FeaturePlaceholderScreen';

export default function ProgressScreen() {
    const router = useRouter();

    return (
        <FeaturePlaceholderScreen
            actionTitle="Open Home"
            badge="Read on You"
            description="This is where your cross-subject progress story will live once the progress service is implemented."
            eyebrow="Progress"
            items={[
                {
                    title: 'Subject trends',
                    description: 'Compare strengths and growth areas',
                    detail: 'The progress routes are already shaped out, but the underlying service still throws not implemented for now.',
                    tone: 'primary',
                },
                {
                    title: 'Session history',
                    description: 'Follow your rhythm over time',
                    detail: 'This shell page now makes space for the richer progress view so it will not feel bolted on later.',
                    tone: 'cool',
                },
                {
                    title: 'Right now',
                    description: 'Use Home and Household snapshots',
                    detail: 'Live Home and Household pages already surface the strongest recent signals while the full progress layer lands.',
                    tone: 'warm',
                },
            ]}
            noteDescription="The progress controller routes exist, but the service methods still return not implemented, so this remains an intentional placeholder."
            noteTitle="Not yet live"
            onActionPress={() => router.push('/home')}
            title="Lernard's Read on You is getting its full home"
        />
    );
}
