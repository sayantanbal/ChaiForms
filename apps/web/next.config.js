/** @type {import('next').NextConfig} */
const nextConfig = {
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
