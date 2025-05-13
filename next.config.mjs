/** @type {import('next').NextConfig} */
const nextConfig = {
    // Configuración condicional basada en el entorno
    ...(process.env.NODE_ENV === 'production' ? {
        // En producción, usamos exportación estática para Render
        output: 'export',
        // Pero mantenemos las reescrituras para las API
        // Nota: Las reescrituras no funcionan en exportación estática,
        // pero las incluimos para mantener la configuración consistente
        async rewrites() {
            return [
                {
                    source: '/api/chat/:path*',
                    destination: 'https://waagentv1.onrender.com/api/:path*',
                },
            ];
        },
    } : {
        // En desarrollo, no usamos exportación estática para permitir API Routes dinámicas
        async rewrites() {
            return [
                {
                    source: '/api/chat/:path*',
                    destination: 'https://waagentv1.onrender.com/api/:path*',
                },
            ];
        },
    }),
    
    // Configuración común para ambos entornos
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
    
    // Configuración para asegurar que las páginas estáticas se generen correctamente
    trailingSlash: true,
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
