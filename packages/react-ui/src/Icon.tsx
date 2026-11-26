// Icons of the shared set, and the tones the parts colour themselves with.
import { icons, type IconName } from "./icons.js";

/** A part's colour, always shown together with text or an icon, never alone. */
export type Tone = "ok" | "warn" | "bad" | "accent";

/** The kit.css class suffix of each tone. */
export const toneClass: Record<Tone, string> = { ok: "ok", warn: "wr", bad: "bd", accent: "ac" };

/** The kit.css colour variable of each tone. */
export const toneColor: Record<Tone, string> = {
  ok: "var(--ok)",
  warn: "var(--wr)",
  bad: "var(--bd)",
  accent: "var(--ac)",
};

/** Joins class names, leaving out the empty ones. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

export interface IconProps {
  name: IconName;
  /** The 14 px size used inside chips and small buttons. */
  small?: boolean;
  /** Read out instead of hiding the icon from assistive technology; omit when text says the same. */
  title?: string;
  className?: string;
}

export function Icon({ name, small, title, className }: IconProps) {
  return (
    <svg
      className={cx("i", small && "s", className)}
      viewBox="0 0 24 24"
      aria-hidden={title === undefined ? true : undefined}
      role={title === undefined ? undefined : "img"}
    >
      {title !== undefined && <title>{title}</title>}
      {icons[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export interface IconBadgeProps {
  icon: IconName;
  tone?: Tone;
  title?: string;
  className?: string;
}

/** An icon on a rounded square, coloured by its tone (kit.css .ic). */
export function IconBadge({ icon, tone, title, className }: IconBadgeProps) {
  return (
    <span className={cx("ic", tone && toneClass[tone], className)}>
      <Icon name={icon} {...(title === undefined ? {} : { title })} />
    </span>
  );
}
