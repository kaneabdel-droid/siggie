import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // 1. Interdiction absolue à tous les robots d'aspiration IA et de minage de données
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'anthropic-ai',
          'CCBot',
          'Bytespider',
          'Google-Extended',
          'PerplexityBot',
          'Diffbot',
          'FacebookBot',
          'Omgilibot',
          'Scrapy',
          'ImagesiftBot',
        ],
        disallow: '/',
      },
      // 2. Règles pour les moteurs de recherche grand public (Google, Bing)
      {
        userAgent: '*',
        allow: [
          '/',
          '/decouvrir-siggie',
          '/tarifs',
          '/guide',
          '/recherche-medicament',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/checkout',
          '/abonnement/',
          '/auth/',
          '/login',
          '/signup',
          '/campagnes/',
          '/credits/',
          '/intrants/',
          '/distribution/',
          '/facturation/',
          '/remboursements/',
          '/tresorerie/',
          '/materiel/',
          '/membres/',
        ],
      },
    ],
  }
}
