import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "First Look — Lernard",
};

export default function FirstLookPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">First Look</h1>
            <p className="text-text-secondary">
                A quick check so Lernard knows where to start.
            </p>
        </div>
    );
}
