import type { Metadata } from "next";

import { AccountTypeClient } from "./AccountTypeClient";

export const metadata: Metadata = {
    title: "Account type — Lernard",
};

export default function AccountTypePage() {
    return <AccountTypeClient />;
}
