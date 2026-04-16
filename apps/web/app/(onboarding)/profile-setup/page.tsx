import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Set up your profile — Lernard",
};

export default function ProfileSetupPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">
                Let&apos;s get to know you
            </h1>
            <p className="text-text-secondary">
                Tell Lernard a bit about yourself so lessons fit you perfectly.
            </p>
        </div>
    );
}
