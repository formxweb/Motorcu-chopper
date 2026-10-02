import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Beden tablosu', description: 'Motorcu yeleği beden tablosu ve ölçü alma rehberi.' };

const ROWS = [
  ['S', '92–98', '58'],
  ['M', '98–104', '60'],
  ['L', '104–110', '62'],
  ['XL', '110–116', '64'],
  ['2XL', '116–122', '66'],
  ['3XL', '122–128', '68'],
  ['4XL', '128–134', '70'],
];

export default function SizePage() {
  return (
    <div className="wrap narrow page-pad prose">
      <h1>Beden tablosu</h1>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Beden</th>
              <th scope="col">Göğüs çevresi (cm)</th>
              <th scope="col">Yelek boyu (cm)</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r[0]}>
                <td>
                  <strong>{r[0]}</strong>
                </td>
                <td>{r[1]}</td>
                <td>{r[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Nasıl ölçülür?</h2>
      <p>Mezurayı kolların altından, göğsün en geniş yerinden geçir ve sıkmadan ölç. Tişört üstünden ölçmek yeterli.</p>
      <p>
        <strong>Mont ya da kalın kazak üstüne giyeceksen</strong> bir beden büyük al. İki beden arasında kaldıysan ölçünü sipariş notuna yaz, doğru bedeni biz
        söyleriz.
      </p>
      <p>
        <strong>Kadın yeleği</strong> bir beden dar kalıptır. Daha büyük beden, uzun boy veya göbek payı için ürün sayfasında &quot;Özel ölçü&quot; seçeneğini seç
        ve ölçülerini sipariş notuna yaz.
      </p>
    </div>
  );
}
