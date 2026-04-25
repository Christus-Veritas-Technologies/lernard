import type { Metadata } from "next";

import { ProfileSetupClient } from "./ProfileSetupClient";

export const metadata: Metadata = {
    title: "Set up your profile — Lernard",
};

export default function ProfileSetupPage() {
    return <ProfileSetupClient />;
}
