// Clés de la plateforme SIGGIE elle-même (mono-marchand) — pas de gestion
// multi-marchand ("BYOK"), donc pas de chiffrement par-tenant : ces variables
// sont lues directement depuis l'environnement du serveur.

export const bictorysApiKey = process.env.BICTORYS_API_KEY
export const bictorysWebhookSecret = process.env.BICTORYS_WEBHOOK_SECRET

export const monerooSecretKey = process.env.MONEROO_SECRET_KEY
export const monerooWebhookSecret = process.env.MONEROO_WEBHOOK_SECRET

export const hasBictorysKeys = Boolean(bictorysApiKey && bictorysWebhookSecret)
export const hasMonerooKeys = Boolean(monerooSecretKey && monerooWebhookSecret)

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
