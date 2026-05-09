import { Redirect, useLocalSearchParams } from 'expo-router';

export default function QuizEntryRedirectScreen() {
  const { lessonId, topic } = useLocalSearchParams<{ lessonId?: string; topic?: string }>();

  if (lessonId || topic) {
    return <Redirect href={{ pathname: '/quiz/create', params: { lessonId: lessonId ?? '', topic: topic ?? '' } }} />;
  }

  return <Redirect href="/quiz/create" />;
}
