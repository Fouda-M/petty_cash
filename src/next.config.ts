
import type { NextConfig } from 'next';
import type { Configuration as WebpackConfig } from 'webpack'; // Import webpack type for custom webpack configuration

const repo = 'petty_cash'; // Corrected repository name
const assetPrefix = process.env.NODE_ENV === 'production' ? `/${repo}/` : '';
const basePath = process.env.NODE_ENV === 'production' ? `/${repo}` : '';

const nextConfig: NextConfig = {
  output: 'export', // Required for static export to GitHub Pages
  assetPrefix: assetPrefix,
  basePath: basePath,
  typescript: {
    ignoreBuildErrors: true, // Keeping this as per original, but ideally should be false for a clean build
  },
  eslint: {
    ignoreDuringBuilds: true, // Keeping this as per original, but ideally should be false for a clean build
  },
  images: {
    // If using next/image, you might need to configure unoptimized: true for static export
    // or provide a custom loader if you host images outside of the basePath.
    // For GitHub Pages, unoptimized is often simpler.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      { // Added placeholder.co for data-ai-hint images
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      }
    ],
  },
  webpack: (config: WebpackConfig) => {
    if (!config.module) {
      config.module = { rules: [] };
    }
    config.module.rules.push({
      test: /\.handlebars$|\.hbs$/, // Match .handlebars or .hbs files
      loader: "handlebars-loader", // Use handlebars-loader
    });
    return config;
  },
};

export default nextConfig;
