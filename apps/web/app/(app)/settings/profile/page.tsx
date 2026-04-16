import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Profile — Lernard",
};

export default function ProfilePage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">Profile</h1>
            <p className="text-text-secondary">Manage your profile details.</p>
        </div>
    );
}
