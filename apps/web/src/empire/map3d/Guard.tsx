/**
 * The 3D board's safety net: an error while it loads or draws (its code or its models not fetched
 * after a deployment or offline, a refused context, a shader that does not compile) never takes the
 * whole game down; the map goes on in SVG (flag.ts, `give3dUp`).
 */
import { Component, type ReactNode } from "react";
import { give3dUp } from "./flag.js";

export class Guard3D extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    give3dUp(error);
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
