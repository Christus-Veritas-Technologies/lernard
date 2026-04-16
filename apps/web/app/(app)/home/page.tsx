import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Home — Lernard",
};

export default function HomePage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">
                Good morning
            </h1>
            <p className="text-text-secondary">
                What would you like to learn today?
            </p>
        </div>
    );
}
