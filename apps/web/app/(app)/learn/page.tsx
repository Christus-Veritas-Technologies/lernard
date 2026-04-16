import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Learn — Lernard",
};

export default function LearnPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">Learn</h1>
            <p className="text-text-secondary">Choose a topic to get started.</p>
        </div>
    );
}
