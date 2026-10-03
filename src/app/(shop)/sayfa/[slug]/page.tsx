import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { INFO_PAGES, infoPage } from '@/lib/legal';
import { getPaymentSetup } from '@/lib/payment';
import { getSettings } from '@/lib/settings';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = infoPage(slug);
  return p ? { title: p.title, description: p.description } : { title: 'Sayfa bulunamadı' };
}

export default async function InfoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = infoPage(slug);
  if (!page) notFound();
  const [settings, pay] = await Promise.all([getSettings(), getPaymentSetup()]);
  return (
    <div className="wrap info">
      <nav className="info-nav" aria-label="Bilgi sayfaları">
        {INFO_PAGES.map((p) => (
          <Link key={p.slug} href={`/sayfa/${p.slug}`} className={p.slug === slug ? 'on' : ''} aria-current={p.slug === slug ? 'page' : undefined}>
            {p.title}
          </Link>
        ))}
      </nav>
      <article className="prose">
        <h1>{page.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: page.html(settings, pay.label) }} />
      </article>
    </div>
  );
}
