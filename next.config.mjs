/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    async redirects() {
        return [
            {
                source: '/',
                destination: '/dashboard',
                permanent: true, // Set to false if the redirect is temporary
            },
        ];
    },
    sassOptions: {
        quietDeps: true, // Suppresses warnings from dependencies
        api: 'modern-compiler',

    },
};

export default nextConfig;
