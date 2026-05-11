"use client";

import {
    Add01Icon,
    AlertCircleIcon,
    ArrowLeft01Icon,
    BookOpen01Icon,
    HelpCircleIcon,
    Menu01Icon,
    Message01Icon,
    PlayCircleIcon,
    SchoolBell01Icon,
    SentIcon,
    SparklesIcon,
} from "hugeicons-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";

import { ROUTES } from "@lernard/routes";
import type {
    ChatAttachment,
    ChatAttachmentInput,
    ChatConversationDetail,
    ChatConversationMessage,
    ChatLessonAttachmentOption,
    ChatMessageBlock,
    ChatQuizAttachmentOption,
    ConversationListItem,
    QuizRemediationContext,
} from "@lernard/shared-types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { BrowserApiError, BrowserAuthError, browserApiFetch } from "@/lib/browser-api";
import { cn } from "@/lib/cn";

type UploadAttachmentInput = Extract<ChatAttachmentInput, { type: "upload" }>;

interface MessageResponse {
    conversationId: string;
    blocks: ChatMessageBlock[];
}

const ATTACHABLE_QUIZZES_ROUTE = (ROUTES.CHAT as typeof ROUTES.CHAT & { ATTACHABLE_QUIZZES: string }).ATTACHABLE_QUIZZES;

