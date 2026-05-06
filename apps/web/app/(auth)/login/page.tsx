import type { Metadata } from "next";

import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
    title: "Sign in — Lernard",
};

export default function LoginPage() {
    return <LoginClient />;
}
