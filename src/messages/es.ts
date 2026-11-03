/**
 * Spanish UI text. Every user-visible string lives here; components and
 * pages import from this file instead of writing literal text.
 */

/** Error codes returned by the backend in `{ error: { code } }`, plus client-side codes. */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DB_UNAVAILABLE"
  | "INTERNAL_ERROR"
  | "UNKNOWN_ERROR";

export interface Messages {
  app: {
    name: string;
    description: string;
  };
  home: {
    heading: string;
    tagline: string;
    loginLink: string;
  };
  login: {
    title: string;
    heading: string;
    instructions: string;
    underConstruction: string;
  };
  dashboard: {
    title: string;
    heading: string;
    underConstruction: string;
  };
  catalog: {
    title: string;
    heading: (slug: string) => string;
    underConstruction: string;
  };
  stock: {
    available: string;
    low: string;
    out: string;
  };
  apiErrors: Record<ApiErrorCode, string> & { fallback: string };
}

export const es: Messages = {
  app: {
    name: "Suplementos",
    description: "Gestión de inventario y catálogo de suplementos para negocios locales.",
  },
  home: {
    heading: "Suplementos",
    tagline: "Plataforma de inventario y catálogo para negocios locales.",
    loginLink: "Entrar al panel de mi negocio",
  },
  login: {
    title: "Iniciar sesión",
    heading: "Iniciar sesión",
    instructions: "Paso 1: escribe el identificador de tu negocio. Paso 2: correo y contraseña.",
    underConstruction: "En construcción (fase 1).",
  },
  dashboard: {
    title: "Panel",
    heading: "Panel de gestión",
    underConstruction: "En construcción (fases 1 y 2).",
  },
  catalog: {
    title: "Catálogo",
    heading: (slug) => `Catálogo: ${slug}`,
    underConstruction: "En construcción (fase 3).",
  },
  stock: {
    available: "Disponible",
    low: "Pocas piezas",
    out: "Agotado",
  },
  apiErrors: {
    VALIDATION_ERROR: "Revisa los datos e inténtalo de nuevo.",
    UNAUTHORIZED: "Tu sesión no es válida o expiró. Inicia sesión de nuevo.",
    NOT_FOUND: "No encontramos lo que buscas.",
    CONFLICT: "La operación no se pudo completar porque los datos cambiaron. Actualiza e inténtalo de nuevo.",
    DB_UNAVAILABLE: "El servicio no está disponible en este momento. Inténtalo más tarde.",
    INTERNAL_ERROR: "Ocurrió un error en el servidor. Inténtalo más tarde.",
    UNKNOWN_ERROR: "Ocurrió un error inesperado.",
    fallback: "Ocurrió un error inesperado.",
  },
};
