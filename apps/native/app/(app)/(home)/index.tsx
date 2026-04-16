import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <Text className="text-2xl font-bold text-foreground">Home</Text>
                <Text className="text-muted-foreground">Welcome back to Lernard.</Text>
            </ScrollView>
        </SafeAreaView>
    );
}
