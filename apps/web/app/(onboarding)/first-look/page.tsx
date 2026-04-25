import type { Metadata } from "next";

import { FirstLookClient } from "./FirstLookClient";

export const metadata: Metadata = {
    title: "First Look — Lernard",
};

export default function FirstLookPage() {
    return <FirstLookClient />;
}
