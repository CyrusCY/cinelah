const path = require('path');
const webpack = require('webpack');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: [
    './index.js'
  ],
  output: {
    path: path.resolve(__dirname, '../public'),
    publicPath: '/',
    filename: 'bundle.js'
  },
  devServer: {
    disableHostCheck: true,
    historyApiFallback: true,
    host: '0.0.0.0',
    hot: true
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['babel-loader'],
        exclude: /node_modules/
      },
      {
        test: /\.scss$/,
        use: process.env.NODE_ENV === 'production' ?
          ExtractTextPlugin.extract({ use: ['css-loader', 'sass-loader'] }) :
          ['style-loader', 'css-loader', 'sass-loader']
      },
      {
        test: /\.(gif|png|jpe?g|svg)$/i,
        use: process.env.NODE_ENV === 'production' ? [
          {
            loader: 'file-loader',
            query: {
              name: '[name].[ext]',
            }
          }, {
            loader: 'image-webpack-loader',
            query: {
              optipng: {
                optimizationLevel: 7
              },
              pngquant: {
                quality: '80-90'
              }
            }
          }
        ] : ['file-loader']
      },
      {
        test: /\.json$/,
        use: [{
          loader: 'file-loader',
          query: {
            name: '[name].[ext]'
          }
        }]
      },
    ],
  },
  plugins: (() => {
    return process.env.NODE_ENV === 'production' ? [
      new webpack.DefinePlugin({
        PRODUCTION: 'true'
      }),
      new CopyWebpackPlugin([{
        from: 'manifest.json',
        transform: content => JSON.stringify(JSON.parse(content))
      }]),
      new ExtractTextPlugin('style.css'),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: 'index.ejs',
        title: 'Cinelah',
        env: process.env.NODE_ENV,
        minify: {
          collapseWhitespace: true,
          minifyJS: true
        }
      })
    ] : [
      new webpack.DefinePlugin({
        PRODUCTION: 'false'
      }),
      new webpack.HotModuleReplacementPlugin(),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: 'index.ejs',
        title: 'Cinelah',
        env: process.env.NODE_ENV
      })
    ];
  })()
};
