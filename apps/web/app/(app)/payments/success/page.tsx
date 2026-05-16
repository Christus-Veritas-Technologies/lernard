import type { Metadata } from "next";
import { PaymentReturnClient } from "../return/PaymentReturnClient";

export const metadata: Metadata = {
    title: "Payment Success — Lernard",
};

type PageProps = {
    searchParams?: {
        intermediatePayment?: string;
        sessionId?: string;
    };
};

export default function PaymentSuccessPage({ searchParams }: PageProps) {
    const sessionId = searchParams?.intermediatePayment ?? searchParams?.sessionId ?? null;

    return <PaymentReturnClient initialSessionId={sessionId} />;
}
