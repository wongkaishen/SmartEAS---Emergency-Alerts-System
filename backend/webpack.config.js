const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  mode: 'production',
  entry: './dist/handlers',
  target: 'node',
  externals: [
    nodeExternals({
      allowlist: ['@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb', '@aws-sdk/client-bedrock-runtime']
    })
  ],
  resolve: {
    extensions: ['.js', '.json']
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-env', { targets: { node: '18' } }]]
          }
        }
      }
    ]
  },
  optimization: {
    minimize: false // Keep readable for AWS Lambda
  },
  performance: {
    hints: false
  }
};
