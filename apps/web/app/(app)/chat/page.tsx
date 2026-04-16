import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Chat — Lernard",
};

export default function ChatPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">Chat</h1>
            <p className="text-text-secondary">Ask Lernard anything.</p>
        </div>
    );
}
