/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: "chaiforms.dev" }],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return [
      {
        source: "/trpc/:path*",
        destination: `${apiUrl}/trpc/:path*`,
      },
      {
        source: "/csrf",
        destination: `${apiUrl}/csrf`,
      },
    ];
  },
};

export default nextConfig;
