import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Subjects — Lernard",
};

export default function SubjectsSettingsPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">Subjects</h1>
            <p className="text-text-secondary">Manage your subjects.</p>
        </div>
    );
}
