import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Progress — Lernard",
};

export default function ProgressPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">Progress</h1>
            <p className="text-text-secondary">Lernard&apos;s Read on You.</p>
        </div>
    );
}
