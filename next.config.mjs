/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true
    },
    serverExternalPackages: ['@prisma/client', '@prisma/adapter-neon', '@neondatabase/serverless']
};

export default nextConfig;
