import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BookOpen01Icon,
  Clock01Icon,
  Cancel01Icon,
  DocumentAttachmentIcon,
  ImageUploadIcon,
  MoreHorizontalCircle01Icon,
  PencilEdit01Icon,
  RefreshIcon,
  Rocket01Icon,
  SchoolReportCardIcon,
  SignalMedium02Icon,
} from 'hugeicons-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type {
  QuizDashboardStats,
  QuizHistoryItem,
  QuizHistoryResponse,
} from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
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

const EMPTY_STATS: QuizDashboardStats = {
  quizzesThisMonth: 0,
  monthlyLimit: null,
  averageScoreThisMonth: null,
  quizzesInProgress: 0,
  growthAreasFlagged: 0,
  mostQuizzedSubject: null,
  mostCommonDifficulty: null,
};

const COUNTS = [5, 10, 15] as const;

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

export default function QuizEntryScreen() {
  const { lessonId, topic: initialTopic } = useLocalSearchParams<{
    lessonId?: string;
    topic?: string;
  }>();
  const router = useRouter();

  const [source, setSource] = useState<Source>('text');
  const [topic, setTopic] = useState(initialTopic ?? '');
  const [questionCount, setQuestionCount] = useState<5 | 10 | 15>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [stats, setStats] = useState<QuizDashboardStats>(EMPTY_STATS);
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);

  // Lesson source state
  const [lessonSearch, setLessonSearch] = useState('');
  const [lessons, setLessons] = useState<LessonListItem[]>([]);
  const [lessonsLoaded, setLessonsLoaded] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<LessonListItem | null>(
    lessonId && initialTopic
      ? { lessonId, topic: initialTopic, subjectName: '', completedAt: null }
      : null,
  );

  // Upload source state
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const [statsData, historyData] = await Promise.all([
        nativeApiFetch<QuizDashboardStats>(ROUTES.QUIZZES.DASHBOARD_STATS),
        nativeApiFetch<QuizHistoryResponse>(`${ROUTES.QUIZZES.HISTORY}?limit=8`),
      ]);
      setStats(statsData);
      setHistory(historyData.quizzes);
      setHistoryCursor(historyData.nextCursor);
      setHistoryHasMore(historyData.hasMore);
    } catch {
      setDashboardError('Could not load your quiz dashboard yet.');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const loadLessons = useCallback(async () => {
    if (lessonsLoaded) return;
    try {
      const data = await nativeApiFetch<LessonListItem[]>(ROUTES.LESSONS.LIST);
      setLessons(data);
    } catch {
      // silently ignore
    } finally {
      setLessonsLoaded(true);
    }
  }, [lessonsLoaded]);

  function switchSource(newSource: Source) {
    setSource(newSource);
    setUploadResult(null);
    setImageUri(null);
    setUploadError(null);
    if (newSource === 'lesson') {
      void loadLessons();
    }
  }

  async function uploadFile(
    uri: string,
    name: string,
    type: string,
  ): Promise<void> {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      // React Native FormData accepts file-like objects via casting
      form.append('file', { uri, name, type } as unknown as Blob);
      const result = await nativeApiFetch<UploadResult>(
        ROUTES.QUIZZES.ATTACHMENTS_UPLOAD,
        { method: 'POST', body: form },
      );
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

  async function loadMoreHistory() {
    if (!historyHasMore || !historyCursor || historyLoadingMore) return;

    setHistoryLoadingMore(true);
    try {
      const nextPage = await nativeApiFetch<QuizHistoryResponse>(
        `${ROUTES.QUIZZES.HISTORY}?limit=8&cursor=${encodeURIComponent(historyCursor)}`,
      );
      setHistory((prev) => [...prev, ...nextPage.quizzes]);
      setHistoryCursor(nextPage.nextCursor);
      setHistoryHasMore(nextPage.hasMore);
    } finally {
      setHistoryLoadingMore(false);
    }
  }

  const filteredLessons = lessons.filter(
    (l) =>
      l.topic.toLowerCase().includes(lessonSearch.toLowerCase()) ||
      l.subjectName.toLowerCase().includes(lessonSearch.toLowerCase()),
  );

  const canGenerate = (() => {
    if (loading || uploading) return false;
    if (source === 'text') return topic.trim().length > 0;
    if (source === 'lesson') return selectedLesson !== null;
    return uploadResult !== null;
  })();

  async function generate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        questionCount,
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
      void loadDashboard();
      router.replace({ pathname: '/quiz/[quizId]', params: { quizId: response.quizId } });
    } catch {
      setError('Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const monthlyUsageLabel =
    stats.monthlyLimit === null
      ? `${stats.quizzesThisMonth} quizzes this month`
      : `${stats.quizzesThisMonth} / ${stats.monthlyLimit} this month`;

  const avgScoreLabel =
    stats.averageScoreThisMonth === null
      ? 'No completed quizzes'
      : `${stats.averageScoreThisMonth.toFixed(1)} / 10 average`;

  function statusTone(status: QuizHistoryItem['status']): string {
    if (status === 'completed') return 'text-green-700 bg-green-50 border-green-200';
    if (status === 'in_progress') return 'text-blue-700 bg-blue-50 border-blue-200';
    if (status === 'queued') return 'text-amber-700 bg-amber-50 border-amber-200';
    if (status === 'failed') return 'text-red-700 bg-red-50 border-red-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  }

  function statusLabel(status: QuizHistoryItem['status']): string {
    if (status === 'in_progress') return 'In progress';
    if (status === 'not_started') return 'Not started';
    if (status === 'queued') return 'Queued';
    if (status === 'failed') return 'Failed';
    return 'Completed';
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center border-b border-slate-100 px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <Text className="text-base font-medium text-indigo-600">← Back</Text>
        </Pressable>
        <Text className="ml-4 text-base font-semibold text-slate-900">New Quiz</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-5 pb-8 gap-5"
        keyboardShouldPersistTaps="handled"
      >
        <View className="rounded-2xl border border-slate-200 bg-white p-4">
          <View className="mb-3 flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-base font-semibold text-slate-900">Quiz Dashboard</Text>
              <Text className="mt-0.5 text-xs text-slate-500">
                Track your momentum and jump back into unfinished quizzes.
              </Text>
            </View>
            <Pressable
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5"
              onPress={() => void loadDashboard()}
            >
              <View className="flex-row items-center gap-1.5">
                <RefreshIcon color="#475569" size={14} />
                <Text className="text-xs font-semibold text-slate-600">Refresh</Text>
              </View>
            </Pressable>
          </View>

          {dashboardError ? (
            <Text className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {dashboardError}
            </Text>
          ) : null}

          <View className="mb-4 flex-row flex-wrap gap-2">
            <View className="min-w-[47%] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <View className="mb-1 flex-row items-center gap-1.5">
                <Rocket01Icon color="#64748b" size={13} />
                <Text className="text-[11px] text-slate-500">Monthly activity</Text>
              </View>
              <Text className="text-xs font-semibold text-slate-800">
                {dashboardLoading ? '...' : monthlyUsageLabel}
              </Text>
            </View>
            <View className="min-w-[47%] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <View className="mb-1 flex-row items-center gap-1.5">
                <SchoolReportCardIcon color="#64748b" size={13} />
                <Text className="text-[11px] text-slate-500">Score trend</Text>
              </View>
              <Text className="text-xs font-semibold text-slate-800">
                {dashboardLoading ? '...' : avgScoreLabel}
              </Text>
            </View>
            <View className="min-w-[47%] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <View className="mb-1 flex-row items-center gap-1.5">
                <Clock01Icon color="#64748b" size={13} />
                <Text className="text-[11px] text-slate-500">In progress</Text>
              </View>
              <Text className="text-xs font-semibold text-slate-800">
                {dashboardLoading
                  ? '...'
                  : `${stats.quizzesInProgress} quiz${stats.quizzesInProgress === 1 ? '' : 'zes'}`}
              </Text>
            </View>
            <View className="min-w-[47%] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <View className="mb-1 flex-row items-center gap-1.5">
                <SignalMedium02Icon color="#64748b" size={13} />
                <Text className="text-[11px] text-slate-500">Growth areas</Text>
              </View>
              <Text className="text-xs font-semibold text-slate-800">
                {dashboardLoading ? '...' : stats.growthAreasFlagged}
              </Text>
            </View>
          </View>

          <Text className="mb-2 text-sm font-semibold text-slate-900">Recent quizzes</Text>
          {history.length === 0 ? (
            <Text className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
              No quizzes yet. Generate one below to get started.
            </Text>
          ) : (
            <View className="gap-2">
              {history.map((item) => (
                <Pressable
                  className="rounded-xl border border-slate-200 px-3 py-2.5 active:bg-slate-50"
                  key={item.quizId}
                  onPress={() =>
                    router.push({
                      pathname: '/quiz/[quizId]',
                      params: { quizId: item.quizId },
                    })
                  }
                >
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                        {item.topic}
                      </Text>
                      <Text className="mt-0.5 text-xs text-slate-500">
                        {item.subjectName} • {item.paperType.toUpperCase()} • {item.difficulty}
                      </Text>
                    </View>
                    <View className={`rounded-full border px-2 py-0.5 ${statusTone(item.status)}`}>
                      <Text className="text-[10px] font-semibold">{statusLabel(item.status)}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {historyHasMore ? (
            <Pressable
              className="mt-3 flex-row items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2"
              onPress={() => void loadMoreHistory()}
            >
              <MoreHorizontalCircle01Icon color="#475569" size={14} />
              <Text className="text-xs font-semibold text-slate-600">
                {historyLoadingMore ? 'Loading...' : 'Load more'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Source selector */}
        <View>
          <Text className="mb-2 text-sm font-semibold text-slate-700">Generate quiz from</Text>
          <View className="flex-row gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {SOURCE_TABS.map((tab) => (
              <Pressable
                className={`flex-1 items-center rounded-lg py-2 ${
                  source === tab.id
                    ? 'bg-white shadow-sm'
                    : ''
                }`}
                key={tab.id}
                onPress={() => switchSource(tab.id)}
              >
                <Text
                  className={`text-[11px] font-semibold ${
                    source === tab.id ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Source: Text */}
        {source === 'text' ? (
          <View>
            <Text className="mb-2 text-sm font-semibold text-slate-700">Topic</Text>
            <TextInput
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              maxLength={300}
              multiline
              numberOfLines={3}
              onChangeText={setTopic}
              placeholder="e.g. CORS, photosynthesis, quadratic equations"
              placeholderTextColor="#94a3b8"
              value={topic}
            />
          </View>
        ) : null}

        {/* Source: Past lesson */}
        {source === 'lesson' ? (
          <View>
            {selectedLesson ? (
              <View className="flex-row items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5">
                <BookOpen01Icon color="#6366f1" size={14} />
                <Text className="flex-1 text-sm font-medium text-indigo-700">
                  {selectedLesson.topic}
                </Text>
                <Pressable onPress={() => { setSelectedLesson(null); setLessonSearch(''); }}>
                  <Cancel01Icon color="#818cf8" size={14} />
                </Pressable>
              </View>
            ) : (
              <View>
                <TextInput
                  className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
                  onChangeText={setLessonSearch}
                  placeholder="Search your past lessons…"
                  placeholderTextColor="#94a3b8"
                  value={lessonSearch}
                />
                <View className="max-h-64 overflow-hidden rounded-xl border border-slate-200">
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
                      ItemSeparatorComponent={() => <View className="h-px bg-slate-100" />}
                      keyExtractor={(item) => item.lessonId}
                      renderItem={({ item }) => (
                        <Pressable
                          className="px-3 py-2.5 active:bg-slate-50"
                          onPress={() => setSelectedLesson(item)}
                        >
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

        {/* Source: Image */}
        {source === 'image' ? (
          <View>
            {uploadResult && imageUri ? (
              <View className="overflow-hidden rounded-xl border border-slate-200">
                <Image
                  className="h-48 w-full"
                  resizeMode="cover"
                  source={{ uri: imageUri }}
                />
                <View className="flex-row items-center justify-between bg-slate-50 px-3 py-2">
                  <Text className="flex-1 truncate text-xs text-slate-600">
                    {uploadResult.fileName}
                  </Text>
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
                {uploading ? (
                  <ActivityIndicator color="#6366f1" size="large" />
                ) : (
                  <ImageUploadIcon color="#94a3b8" size={32} />
                )}
                <Text className="text-sm font-medium text-slate-500">
                  {uploading ? 'Uploading…' : 'Tap to pick an image'}
                </Text>
                <Text className="text-xs text-slate-400">PNG, JPG, WEBP, GIF — up to 15 MB</Text>
              </Pressable>
            )}
            {uploadError ? (
              <Text className="mt-2 text-sm text-red-600">{uploadError}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Source: Document */}
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
                {uploading ? (
                  <ActivityIndicator color="#6366f1" size="large" />
                ) : (
                  <DocumentAttachmentIcon color="#94a3b8" size={32} />
                )}
                <Text className="text-sm font-medium text-slate-500">
                  {uploading ? 'Uploading…' : 'Tap to pick a PDF'}
                </Text>
                <Text className="text-xs text-slate-400">PDF — up to 15 MB</Text>
              </Pressable>
            )}
            {uploadError ? (
              <Text className="mt-2 text-sm text-red-600">{uploadError}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Number of questions */}
        <View>
          <Text className="mb-2 text-sm font-semibold text-slate-700">Number of questions</Text>
          <View className="flex-row gap-3">
            {COUNTS.map((n) => (
              <Pressable
                className={`flex-1 items-center rounded-xl border py-3 ${
                  questionCount === n
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 bg-white'
                }`}
                key={n}
                onPress={() => setQuestionCount(n)}
              >
                <Text
                  className={`text-sm font-semibold ${
                    questionCount === n ? 'text-indigo-700' : 'text-slate-700'
                  }`}
                >
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

        <Button
          disabled={!canGenerate}
          onPress={generate}
          title={loading ? 'Generating…' : 'Generate Quiz'}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
