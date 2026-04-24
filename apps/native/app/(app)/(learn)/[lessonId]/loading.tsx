import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@rnr/text';

export default function LessonLoadingScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="flex-1 items-center justify-center">
                <Text className="text-lg text-muted-foreground">Generating your lesson...</Text>
            </View>
        </SafeAreaView>
    );
}
