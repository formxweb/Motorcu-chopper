'use client';

export function SortSelect({ value }: { value: string }) {
  return (
    <select
      id="siralama"
      name="siralama"
      defaultValue={value}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      <option value="">Önerilen</option>
      <option value="yeni">En yeni</option>
      <option value="artan">Fiyat: düşükten yükseğe</option>
      <option value="azalan">Fiyat: yüksekten düşüğe</option>
    </select>
  );
}
