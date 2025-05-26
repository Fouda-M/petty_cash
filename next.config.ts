import type {NextConfig} from 'next';
// Import webpack type for custom webpack configuration
import type { WebpackConfigContext, WebpackConfiguration } from 'next/dist/server/config-shared';


const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true, // Keeping this as per original, but ideally should be false for a clean build
  },
  eslint: {
    ignoreDuringBuilds: true, // Keeping this as per original, but ideally should be false for a clean build
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (
    config: WebpackConfiguration,
    { isServer, webpack }: WebpackConfigContext
  ): WebpackConfiguration => {
    // Rule for handlebars-loader (if .handlebars files are ever directly imported)
    // This might not silence warnings if they come from handlebars internal usage by dotprompt
    config.module?.rules?.push({
      test: /\.handlebars$/,
      loader: 'handlebars-loader',
    });

    // The Jaeger warning is best fixed by installing the optional dependency,
    // which was done in package.json. If it still appeared, an IgnorePlugin
    // could be used, but installing the dep is cleaner if it's truly looked for.
    // Example of IgnorePlugin if needed:
    // if (!config.plugins) {
    //   config.plugins = [];
    // }
    // config.plugins.push(
    //   new webpack.IgnorePlugin({
    //     resourceRegExp: /@opentelemetry\/exporter-jaeger/,
    //   })
    // );

    return config;
  },
};

export default nextConfig;
