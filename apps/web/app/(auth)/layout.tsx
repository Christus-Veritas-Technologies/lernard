import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign in — Lernard",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
            <div className="w-full max-w-5xl">{children}</div>
        </div>
    );
}
