/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurações para produção no Vercel
  output: 'standalone',
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Otimizações de performance
  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },
  
  // Configurações de imagem
  images: {
    unoptimized: true,
  },
  
  // Configurações de ambiente
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  
  // Headers de segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

export default nextConfig
