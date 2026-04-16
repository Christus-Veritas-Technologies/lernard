import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "History — Lernard",
};

export default function HistoryPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">History</h1>
            <p className="text-text-secondary">Your learning journey so far.</p>
        </div>
    );
}
