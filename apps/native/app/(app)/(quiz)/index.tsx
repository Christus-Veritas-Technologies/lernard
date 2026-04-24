import { useRouter } from 'expo-router';

import { FeaturePlaceholderScreen } from '@/components/FeaturePlaceholderScreen';

export default function QuizEntryScreen() {
    const router = useRouter();

    return (
        <FeaturePlaceholderScreen
            actionTitle="Open Learn"
            badge="Practice"
            description="Quizzes will soon launch from here as a first-class flow instead of feeling tucked behind lesson generation."
            eyebrow="Quiz"
            items={[
                {
                    title: 'Quick checks',
                    description: 'Start a targeted quiz fast',
                    detail: 'The quiz endpoints already exist, but the native entry orchestration is still landing, so this route stays honest for now.',
                    tone: 'primary',
                },
                {
                    title: 'Results loop',
                    description: 'Review and retry from one place',
                    detail: 'The surrounding quiz routes are present, which keeps the native navigation shape ready for the full launch flow.',
                    tone: 'cool',
                },
                {
                    title: 'Right now',
                    description: 'Start from Learn',
                    detail: 'The live Learn screen already gives you the best current route into lesson and practice generation.',
                    tone: 'warm',
                },
            ]}
            noteDescription="This route now matches the rest of the shell visually without pretending the final quiz launch flow is already complete."
            noteTitle="Shell-ready"
            onActionPress={() => router.push('/learn')}
            title="Ready to test what you know, once the launch flow lands"
        />
    );
}
