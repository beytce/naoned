import { useState } from "react";
import { BuildingArt } from "../art/buildings.js";
import { Coin } from "../art/icons.js";
import { ResourceIcon } from "../art/resources.js";
import { Lorenzo } from "../art/scenes.js";
import { Skyline } from "../art/scenes.js";
import { fr } from "../i18n.js";
import { Label, Slab } from "../ui.js";

function Goal() {
  return (
    <div className="relative flex items-end justify-center gap-2 pt-6">
      {[
        { h: "h-16", rank: "2", tone: "bg-lagoon" },
        { h: "h-28", rank: "1", tone: "bg-gold" },
        { h: "h-10", rank: "3", tone: "bg-vermilion" },
      ].map((p) => (
        <div key={p.rank} className="flex w-20 flex-col items-center gap-2">
          {p.rank === "1" && (
            <div className="animate-floaty">
              <Lorenzo size={64} />
            </div>
          )}
          <div
            className={`slab flex w-full ${p.h} items-start justify-center ${p.tone} pt-2 font-display text-2xl font-extrabold text-night`}
          >
            <span>{p.rank}</span>
          </div>
        </div>
      ))}
      <div className="absolute right-6 top-0 animate-floaty">
        <Coin size={44} />
      </div>
    </div>
  );
}

/** Produce → sell → reinvest, drawn as a loop. */
function Loop() {
  const steps = [
    {
      label: "Produire",
      icon: <BuildingArt type="mill" active className="h-16 w-20" />,
      pos: "left-1/2 top-0 -translate-x-1/2",
    },
    { label: "Vendre", icon: <ResourceIcon code="bread" size={48} />, pos: "bottom-2 right-0" },
    { label: "Réinvestir", icon: <Coin size={44} />, pos: "bottom-2 left-0" },
  ];
  return (
    <div className="relative mx-auto h-64 w-72">
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 z" fill="#F4B740" />
          </marker>
        </defs>
        <circle cx="100" cy="110" r="62" fill="none" stroke="#3D3450" strokeWidth="10" />
        <path
          d="M140 64 A62 62 0 0 1 158 140"
          fill="none"
          stroke="#F4B740"
          strokeWidth="4"
          markerEnd="url(#arrow)"
        />
        <path
          d="M130 166 A62 62 0 0 1 64 160"
          fill="none"
          stroke="#2FC6B4"
          strokeWidth="4"
          markerEnd="url(#arrow)"
        />
        <path
          d="M42 136 A62 62 0 0 1 62 62"
          fill="none"
          stroke="#EF5A4C"
          strokeWidth="4"
          markerEnd="url(#arrow)"
        />
      </svg>
      {steps.map((s) => (
        <div key={s.label} className={`absolute flex flex-col items-center ${s.pos}`}>
          <div className="flex h-20 w-24 items-center justify-center rounded-xl bg-night-3 ring-1 ring-line">
            {s.icon}
          </div>
          <span className="mt-1 font-display text-xs font-extrabold uppercase">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function Illustration({ index }: { index: number }) {
  if (index === 0) return <Goal />;
  if (index === 1) return <Loop />;
  if (index === 2) {
    return (
      <div className="flex items-center justify-center gap-4 py-6">
        <div className="slab bg-night-3 p-4 ring-1 ring-line">
          <span>
            <ResourceIcon code="bricks" size={64} />
          </span>
        </div>
        <span className="font-display text-3xl text-gold">+</span>
        <div className="slab bg-night-3 p-4 ring-1 ring-line">
          <span>
            <ResourceIcon code="planks" size={64} />
          </span>
        </div>
        <span className="font-display text-3xl text-gold">=</span>
        <BuildingArt type="palazzo" className="h-20 w-24" />
      </div>
    );
  }
  return (
    <div className="relative">
      <Skyline className="w-full" />
      <div className="absolute bottom-4 left-4 animate-floaty">
        <Lorenzo size={72} />
      </div>
    </div>
  );
}

/** Four illustrated slides: the story and the loop, before the first step. */
export function Intro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const slides = fr.intro.slides;
  const slide = slides[i];
  const last = i === slides.length - 1;
  if (!slide) return null;
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {slides.map((s, k) => (
            <span
              key={s.title}
              className={`slab h-1.5 w-8 ${k <= i ? (k === i ? "bg-gold" : "bg-lagoon") : "bg-line"}`}
            />
          ))}
        </div>
        <button type="button" className="label text-cream-dim" onClick={onDone}>
          {fr.intro.skip}
        </button>
      </div>
      <div key={i} className="flex flex-1 animate-rise flex-col justify-center gap-8">
        <Illustration index={i} />
        <div className="space-y-3">
          <Label className="text-lagoon">{slide.kicker}</Label>
          <h1 className="font-display text-3xl font-extrabold uppercase leading-tight">
            {slide.title}
          </h1>
          <p className="text-lg leading-snug text-cream-dim">{slide.text}</p>
        </div>
      </div>
      <Slab size="lg" className="w-full" onClick={() => (last ? onDone() : setI(i + 1))}>
        {last ? fr.intro.start : fr.intro.next}
      </Slab>
    </main>
  );
}
