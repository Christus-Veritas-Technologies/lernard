import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-4">
                <Text className="text-2xl font-bold text-foreground">Settings</Text>
                <Text className="text-muted-foreground">Manage your Lernard experience.</Text>
            </ScrollView>
        </SafeAreaView>
    );
}
