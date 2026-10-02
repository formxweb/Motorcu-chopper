'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="soon">
      <div className="soon-in">
        <h1>Bir şeyler ters gitti</h1>
        <p>Sayfa yüklenirken bir hata oluştu. Tekrar dene, sorun sürerse bize yaz.</p>
        <p>
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            Tekrar dene
          </button>
        </p>
      </div>
    </main>
  );
}
