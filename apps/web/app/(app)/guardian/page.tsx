import type { Metadata } from "next";

import { GuardianPageClient } from "./GuardianPageClient";

export const metadata: Metadata = {
    title: "Guardian — Lernard",
    description: "Manage linked children, pending invites, and companion controls from one dashboard.",
};

export default function GuardianPage() {
    return <GuardianPageClient />;
}
