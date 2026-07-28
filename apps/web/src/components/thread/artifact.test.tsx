import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  ArtifactContent,
  ArtifactProvider,
  ArtifactTitle,
  useArtifact,
} from "./artifact";

function ArtifactFixture() {
  const [Artifact, { setOpen }] = useArtifact();
  return (
    <>
      <button onClick={() => setOpen(true)}>Open artifact</button>
      <Artifact title="Evidence">
        <p>Artifact body</p>
      </Artifact>
      <ArtifactTitle />
      <ArtifactContent />
    </>
  );
}

describe("Artifact", () => {
  it("renders title and content in the side-panel slots", async () => {
    render(
      <ArtifactProvider>
        <ArtifactFixture />
      </ArtifactProvider>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /open artifact/i }),
    );

    expect(await screen.findByText("Evidence")).toBeInTheDocument();
    expect(await screen.findByText("Artifact body")).toBeInTheDocument();
  });
});
