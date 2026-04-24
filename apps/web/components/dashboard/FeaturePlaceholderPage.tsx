import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHero } from "@/components/dashboard/PageHero";

interface FeaturePlaceholderItem {
    title: string;
    description: string;
    detail: string;
    tone?: "primary" | "warm" | "cool" | "success" | "warning" | "muted";
}

interface FeaturePlaceholderPageProps {
    eyebrow: string;
    title: string;
    description: string;
    badge: string;
    noteTitle: string;
    noteDescription: string;
    items: FeaturePlaceholderItem[];
}

export function FeaturePlaceholderPage({
    eyebrow,
    title,
    description,
    badge,
    noteTitle,
    noteDescription,
    items,
}: FeaturePlaceholderPageProps) {
    return (
        <div className="flex flex-col gap-6">
            <PageHero
                aside={
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">What&apos;s happening here</CardTitle>
                            <CardDescription>{noteDescription}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Badge tone="warm">{noteTitle}</Badge>
                        </CardContent>
                    </Card>
                }
                description={description}
                eyebrow={eyebrow}
                title={title}
            >
                <Badge tone="primary">{badge}</Badge>
            </PageHero>

            <section className="grid gap-4 lg:grid-cols-3">
                {items.map((item) => (
                    <Card key={item.title}>
                        <CardHeader>
                            <Badge className="w-fit" tone={item.tone ?? "muted"}>
                                {item.title}
                            </Badge>
                            <CardTitle>{item.description}</CardTitle>
                            <CardDescription>{item.detail}</CardDescription>
                        </CardHeader>
                    </Card>
                ))}
            </section>
        </div>
    );
}