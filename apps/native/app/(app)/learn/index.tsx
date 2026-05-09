import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    BookOpen01Icon,
    Cancel01Icon,
    DocumentAttachmentIcon,
    ImageUploadIcon,
    Message01Icon,
    SchoolBell01Icon,
} from 'hugeicons-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { QuizHistoryItem, QuizHistoryResponse } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { CardContent } from '@/rnr/card';
import { Input } from '@/rnr/input';
import { nativeApiFetch } from '@/lib/native-api';

type Source = 'text' | 'quiz' | 'image' | 'document';

interface UploadResult {
    uploadId: string;
    kind: 'image' | 'pdf';
    fileName: string;
    mimeType: string;
    size: number;
}

const SOURCE_TABS: { id: Source; label: string }[] = [
    { id: 'text', label: 'Text' },
    { id: 'quiz', label: 'Past Practice Exam' },
    { id: 'image', label: 'Image' },
    { id: 'document', label: 'Document' },
];

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LearnEntryScreen() {
        const { topic: initialTopic } = useLocalSearchParams<{ topic?: string }>();
    const router = useRouter();

        const [source, setSource] = useState<Source>('text');
        const [topic, setTopic] = useState(initialTopic ?? '');
        const [depth, setDepth] = useState<'quick' | 'standard' | 'deep'>('standard');
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState<string | null>(null);

        const [quizSearch, setQuizSearch] = useState('');
        const [quizzes, setQuizzes] = useState<QuizHistoryItem[]>([]);
        const [quizzesLoaded, setQuizzesLoaded] = useState(false);
        const [selectedQuiz, setSelectedQuiz] = useState<QuizHistoryItem | null>(null);

        const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
        const [imageUri, setImageUri] = useState<string | null>(null);
        const [uploading, setUploading] = useState(false);
        const [uploadError, setUploadError] = useState<string | null>(null);

        const loadQuizzes = useCallback(async () => {
            if (quizzesLoaded) return;

            try {
                const data = await nativeApiFetch<QuizHistoryResponse>(
                    `${ROUTES.QUIZZES.HISTORY}?limit=20&status=completed`,
                );
                setQuizzes(data.quizzes);
            } catch {
                setQuizzes([]);
            } finally {
                setQuizzesLoaded(true);
            }
        }, [quizzesLoaded]);

        function switchSource(nextSource: Source) {
            setSource(nextSource);
            setUploadResult(null);
            setImageUri(null);
            setUploadError(null);
            if (nextSource === 'quiz') {
                void loadQuizzes();
            }
        }

        async function uploadFile(uri: string, name: string, type: string): Promise<void> {
            setUploading(true);
            setUploadError(null);

            try {
                const form = new FormData();
                form.append('file', { uri, name, type } as unknown as Blob);
                const result = await nativeApiFetch<UploadResult>(ROUTES.LESSONS.ATTACHMENTS_UPLOAD, {
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

        const filteredQuizzes = quizzes.filter(
            (quiz) =>
                quiz.topic.toLowerCase().includes(quizSearch.toLowerCase())
                || quiz.subjectName.toLowerCase().includes(quizSearch.toLowerCase()),
        );

        const canGenerate = (() => {
            if (loading || uploading) return false;
            if (source === 'text') return topic.trim().length > 0;
            if (source === 'quiz') return selectedQuiz !== null;
            return uploadResult !== null;
        })();

        async function onGenerate() {
            if (!canGenerate) return;

            setLoading(true);
            setError(null);
            try {
                const body: Record<string, unknown> = {
                    depth,
                    idempotencyKey: `lesson-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                };

                if (source === 'text') {
                    body.topic = topic.trim();
                } else if (source === 'quiz' && selectedQuiz) {
                    body.fromQuizId = selectedQuiz.quizId;
                } else if (uploadResult) {
                    body.fromUploadId = uploadResult.uploadId;
                    body.fromUploadKind = uploadResult.kind;
                }

                const response = await nativeApiFetch<{ lessonId: string }>(ROUTES.LESSONS.GENERATE, {
                    method: 'POST',
                    body: JSON.stringify(body),
                });

                router.push({ pathname: '/learn/[lessonId]', params: { lessonId: response.lessonId } });
            } catch {
                setError('Failed to generate lesson. Please try again.');
            } finally {
                setLoading(false);
            }
        }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <View className="flex-row items-center gap-2">
                        <BookOpen01Icon color="#4F46E5" size={18} strokeWidth={1.8} />
                        <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Lessons</Text>
                    </View>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">Pick your next learning move</Text>
                                        <Text className="mt-3 text-base leading-7 text-slate-600">Create a lesson from your own topic, past practice exams, an image, or a PDF.</Text>

                                        <View className="mt-5">
                                            <Text className="mb-2 text-sm font-semibold text-slate-700">Generate lesson from</Text>
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
                                            <View className="mt-4">
                                                <Text className="mb-2 text-sm font-semibold text-slate-700">Topic</Text>
                                                <Input
                                                    containerClassName="min-h-20 items-start rounded-xl"
                                                    maxLength={300}
                                                    multiline
                                                    numberOfLines={3}
                                                    onChangeText={setTopic}
                                                    placeholder="Type a topic, question, or concept"
                                                    textAlignVertical="top"
                                                    value={topic}
                                                />
                                                <Text className="mt-1 text-right text-xs text-slate-500">{topic.length}/300</Text>
                                            </View>
                                        ) : null}

                                        {source === 'quiz' ? (
                                            <View className="mt-4">
                                                {selectedQuiz ? (
                                                    <View className="flex-row items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5">
                                                        <BookOpen01Icon color="#6366f1" size={14} />
                                                        <Text className="flex-1 text-sm font-medium text-indigo-700">{selectedQuiz.topic}</Text>
                                                        <Pressable
                                                            onPress={() => {
                                                                setSelectedQuiz(null);
                                                                setQuizSearch('');
                                                            }}
                                                        >
                                                            <Cancel01Icon color="#818cf8" size={14} />
                                                        </Pressable>
                                                    </View>
                                                ) : (
                                                    <View className="gap-2">
                                                        <Input
                                                            onChangeText={setQuizSearch}
                                                            placeholder="Search past practice exams..."
                                                            value={quizSearch}
                                                        />
                                                        <View className="max-h-64 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                                            {!quizzesLoaded ? (
                                                                <View className="items-center py-6">
                                                                    <ActivityIndicator color="#6366f1" />
                                                                </View>
                                                            ) : filteredQuizzes.length === 0 ? (
                                                                <View className="px-4 py-6">
                                                                    <Text className="text-center text-sm text-slate-400">
                                                                        {quizSearch ? 'No practice exams match your search.' : 'No completed practice exams yet.'}
                                                                    </Text>
                                                                </View>
                                                            ) : (
                                                                <FlatList
                                                                    data={filteredQuizzes}
                                                                    ItemSeparatorComponent={() => <CardContent className="mt-0 h-px bg-slate-100" />}
                                                                    keyExtractor={(item) => item.quizId}
                                                                    renderItem={({ item }) => (
                                                                        <Pressable className="px-3 py-2.5 active:bg-slate-50" onPress={() => setSelectedQuiz(item)}>
                                                                            <Text className="text-sm font-medium text-slate-800">{item.topic}</Text>
                                                                            <Text className="mt-0.5 text-xs text-slate-400">{item.subjectName}</Text>
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
                                            <View className="mt-4">
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
                                            <View className="mt-4">
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

                                        <View className="mt-5">
                                            <Text className="mb-2 text-sm font-semibold text-slate-700">Depth</Text>
                                            <View className="flex-row gap-3">
                                                {([
                                                    { label: 'Quick', value: 'quick' },
                                                    { label: 'Full', value: 'standard' },
                                                    { label: 'Deep', value: 'deep' },
                                                ] as const).map((option) => (
                                                    <Button
                                                        className={`flex-1 rounded-xl py-3 ${depth === option.value ? 'border border-indigo-500 bg-indigo-50' : 'border border-slate-200 bg-white'}`}
                                                        key={option.value}
                                                        onPress={() => setDepth(option.value)}
                                                        textClassName={depth === option.value ? 'text-indigo-700' : 'text-slate-700'}
                                                        title={option.label}
                                                        variant="secondary"
                                                    />
                                                ))}
                                            </View>
                                        </View>

                                        {error ? <Text className="mt-4 text-sm text-red-600">{error}</Text> : null}

                                        <View className="mt-6 flex-row flex-wrap gap-3">
                                                <Button disabled={!canGenerate} onPress={onGenerate} title={loading ? 'Generating...' : 'Generate lesson'} />
                                                <Button
                                                        iconLeft={<SchoolBell01Icon color="#FFFFFF" size={16} strokeWidth={1.8} />}
                                                        onPress={() => router.push('/quiz/entry')}
                                                        title="Start practice exam"
                                                />
                                                <Button
                                                        iconLeft={<Message01Icon color="#0F172A" size={16} strokeWidth={1.8} />}
                                                        onPress={() => router.push('/chat')}
                                                        title="Ask Lernard"
                                                        variant="secondary"
                                                />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
