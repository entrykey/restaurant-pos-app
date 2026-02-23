const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        stream: require.resolve('stream-browserify'),
        util: require.resolve('util/'),
        zlib: require.resolve('browserify-zlib'),
        url: require.resolve('url/'),
        crypto: require.resolve('crypto-browserify'),
        assert: require.resolve('assert/'),
        http2: false,
      };
      return webpackConfig;
    },
  },
};
