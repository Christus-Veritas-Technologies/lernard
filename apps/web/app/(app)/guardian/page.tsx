import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Guardian — Lernard",
};

export default function GuardianPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">Guardian</h1>
            <p className="text-text-secondary">Manage your children&apos;s accounts.</p>
        </div>
    );
}
