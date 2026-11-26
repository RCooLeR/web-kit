// A modal dialog in the kit's look: focus kept inside while open, Escape and the backdrop close it.
import { useId, useRef, type ReactNode } from "react";

import { Icon, cx } from "./Icon.js";
import { useFocusTrap } from "./useFocusTrap.js";

export interface ModalProps {
  /** Whether the dialog is shown. A closed modal renders nothing. */
  open: boolean;
  title: ReactNode;
  /** Called on Escape, on the close button and on a click on the backdrop. */
  onClose: () => void;
  children: ReactNode;
  /** Buttons at the bottom; omitted for a dialog without a footer. */
  footer?: ReactNode;
  /** Narrower or wider than the default 560 px. */
  size?: "sm" | "lg" | "xl";
  /** Label of the close button, in the app's language. */
  closeLabel: string;
}

export function Modal({ open, title, onClose, children, footer, size, closeLabel }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(open, panelRef, onClose);
  if (!open) return null;

  return (
    <div
      className="dlg-bg"
      role="presentation"
      onMouseDown={(event) => {
        // Only a press on the backdrop itself closes; a drag that ends outside the panel does not.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={cx("card dlg", size && `dlg-${size}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="hd">
          <h2 className="h2" id={titleId}>
            {title}
          </h2>
          <button type="button" className="btn gh sq sp" aria-label={closeLabel} onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div>{children}</div>
        {footer !== undefined && <div className="dlg-ft">{footer}</div>}
      </div>
    </div>
  );
}
