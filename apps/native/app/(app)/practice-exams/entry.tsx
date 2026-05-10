import { Redirect, useLocalSearchParams } from 'expo-router';

export default function QuizEntryRedirectScreen() {
  const { lessonId, topic } = useLocalSearchParams<{ lessonId?: string; topic?: string }>();

  if (lessonId || topic) {
    return <Redirect href={{ pathname: '/practice-exams/create', params: { lessonId: lessonId ?? '', topic: topic ?? '' } }} />;
  }

  return <Redirect href="/practice-exams/create" />;
}
