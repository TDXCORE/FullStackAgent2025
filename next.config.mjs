/** @type {import('next').NextConfig} */
const nextConfig = {
    // Eliminado output: 'export' para permitir API Routes dinámicas
    async redirects() {
        return [
            {
                source: '/',
                destination: '/dashboard',
                permanent: true, // Set to false if the redirect is temporary
            },
        ];
    },
    // Agregado rewrites para mejorar el manejo de las API
    async rewrites() {
        return [
            {
                source: '/api/chat/:path*',
                destination: 'https://waagentv1.onrender.com/api/:path*',
            },
        ];
    },
    sassOptions: {
        quietDeps: true, // Suppresses warnings from dependencies
        api: 'modern-compiler',
    },
};

export default nextConfig;
