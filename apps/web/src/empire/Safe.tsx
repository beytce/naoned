/**
 * The empire's safety net: an error while a sheet, a dock or a scene draws never leaves a white
 * screen. It says so, shows what broke (for the owner to report), and goes back to the map.
 */
import { Component, type ReactNode } from "react";

export class Safe extends Component<
  { children: ReactNode; onReset: () => void },
  { error: string | null }
> {
  override state = { error: null as string | null };

  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }

  override componentDidCatch(e: unknown) {
    console.error("empire screen", e);
  }

  override render() {
    if (this.state.error === null) return this.props.children;
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-night p-6">
        <div className="hud-bar w-full max-w-sm rounded-[1.75rem] p-6 text-center" role="alert">
          <p className="font-display text-xl font-black text-cream">Cet écran a buté</p>
          <p className="mt-2 text-sm text-cream-dim">
            Rien n'est perdu : ta maison est sur le serveur. Reviens à la carte.
          </p>
          <p className="mt-3 break-words rounded-xl bg-night-4 p-2 text-left text-xs text-cream-dim">
            {this.state.error}
          </p>
          <button
            type="button"
            className="mt-4 min-h-12 w-full rounded-full bg-face font-display font-black text-white shadow-[0_4px_0_rgb(var(--face-deep))]"
            onClick={() => {
              this.props.onReset();
              this.setState({ error: null });
            }}
          >
            Revenir à la carte
          </button>
        </div>
      </div>
    );
  }
}
