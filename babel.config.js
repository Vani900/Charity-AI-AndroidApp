module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        root: ['./src'],
        alias: {
          '@screens': './src/screens',
          '@components': './src/components',
          '@redux': './src/redux',
          '@services': './src/services',
          '@utils': './src/utils',
          '@navigation': './src/navigation',
        },
      }],
      'react-native-reanimated/plugin',
    ],
  };
};
