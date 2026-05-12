import type { Metadata } from "next";
import { PaymentReturnClient } from "./PaymentReturnClient";

export const metadata: Metadata = {
    title: "Payment — Lernard",
};

export default function PaymentReturnPage() {
    return <PaymentReturnClient />;
}
