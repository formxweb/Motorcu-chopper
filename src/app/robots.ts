import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/yonetim', '/hesap', '/sepet', '/odeme', '/siparis', '/api'] }],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
