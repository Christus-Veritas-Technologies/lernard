import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Account type — Lernard",
};

export default function AccountTypePage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">
                Who are you?
            </h1>
            <p className="text-text-secondary">
                Choose your account type to get started.
            </p>
        </div>
    );
}
