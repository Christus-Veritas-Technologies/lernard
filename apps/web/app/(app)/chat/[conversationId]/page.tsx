import type { Metadata } from "next";

interface ConversationPageProps {
    params: Promise<{ conversationId: string }>;
}

export async function generateMetadata({ params }: ConversationPageProps): Promise<Metadata> {
    const { conversationId } = await params;

    return {
        title: `Chat ${conversationId} — Lernard`,
        description: "Reopen an active Lernard conversation and continue learning with context intact.",
    };
}

export default async function ConversationPage({ params }: ConversationPageProps) {
    const { conversationId } = await params;

    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="text-2xl font-bold text-text-primary">Conversation</h1>
            <p className="mt-2 text-text-secondary">
                Conversation ID: {conversationId}
            </p>
        </div>
    );
}
