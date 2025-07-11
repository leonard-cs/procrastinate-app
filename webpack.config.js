import path, { dirname } from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import WorkboxPlugin from "workbox-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import webpack from "webpack";
import dotenv from "dotenv";

import { fileURLToPath } from "url";

// Load environment variables
const env = dotenv.config().parsed || {};

// Convert to DefinePlugin format
const envKeys = Object.keys(env).reduce((acc, key) => {
  acc[`process.env.${key}`] = JSON.stringify(env[key]);
  return acc;
}, {});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const plugins = [
  new HtmlWebpackPlugin({
    template: path.resolve(__dirname, "./src/client/index.html"),
    title: "Progressive Web Application",
  }),
  new CopyWebpackPlugin({
    patterns: [
      { from: path.resolve(__dirname, 'public/icons'), to: 'icons' },
      { from: './manifest.webmanifest', to: 'manifest.webmanifest' },
    ],
  }),
  new webpack.DefinePlugin(envKeys),
];

// Only add service worker in production
if (isProd) {
  plugins.push(
    new WorkboxPlugin.GenerateSW({
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      clientsClaim: true,
      skipWaiting: true,
    })
  );
}


export default {
  mode: "development",
  context: path.join(__dirname, "./src/"),
  entry: "./client/index.tsx",
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.(ts)x?$/,
        exclude: ["/node_modules/", "/src/server/"],
        use: "ts-loader",
      },
      {
        test: /\.css$/,
        include: path.resolve(__dirname, "./src/client/"),
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, "./dist"),
    filename: "bundle.js",
  },
  plugins,

  devServer: {
    static: [
      {
        directory: path.join(__dirname, "./dist"),
      },
      {
        directory: path.join(__dirname, "./public"),
        publicPath: "/",
      },
    ],
    historyApiFallback: true, // Enables React Router to handle /task, /home, etc.
    port: 8080,
    open: true,
    hot: true,
    compress: true,
  },

  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
};
