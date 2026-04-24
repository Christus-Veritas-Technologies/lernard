import { useRouter } from 'expo-router';

import { FeaturePlaceholderScreen } from '@/components/FeaturePlaceholderScreen';

export default function ChatListScreen() {
    const router = useRouter();

    return (
        <FeaturePlaceholderScreen
            actionTitle="Open Home"
            badge="Guide + Companion"
            description="Chat will soon carry your ongoing conversations with Lernard directly inside the native shell."
            eyebrow="Chat"
            items={[
                {
                    title: 'Conversation history',
                    description: 'Persistent threads are next',
                    detail: 'The chat API surface exists, but the current mobile route stays honest because the service layer is still not implemented.',
                    tone: 'cool',
                },
                {
                    title: 'Lesson handoff',
                    description: 'Turn questions into learning',
                    detail: 'Once chat is live, a conversation will be able to hand into a lesson or quiz without leaving the app shell.',
                    tone: 'primary',
                },
                {
                    title: 'Right now',
                    description: 'Use Home or Learn instead',
                    detail: 'The mobile Home and Learn screens are already connected to live payloads while chat lands.',
                    tone: 'warm',
                },
            ]}
            noteDescription="The backend chat controller exists, but the service still throws not implemented, so this route is a deliberate placeholder instead of fake message data."
            noteTitle="Coming next"
            onActionPress={() => router.push('/home')}
            title="Ask Lernard anything, once the conversation layer lands"
        />
    );
}
