import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BookOpen01Icon,
  Cancel01Icon,
  DocumentAttachmentIcon,
  ImageUploadIcon,
} from 'hugeicons-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, View } from 'react-native';

import { ROUTES } from '@lernard/routes';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { CardContent } from '@/rnr/card';
import { Input } from '@/rnr/input';
import { nativeApiFetch } from '@/lib/native-api';

type Source = 'text' | 'lesson' | 'image' | 'document';

interface LessonListItem {
  lessonId: string;
  topic: string;
  subjectName: string;
  completedAt: string | null;
}

interface UploadResult {
  uploadId: string;
  kind: 'image' | 'pdf';
  fileName: string;
  mimeType: string;
  size: number;
}

interface QuizCreateFormProps {
  onGenerated?: () => void;
}

const MULTIPLE_CHOICE_COUNTS = [5, 10, 15] as const;
const STRUCTURED_COUNTS = [1, 3, 5] as const;

const SOURCE_TABS: { id: Source; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'lesson', label: 'Past lesson' },
  { id: 'image', label: 'Image' },
  { id: 'document', label: 'Document' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function QuizCreateForm({ onGenerated }: QuizCreateFormProps) {
  const { lessonId, topic: initialTopic } = useLocalSearchParams<{
    lessonId?: string;
    topic?: string;
  }>();
  const router = useRouter();

  const [source, setSource] = useState<Source>('text');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'structured'>('multiple_choice');
  const [topic, setTopic] = useState(initialTopic ?? '');
  const [questionCount, setQuestionCount] = useState<1 | 3 | 5 | 10 | 15>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lessonSearch, setLessonSearch] = useState('');
  const [lessons, setLessons] = useState<LessonListItem[]>([]);
  const [lessonsLoaded, setLessonsLoaded] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<LessonListItem | null>(
    lessonId && initialTopic
      ? { lessonId, topic: initialTopic, subjectName: '', completedAt: null }
      : null,
  );

  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadLessons = useCallback(async () => {
    if (lessonsLoaded) return;

    try {
      const data = await nativeApiFetch<LessonListItem[]>(ROUTES.LESSONS.LIST);
      setLessons(data);
    } catch {
      // Keep the form usable with text mode if lessons fail.
    } finally {
      setLessonsLoaded(true);
    }
  }, [lessonsLoaded]);

  function switchSource(nextSource: Source) {
    setSource(nextSource);
    setUploadResult(null);
    setImageUri(null);
    setUploadError(null);
    if (nextSource === 'lesson') {
      void loadLessons();
    }
  }

  async function uploadFile(uri: string, name: string, type: string): Promise<void> {
    setUploading(true);
    setUploadError(null);

    try {
      const form = new FormData();
      form.append('file', { uri, name, type } as unknown as Blob);
      const result = await nativeApiFetch<UploadResult>(ROUTES.QUIZZES.ATTACHMENTS_UPLOAD, {
        method: 'POST',
        body: form,
      });
      setUploadResult(result);
    } catch {
      setUploadError('Upload failed. Please try again.');
      setImageUri(null);
    } finally {
      setUploading(false);
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setImageUri(asset.uri);
    setUploadResult(null);

    const name = asset.fileName ?? `image_${Date.now()}.jpg`;
    const type = asset.mimeType ?? 'image/jpeg';
    await uploadFile(asset.uri, name, type);
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploadResult(null);
    await uploadFile(asset.uri, asset.name, asset.mimeType ?? 'application/pdf');
  }

  function clearUpload() {
    setUploadResult(null);
    setImageUri(null);
    setUploadError(null);
  }

  const filteredLessons = lessons.filter(
    (lesson) =>
      lesson.topic.toLowerCase().includes(lessonSearch.toLowerCase())
      || lesson.subjectName.toLowerCase().includes(lessonSearch.toLowerCase()),
  );

  const canGenerate = (() => {
    if (loading || uploading) return false;
    if (source === 'text') return topic.trim().length > 0;
    if (source === 'lesson') return selectedLesson !== null;
    return uploadResult !== null;
  })();

  function setQuestionTypeWithCount(next: 'multiple_choice' | 'structured') {
    setQuestionType(next);
    if (next === 'structured') {
      if (![1, 3, 5].includes(questionCount)) {
        setQuestionCount(5);
      }
      return;
    }

    if (![5, 10, 15].includes(questionCount)) {
      setQuestionCount(15);
    }
  }

  async function onGenerate() {
    if (!canGenerate) return;

    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        questionCount,
        paperType: 'paper2',
        questionType,
        idempotencyKey: Math.random().toString(36).slice(2),
      };

      if (source === 'text') {
        body.topic = topic.trim();
      } else if (source === 'lesson' && selectedLesson) {
        body.topic = selectedLesson.topic;
        body.fromLessonId = selectedLesson.lessonId;
      } else if (uploadResult) {
        body.fromUploadId = uploadResult.uploadId;
        body.fromUploadKind = uploadResult.kind;
      }

      const response = await nativeApiFetch<{ quizId: string }>(ROUTES.QUIZZES.GENERATE, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      onGenerated?.();
      router.replace({ pathname: '/quiz/[quizId]', params: { quizId: response.quizId } });
    } catch {
      setError('Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="gap-4">
      <View>
        <Text className="mb-2 text-sm font-semibold text-slate-700">Question type</Text>
        <CardContent className="mt-0 flex-row gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {([
            { id: 'multiple_choice', label: 'Multiple Choice' },
            { id: 'structured', label: 'Structured Questions' },
          ] as const).map((option) => (
            <Pressable
              className={`flex-1 items-center rounded-lg py-2 ${questionType === option.id ? 'bg-white shadow-sm' : ''}`}
              key={option.id}
              onPress={() => setQuestionTypeWithCount(option.id)}
            >
              <Text className={`text-[11px] font-semibold ${questionType === option.id ? 'text-slate-900' : 'text-slate-500'}`}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </CardContent>
        <Text className="mt-1 text-xs text-slate-500">
          {questionType === 'structured'
            ? 'Generates multi-part exam-style questions with marking schemes.'
            : 'Generates a mix of single-answer and select-all-that-apply questions.'}
        </Text>
      </View>

      <View>
        <Text className="mb-2 text-sm font-semibold text-slate-700">Generate quiz from</Text>
        <CardContent className="mt-0 flex-row gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {SOURCE_TABS.map((tab) => (
            <Pressable
              className={`flex-1 items-center rounded-lg py-2 ${source === tab.id ? 'bg-white shadow-sm' : ''}`}
              key={tab.id}
              onPress={() => switchSource(tab.id)}
            >
              <Text className={`text-[11px] font-semibold ${source === tab.id ? 'text-slate-900' : 'text-slate-500'}`}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </CardContent>
      </View>

      {source === 'text' ? (
        <View>
          <Text className="mb-2 text-sm font-semibold text-slate-700">Topic</Text>
          <Input
            containerClassName="min-h-20 items-start rounded-xl"
            maxLength={300}
            multiline
            numberOfLines={3}
            onChangeText={setTopic}
            placeholder="e.g. CORS, photosynthesis, quadratic equations"
            textAlignVertical="top"
            value={topic}
          />
          <Text className="mt-1 text-right text-xs text-slate-500">{topic.length}/300</Text>
        </View>
      ) : null}

      {source === 'lesson' ? (
        <View>
          {selectedLesson ? (
            <View className="flex-row items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5">
              <BookOpen01Icon color="#6366f1" size={14} />
              <Text className="flex-1 text-sm font-medium text-indigo-700">{selectedLesson.topic}</Text>
              <Pressable
                onPress={() => {
                  setSelectedLesson(null);
                  setLessonSearch('');
                }}
              >
                <Cancel01Icon color="#818cf8" size={14} />
              </Pressable>
            </View>
          ) : (
            <View className="gap-2">
              <Input
                onChangeText={setLessonSearch}
                placeholder="Search your past lessons..."
                value={lessonSearch}
              />
              <View className="max-h-64 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {!lessonsLoaded ? (
                  <View className="items-center py-6">
                    <ActivityIndicator color="#6366f1" />
                  </View>
                ) : filteredLessons.length === 0 ? (
                  <View className="px-4 py-6">
                    <Text className="text-center text-sm text-slate-400">
                      {lessonSearch ? 'No lessons match your search.' : 'No completed lessons yet.'}
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredLessons}
                    ItemSeparatorComponent={() => <CardContent className="mt-0 h-px bg-slate-100" />}
                    keyExtractor={(item) => item.lessonId}
                    renderItem={({ item }) => (
                      <Pressable className="px-3 py-2.5 active:bg-slate-50" onPress={() => setSelectedLesson(item)}>
                        <Text className="text-sm font-medium text-slate-800">{item.topic}</Text>
                        {item.subjectName ? (
                          <Text className="mt-0.5 text-xs text-slate-400">{item.subjectName}</Text>
                        ) : null}
                      </Pressable>
                    )}
                    scrollEnabled={false}
                  />
                )}
              </View>
            </View>
          )}
        </View>
      ) : null}

      {source === 'image' ? (
        <View>
          {uploadResult && imageUri ? (
            <View className="overflow-hidden rounded-xl border border-slate-200">
              <Image className="h-48 w-full" resizeMode="cover" source={{ uri: imageUri }} />
              <View className="flex-row items-center justify-between bg-slate-50 px-3 py-2">
                <Text className="flex-1 truncate text-xs text-slate-600">{uploadResult.fileName}</Text>
                <Pressable onPress={() => { clearUpload(); void pickImage(); }}>
                  <Text className="ml-2 text-xs font-semibold text-indigo-600">Change</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              className="items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 py-10"
              disabled={uploading}
              onPress={() => void pickImage()}
            >
              {uploading ? <ActivityIndicator color="#6366f1" size="large" /> : <ImageUploadIcon color="#94a3b8" size={30} />}
              <Text className="text-sm font-medium text-slate-500">
                {uploading ? 'Uploading...' : 'Tap to pick an image'}
              </Text>
              <Text className="text-xs text-slate-400">PNG, JPG, WEBP, GIF - up to 15 MB</Text>
            </Pressable>
          )}
          {uploadError ? <Text className="mt-2 text-sm text-red-600">{uploadError}</Text> : null}
        </View>
      ) : null}

      {source === 'document' ? (
        <View>
          {uploadResult ? (
            <View className="flex-row items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <DocumentAttachmentIcon color="#6366f1" size={20} />
              <View className="flex-1">
                <Text className="text-sm font-medium text-slate-800">{uploadResult.fileName}</Text>
                <Text className="text-xs text-slate-400">{formatBytes(uploadResult.size)}</Text>
              </View>
              <Pressable onPress={() => { clearUpload(); void pickDocument(); }}>
                <Text className="text-xs font-semibold text-indigo-600">Change</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              className="items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 py-10"
              disabled={uploading}
              onPress={() => void pickDocument()}
            >
              {uploading ? <ActivityIndicator color="#6366f1" size="large" /> : <DocumentAttachmentIcon color="#94a3b8" size={30} />}
              <Text className="text-sm font-medium text-slate-500">
                {uploading ? 'Uploading...' : 'Tap to pick a PDF'}
              </Text>
              <Text className="text-xs text-slate-400">PDF - up to 15 MB</Text>
            </Pressable>
          )}
          {uploadError ? <Text className="mt-2 text-sm text-red-600">{uploadError}</Text> : null}
        </View>
      ) : null}

      <View>
        <Text className="mb-2 text-sm font-semibold text-slate-700">Number of questions</Text>
        <View className="flex-row gap-3">
          {(questionType === 'structured' ? STRUCTURED_COUNTS : MULTIPLE_CHOICE_COUNTS).map((count) => (
            <Button
              className={`flex-1 rounded-xl py-3 ${questionCount === count ? 'border border-indigo-500 bg-indigo-50' : 'border border-slate-200 bg-white'}`}
              key={count}
              onPress={() => setQuestionCount(count)}
              textClassName={questionCount === count ? 'text-indigo-700' : 'text-slate-700'}
              title={`${count}`}
              variant="secondary"
            />
          ))}
        </View>
      </View>

      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

      <Button disabled={!canGenerate} onPress={onGenerate} title={loading ? 'Generating...' : 'Generate Quiz'} />
    </View>
  );
}
