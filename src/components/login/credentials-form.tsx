"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { login } from "@/lib/api/auth";
import { ApiError, getErrorUserMessage } from "@/lib/api/client";
import { es } from "@/messages/es";
import styles from "./login-form.module.css";

const t = es.login.credentialsStep;

/** Same limit as the backend login schema. */
const PASSWORD_MAX_LENGTH = 128;
/** UX check only; the backend has the final say on the email format. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Field = "email" | "password";
type FieldErrors = Partial<Record<Field, string>>;

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (email === "") errors.email = t.errors.emailRequired;
  else if (!EMAIL_PATTERN.test(email)) errors.email = t.errors.emailInvalid;
  if (password === "") errors.password = t.errors.passwordRequired;
  else if (password.length > PASSWORD_MAX_LENGTH) errors.password = t.errors.passwordTooLong;
  return errors;
}

/** Login step 2: email and password for an already resolved tenant. */
export function CredentialsForm({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [navigating, startNavigation] = useTransition();
  const pending = submitting || navigating;

  const id = useId();
  const ids = {
    email: `${id}-email`,
    emailError: `${id}-email-error`,
    password: `${id}-password`,
    passwordError: `${id}-password-error`,
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const trimmedEmail = email.trim();
    setEmail(trimmedEmail);
    setFormError(null);

    const errors = validate(trimmedEmail, password);
    setFieldErrors(errors);
    if (errors.email !== undefined) return emailRef.current?.focus();
    if (errors.password !== undefined) return passwordRef.current?.focus();

    setSubmitting(true);
    try {
      await login({ tenantSlug, email: trimmedEmail, password });
      startNavigation(() => {
        router.replace("/app");
        router.refresh();
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === "INVALID_CREDENTIALS") {
        // Generic message for any failure; keep the email and ask for the password again.
        setPassword("");
        setFieldErrors({ password: error.userMessage });
        passwordRef.current?.focus();
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
        <label className={styles.label} htmlFor={ids.email}>
          {t.emailLabel}
        </label>
        <input
          ref={emailRef}
          className={styles.input}
          id={ids.email}
          name="email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-invalid={fieldErrors.email !== undefined}
          aria-describedby={fieldErrors.email !== undefined ? ids.emailError : undefined}
        />
        {fieldErrors.email !== undefined && (
          <p className={styles.error} id={ids.emailError} role="alert">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={ids.password}>
          {t.passwordLabel}
        </label>
        <input
          ref={passwordRef}
          className={styles.input}
          id={ids.password}
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          aria-invalid={fieldErrors.password !== undefined}
          aria-describedby={fieldErrors.password !== undefined ? ids.passwordError : undefined}
        />
        {fieldErrors.password !== undefined && (
          <p className={styles.error} id={ids.passwordError} role="alert">
            {fieldErrors.password}
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
