/**
 * The 3D board's safety net: an error while it loads or draws (its code or its models not fetched
 * after a deployment or offline, a refused context, a shader that does not compile) never takes the
 * whole game down; the map goes on in SVG (flag.ts, `give3dUp`).
 */
import { Component, type ReactNode } from "react";
import { give3dUp, mark3dFailed } from "./flag.js";

export class Guard3D extends Component<
  {
    children: ReactNode;
    /**
     * A screen that has its own 2D (the battle): it takes over in place, without reloading the
     * page in mid-battle (audit of 4 November, 3D M7).
     */
    onFail?: () => void;
  },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    if (this.props.onFail) {
      mark3dFailed(error);
      this.props.onFail();
    } else give3dUp(error);
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
