import { render, screen, fireEvent } from "@testing-library/preact";
import { describe, it, expect, vi } from "vitest";
import { UploadFile } from "../components/upload/uploadFile";

vi.mock("@mui/material", () => ({
  Dialog: (p: any) => (p.open ? <div>{p.children}</div> : null),
  DialogTitle: (p: any) => <h2>{p.children}</h2>,
  DialogContent: (p: any) => <div>{p.children}</div>,
  DialogActions: (p: any) => <div>{p.children}</div>,
  Box: (p: any) => <div>{p.children}</div>,
}));

describe("UploadFile", () => {
  it("megjeleníti a fájlválasztókat", () => {
    render(<UploadFile open={true} setOpen={vi.fn()} setFile={vi.fn()} link={vi.fn()} />);

    expect(screen.getByText("Choose files")).toBeInTheDocument();
    expect(screen.getByText("Choose a directory")).toBeInTheDocument();
    expect(screen.getByText("Upload")).toBeInTheDocument();
  });

  it("Cancel gombra bezár", () => {
    const setOpen = vi.fn();

    render(<UploadFile open={true} setOpen={setOpen} setFile={vi.fn()} link={vi.fn()} />);

    fireEvent.click(screen.getByText("Cancel"));

    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it("Upload gombra meghívja a link függvényt", () => {
    const link = vi.fn();

    render(<UploadFile open={true} setOpen={vi.fn()} setFile={vi.fn()} link={link} />);

    fireEvent.click(screen.getByText("Upload"));

    expect(link).toHaveBeenCalled();
  });
});