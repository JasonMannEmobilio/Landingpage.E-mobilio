/** @type {import('next').NextConfig} */

// Logos and card images served from Xano need their host whitelisted, or next/image
// refuses to load them in production. Set XANO_IMAGE_HOST to e.g. "x123-abcd-efgh.xano.io".
const xanoImageHost = process.env.XANO_IMAGE_HOST;

const nextConfig = {
  images: {
    remotePatterns: xanoImageHost
      ? [{ protocol: 'https', hostname: xanoImageHost }]
      : [],
  },
};

export default nextConfig;
