"use client";

import { Message01Icon, SentIcon } from "hugeicons-react";
import { useEffect, useState } from "react";

import { ROUTES } from "@lernard/routes";
import type { ChatMessageBlock, ConversationListItem } from "@lernard/shared-types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { browserApiFetch } from "@/lib/browser-api";

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    blocks: ChatMessageBlock[];
}

export function ChatPageClient() {
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [conversations, setConversations] = useState<ConversationListItem[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);

    useEffect(() => {
        void browserApiFetch<ConversationListItem[]>(ROUTES.CHAT.CONVERSATIONS)
            .then(setConversations)
            .catch(() => setConversations([]));
    }, []);

    async function onSend() {
        if (!input.trim() || sending) return;

        const nextUserMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            blocks: [{ type: "text", content: input.trim() }],
        };

        setMessages((current) => [...current, nextUserMessage]);
        setSending(true);

        try {
            const response = await browserApiFetch<{ conversationId: string; blocks: ChatMessageBlock[] }>(
                ROUTES.CHAT.MESSAGE,
                {
                    method: "POST",
                    body: JSON.stringify({
                        conversationId,
                        message: input.trim(),
                    }),
                },
            );

            setConversationId(response.conversationId);
            setMessages((current) => [
                ...current,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    blocks: response.blocks,
                },
            ]);

            const refreshed = await browserApiFetch<ConversationListItem[]>(ROUTES.CHAT.CONVERSATIONS);
            setConversations(refreshed);
            setInput("");
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="grid h-full min-h-[70vh] gap-4 lg:grid-cols-[280px_1fr]">
            <Card className="p-0">
                <CardHeader>
                    <CardTitle>Conversations</CardTitle>
                    <Button
                        onClick={() => {
                            setConversationId(null);
                            setMessages([]);
                        }}
                        variant="secondary"
                    >
                        New Chat
                    </Button>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="max-h-[58vh] pr-2">
                        <div className="space-y-2">
                            {conversations.map((conversation) => (
                                <button
                                    className="w-full rounded-xl border border-border p-3 text-left transition hover:bg-background-subtle"
                                    key={conversation.id}
                                    onClick={() => {
                                        setConversationId(conversation.id);
                                        setMessages([]);
                                    }}
                                    type="button"
                                >
                                    <p className="truncate text-sm font-medium text-text-primary">
                                        {conversation.title}
                                    </p>
                                    <p className="truncate text-xs text-text-secondary">
                                        {conversation.lastMessage || "No messages yet"}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card className="flex min-h-0 flex-col p-0">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-white">
                            <Message01Icon size={18} />
                        </div>
                        <div>
                            <CardTitle>Ask Lernard anything</CardTitle>
                            <CardDescription>Learning help, examples, and quizzes on demand.</CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
                    <ScrollArea className="min-h-0 flex-1 rounded-2xl border border-border bg-background p-3">
                        <div className="space-y-3">
                            {messages.map((message) => (
                                <div
                                    className={`max-w-[85%] rounded-2xl p-3 ${message.role === "user"
                                            ? "ml-auto bg-primary-500 text-white"
                                            : "bg-surface text-text-primary"
                                        }`}
                                    key={message.id}
                                >
                                    {message.blocks.map((block, index) => (
                                        <MessageBlock key={`${message.id}-${index}`} block={block} />
                                    ))}
                                </div>
                            ))}

                            {sending ? (
                                <div className="w-fit rounded-2xl bg-surface px-3 py-2 text-sm text-text-secondary">
                                    <span className="animate-pulse">Lernard is thinking...</span>
                                </div>
                            ) : null}
                        </div>
                    </ScrollArea>

                    <div className="space-y-3">
                        <Textarea
                            onChange={(event) => setInput(event.target.value)}
                            placeholder="Ask a question, request an explanation, or ask for a quiz"
                            value={input}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex gap-2">
                                <Badge tone="cool">Build a lesson on this</Badge>
                                <Badge tone="warm">Quiz me on this</Badge>
                            </div>
                            <Button disabled={!input.trim() || sending} onClick={onSend}>
                                <SentIcon size={16} strokeWidth={1.8} />
                                Send
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

function MessageBlock({ block }: { block: ChatMessageBlock }) {
    if (block.type === "text") {
        return <p className="whitespace-pre-wrap text-sm leading-6">{block.content}</p>;
    }

    if (block.type === "QuizCard") {
        return (
            <div className="rounded-xl border border-border/70 bg-background p-3 text-sm text-text-primary">
                <p className="font-medium">{block.props.title}</p>
                <p className="text-xs text-text-secondary">{block.props.summary}</p>
            </div>
        );
    }

    if (block.type === "ConceptBreakdown") {
        return (
            <div className="rounded-xl border border-border/70 bg-background p-3 text-sm text-text-primary">
                <p className="font-medium">{block.props.heading}</p>
                <ul className="mt-1 list-disc pl-4 text-xs text-text-secondary">
                    {block.props.bullets.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border/70 bg-background p-3 text-xs text-text-secondary">
            <p className="font-medium text-text-primary">{block.props.title}</p>
            <p>{block.props.description}</p>
        </div>
    );
}
