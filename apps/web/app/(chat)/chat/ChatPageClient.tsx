"use client";

import {
    Add01Icon,
    AlertCircleIcon,
    BookOpen01Icon,
    Message01Icon,
    SentIcon,
    SparklesIcon,
} from "hugeicons-react";
import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";

import { ROUTES } from "@lernard/routes";
import type {
    ChatAttachment,
    ChatAttachmentInput,
    ChatConversationDetail,
    ChatConversationMessage,
    ChatLessonAttachmentOption,
    ChatMessageBlock,
    ConversationListItem,
} from "@lernard/shared-types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { BrowserApiError, BrowserAuthError, browserApiFetch } from "@/lib/browser-api";
import { cn } from "@/lib/cn";

type UploadAttachmentInput = Extract<ChatAttachmentInput, { type: "upload" }>;

interface MessageResponse {
    conversationId: string;
    blocks: ChatMessageBlock[];
}

export function ChatPageClient() {
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [conversationTitle, setConversationTitle] = useState("New chat");
    const [conversations, setConversations] = useState<ConversationListItem[]>([]);
    const [lessons, setLessons] = useState<ChatLessonAttachmentOption[]>([]);
    const [messages, setMessages] = useState<ChatConversationMessage[]>([]);
    const [input, setInput] = useState("");
    const [lessonQuery, setLessonQuery] = useState("");
    const [selectedLessons, setSelectedLessons] = useState<ChatLessonAttachmentOption[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<UploadAttachmentInput[]>([]);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [loadingConversation, setLoadingConversation] = useState(false);
    const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const deferredLessonQuery = useDeferredValue(lessonQuery);

    useEffect(() => {
        let isDisposed = false;

        void Promise.allSettled([
            browserApiFetch<ConversationListItem[]>(ROUTES.CHAT.CONVERSATIONS),
            browserApiFetch<ChatLessonAttachmentOption[]>(ROUTES.CHAT.ATTACHABLE_LESSONS),
        ]).then(([conversationResult, lessonResult]) => {
            if (isDisposed) {
                return;
            }

            if (conversationResult.status === "fulfilled") {
                setConversations(conversationResult.value);
            }

            if (lessonResult.status === "fulfilled") {
                setLessons(lessonResult.value);
            }
        });

        return () => {
            isDisposed = true;
        };
    }, []);

    const filteredLessons = lessons.filter((lesson) => {
        const normalizedQuery = deferredLessonQuery.trim().toLowerCase();
        if (!normalizedQuery) {
            return true;
        }

        return `${lesson.title} ${lesson.subjectName}`.toLowerCase().includes(normalizedQuery);
    });

    const attachmentCount = uploadedFiles.length + selectedLessons.length;

    async function loadConversation(nextConversationId: string) {
        setLoadingConversation(true);
        setErrorMessage(null);

        try {
            const detail = await browserApiFetch<ChatConversationDetail>(ROUTES.CHAT.CONVERSATION(nextConversationId));
            startTransition(() => {
                setConversationId(detail.conversationId);
                setConversationTitle(detail.title);
                setMessages(detail.messages);
            });
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        } finally {
            setLoadingConversation(false);
        }
    }

    async function onSend() {
        if (!input.trim() || sending || uploading) {
            return;
        }

        const optimisticBlocks = buildOptimisticUserBlocks(input.trim(), uploadedFiles, selectedLessons);
        const nextUserMessage: ChatConversationMessage = {
            id: crypto.randomUUID(),
            role: "user",
            blocks: optimisticBlocks,
            createdAt: new Date().toISOString(),
        };

        setErrorMessage(null);
        setMessages((current) => [...current, nextUserMessage]);
        setSending(true);

        try {
            const response = await browserApiFetch<MessageResponse>(ROUTES.CHAT.MESSAGE, {
                method: "POST",
                body: JSON.stringify({
                    conversationId,
                    message: input.trim(),
                    attachments: buildAttachmentPayload(uploadedFiles, selectedLessons),
                }),
            });

            startTransition(() => {
                setConversationId(response.conversationId);
                setMessages((current) => [
                    ...current,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        blocks: response.blocks,
                        createdAt: new Date().toISOString(),
                    },
                ]);
                setInput("");
                setUploadedFiles([]);
                setSelectedLessons([]);
                setAttachmentMenuOpen(false);
            });

            const refreshedConversations = await browserApiFetch<ConversationListItem[]>(ROUTES.CHAT.CONVERSATIONS);
            setConversations(refreshedConversations);

            const currentConversation = refreshedConversations.find((item) => item.id === response.conversationId);
            if (currentConversation) {
                setConversationTitle(currentConversation.title);
            }
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
            setMessages((current) => current.filter((message) => message.id !== nextUserMessage.id));
        } finally {
            setSending(false);
        }
    }

    async function onUploadFiles(fileList: FileList | null) {
        const files = Array.from(fileList ?? []);
        if (files.length === 0) {
            return;
        }

        if (attachmentCount + files.length > 6) {
            setErrorMessage("Keep each message to six attachments or fewer.");
            return;
        }

        setUploading(true);
        setErrorMessage(null);

        try {
            const uploaded: UploadAttachmentInput[] = [];

            for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);

                const response = await browserApiFetch<UploadAttachmentInput>(ROUTES.CHAT.ATTACHMENTS_UPLOAD, {
                    method: "POST",
                    body: formData,
                });

                uploaded.push(response);
            }

            startTransition(() => {
                setUploadedFiles((current) => [...current, ...uploaded]);
                setAttachmentMenuOpen(false);
            });
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }

    function onSelectLesson(lesson: ChatLessonAttachmentOption) {
        setErrorMessage(null);

        if (selectedLessons.some((item) => item.lessonId === lesson.lessonId)) {
            setSelectedLessons((current) => current.filter((item) => item.lessonId !== lesson.lessonId));
            return;
        }

        if (attachmentCount >= 6) {
            setErrorMessage("Keep each message to six attachments or fewer.");
            return;
        }

        setSelectedLessons((current) => [...current, lesson]);
    }

    function onStartNewChat() {
        startTransition(() => {
            setConversationId(null);
            setConversationTitle("New chat");
            setMessages([]);
            setInput("");
            setSelectedLessons([]);
            setUploadedFiles([]);
            setAttachmentMenuOpen(false);
            setErrorMessage(null);
        });
    }

    return (
        <div className="grid min-h-[76vh] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="overflow-hidden border-none bg-linear-to-br from-accent-cool-100 via-background to-accent-warm-100 shadow-[0_28px_80px_-36px_rgba(36,52,88,0.45)]">
                <CardHeader className="space-y-4 border-b border-border/60 pb-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                            <Badge className="gap-2" tone="cool">
                                <SparklesIcon size={14} />
                                Lernard chat
                            </Badge>
                            <div>
                                <CardTitle className="text-xl">Your thinking space</CardTitle>
                                <CardDescription className="max-w-sm text-sm text-text-secondary">
                                    Pick up an older conversation or open a fresh thread when you want a new lane.
                                </CardDescription>
                            </div>
                        </div>
                        <Button className="gap-2" onClick={onStartNewChat} variant="secondary">
                            <Add01Icon size={16} strokeWidth={1.8} />
                            New chat
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <ScrollArea className="h-112 pr-2 xl:h-144">
                        <div className="space-y-2">
                            {conversations.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-border bg-surface/70 p-4 text-sm text-text-secondary">
                                    Your latest conversations will appear here.
                                </div>
                            ) : null}

                            {conversations.map((conversation) => {
                                const isActive = conversation.id === conversationId;

                                return (
                                    <button
                                        className={cn(
                                            "w-full rounded-3xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                            isActive
                                                ? "border-primary-300 bg-white shadow-[0_18px_44px_-34px_rgba(36,52,88,0.4)]"
                                                : "border-border/70 bg-surface/80 hover:bg-white",
                                        )}
                                        key={conversation.id}
                                        onClick={() => {
                                            void loadConversation(conversation.id);
                                        }}
                                        type="button"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="truncate text-sm font-semibold text-text-primary">
                                                {conversation.title}
                                            </p>
                                            {isActive ? <Badge tone="primary">Open</Badge> : null}
                                        </div>
                                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-text-secondary">
                                            {conversation.lastMessage || "No messages yet"}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card className="relative flex min-h-[76vh] flex-col overflow-hidden border-none bg-linear-to-b from-white via-background to-accent-cool-100/60 shadow-[0_30px_90px_-40px_rgba(36,52,88,0.42)]">
                {attachmentMenuOpen ? (
                    <div className="absolute bottom-44 left-4 right-4 z-20 rounded-[28px] border border-border/70 bg-white/95 p-4 shadow-[0_24px_64px_-32px_rgba(36,52,88,0.45)] backdrop-blur xl:left-auto xl:right-6 xl:w-104">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-text-primary">Attach context</p>
                                <p className="text-xs text-text-secondary">
                                    Upload a PDF or image, or pull in a recent lesson from Lernard.
                                </p>
                            </div>
                            <Badge tone="muted">{attachmentCount}/6</Badge>
                        </div>

                        <div className="mt-4 space-y-4">
                            <button
                                className="flex w-full items-center justify-between rounded-[22px] border border-border bg-background px-4 py-3 text-left transition hover:border-primary-300 hover:bg-accent-cool-100/60"
                                onClick={() => fileInputRef.current?.click()}
                                type="button"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-500 text-white">
                                        <Add01Icon size={18} strokeWidth={1.8} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-text-primary">Upload a PDF or image</p>
                                        <p className="text-xs text-text-secondary">Claude receives the file on this turn.</p>
                                    </div>
                                </div>
                                <Badge tone={uploading ? "warning" : "cool"}>{uploading ? "Uploading" : "Ready"}</Badge>
                            </button>

                            <div className="space-y-3 rounded-3xl border border-border bg-background p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                                    <BookOpen01Icon size={18} strokeWidth={1.8} />
                                    Attach a lesson
                                </div>
                                <Input
                                    onChange={(event) => setLessonQuery(event.target.value)}
                                    placeholder="Search your recent lessons"
                                    value={lessonQuery}
                                />
                                <ScrollArea className="h-52 pr-2">
                                    <div className="space-y-2">
                                        {filteredLessons.map((lesson) => {
                                            const isSelected = selectedLessons.some((item) => item.lessonId === lesson.lessonId);

                                            return (
                                                <button
                                                    className={cn(
                                                        "w-full rounded-[20px] border px-3 py-3 text-left transition",
                                                        isSelected
                                                            ? "border-primary-300 bg-primary-100/70"
                                                            : "border-border bg-white hover:border-primary-200 hover:bg-accent-cool-100/50",
                                                    )}
                                                    key={lesson.lessonId}
                                                    onClick={() => onSelectLesson(lesson)}
                                                    type="button"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-medium text-text-primary">{lesson.title}</p>
                                                            <p className="text-xs text-text-secondary">{lesson.subjectName}</p>
                                                        </div>
                                                        <Badge tone={isSelected ? "primary" : "muted"}>
                                                            {isSelected ? "Attached" : "Attach"}
                                                        </Badge>
                                                    </div>
                                                </button>
                                            );
                                        })}

                                        {filteredLessons.length === 0 ? (
                                            <div className="rounded-[20px] border border-dashed border-border bg-surface p-4 text-xs text-text-secondary">
                                                No matching lessons yet. Generate one in Learn and it will appear here.
                                            </div>
                                        ) : null}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    </div>
                ) : null}

                <CardHeader className="border-b border-border/60 pb-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div className="space-y-3">
                            <Badge className="gap-2" tone="warm">
                                <Message01Icon size={14} />
                                {conversationTitle}
                            </Badge>
                            <div className="space-y-2">
                                <CardTitle className="text-2xl">Ask Lernard anything</CardTitle>
                                <CardDescription className="max-w-2xl text-sm leading-6 text-text-secondary">
                                    Bring in a question, a screenshot, a PDF worksheet, or one of your own lessons and keep the explanation grounded in your work.
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge tone="cool">Lessons-first context</Badge>
                            <Badge tone="warm">PDF and image support</Badge>
                            <Badge tone="success">Responsive thread</Badge>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
                    {errorMessage ? (
                        <div className="flex items-start gap-3 rounded-3xl border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-text-primary">
                            <AlertCircleIcon className="mt-0.5 shrink-0" size={18} strokeWidth={1.8} />
                            <p>{errorMessage}</p>
                        </div>
                    ) : null}

                    <ScrollArea className="min-h-0 flex-1 rounded-[30px] border border-border/60 bg-white/80 p-4 shadow-inner shadow-accent-cool-100/40">
                        <div className="space-y-4">
                            {messages.length === 0 && !loadingConversation ? (
                                <div className="rounded-[28px] border border-dashed border-border bg-linear-to-br from-accent-cool-100/70 via-white to-accent-warm-100/70 p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500 text-white">
                                            <SparklesIcon size={20} strokeWidth={1.8} />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-text-primary">Build a sharper prompt</p>
                                            <p className="text-sm leading-6 text-text-secondary">
                                                Ask for a walkthrough, upload the worksheet you are stuck on, or attach a recent lesson so Lernard can stay on your exact track.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {messages.map((message) => (
                                <div
                                    className={cn(
                                        "max-w-[92%] rounded-[28px] px-4 py-3 md:max-w-[80%]",
                                        message.role === "user"
                                            ? "ml-auto bg-primary-500 text-white shadow-[0_20px_48px_-28px_rgba(62,99,221,0.8)]"
                                            : "bg-surface text-text-primary shadow-[0_18px_40px_-30px_rgba(36,52,88,0.3)]",
                                    )}
                                    key={message.id}
                                >
                                    <div className="space-y-3">
                                        {message.blocks.map((block, index) => (
                                            <MessageBlock
                                                block={block}
                                                key={`${message.id}-${index}`}
                                                role={message.role}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {loadingConversation ? (
                                <div className="w-fit rounded-[22px] bg-surface px-4 py-3 text-sm text-text-secondary">
                                    Loading that conversation...
                                </div>
                            ) : null}

                            {sending ? (
                                <div className="w-fit rounded-[22px] bg-surface px-4 py-3 text-sm text-text-secondary">
                                    Lernard is stitching the next explanation together...
                                </div>
                            ) : null}
                        </div>
                    </ScrollArea>

                    <div className="rounded-4xl border border-border/70 bg-white/90 p-3 shadow-[0_24px_64px_-40px_rgba(36,52,88,0.48)] backdrop-blur">
                        {attachmentCount > 0 ? (
                            <div className="mb-3 flex flex-wrap gap-2">
                                {uploadedFiles.map((file) => (
                                    <Badge className="gap-2" key={file.uploadId} tone="cool">
                                        {file.kind.toUpperCase()}
                                        <span className="max-w-40 truncate">{file.fileName}</span>
                                        <button
                                            className="text-xs font-semibold text-text-primary"
                                            onClick={() => {
                                                setUploadedFiles((current) => current.filter((item) => item.uploadId !== file.uploadId));
                                            }}
                                            type="button"
                                        >
                                            Remove
                                        </button>
                                    </Badge>
                                ))}
                                {selectedLessons.map((lesson) => (
                                    <Badge className="gap-2" key={lesson.lessonId} tone="warm">
                                        <BookOpen01Icon size={14} strokeWidth={1.8} />
                                        <span className="max-w-40 truncate">{lesson.title}</span>
                                        <button
                                            className="text-xs font-semibold text-text-primary"
                                            onClick={() => {
                                                setSelectedLessons((current) => current.filter((item) => item.lessonId !== lesson.lessonId));
                                            }}
                                            type="button"
                                        >
                                            Remove
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        ) : null}

                        <Textarea
                            className="min-h-30 border-0 bg-transparent px-1 py-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            onChange={(event) => setInput(event.target.value)}
                            onKeyDown={(event) => {
                                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                                    event.preventDefault();
                                    void onSend();
                                }
                            }}
                            placeholder="Ask for a walkthrough, bring in a worksheet, or ask Lernard to turn this into Set Work."
                            value={input}
                        />

                        <div className="mt-3 flex flex-col gap-3 border-t border-border/70 pt-3 md:flex-row md:items-end md:justify-between">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    className="gap-2"
                                    onClick={() => setAttachmentMenuOpen((current) => !current)}
                                    variant="secondary"
                                >
                                    <Add01Icon size={16} strokeWidth={1.8} />
                                    Attach context
                                </Button>
                                <Badge tone="cool">Ctrl + Enter to send</Badge>
                                <Badge tone={uploading ? "warning" : "muted"}>
                                    {uploading ? "Uploading files..." : `${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}`}
                                </Badge>
                            </div>
                            <Button className="gap-2" disabled={!input.trim() || sending || uploading} onClick={() => void onSend()}>
                                <SentIcon size={16} strokeWidth={1.8} />
                                Send to Lernard
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <input
                accept="application/pdf,image/gif,image/jpeg,image/png,image/webp"
                className="hidden"
                multiple
                onChange={(event) => {
                    void onUploadFiles(event.target.files);
                }}
                ref={fileInputRef}
                type="file"
            />
        </div>
    );
}

function MessageBlock({ block, role }: { block: ChatMessageBlock; role: "user" | "assistant" }) {
    if (block.type === "text") {
        return <p className="whitespace-pre-wrap text-sm leading-7">{block.content}</p>;
    }

    if (block.type === "attachments") {
        return (
            <div className="space-y-2">
                {block.items.map((attachment) => (
                    <div
                        className={cn(
                            "rounded-[20px] border px-3 py-3 text-sm",
                            role === "user"
                                ? "border-white/20 bg-white/10 text-white"
                                : "border-border bg-background text-text-primary",
                        )}
                        key={attachment.type === "lesson" ? attachment.lessonId : attachment.uploadId}
                    >
                        <div className="flex items-center gap-2 font-semibold">
                            <BookOpen01Icon size={16} strokeWidth={1.8} />
                            {attachment.type === "lesson" ? attachment.title : attachment.fileName}
                        </div>
                        <p
                            className={cn(
                                "mt-1 text-xs leading-5",
                                role === "user" ? "text-white/80" : "text-text-secondary",
                            )}
                        >
                            {attachment.type === "lesson"
                                ? `${attachment.subjectName ?? "General"} lesson attached for context.`
                                : `${attachment.kind.toUpperCase()} attached for this turn.`}
                        </p>
                    </div>
                ))}
            </div>
        );
    }

    if (block.type === "QuizCard") {
        return (
            <div className="rounded-[22px] border border-border/70 bg-background p-3 text-sm text-text-primary">
                <p className="font-medium">{block.props.title}</p>
                <p className="text-xs text-text-secondary">{block.props.summary}</p>
            </div>
        );
    }

    if (block.type === "ConceptBreakdown") {
        return (
            <div className="rounded-[22px] border border-border/70 bg-background p-3 text-sm text-text-primary">
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
        <div className="rounded-[22px] border border-border/70 bg-background p-3 text-xs text-text-secondary">
            <p className="font-medium text-text-primary">{block.props.title}</p>
            <p>{block.props.description}</p>
        </div>
    );
}

function buildAttachmentPayload(
    uploadedFiles: UploadAttachmentInput[],
    selectedLessons: ChatLessonAttachmentOption[],
): ChatAttachmentInput[] {
    return [
        ...uploadedFiles,
        ...selectedLessons.map((lesson) => ({
            type: "lesson" as const,
            lessonId: lesson.lessonId,
        })),
    ];
}

function buildOptimisticUserBlocks(
    message: string,
    uploadedFiles: UploadAttachmentInput[],
    selectedLessons: ChatLessonAttachmentOption[],
): ChatMessageBlock[] {
    const attachments: ChatAttachment[] = [
        ...uploadedFiles,
        ...selectedLessons.map((lesson) => ({
            type: "lesson" as const,
            lessonId: lesson.lessonId,
            title: lesson.title,
            subjectName: lesson.subjectName,
        })),
    ];

    return attachments.length === 0
        ? [{ type: "text", content: message }]
        : [
            { type: "text", content: message },
            { type: "attachments", items: attachments },
        ];
}

function getErrorMessage(error: unknown): string {
    if (error instanceof BrowserAuthError) {
        return error.message;
    }

    if (error instanceof BrowserApiError) {
        return error.body || "Lernard could not complete that request.";
    }

    return "Lernard hit a snag. Try that again in a moment.";
}
