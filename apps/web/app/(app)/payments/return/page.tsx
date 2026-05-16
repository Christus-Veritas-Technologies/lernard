import type { Metadata } from "next";
import { PaymentReturnClient } from "./PaymentReturnClient";

export const metadata: Metadata = {
    title: "Payment — Lernard",
};

type PageProps = {
    searchParams?: {
        intermediatePayment?: string;
        sessionId?: string;
    };
};

export default function PaymentReturnPage({ searchParams }: PageProps) {
    const sessionId = searchParams?.intermediatePayment ?? searchParams?.sessionId ?? null;

    return <PaymentReturnClient initialSessionId={sessionId} />;
}
