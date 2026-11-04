"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { logout } from "@/lib/api/auth";
import { getErrorUserMessage } from "@/lib/api/client";
import { es } from "@/messages/es";
import styles from "./session-header.module.css";

export function LogoutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [navigating, startNavigation] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const pending = submitting || navigating;

  async function handleClick() {
    if (pending) return;
    setError(null);
    setSubmitting(true);
    try {
      await logout();
      startNavigation(() => {
        router.replace("/login");
        router.refresh();
      });
    } catch (caught) {
      setError(getErrorUserMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.logout}>
      <button className={styles.button} type="button" onClick={handleClick} disabled={pending}>
        {pending ? es.dashboard.loggingOut : es.dashboard.logout}
      </button>
      {error !== null && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
