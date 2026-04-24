import { useLocalSearchParams } from 'expo-router';

import { FeaturePlaceholderScreen } from '@/components/FeaturePlaceholderScreen';

export default function ConversationScreen() {
    const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

    return (
        <FeaturePlaceholderScreen
            badge="Conversation"
            description="This route is ready to host a full message thread once the chat service starts returning real conversation state."
            eyebrow="Chat thread"
            items={[
                {
                    title: 'Thread history',
                    description: 'Past messages will land here',
                    detail: `Conversation ${conversationId} is preserved in the route so this screen can attach to a live thread later without changing the navigation shape.`,
                    tone: 'cool',
                },
                {
                    title: 'Tutor responses',
                    description: 'Guide and Companion replies will appear here',
                    detail: 'When the backend is ready, this screen will display message history, structured inserts, and handoffs to lessons or quizzes.',
                    tone: 'primary',
                },
            ]}
            noteDescription="The current chat service still returns not implemented, so the route stays as a shell-aligned placeholder instead of rendering fake messages."
            noteTitle="Waiting on backend"
            title="Conversation threads are waiting on the chat service"
        />
    );
}
