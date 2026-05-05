"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Add01Icon, Message01Icon } from "hugeicons-react";

import { useAuthMeQuery } from "@/hooks/useAuthMutations";

function ChatSidebar() {
    const { data: me } = useAuthMeQuery();
    const initials = me?.name
        ? me.name
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase()
        : "?";

    return (
        <aside className="flex h-full w-72 flex-col border-r border-border bg-surface">
            {/* Brand header */}
            <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500">
                    <Message01Icon className="text-white" size={15} />
                </div>
                <span className="text-[15px] font-semibold text-text-primary">Chat</span>
                <div className="flex-1" />
                <Link
                    aria-label="Go back to app"
                    className="text-xs text-text-tertiary hover:text-text-secondary"
                    href="/home"
                >
                    ← Back
                </Link>
            </div>

            {/* New conversation button */}
            <div className="px-3 pt-4">
                <button
                    className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-text-tertiary transition-colors hover:border-primary-300 hover:text-text-secondary disabled:cursor-not-allowed"
                    disabled
                    title="Conversation history is coming soon"
                    type="button"
                >
                    <Add01Icon size={16} />
                    New conversation
                </button>
            </div>

            {/* Conversation list empty state */}
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8">
                <Message01Icon className="text-text-tertiary" size={32} />
                <p className="text-center text-sm text-text-tertiary">
                    Your conversations will appear here once chat is available.
                </p>
            </div>

            {/* User footer */}
            {me && (
                <div className="flex shrink-0 items-center gap-3 border-t border-border px-4 py-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">{me.name}</p>
                        {me.email && (
                            <p className="truncate text-xs text-text-tertiary">{me.email}</p>
                        )}
                    </div>
                </div>
            )}
        </aside>
    );
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <ChatSidebar />
            <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
        </div>
    );
}
