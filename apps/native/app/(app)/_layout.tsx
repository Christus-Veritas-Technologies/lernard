import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';

export default function AppLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                sceneStyle: {
                    backgroundColor: '#F8FAFC',
                },
            }}
            tabBar={(props) => <TabBar {...props} />}
        >
            <Tabs.Screen name="(home)" options={{ title: 'Home' }} />
            <Tabs.Screen name="(progress)" options={{ title: 'Progress' }} />
            <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
            <Tabs.Screen name="guardian" options={{ href: null }} />
        </Tabs>
    );
}
