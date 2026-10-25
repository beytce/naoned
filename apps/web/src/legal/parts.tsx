import type { ReactNode } from "react";
import { LANG } from "../lang.js";
import { LEGAL } from "./info.js";

/** A detail still to give (see legal/info.ts): visible, so that it is not forgotten. */
export function Missing({ what }: { what: string }) {
  return (
    <span className="font-semibold text-vermilion">
      [{LANG === "en" ? "to complete" : "à compléter"} : {what}]
    </span>
  );
}

export const value = (v: string | null, what: string) => v ?? <Missing what={what} />;

export function Contact() {
  return LEGAL.email ? (
    <a className="text-gold underline" href={`mailto:${LEGAL.email}`}>
      {LEGAL.email}
    </a>
  ) : (
    <Missing what={LANG === "en" ? "contact e-mail address" : "adresse e-mail de contact"} />
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 font-display text-lg font-extrabold uppercase">{children}</h2>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 leading-relaxed text-cream-dim">{children}</p>;
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-cream-dim">
      {items.map((item, i) => (
        // Fixed texts: their order never changes.
        // biome-ignore lint/suspicious/noArrayIndexKey: static content
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
