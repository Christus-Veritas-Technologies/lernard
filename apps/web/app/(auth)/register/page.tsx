import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Create account — Lernard",
};

export default function RegisterPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">Create account</h1>
            <p className="text-text-secondary">Start your learning journey.</p>
        </div>
    );
}
