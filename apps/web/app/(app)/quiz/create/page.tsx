import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

import { QuizCreateForm } from "../QuizCreateForm";

export const metadata: Metadata = {
    title: "Create Practice Exam — Lernard",
    description: "Build a fresh practice exam from text, lessons, images, or a document.",
};

export default function QuizCreatePage() {
    return (
        <div className="mx-auto w-full max-w-3xl">
            <Card>
                <CardHeader>
                    <CardTitle>Create practice exam</CardTitle>
                    <CardDescription>
                        Choose your source, configure practice exam length, and start practicing.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <QuizCreateForm />
                </CardContent>
            </Card>
        </div>
    );
}
