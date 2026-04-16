import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Log in — Lernard",
};

export default function LoginPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">Log in</h1>
            <p className="text-text-secondary">Welcome back to Lernard.</p>
        </div>
    );
}
