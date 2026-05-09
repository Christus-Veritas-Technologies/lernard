import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

import { QuizCreateForm } from "../QuizCreateForm";

export const metadata: Metadata = {
    title: "Create Quiz — Lernard",
    description: "Build a fresh quiz from text, lessons, images, or a document.",
};

export default function QuizCreatePage() {
    return (
        <div className="mx-auto w-full max-w-3xl">
            <Card>
                <CardHeader>
                    <CardTitle>Create quiz</CardTitle>
                    <CardDescription>
                        Choose your source, configure quiz length, and start practicing.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <QuizCreateForm />
                </CardContent>
            </Card>
        </div>
    );
}
