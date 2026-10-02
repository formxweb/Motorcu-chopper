import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="soon">
      <div className="soon-in">
        <h1>Aradığın sayfa bulunamadı</h1>
        <p>Bağlantı eskimiş veya ürün kaldırılmış olabilir.</p>
        <p>
          <Link className="btn btn-primary" href="/">
            Ana sayfaya dön
          </Link>
        </p>
      </div>
    </main>
  );
}
