// Dynamic Expo config — reads environment variables at build/start time.
// Copy .env.example to .env and fill in your values.

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
    name: 'Lernard AI',
    slug: 'lernard',
    newArchEnabled: false,
    version: '1.0.0',
    scheme: process.env.EXPO_PUBLIC_APP_SCHEME ?? 'lernard',
    platforms: ['ios', 'android'],
    web: {
        bundler: 'metro',
        output: 'static',
        favicon: './assets/favicon.png',
    },
    plugins: ['expo-router'],
    experiments: {
        typedRoutes: true,
        tsconfigPaths: true,
    },
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
        backgroundColor: '#FFFFFF',
        image: './assets/images/splash-icon.png',
        dark: {
            image: './assets/images/splash-icon-dark.png',
            backgroundColor: '#000000',
        },
        imageWidth: 200,
    },
    assetBundlePatterns: ['**/*'],
    ios: {
        supportsTablet: true,
        bundleIdentifier: process.env.EXPO_IOS_BUNDLE_ID ?? 'com.christusveritastechnologies.lernard',
    },
    android: {
        adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor: '#ffffff',
        },
        package: process.env.EXPO_ANDROID_PACKAGE ?? 'com.christusveritastechnologies.lernard',
    },
    extra: {
        apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001',
        router: {},
        eas: {
            projectId: process.env.EAS_PROJECT_ID ?? '4bf1a62f-7d02-4dcc-ae8a-b7c32b1ee7a6',
        },
    },
    owner: process.env.EXPO_OWNER ?? 'johnprime',
};
