import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Welcome — Lernard",
    description: "Your personal AI tutor. Always ready.",
};

export default function WelcomePage() {
    return (
        <div className="flex flex-col items-center gap-6 text-center">
            <h1 className="text-4xl font-bold text-text-primary">Lernard</h1>
            <p className="text-lg text-text-secondary">
                Your personal tutor. Always ready.
            </p>
        </div>
    );
}
