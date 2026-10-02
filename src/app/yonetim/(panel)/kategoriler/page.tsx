import { asc, sql } from 'drizzle-orm';
import { deleteCategory, saveCategory } from '@/app/actions/admin-catalog';
import { ActionForm, ConfirmButton } from '@/components/forms';
import { db } from '@/db';
import { categories } from '@/db/schema';

export default async function CategoriesPage() {
  const list = await db
    .select({
      c: categories,
      n: sql<number>`(select count(*) from products p where p.category_id = categories.id)`.mapWith(Number),
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return (
    <>
      <div className="adm-top">
        <h1>Kategoriler</h1>
      </div>
      <div className="cols">
        <div>
          <section className="panel">
            {list.length ? (
              <div className="rows">
                {list.map(({ c, n }) => (
                  <details key={c.id} className="op">
                    <summary>
                      {c.name} <span className="muted">({n} ürün{c.isActive ? '' : ', gizli'})</span>
                    </summary>
                    <ActionForm action={saveCategory} submitLabel="Kaydet">
                      <input type="hidden" name="id" value={c.id} />
                      <div className="grid-2">
                        <label className="field" htmlFor={`n-${c.id}`}>
                          <span>Ad</span>
                          <input id={`n-${c.id}`} name="name" defaultValue={c.name} />
                        </label>
                        <label className="field" htmlFor={`s-${c.id}`}>
                          <span>Adres</span>
                          <input id={`s-${c.id}`} name="slug" defaultValue={c.slug} />
                        </label>
                        <label className="field span-2" htmlFor={`d-${c.id}`}>
                          <span>Açıklama</span>
                          <input id={`d-${c.id}`} name="description" defaultValue={c.description} />
                        </label>
                        <label className="field" htmlFor={`o-${c.id}`}>
                          <span>Sıra</span>
                          <input id={`o-${c.id}`} name="sortOrder" inputMode="numeric" defaultValue={c.sortOrder} />
                        </label>
                        <label className="check">
                          <input type="checkbox" name="isActive" defaultChecked={c.isActive} />
                          <span>Mağazada göster</span>
                        </label>
                      </div>
                    </ActionForm>
                    <ConfirmButton action={deleteCategory.bind(null, c.id)} label="Kategoriyi sil" confirmLabel="Sil (ürünler kategorisiz kalır)" />
                  </details>
                ))}
              </div>
            ) : (
              <p className="muted">Kategori yok.</p>
            )}
          </section>
        </div>
        <div>
          <section className="panel">
            <h2>Yeni kategori</h2>
            <ActionForm action={saveCategory} submitLabel="Kategori ekle" resetOnSuccess>
              <label className="field" htmlFor="new-name">
                <span>Ad</span>
                <input id="new-name" name="name" />
              </label>
              <label className="field" htmlFor="new-desc">
                <span>Açıklama (isteğe bağlı)</span>
                <input id="new-desc" name="description" />
              </label>
              <label className="field" htmlFor="new-order">
                <span>Sıra</span>
                <input id="new-order" name="sortOrder" inputMode="numeric" defaultValue={list.length + 1} />
              </label>
              <label className="check">
                <input type="checkbox" name="isActive" defaultChecked />
                <span>Mağazada göster</span>
              </label>
            </ActionForm>
          </section>
        </div>
      </div>
    </>
  );
}
