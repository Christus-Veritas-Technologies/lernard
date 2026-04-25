import type { Metadata } from "next";

import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
    title: "Log in — Lernard",
};

export default function LoginPage() {
    return <LoginClient />;
}
