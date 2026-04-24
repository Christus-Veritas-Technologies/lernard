import type { Metadata } from "next";

import { FeaturePlaceholderPage } from "../../../components/dashboard/FeaturePlaceholderPage";

export const metadata: Metadata = {
    title: "Chat — Lernard",
};

export default function ChatPage() {
    return (
        <FeaturePlaceholderPage
            badge="Guide + Companion"
            description="Chat will soon carry your ongoing conversations with Lernard directly inside this shell."
            eyebrow="Chat"
            items={[
                {
                    title: "Conversation history",
                    description: "Persistent threads are next",
                    detail: "The backend conversation endpoints are still stubs, so this page stays honest instead of faking old messages.",
                    tone: "cool",
                },
                {
                    title: "Lesson handoff",
                    description: "Turn questions into learning",
                    detail: "Once chat is live, you will be able to move straight from a conversation into a lesson or quiz.",
                    tone: "primary",
                },
                {
                    title: "Right now",
                    description: "Use Home or Learn instead",
                    detail: "The live Home and Learn pages are already connected and ready while chat lands.",
                    tone: "warm",
                },
            ]}
            noteDescription="The chat API surface exists, but the service layer is still marked not implemented."
            noteTitle="Coming next"
            title="Ask Lernard anything, once the conversation layer lands"
        />
    );
}
