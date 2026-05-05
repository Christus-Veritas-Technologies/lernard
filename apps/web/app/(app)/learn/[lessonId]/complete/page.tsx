import { PostLessonClient } from "./PostLessonClient";

interface PostLessonPageProps {
    params: Promise<{ lessonId: string }>;
}

export default async function PostLessonPage({ params }: PostLessonPageProps) {
    const { lessonId } = await params;
    return <PostLessonClient lessonId={lessonId} />;
}
