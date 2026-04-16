import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Preferences — Lernard",
};

export default function PreferencesPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">Preferences</h1>
            <p className="text-text-secondary">Tune how Lernard teaches you.</p>
        </div>
    );
}
