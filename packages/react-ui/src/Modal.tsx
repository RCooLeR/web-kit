// A Bootstrap 5 modal dialog rendered by React: no Bootstrap JavaScript, focus kept inside while
// open, Escape and the backdrop close it.
import { useId, useRef, type ReactNode } from "react";

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
  /** Bootstrap's modal sizes. */
  size?: "sm" | "lg" | "xl";
  /** Label of the close button, in the app's language. */
  closeLabel: string;
}

export function Modal({ open, title, onClose, children, footer, size, closeLabel }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(open, panelRef, onClose);
  if (!open) return null;

  const dialogClass = ["modal-dialog", "modal-dialog-scrollable", size ? `modal-${size}` : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      <div className="modal-backdrop show" />
      <div
        className="modal d-block"
        tabIndex={-1}
        role="presentation"
        onMouseDown={(event) => {
          // Only a press on the backdrop itself closes; a drag that ends outside the panel does not.
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div className={dialogClass}>
          <div
            ref={panelRef}
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
          >
            <div className="modal-header">
              <h2 className="modal-title h5" id={titleId}>
                {title}
              </h2>
              <button
                type="button"
                className="btn-close"
                aria-label={closeLabel}
                onClick={onClose}
              />
            </div>
            <div className="modal-body">{children}</div>
            {footer !== undefined && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
