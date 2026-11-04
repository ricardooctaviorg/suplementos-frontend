/**
 * Spanish UI text. Every user-visible string lives here; components and
 * pages import from this file instead of writing literal text.
 */

/** Error codes returned by the backend in `{ error: { code } }`, plus client-side codes. */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "INVALID_CURRENT_PASSWORD"
  | "INVALID_CREDENTIALS"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "TENANT_NOT_FOUND"
  | "CONFLICT"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
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
    tenantStep: {
      instructions: string;
      slugLabel: string;
      slugHint: string;
      submit: string;
      submitting: string;
      errors: {
        required: string;
        invalidFormat: string;
      };
    };
    credentialsStep: {
      loading: string;
      instructions: string;
      emailLabel: string;
      passwordLabel: string;
      submit: string;
      submitting: string;
      changeTenant: string;
      errors: {
        emailRequired: string;
        emailInvalid: string;
        passwordRequired: string;
        passwordTooLong: string;
      };
    };
  };
  dashboard: {
    title: string;
    heading: string;
    underConstruction: string;
    loadingSession: string;
    userLabel: string;
    tenantLabel: string;
    logout: string;
    loggingOut: string;
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
    tenantStep: {
      instructions: "Escribe el identificador de tu negocio para continuar.",
      slugLabel: "Identificador del negocio",
      slugHint: "Letras minúsculas, números y guiones; de 3 a 40 caracteres. Ejemplo: mi-tienda.",
      submit: "Continuar",
      submitting: "Buscando negocio…",
      errors: {
        required: "Escribe el identificador de tu negocio.",
        invalidFormat:
          "El identificador solo puede tener letras minúsculas, números y guiones entre ellos, y medir de 3 a 40 caracteres.",
      },
    },
    credentialsStep: {
      loading: "Cargando negocio…",
      instructions: "Inicia sesión con tu correo y contraseña.",
      emailLabel: "Correo electrónico",
      passwordLabel: "Contraseña",
      submit: "Iniciar sesión",
      submitting: "Iniciando sesión…",
      changeTenant: "Cambiar de negocio",
      errors: {
        emailRequired: "Escribe tu correo electrónico.",
        emailInvalid: "Escribe un correo electrónico válido, por ejemplo nombre@correo.com.",
        passwordRequired: "Escribe tu contraseña.",
        passwordTooLong: "La contraseña no puede tener más de 128 caracteres.",
      },
    },
  },
  dashboard: {
    title: "Panel",
    heading: "Panel de gestión",
    underConstruction: "En construcción (fases 1 y 2).",
    loadingSession: "Verificando tu sesión…",
    userLabel: "Usuario",
    tenantLabel: "Negocio",
    logout: "Cerrar sesión",
    loggingOut: "Cerrando sesión…",
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
    BAD_REQUEST: "La solicitud no es válida. Inténtalo de nuevo.",
    INVALID_CURRENT_PASSWORD: "La contraseña actual no es correcta.",
    INVALID_CREDENTIALS: "No pudimos iniciar sesión con esos datos. Revisa el correo y la contraseña.",
    UNAUTHORIZED: "Tu sesión no es válida o expiró. Inicia sesión de nuevo.",
    NOT_FOUND: "No encontramos lo que buscas.",
    TENANT_NOT_FOUND: "No encontramos un negocio con ese identificador.",
    CONFLICT: "La operación no se pudo completar porque los datos cambiaron. Actualiza e inténtalo de nuevo.",
    UNSUPPORTED_MEDIA_TYPE: "La solicitud no es válida. Inténtalo de nuevo.",
    RATE_LIMITED: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    DB_UNAVAILABLE: "El servicio no está disponible en este momento. Inténtalo más tarde.",
    INTERNAL_ERROR: "Ocurrió un error en el servidor. Inténtalo más tarde.",
    UNKNOWN_ERROR: "Ocurrió un error inesperado.",
    fallback: "Ocurrió un error inesperado.",
  },
};
