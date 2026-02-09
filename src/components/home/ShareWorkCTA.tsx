import type { RefObject } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SiteContainer } from "../SiteContainer";
import { Button, ButtonAnchor } from "../ui/Button";

const COMMUNITY_URL = "https://github.com/cbassuarez/flux/discussions";

type SubmissionState = "idle" | "submitting" | "success" | "error";

type FormState = {
  documentLink: string;
  description: string;
  attributionName: string;
  attributionLink: string;
  contactEmail: string;
  notes: string;
  permission: boolean;
  license: boolean;
  company: string;
};

const defaultState: FormState = {
  documentLink: "",
  description: "",
  attributionName: "",
  attributionLink: "",
  contactEmail: "",
  notes: "",
  permission: false,
  license: false,
  company: "",
};

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ShareWorkCTA() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="border-t border-[var(--border)] bg-[var(--surface-0)] py-16">
      <SiteContainer>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] px-6 py-10 shadow-sm md:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_auto] lg:items-center">
            <div className="space-y-3 max-w-2xl">
              <h2 className="text-2xl font-semibold text-[var(--fg)] md:text-3xl">
                Share a .flux document you’ve made.
              </h2>
              <p className="text-sm text-[var(--muted)] md:text-base">
                We’ll curate a few highlights for the upcoming Examples page.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
              >
                Share a document
              </Button>
              <ButtonAnchor
                href={COMMUNITY_URL}
                target="_blank"
                rel="noreferrer"
                variant="solid"
                size="md"
              >
                Join the community
              </ButtonAnchor>
            </div>
          </div>
        </div>
      </SiteContainer>
      <AnimatePresence>
        {isOpen ? (
          <ShareWorkModal
            onClose={() => setIsOpen(false)}
            triggerRef={triggerRef}
            shouldReduceMotion={shouldReduceMotion}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}

type ShareWorkModalProps = {
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement>;
  shouldReduceMotion: boolean;
};

function ShareWorkModal({ onClose, triggerRef, shouldReduceMotion }: ShareWorkModalProps) {
  const formspreeEndpoint = import.meta.env.VITE_FORMSPREE_SHAREDOC_ENDPOINT as string | undefined;
  const isFormEnabled = Boolean(formspreeEndpoint);
  const [formState, setFormState] = useState<FormState>(defaultState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SubmissionState>("idle");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const titleId = useId();
  const helperId = useId();

  const errorSummary = useMemo(() => Object.values(errors).filter(Boolean), [errors]);

  useEffect(() => {
    triggerRef.current?.setAttribute("aria-expanded", "true");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timeout = window.setTimeout(() => {
      firstFieldRef.current?.focus();
    }, 0);

    return () => {
      triggerRef.current?.setAttribute("aria-expanded", "false");
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timeout);
      triggerRef.current?.focus();
    };
  }, [triggerRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setStatus((prev) => (prev === "error" ? "idle" : prev));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!formState.documentLink.trim()) {
      nextErrors.documentLink = "Add a document link.";
    } else if (!isValidUrl(formState.documentLink.trim())) {
      nextErrors.documentLink = "Enter a valid URL.";
    }

    if (!formState.description.trim()) {
      nextErrors.description = "Add a short description.";
    }

    if (!formState.attributionName.trim()) {
      nextErrors.attributionName = "Add an attribution name.";
    }

    if (formState.attributionLink.trim() && !isValidUrl(formState.attributionLink.trim())) {
      nextErrors.attributionLink = "Enter a valid URL.";
    }

    if (formState.contactEmail.trim() && !isValidEmail(formState.contactEmail.trim())) {
      nextErrors.contactEmail = "Enter a valid email address.";
    }

    if (!formState.permission) {
      nextErrors.permission = "Confirm you have permission to share.";
    }

    if (!formState.license) {
      nextErrors.license = "Confirm the license for this share.";
    }

    setErrors(nextErrors);
    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormEnabled) return;

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setStatus("idle");
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch(formspreeEndpoint ?? "", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          documentLink: formState.documentLink,
          description: formState.description,
          attributionName: formState.attributionName,
          attributionLink: formState.attributionLink,
          contactEmail: formState.contactEmail,
          notes: formState.notes,
          permission: formState.permission,
          license: formState.license,
          company: formState.company,
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      setStatus("success");
      setFormState(defaultState);
      setErrors({});
    } catch {
      setStatus("error");
    }
  };

  const handleOverlayMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const fieldBaseClassName =
    "mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--fg)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]";

  return createPortal(
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
      onMouseDown={handleOverlayMouseDown}
      role="presentation"
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={helperId}
        tabIndex={-1}
        className="w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-xl md:p-8"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.98 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">Share your work</p>
            <h3 id={titleId} className="mt-2 text-xl font-semibold text-[var(--fg)]">
              Share a .flux document
            </h3>
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="sm"
          >
            Close
          </Button>
        </div>

        <p id={helperId} className="mt-3 text-sm text-[var(--muted)]">
          Add context so we can feature your work responsibly.
        </p>

        {!isFormEnabled ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--muted)]">
            Submission form is not configured yet.
          </div>
        ) : null}

        {status === "success" ? (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Thanks — we’ll review it.
          </div>
        ) : null}

        {status === "error" ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Something went wrong. Please try again.
          </div>
        ) : null}

        {errorSummary.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            Please review the highlighted fields.
          </div>
        ) : null}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-semibold text-[var(--fg)]" htmlFor="document-link">
              Document link (URL)
            </label>
            <input
              ref={firstFieldRef}
              id="document-link"
              name="documentLink"
              type="url"
              required
              value={formState.documentLink}
              onChange={(event) => updateField("documentLink", event.target.value)}
              aria-invalid={Boolean(errors.documentLink)}
              aria-describedby={errors.documentLink ? "document-link-error" : undefined}
              className={fieldBaseClassName}
              placeholder="https://example.com/my-score"
            />
            {errors.documentLink ? (
              <p id="document-link-error" className="mt-2 text-xs text-red-300">
                {errors.documentLink}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-semibold text-[var(--fg)]" htmlFor="description">
              Short description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              required
              value={formState.description}
              onChange={(event) => updateField("description", event.target.value)}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "description-error" : undefined}
              className={fieldBaseClassName}
              placeholder="Tell us what the document is and why it stands out."
            />
            {errors.description ? (
              <p id="description-error" className="mt-2 text-xs text-red-300">
                {errors.description}
              </p>
            ) : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-[var(--fg)]" htmlFor="attribution-name">
                Attribution name
              </label>
              <input
                id="attribution-name"
                name="attributionName"
                type="text"
                required
                value={formState.attributionName}
                onChange={(event) => updateField("attributionName", event.target.value)}
                aria-invalid={Boolean(errors.attributionName)}
                aria-describedby={errors.attributionName ? "attribution-name-error" : undefined}
                className={fieldBaseClassName}
                placeholder="Name to display"
              />
              {errors.attributionName ? (
                <p id="attribution-name-error" className="mt-2 text-xs text-red-300">
                  {errors.attributionName}
                </p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-semibold text-[var(--fg)]" htmlFor="attribution-link">
                Attribution link (URL)
              </label>
              <input
                id="attribution-link"
                name="attributionLink"
                type="url"
                value={formState.attributionLink}
                onChange={(event) => updateField("attributionLink", event.target.value)}
                aria-invalid={Boolean(errors.attributionLink)}
                aria-describedby={errors.attributionLink ? "attribution-link-error" : undefined}
                className={fieldBaseClassName}
                placeholder="https://"
              />
              {errors.attributionLink ? (
                <p id="attribution-link-error" className="mt-2 text-xs text-red-300">
                  {errors.attributionLink}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-[var(--fg)]" htmlFor="contact-email">
              Contact email
            </label>
            <input
              id="contact-email"
              name="contactEmail"
              type="email"
              value={formState.contactEmail}
              onChange={(event) => updateField("contactEmail", event.target.value)}
              aria-invalid={Boolean(errors.contactEmail)}
              aria-describedby={errors.contactEmail ? "contact-email-error" : undefined}
              className={fieldBaseClassName}
              placeholder="name@example.com"
            />
            {errors.contactEmail ? (
              <p id="contact-email-error" className="mt-2 text-xs text-red-300">
                {errors.contactEmail}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-semibold text-[var(--fg)]" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formState.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              className={fieldBaseClassName}
              placeholder="Anything else we should know?"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 text-sm text-[var(--fg)]">
              <input
                type="checkbox"
                name="permission"
                checked={formState.permission}
                onChange={(event) => updateField("permission", event.target.checked)}
                aria-invalid={Boolean(errors.permission)}
                aria-describedby={errors.permission ? "permission-error" : undefined}
                className="mt-1 h-4 w-4 rounded border border-[var(--border)] bg-[var(--surface-0)] text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]"
                required
              />
              <span>
                I have permission to share this document for review.
              </span>
            </label>
            {errors.permission ? (
              <p id="permission-error" className="text-xs text-red-300">
                {errors.permission}
              </p>
            ) : null}

            <label className="flex items-start gap-3 text-sm text-[var(--fg)]">
              <input
                type="checkbox"
                name="license"
                checked={formState.license}
                onChange={(event) => updateField("license", event.target.checked)}
                aria-invalid={Boolean(errors.license)}
                aria-describedby={errors.license ? "license-error" : undefined}
                className="mt-1 h-4 w-4 rounded border border-[var(--border)] bg-[var(--surface-0)] text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]"
                required
              />
              <span>
                I confirm the document’s license allows sharing it.
              </span>
            </label>
            {errors.license ? (
              <p id="license-error" className="text-xs text-red-300">
                {errors.license}
              </p>
            ) : null}

            <div className="text-xs text-[var(--muted)]">
              <p>No copyrighted material.</p>
              <p>No third-party personal data.</p>
            </div>
          </div>

          <label className="sr-only" aria-hidden="true">
            Company
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              name="company"
              value={formState.company}
              onChange={(event) => updateField("company", event.target.value)}
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={!isFormEnabled || status === "submitting"}
              variant="glass"
              size="md"
            >
              {status === "submitting" ? "Submitting…" : "Submit"}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="solid"
              size="md"
            >
              Close
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
