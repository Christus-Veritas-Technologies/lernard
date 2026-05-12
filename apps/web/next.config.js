/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: true
    },
    allowedDevOrigins: ['192.168.1.8'],
};

export default nextConfig;
