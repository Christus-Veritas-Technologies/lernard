module.exports = function (api) {
  api.cache(true);
  const tailwindConfig = require('./tailwind.config');
  let plugins = [];

  plugins.push('react-native-worklets/plugin');
  plugins.push([
    'nativewind/babel',
    {
      mode: 'transformOnly',
      tailwindConfig,
    },
  ]);

  return {
    presets: ['babel-preset-expo'],

    plugins,
  };
};
