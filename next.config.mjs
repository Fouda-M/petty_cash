/** @type {import('next').NextConfig} */
const repo = 'petty_cash';
const isProd = process.env.NODE_ENV === 'production';
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  assetPrefix: isProd ? `/${repo}/` : '',
  basePath: isProd ? `/${repo}` : '',
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Ignore Node.js-specific modules that handlebars might use
    if (!config.resolve) {
      config.resolve = { fallback: { fs: false, path: false } };
    } else {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
      };
    }

    // Add handlebars loader (safe checks)
    if (!config.module) {
      config.module = { rules: [] };
    }
    if (!config.module.rules) {
      config.module.rules = [];
    }
    config.module.rules.push({
      test: /\.handlebars|\.hbs$/,
      loader: "handlebars-loader",
    });

    return config;
  },
};

export default nextConfig;