export function ChatPageClient() {
    const searchParams = useSearchParams();
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [conversationTitle, setConversationTitle] = useState("New chat");
    const [conversations, setConversations] = useState<ConversationListItem[]>([]);
    const [lessons, setLessons] = useState<ChatLessonAttachmentOption[]>([]);
    const [quizzes, setQuizzes] = useState<ChatQuizAttachmentOption[]>([]);
    const [messages, setMessages] = useState<ChatConversationMessage[]>([]);
    const [input, setInput] = useState("");
    const [lessonQuery, setLessonQuery] = useState("");
    const [quizQuery, setQuizQuery] = useState("");
    const [selectedLessons, setSelectedLessons] = useState<ChatLessonAttachmentOption[]>([]);
    const [selectedQuizzes, setSelectedQuizzes] = useState<ChatQuizAttachmentOption[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<UploadAttachmentInput[]>([]);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [loadingConversation, setLoadingConversation] = useState(false);
    const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [quizRemediationContext, setQuizRemediationContext] = useState<QuizRemediationContext | null>(null);
    const [loadingQuizContext, setLoadingQuizContext] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const deepLinkAppliedRef = useRef(false);
    const deferredLessonQuery = useDeferredValue(lessonQuery);

    const attachQuizId = searchParams.get("attachQuizId");
    const prefillMessage = searchParams.get("prompt");

    function applySuggestedPrompt(prefill: string) {
        setInput(prefill);
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(prefill.length, prefill.length);
        }
    }

    useEffect(() => {
        let isDisposed = false;

        void Promise.allSettled([
            browserApiFetch<ConversationListItem[]>(ROUTES.CHAT.CONVERSATIONS),
            browserApiFetch<ChatLessonAttachmentOption[]>(ROUTES.CHAT.ATTACHABLE_LESSONS),
            browserApiFetch<ChatQuizAttachmentOption[]>(ATTACHABLE_QUIZZES_ROUTE),
        ]).then(([conversationResult, lessonResult, quizResult]) => {
            if (isDisposed) {
                return;
            }

            if (conversationResult.status === "fulfilled") {
                setConversations(conversationResult.value);
            }

            if (lessonResult.status === "fulfilled") {
                setLessons(lessonResult.value);
            }

            if (quizResult.status === "fulfilled") {
                setQuizzes(quizResult.value);
            }
        });

        return () => {
            isDisposed = true;
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (!attachQuizId) {
            setQuizRemediationContext(null);
            return;
        }

        let disposed = false;
        setLoadingQuizContext(true);
        void browserApiFetch<QuizRemediationContext>(ROUTES.QUIZZES.REMEDIATION_CONTEXT(attachQuizId))
            .then((context) => {
                if (!disposed) {
                    setQuizRemediationContext(context);
                }
            })
            .catch(() => {
                if (!disposed) {
                    setQuizRemediationContext(null);
                }
            })
            .finally(() => {
                if (!disposed) {
                    setLoadingQuizContext(false);
                }
            });

        return () => {
            disposed = true;
        };
    }, [attachQuizId]);

    useEffect(() => {
        if (deepLinkAppliedRef.current) {
            return;
        }

        let applied = false;

        if (attachQuizId && quizzes.length > 0) {
            const match = quizzes.find((quiz) => quiz.quizId === attachQuizId);
            if (match) {
                setSelectedQuizzes((current) => {
                    if (current.some((item) => item.quizId === match.quizId)) {
                        return current;
                    }
                    return [...current, match].slice(0, 6);
                });
                applied = true;
            }
        }

        if (prefillMessage && !input.trim()) {
            setInput(prefillMessage);
            applied = true;
        }

        if (!prefillMessage && quizRemediationContext && !input.trim()) {
            setInput(buildRemediationOpeningPrompt(quizRemediationContext));
            applied = true;
        }

        if (applied || (!attachQuizId && !prefillMessage)) {
            deepLinkAppliedRef.current = true;
        }
    }, [attachQuizId, prefillMessage, quizzes, input, quizRemediationContext]);

    const filteredLessons = lessons.filter((lesson) => {
        const normalizedQuery = deferredLessonQuery.trim().toLowerCase();
        if (!normalizedQuery) {
            return true;
        }

        return `${lesson.title} ${lesson.subjectName}`.toLowerCase().includes(normalizedQuery);
    });

    const filteredQuizzes = quizzes.filter((quiz) => {
        const normalizedQuery = quizQuery.trim().toLowerCase();
        if (!normalizedQuery) {
            return true;
        }

        return `${quiz.title} ${quiz.subjectName}`.toLowerCase().includes(normalizedQuery);
    });

    const attachmentCount = uploadedFiles.length + selectedLessons.length + selectedQuizzes.length;

    async function loadConversation(nextConversationId: string) {
        setMobileSidebarOpen(false);
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

        const trimmed = input.trim();
        const sentUploads = uploadedFiles;
        const sentLessons = selectedLessons;
        const sentQuizzes = selectedQuizzes;

        const optimisticBlocks = buildOptimisticUserBlocks(trimmed, sentUploads, sentLessons, sentQuizzes);
        const nextUserMessage: ChatConversationMessage = {
            id: crypto.randomUUID(),
            role: "user",
            blocks: optimisticBlocks,
            createdAt: new Date().toISOString(),
        };

        setErrorMessage(null);
        setMessages((current) => [...current, nextUserMessage]);
        setInput("");
        setUploadedFiles([]);
        setSelectedLessons([]);
        setSelectedQuizzes([]);
        setAttachmentMenuOpen(false);
        setSending(true);

        try {
            const response = await browserApiFetch<MessageResponse>(ROUTES.CHAT.MESSAGE, {
                method: "POST",
                body: JSON.stringify({
                    conversationId,
                    message: trimmed,
                    attachments: buildAttachmentPayload(sentUploads, sentLessons, sentQuizzes),
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

    function onSelectQuiz(quiz: ChatQuizAttachmentOption) {
        setErrorMessage(null);

        if (selectedQuizzes.some((item) => item.quizId === quiz.quizId)) {
            setSelectedQuizzes((current) => current.filter((item) => item.quizId !== quiz.quizId));
            return;
        }

        if (attachmentCount >= 6) {
            setErrorMessage("Keep each message to six attachments or fewer.");
            return;
        }

        setSelectedQuizzes((current) => [...current, quiz]);
    }

    function onStartNewChat() {
        setMobileSidebarOpen(false);
        startTransition(() => {
            setConversationId(null);
            setConversationTitle("New chat");
            setMessages([]);
            setInput("");
            setSelectedLessons([]);
            setSelectedQuizzes([]);
            setUploadedFiles([]);
            setAttachmentMenuOpen(false);
            setErrorMessage(null);
        });
    }

    const sidebarBody = (
        <div className="flex h-full flex-col overflow-hidden">
            <div className="space-y-3 border-b border-border/60 p-4 pb-5">
                <div className="flex items-center justify-between gap-2">
                    <Link
                        className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-background-subtle hover:text-text-primary"
                        href="/home"
                    >
                        <ArrowLeft01Icon size={14} strokeWidth={2} />
                        Back to home
                    </Link>
                    <button
                        className="hidden xl:inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-background-subtle hover:text-text-primary"
                        onClick={() => setDesktopSidebarCollapsed(true)}
                        type="button"
                    >
                        Collapse
                    </button>
                </div>

                <div>
                    <Badge className="gap-2 mb-2" tone="cool">
                        <SparklesIcon size={14} />
                        Lernard chat
                    </Badge>
                    <CardTitle className="text-xl">Your learning space</CardTitle>
                    <CardDescription className="mt-1 max-w-sm text-sm text-text-secondary">
                        Pick up where you left off, or start a fresh thread to chat about a lesson, run a quiz, or learn something new.
                    </CardDescription>
                </div>

                <Button className="w-full gap-2" onClick={onStartNewChat} variant="secondary">
                    <Add01Icon size={16} strokeWidth={1.8} />
                    New chat
                </Button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                    Recent conversations
                </p>
                <ScrollArea className="flex-1 pr-1">
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
                                        "w-full rounded-3xl border p-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                        isActive
                                            ? "border-primary-300 bg-white shadow-[0_18px_44px_-34px_rgba(36,52,88,0.4)]"
                                            : "border-border/70 bg-surface/80 hover:-translate-y-px hover:border-primary-200 hover:bg-white hover:shadow-[0_12px_32px_-26px_rgba(36,52,88,0.35)]",
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
                                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-text-secondary">
                                        {conversation.lastMessage || "No messages yet"}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );

    return (
        <div className="flex h-dvh flex-col gap-3 overflow-hidden p-3 xl:flex-row">
            {/* Desktop sidebar */}
            <Card
                className={cn(
                    "hidden xl:w-[320px] xl:shrink-0 xl:flex-col xl:h-full xl:overflow-hidden border-none bg-linear-to-br from-accent-cool-100 via-background to-accent-warm-100 shadow-[0_28px_80px_-36px_rgba(36,52,88,0.45)]",
                    desktopSidebarCollapsed ? "xl:hidden" : "xl:flex",
                )}
            >
                {sidebarBody}
            </Card>

            {/* Main chat panel */}
            <Card className="relative flex h-full flex-1 flex-col overflow-hidden border-none bg-linear-to-b from-white via-background to-accent-cool-100/60 shadow-[0_30px_90px_-40px_rgba(36,52,88,0.42)]">
                <CardHeader className="shrink-0 border-b border-border/60 pb-4">
                    <div className="flex items-center gap-3">
                        {/* Mobile hamburger — opens sidebar Sheet */}
                        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    className="xl:hidden h-10 w-10 shrink-0 px-0"
                                    variant="secondary"
                                >
                                    <Menu01Icon size={18} strokeWidth={1.8} />
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="bg-linear-to-br from-accent-cool-100 via-background to-accent-warm-100">
                                {sidebarBody}
                            </SheetContent>
                        </Sheet>

                        {/* Desktop re-expand — only visible when sidebar is collapsed */}
                        {desktopSidebarCollapsed ? (
                            <Button
                                className="hidden xl:inline-flex h-10 w-10 shrink-0 px-0"
                                onClick={() => setDesktopSidebarCollapsed(false)}
                                variant="secondary"
                            >
                                <Menu01Icon size={18} strokeWidth={1.8} />
                            </Button>
                        ) : null}

                        <Badge className="gap-2" tone="warm">
                            <Message01Icon size={14} />
                            {conversationTitle}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="flex min-h-0 flex-1 flex-col gap-2 p-2 md:p-3">
                    {errorMessage ? (
                        <div className="flex items-start gap-3 rounded-3xl border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-text-primary">
                            <AlertCircleIcon className="mt-0.5 shrink-0" size={18} strokeWidth={1.8} />
                            <p>{errorMessage}</p>
                        </div>
                    ) : null}

                    <ScrollArea className="min-h-0 flex-1 rounded-[30px] border border-border/60 bg-white/80 p-2 shadow-inner shadow-accent-cool-100/40">
                        <div className="space-y-4">
                            {attachQuizId && messages.length === 0 ? (
                                <Card className="border-primary-200 bg-linear-to-br from-primary-50/70 via-white to-accent-warm-100/50 shadow-[0_18px_40px_-28px_rgba(36,52,88,0.35)]">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <CardTitle className="text-base">Quiz remediation context</CardTitle>
                                            <Badge tone="cool">Attached quiz</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {loadingQuizContext ? (
                                            <p className="text-sm text-text-secondary">Loading quiz context...</p>
                                        ) : quizRemediationContext ? (
                                            <>
                                                <p className="text-sm text-text-secondary">
                                                    {quizRemediationContext.topic} · {quizRemediationContext.score}/{quizRemediationContext.total} ({quizRemediationContext.percentageScore}%)
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {quizRemediationContext.weakSubtopics.slice(0, 4).map((item) => (
                                                        <Badge key={`weak-${item.name}`} tone="warning">Weak: {item.name}</Badge>
                                                    ))}
                                                    {quizRemediationContext.strongSubtopics.slice(0, 2).map((item) => (
                                                        <Badge key={`strong-${item}`} tone="success">Strong: {item}</Badge>
                                                    ))}
                                                </div>
                                                {quizRemediationContext.misconceptions[0] ? (
                                                    <p className="text-xs leading-6 text-text-secondary">
                                                        Misconception to fix first: {quizRemediationContext.misconceptions[0].studentBelievedX} → {quizRemediationContext.misconceptions[0].correctAnswerIsY}
                                                    </p>
                                                ) : null}
                                            </>
                                        ) : (
                                            <p className="text-sm text-text-secondary">Could not load remediation details, but the quiz is still attached for context.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            ) : null}

                            {messages.length === 0 && !loadingConversation ? (
                                <div className="rounded-[28px] border border-dashed border-border bg-linear-to-br from-accent-cool-100/70 via-white to-accent-warm-100/70 p-6">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white">
                                            <SparklesIcon size={20} strokeWidth={1.8} />
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-base font-semibold text-text-primary">What do you want to learn today?</p>
                                                <p className="text-sm leading-6 text-text-secondary">
                                                    Ask Lernard to teach you a topic, quiz you on a subject, or unpack a worksheet. Lernard will spin up a lesson or quiz right here in chat.
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1.5 text-xs font-medium text-text-primary transition hover:border-primary-300 hover:bg-accent-cool-100/70"
                                                    onClick={() => applySuggestedPrompt("Teach me about ")}
                                                    type="button"
                                                >
                                                    <BookOpen01Icon size={14} strokeWidth={1.8} />
                                                    Teach me…
                                                </button>
                                                <button
                                                    className="inline-flex items-center gap-2 rounded-full border border-accent-warm-300 bg-white px-3 py-1.5 text-xs font-medium text-text-primary transition hover:border-accent-warm-400 hover:bg-accent-warm-100/60"
                                                    onClick={() => applySuggestedPrompt("Quiz me on ")}
                                                    type="button"
                                                >
                                                    <SchoolBell01Icon size={14} strokeWidth={1.8} />
                                                    Quiz me on…
                                                </button>
                                                <button
                                                    className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-text-primary transition hover:border-primary-200 hover:bg-background-subtle"
                                                    onClick={() => applySuggestedPrompt("Explain ")}
                                                    type="button"
                                                >
                                                    <HelpCircleIcon size={14} strokeWidth={1.8} />
                                                    Explain…
                                                </button>
                                            </div>
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

                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>

                    <div className="shrink-0 rounded-4xl border border-border/70 bg-white/90 p-2 shadow-[0_24px_64px_-40px_rgba(36,52,88,0.48)] backdrop-blur">
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
                                {selectedQuizzes.map((quiz) => (
                                    <Badge className="gap-2" key={quiz.quizId} tone="warm">
                                        <SchoolBell01Icon size={14} strokeWidth={1.8} />
                                        <span className="max-w-40 truncate">{quiz.title}</span>
                                        <button
                                            className="text-xs font-semibold text-text-primary"
                                            onClick={() => {
                                                setSelectedQuizzes((current) => current.filter((item) => item.quizId !== quiz.quizId));
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
                            placeholder="Try: 'Teach me photosynthesis', 'Quiz me on French verbs', or 'Explain the worksheet I attached.'"
                            ref={textareaRef}
                            value={input}
                        />

                        <div className="mt-3 flex flex-col gap-3 border-t border-border/70 pt-3 md:flex-row md:items-end md:justify-between">
                            <div className="flex flex-wrap gap-2">
                                <Popover open={attachmentMenuOpen} onOpenChange={setAttachmentMenuOpen}>
                                    <PopoverTrigger asChild>
                                        <Button className="gap-2" variant="secondary">
                                            <Add01Icon size={16} strokeWidth={1.8} />
                                            Attach context
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        align="start"
                                        className="w-[min(92vw,34rem)] p-0"
                                        side="top"
                                    >
                                        <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 pb-3 pt-4">
                                            <div>
                                                <p className="text-sm font-semibold text-text-primary">Attach context</p>
                                                <p className="text-xs text-text-secondary">
                                                    Upload a PDF or image, or pull in a recent lesson from Lernard.
                                                </p>
                                            </div>
                                            <Badge tone="muted">{attachmentCount}/6</Badge>
                                        </div>

                                        <ScrollArea className="max-h-[70vh] px-4 pb-4 pt-4">
                                            <div className="space-y-4">
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

                                                <Accordion className="space-y-3" defaultValue={["lessons-controls", "lessons-results", "quizzes-controls", "quizzes-results"]} type="multiple">
                                                    <AccordionItem value="lessons-controls">
                                                        <AccordionTrigger>
                                                            <span className="flex items-center gap-2">
                                                                <BookOpen01Icon size={18} strokeWidth={1.8} />
                                                                Attach a lesson
                                                            </span>
                                                        </AccordionTrigger>
                                                        <AccordionContent>
                                                            <Input
                                                                onChange={(event) => setLessonQuery(event.target.value)}
                                                                placeholder="Search your recent lessons"
                                                                value={lessonQuery}
                                                            />
                                                        </AccordionContent>
                                                    </AccordionItem>

                                                    <AccordionItem value="lessons-results">
                                                        <AccordionTrigger>Recent lessons</AccordionTrigger>
                                                        <AccordionContent>
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
                                                                        No matching lessons yet. Generate one in Lessons and it will appear here.
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>

                                                    <AccordionItem value="quizzes-controls">
                                                        <AccordionTrigger>
                                                            <span className="flex items-center gap-2">
                                                                <SchoolBell01Icon size={18} strokeWidth={1.8} />
                                                                Attach a quiz
                                                            </span>
                                                        </AccordionTrigger>
                                                        <AccordionContent>
                                                            <Input
                                                                onChange={(event) => setQuizQuery(event.target.value)}
                                                                placeholder="Search your recent quizzes"
                                                                value={quizQuery}
                                                            />
                                                        </AccordionContent>
                                                    </AccordionItem>

                                                    <AccordionItem value="quizzes-results">
                                                        <AccordionTrigger>Recent quizzes</AccordionTrigger>
                                                        <AccordionContent>
                                                            <div className="space-y-2">
                                                                {filteredQuizzes.map((quiz) => {
                                                                    const isSelected = selectedQuizzes.some((item) => item.quizId === quiz.quizId);

                                                                    return (
                                                                        <button
                                                                            className={cn(
                                                                                "w-full rounded-[20px] border px-3 py-3 text-left transition",
                                                                                isSelected
                                                                                    ? "border-primary-300 bg-primary-100/70"
                                                                                    : "border-border bg-white hover:border-primary-200 hover:bg-accent-cool-100/50",
                                                                            )}
                                                                            key={quiz.quizId}
                                                                            onClick={() => onSelectQuiz(quiz)}
                                                                            type="button"
                                                                        >
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <div>
                                                                                    <p className="text-sm font-medium text-text-primary">{quiz.title}</p>
                                                                                    <p className="text-xs text-text-secondary">
                                                                                        {quiz.subjectName} · {quiz.totalQuestions} questions
                                                                                        {typeof quiz.score === "number"
                                                                                            ? ` · score ${quiz.score}/${quiz.totalQuestions}`
                                                                                            : " · not completed"}
                                                                                    </p>
                                                                                </div>
                                                                                <Badge tone={isSelected ? "primary" : "muted"}>
                                                                                    {isSelected ? "Attached" : "Attach"}
                                                                                </Badge>
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}

                                                                {filteredQuizzes.length === 0 ? (
                                                                    <div className="rounded-[20px] border border-dashed border-border bg-surface p-4 text-xs text-text-secondary">
                                                                        No matching quizzes yet. Complete a quiz and it will appear here.
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                </Accordion>
                                            </div>
                                        </ScrollArea>
                                    </PopoverContent>
                                </Popover>
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

    if (block.type === "markdown") {
        const isUser = role === "user";
        return (
            <div className={cn("text-sm leading-7", isUser ? "text-white" : "text-text-primary")}>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>,
                        li: ({ children }) => <li className="leading-7">{children}</li>,
                        h1: ({ children }) => <h1 className="mb-2 mt-3 text-base font-semibold">{children}</h1>,
                        h2: ({ children }) => <h2 className="mb-2 mt-3 text-base font-semibold">{children}</h2>,
                        h3: ({ children }) => <h3 className="mb-2 mt-3 text-sm font-semibold">{children}</h3>,
                        h4: ({ children }) => <h4 className="mb-1 mt-2 text-sm font-semibold">{children}</h4>,
                        a: ({ children, href }) => (
                            <a
                                className={cn(
                                    "underline underline-offset-2",
                                    isUser ? "text-white" : "text-primary-500 hover:text-primary-600",
                                )}
                                href={href}
                                rel="noreferrer"
                                target="_blank"
                            >
                                {children}
                            </a>
                        ),
                        code: ({ children }) => (
                            <code
                                className={cn(
                                    "rounded px-1 py-0.5 text-xs",
                                    isUser ? "bg-white/20" : "bg-background-subtle text-text-primary",
                                )}
                            >
                                {children}
                            </code>
                        ),
                        blockquote: ({ children }) => (
                            <blockquote className="my-2 border-l-2 border-border pl-3 text-text-secondary">
                                {children}
                            </blockquote>
                        ),
                    }}
                >
                    {block.content}
                </ReactMarkdown>
            </div>
        );
    }

    if (block.type === "code") {
        return (
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-slate-900 text-sm">
                {block.language && (
                    <div className="border-b border-white/10 px-4 py-2 text-xs font-medium text-slate-400">
                        {block.language}{block.fileName ? ` · ${block.fileName}` : ""}
                    </div>
                )}
                <pre className="overflow-x-auto p-4 text-slate-200">
                    <code>{block.code}</code>
                </pre>
            </div>
        );
    }

    if (block.type === "attachments") {
        return (
            <div className="space-y-2">
                {block.items.map((attachment) => {
                    const key =
                        attachment.type === "lesson"
                            ? attachment.lessonId
                            : attachment.type === "quiz"
                              ? attachment.quizId
                              : attachment.uploadId;
                    const title =
                        attachment.type === "lesson" || attachment.type === "quiz"
                            ? attachment.title
                            : attachment.fileName;

                    return (
                        <div
                            className={cn(
                                "rounded-[20px] border px-3 py-3 text-sm",
                                role === "user"
                                    ? "border-white/20 bg-white/10 text-white"
                                    : "border-border bg-background text-text-primary",
                            )}
                            key={key}
                        >
                            <div className="flex items-center gap-2 font-semibold">
                                <BookOpen01Icon size={16} strokeWidth={1.8} />
                                {title}
                            </div>
                            <p
                                className={cn(
                                    "mt-1 text-xs leading-5",
                                    role === "user" ? "text-white/80" : "text-text-secondary",
                                )}
                            >
                                {attachment.type === "lesson"
                                    ? `${attachment.subjectName ?? "General"} lesson attached for context.`
                                    : attachment.type === "quiz"
                                      ? `${attachment.subjectName ?? "General"} quiz attached for discussion context.`
                                      : `${attachment.kind.toUpperCase()} attached for this turn.`}
                            </p>
                        </div>
                    );
                })}
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

    if (block.type === "LessonRefCard") {
        const { lessonId, title, subjectName, depth, estimatedMinutes } = block.props;
        return (
            <div className="rounded-[22px] border border-primary-200 bg-white p-4 shadow-[0_18px_44px_-30px_rgba(36,52,88,0.35)]">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge className="gap-1.5" tone="cool">
                        <BookOpen01Icon size={12} strokeWidth={1.8} />
                        Lesson · {depth}
                    </Badge>
                    <span className="text-xs text-text-secondary">{estimatedMinutes} min</span>
                </div>
                <p className="font-semibold text-text-primary">{title}</p>
                {subjectName ? <p className="text-xs text-text-secondary">{subjectName}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-primary-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-600"
                        href={`/learn/${lessonId}`}
                    >
                        <PlayCircleIcon size={14} strokeWidth={1.8} />
                        Start lesson
                    </Link>
                    <Link
                        className="inline-flex items-center gap-1.5 rounded-2xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-primary transition hover:bg-background-subtle"
                        href={`/learn/${lessonId}`}
                        target="_blank"
                    >
                        View lesson
                    </Link>
                </div>
            </div>
        );
    }

    if (block.type === "QuizRefCard") {
        const { quizId, title, subjectName, totalQuestions } = block.props;
        return (
            <div className="rounded-[22px] border border-accent-warm-300 bg-white p-4 shadow-[0_18px_44px_-30px_rgba(232,147,127,0.35)]">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge className="gap-1.5" tone="warm">
                        <SchoolBell01Icon size={12} strokeWidth={1.8} />
                        Quiz · {totalQuestions} questions
                    </Badge>
                </div>
                <p className="font-semibold text-text-primary">{title}</p>
                {subjectName ? <p className="text-xs text-text-secondary">{subjectName}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-primary-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-600"
                        href={`/practice-exams/${quizId}`}
                    >
                        <PlayCircleIcon size={14} strokeWidth={1.8} />
                        Start quiz
                    </Link>
                    <Link
                        className="inline-flex items-center gap-1.5 rounded-2xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-primary transition hover:bg-background-subtle"
                        href={`/practice-exams/${quizId}`}
                        target="_blank"
                    >
                        View quiz
                    </Link>
                </div>
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
    selectedQuizzes: ChatQuizAttachmentOption[],
): ChatAttachmentInput[] {
    return [
        ...uploadedFiles,
        ...selectedLessons.map((lesson) => ({
            type: "lesson" as const,
            lessonId: lesson.lessonId,
        })),
        ...selectedQuizzes.map((quiz) => ({
            type: "quiz" as const,
            quizId: quiz.quizId,
        })),
    ];
}

function buildOptimisticUserBlocks(
    message: string,
    uploadedFiles: UploadAttachmentInput[],
    selectedLessons: ChatLessonAttachmentOption[],
    selectedQuizzes: ChatQuizAttachmentOption[],
): ChatMessageBlock[] {
    const attachments: ChatAttachment[] = [
        ...uploadedFiles,
        ...selectedLessons.map((lesson) => ({
            type: "lesson" as const,
            lessonId: lesson.lessonId,
            title: lesson.title,
            subjectName: lesson.subjectName,
        })),
        ...selectedQuizzes.map((quiz) => ({
            type: "quiz" as const,
            quizId: quiz.quizId,
            title: quiz.title,
            subjectName: quiz.subjectName,
            totalQuestions: quiz.totalQuestions,
            score: quiz.score,
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

function buildRemediationOpeningPrompt(context: QuizRemediationContext): string {
    const weak = context.weakSubtopics.slice(0, 3).map((item) => item.name).join(", ");
    const misconception = context.misconceptions[0];

    if (misconception) {
        return `Help me review ${context.topic}. Focus on ${weak || "my weak subtopics"}. I thought "${misconception.studentBelievedX}", but the correct idea is "${misconception.correctAnswerIsY}". Teach this clearly, then give me short practice checks.`;
    }

    return `Help me review ${context.topic}. Focus on ${weak || "my weak subtopics"}. Explain what I got wrong and then give me short practice checks.`;
}
