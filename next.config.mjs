/** @type {import('next').NextConfig} */
const nextConfig = {
    // Configuración para exportación estática (necesaria para Render)
    output: 'export',
    
    // Configuración común para ambos entornos
    async redirects() {
        return [
            {
                source: '/',
                destination: '/dashboard',
                permanent: true,
            },
        ];
    },
    
    // Configuración para SASS
    sassOptions: {
        quietDeps: true,
        api: 'modern-compiler',
    },
    
    // Configuración para asegurar que las páginas estáticas se generen correctamente
    trailingSlash: true,
    images: {
        unoptimized: true,
    },
    
    // Configuración de entorno
    env: {
        // Definimos variables de entorno aquí como fallback
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://waagentv1.onrender.com/api',
    },
};

export default nextConfig;
