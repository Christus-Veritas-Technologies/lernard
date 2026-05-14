import type { Metadata } from "next";
import { PaymentReturnClient } from "../return/PaymentReturnClient";

export const metadata: Metadata = {
    title: "Payment Success — Lernard",
};

export default function PaymentSuccessPage() {
    return <PaymentReturnClient />;
}
