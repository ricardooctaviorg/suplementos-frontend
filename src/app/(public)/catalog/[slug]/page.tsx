import { Suspense } from "react";
import { es } from "@/messages/es";

async function CatalogHeader({ params }: Pick<PageProps<"/catalog/[slug]">, "params">) {
  const { slug } = await params;
  return <h1>{es.catalog.heading(slug)}</h1>;
}

export default function CatalogPage(props: PageProps<"/catalog/[slug]">) {
  return (
    <main style={{ padding: "2rem 1rem" }}>
      <Suspense fallback={<h1>{es.catalog.title}</h1>}>
        <CatalogHeader params={props.params} />
      </Suspense>
      <p>
        <em>{es.catalog.underConstruction}</em>
      </p>
    </main>
  );
}
