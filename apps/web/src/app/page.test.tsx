import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/thread", () => ({
  Thread: () => <main>Thread page ready</main>,
}));
vi.mock("@/providers/Stream", () => ({
  StreamProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/providers/Thread", () => ({
  ThreadProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/thread/artifact", () => ({
  ArtifactProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => null,
}));

import DemoPage from "./page";

describe("DemoPage", () => {
  it("renders the thread page through its providers", () => {
    render(<DemoPage />);

    expect(screen.getByText("Thread page ready")).toBeInTheDocument();
  });
});
