/** @type {import('next').NextConfig} */

/*
 * Host allowed to serve optimised images. Partner logos live in Xano's vault, so its
 * hostname must be whitelisted or next/image refuses them in production.
 *
 * IMPORTANT: with output: 'standalone' this config is serialised at BUILD time into
 * .next/required-server-files.json — setting it only at runtime is too late. The
 * Dockerfile therefore passes XANO_IMAGE_HOST (or XANO_BASE_URL) as a build arg.
 */
function xanoImageHost() {
  if (process.env.XANO_IMAGE_HOST) return process.env.XANO_IMAGE_HOST;
  try {
    return new URL(process.env.XANO_BASE_URL).hostname;
  } catch {
    return null;
  }
}

const host = xanoImageHost();

const nextConfig = {
  // Emits a self-contained server with only the node_modules actually used,
  // which keeps the container image small.
  output: 'standalone',
  images: {
    remotePatterns: host ? [{ protocol: 'https', hostname: host }] : [],
  },
};

export default nextConfig;
