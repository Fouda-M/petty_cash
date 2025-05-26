/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Ignore Node.js-specific modules that handlebars might use
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    // Add handlebars loader
    config.module.rules.push({
      test: /\.handlebars|\.hbs$/,
      loader: "handlebars-loader",
    });

    return config;
  },
};

export default nextConfig;