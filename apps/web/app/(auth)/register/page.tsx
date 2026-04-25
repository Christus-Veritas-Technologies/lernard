import type { Metadata } from "next";

import { RegisterClient } from "./RegisterClient";

export const metadata: Metadata = {
    title: "Create account — Lernard",
};

export default function RegisterPage() {
    return <RegisterClient />;
}
