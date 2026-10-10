import { useState } from "react";
import { BuildingArt } from "../art/buildings.js";
import { Coin } from "../art/icons.js";
import { ResourceIcon } from "../art/resources.js";
import { Skyline } from "../art/scenes.js";
import { fr } from "../i18n.js";
import { Label, Slab } from "../ui.js";

function Illustration({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="relative">
        <Skyline className="w-full" />
        <div className="absolute right-6 top-4 animate-floaty">
          <Coin size={56} />
        </div>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="flex items-end justify-center gap-2">
        <BuildingArt type="mill" active className="h-40 w-48" />
        <div className="mb-8 flex flex-col gap-2">
          <ResourceIcon code="wheat" size={40} />
          <span className="text-center text-gold">→</span>
          <ResourceIcon code="flour" size={40} />
        </div>
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="flex items-center justify-center gap-4 py-6">
        <div className="slab bg-night-3 p-4 ring-1 ring-line">
          <span>
            <ResourceIcon code="bricks" size={64} />
          </span>
        </div>
        <span className="font-display text-3xl text-gold">⇄</span>
        <div className="slab bg-night-3 p-4 ring-1 ring-line">
          <span>
            <ResourceIcon code="planks" size={64} />
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-center">
      <BuildingArt type="palazzo" className="h-44 w-60 animate-floaty" />
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
