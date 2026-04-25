import type { Metadata } from "next";

import { WelcomeClient } from "./WelcomeClient";

export const metadata: Metadata = {
    title: "Welcome — Lernard",
    description: "Your personal AI tutor. Always ready.",
};

export default function WelcomePage() {
    return <WelcomeClient />;
}
