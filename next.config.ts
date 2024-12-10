import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    // Handle Prism.js imports
    config.resolve.alias = {
      ...config.resolve.alias,
      'prismjs': 'prismjs/components/',
    };
    return config;
  },
};

export default nextConfig;

