import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

export default function ConversationScreen() {
    const { conversationId } = useLocalSearchParams();

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="flex-1 px-4 pt-6">
                <Text className="text-2xl font-bold text-foreground">Conversation</Text>
                <Text className="mt-2 text-muted-foreground">ID: {conversationId}</Text>
            </View>
        </SafeAreaView>
    );
}
