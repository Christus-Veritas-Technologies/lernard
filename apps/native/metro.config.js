// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

module.exports = (async () => {
  return withNativeWind(
    await getDefaultConfig(__dirname),
    { input: './global.css' }
  );
})();
