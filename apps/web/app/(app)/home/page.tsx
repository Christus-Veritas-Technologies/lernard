import type { Metadata } from "next";

import { HomePageClient } from "./HomePageClient";

export const metadata: Metadata = {
    title: "Home — Lernard",
    description: "Your personal learning dashboard with quick starts, momentum, and recent sessions.",
};

export default function HomePage() {
    return <HomePageClient />;
}
