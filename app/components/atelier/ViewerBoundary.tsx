"use client";

import { Component, type ReactNode } from "react";

/**
 * Keeps a failing 3D canvas from taking the page with it.
 *
 * Without WebGL — a locked-down studio machine, a remote desktop, a headless browser — the
 * viewer cannot draw, but the review form beside it still has to work.
 */
export class ViewerBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        this.props.fallback ?? (
          <div className="w-full h-full grid place-items-center bg-pearl text-text-muted caption-m p-6 text-center">
            This screen cannot show 3D. The measurements below still apply.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
