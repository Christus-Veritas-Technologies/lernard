import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/rnr/card';

import { QuizCreateForm } from './QuizCreateForm';

export default function QuizCreateScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-5">
        <CardContent className="mt-0 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
          <Text className="text-2xl font-semibold text-slate-900">Create practice exam</Text>
          <Button onPress={() => router.back()} title="Back" variant="secondary" />
        </CardContent>

        <Card className="p-4">
          <CardHeader className="gap-1">
            <CardTitle className="text-lg">Build a fresh practice exam</CardTitle>
            <Text className="text-sm text-slate-500">
              Choose your source, set practice exam question count, and start practicing.
            </Text>
          </CardHeader>
          <CardContent>
            <QuizCreateForm />
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
