import { useLocalSearchParams } from 'expo-router';

import { FeaturePlaceholderScreen } from '@/components/FeaturePlaceholderScreen';

export default function SubjectDetailScreen() {
    const { subjectId } = useLocalSearchParams<{ subjectId: string }>();

    return (
        <FeaturePlaceholderScreen
            badge="Subject detail"
            description="This route will host the deeper subject breakdown once progress data is ready to support it."
            eyebrow="Progress detail"
            items={[
                {
                    title: 'Route preserved',
                    description: `Subject ${subjectId} will plug in here`,
                    detail: 'Keeping the route in place now means the native navigation can stay stable when subject-level progress lands.',
                    tone: 'cool',
                },
                {
                    title: 'Next step',
                    description: 'The progress backend needs to go live first',
                    detail: 'Once the progress service stops returning not implemented, this screen can render the full subject view without a routing rethink.',
                    tone: 'primary',
                },
            ]}
            noteDescription="The progress subject route exists, but its service layer is still unfinished, so this stays as a shell-ready placeholder."
            noteTitle="Not yet live"
            title="Subject detail is waiting on live progress data"
        />
    );
}
