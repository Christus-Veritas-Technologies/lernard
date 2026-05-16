module.exports = function (api) {
  api.cache(true);
  const tailwindConfig = require('./tailwind.config.js');
  const plugins = [
    [
      'nativewind/babel',
      {
        mode: 'transformOnly',
        tailwindConfig,
      },
    ],
    'react-native-worklets/plugin',
  ];

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
