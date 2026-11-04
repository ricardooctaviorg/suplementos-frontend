import { es } from "@/messages/es";
import { LogoutButton } from "./logout-button";
import styles from "./session-header.module.css";

export function SessionHeader({ userName, tenantName }: { userName: string; tenantName: string }) {
  return (
    <header className={styles.header}>
      <dl className={styles.details}>
        <div>
          <dt>{es.dashboard.tenantLabel}</dt>
          <dd>{tenantName}</dd>
        </div>
        <div>
          <dt>{es.dashboard.userLabel}</dt>
          <dd>{userName}</dd>
        </div>
      </dl>
      <LogoutButton />
    </header>
  );
}
