import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Settings — Lernard",
};

export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
            <p className="text-text-secondary">Customise your experience.</p>
        </div>
    );
}
