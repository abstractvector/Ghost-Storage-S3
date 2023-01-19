const path = require('node:path');

const config = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts'],
  },
  resolve: {
    fallback: { path: require.resolve('path-browserify') },
  },
  ignoreWarnings: [/Critical dependency: the request of a dependency is an expression/],
  mode: 'production',
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: 'index.js',
    library: {
      type: 'umd',
      export: 'default',
    },
    clean: true,
  },
  optimization: {
    minimize: false, // it doesn't work properly when minified
  },
};

module.exports = config;
