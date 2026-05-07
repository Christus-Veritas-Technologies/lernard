"use client";

import { RequireWebAuth } from "@/components/auth/RequireWebAuth";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <RequireWebAuth>
            <main className="min-h-screen bg-background">{children}</main>
        </RequireWebAuth>
    );
}
