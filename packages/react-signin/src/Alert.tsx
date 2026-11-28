// A message block of the sign-in screens: an icon, a bold line and a sentence under it.
import { Icon, type IconName } from "@rcooler/react-ui";
import type { ReactNode } from "react";

export type AlertTone = "bad" | "warn" | "ok";

const toneClass: Record<AlertTone, string> = { bad: "bd", warn: "wr", ok: "ok" };

export interface AlertProps {
  tone: AlertTone;
  icon: IconName;
  title: ReactNode;
  children?: ReactNode;
  /** "alert" for a refusal the person must notice, "status" for news. */
  role?: "alert" | "status";
}

export function Alert({ tone, icon, title, children, role = "alert" }: AlertProps) {
  return (
    <div className={`si-al ${toneClass[tone]}`} role={role}>
      <Icon name={icon} />
      <div>
        <div className="b">{title}</div>
        {children !== undefined && <div>{children}</div>}
      </div>
    </div>
  );
}
