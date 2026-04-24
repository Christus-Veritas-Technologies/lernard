import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@rnr/text';

export default function LessonCompleteScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-2xl font-bold text-foreground">Lesson Complete</Text>
                <Text className="mt-2 text-muted-foreground">Great work! Here's how you did.</Text>
            </View>
        </SafeAreaView>
    );
}
