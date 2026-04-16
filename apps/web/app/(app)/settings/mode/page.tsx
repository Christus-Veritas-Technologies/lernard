import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Mode — Lernard",
};

export default function ModePage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">Mode</h1>
            <p className="text-text-secondary">Switch between Guide and Companion.</p>
        </div>
    );
}
