import { Suspense } from "react";

async function CatalogHeader({ params }: Pick<PageProps<"/catalogo/[slug]">, "params">) {
  const { slug } = await params;
  return <h1>Catálogo: {slug}</h1>;
}

export default function CatalogoPage(props: PageProps<"/catalogo/[slug]">) {
  return (
    <main style={{ padding: "2rem 1rem" }}>
      <Suspense fallback={<h1>Catálogo</h1>}>
        <CatalogHeader params={props.params} />
      </Suspense>
      <p>
        <em>En construcción (fase 3).</em>
      </p>
    </main>
  );
}
