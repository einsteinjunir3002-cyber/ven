import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Venessa Study',
    short_name: 'VenessaStudy',
    description: "Venessa's personal AI tutor, digital notebook, and quiz platform.",
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F8FAF9',
    theme_color: '#0F5C47',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
