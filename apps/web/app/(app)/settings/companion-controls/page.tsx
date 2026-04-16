import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Companion controls — Lernard",
};

export default function CompanionControlsPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">
                Companion controls
            </h1>
            <p className="text-text-secondary">
                Adjust what Lernard&apos;s companion can do.
            </p>
        </div>
    );
}
