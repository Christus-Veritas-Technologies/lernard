import type { Metadata } from "next";

import { ChatPageClient } from "./ChatPageClient";

export const metadata: Metadata = {
    title: "Chat — Lernard",
};

export default function ChatPage() {
    return <ChatPageClient />;
}
