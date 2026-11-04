"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { ApiError, getErrorUserMessage } from "@/lib/api/client";
import { getPublicTenant } from "@/lib/api/tenants";
import { isValidTenantSlug, normalizeTenantSlug, TENANT_SLUG_MAX_LENGTH } from "@/lib/tenant-slug";
import { es } from "@/messages/es";
import styles from "./login-form.module.css";

const t = es.login.tenantStep;

/** Login step 1: resolves the tenant by slug and moves on to `/login/[slug]`. */
export function TenantSlugForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [slug, setSlug] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [navigating, startNavigation] = useTransition();
  const pending = submitting || navigating;

  const id = useId();
  const inputId = `${id}-slug`;
  const hintId = `${id}-slug-hint`;
  const errorId = `${id}-slug-error`;

  function showFieldError(message: string) {
    setFieldError(message);
    inputRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const normalized = normalizeTenantSlug(slug);
    setSlug(normalized);
    setFormError(null);

    if (normalized === "") return showFieldError(t.errors.required);
    if (!isValidTenantSlug(normalized)) return showFieldError(t.errors.invalidFormat);

    setFieldError(null);
    setSubmitting(true);
    try {
      const tenant = await getPublicTenant(normalized);
      startNavigation(() => router.push(`/login/${tenant.slug}`));
    } catch (error) {
      if (error instanceof ApiError && error.code === "TENANT_NOT_FOUND") {
        showFieldError(error.userMessage);
      } else {
        setFormError(getErrorUserMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={inputId}>
          {t.slugLabel}
        </label>
        <p className={styles.hint} id={hintId}>
          {t.slugHint}
        </p>
        <input
          ref={inputRef}
          className={styles.input}
          id={inputId}
          name="tenantSlug"
          type="text"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={TENANT_SLUG_MAX_LENGTH + 10}
          required
          aria-invalid={fieldError !== null}
          aria-describedby={fieldError !== null ? `${hintId} ${errorId}` : hintId}
        />
        {fieldError !== null && (
          <p className={styles.error} id={errorId} role="alert">
            {fieldError}
          </p>
        )}
      </div>

      {formError !== null && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </button>
    </form>
  );
}
