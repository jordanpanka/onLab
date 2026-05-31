import { h } from "preact";
import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RightPanel } from "../RightPanel";

vi.mock("@mui/material", () => ({
  Drawer: (p: any) => <div>{p.children}</div>,
  Box: (p: any) => <div>{p.children}</div>,
  Typography: (p: any) => <div>{p.children}</div>,
  IconButton: (p: any) => <button onClick={p.onClick}>{p.children}</button>,
  List: (p: any) => <div>{p.children}</div>,
  ListItemButton: (p: any) => <button onClick={p.onClick}>{p.children}</button>,
  ListItemText: (p: any) => <span>{p.primary}</span>,
  Collapse: (p: any) => (p.in ? <div>{p.children}</div> : null),
  Dialog: (p: any) => (p.open ? <div>{p.children}</div> : null),
  DialogTitle: (p: any) => <h2>{p.children}</h2>,
  DialogContent: (p: any) => <div>{p.children}</div>,
  DialogActions: (p: any) => <div>{p.children}</div>,
}));

vi.mock("@mui/icons-material", () => ({
  AttachFile: () => <span>attach</span>,
  ExpandLess: () => <span>less</span>,
  ExpandMore: () => <span>more</span>,
}));

vi.mock("../FolderTree", () => ({
  buildTree: () => ({ name: "root", folders: [], files: [] }),
  FolderTree: () => <div>FolderTree</div>,
}));

vi.mock("../uploadFile", () => ({
  UploadFile: (p: any) => (
    <div>
      <p>UploadFile</p>
      <button onClick={() => p.setOpen(false)}>Cancel</button>
      <button onClick={p.link}>Upload</button>
    </div>
  ),
}));

describe("RightPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("token", "test-token");
  });

  const project = {
    id: 1,
    invid: 1,
    name: "Teszt projekt",
    description: "Leírás",
  };

  it("megjeleníti a kiválasztott projekt nevét", () => {
    render(
      <RightPanel
        selectedInvId={1}
        projectSelected={project}
        projOpen={{}}
        setProjOpen={vi.fn()}
        showWindowAddfile={false}
        setShowWindowAddFile={vi.fn()}
      />
    );

    expect(screen.getByText("Files")).toBeInTheDocument();
    expect(screen.getByText("Teszt projekt")).toBeInTheDocument();
  });

  it("plusz gombra megnyitja a fájlfeltöltő ablakot", () => {
    const setShowWindowAddFile = vi.fn();

    render(
      <RightPanel
        selectedInvId={1}
        projectSelected={project}
        projOpen={{}}
        setProjOpen={vi.fn()}
        showWindowAddfile={false}
        setShowWindowAddFile={setShowWindowAddFile}
      />
    );

    fireEvent.click(screen.getByText("+"));

    expect(setShowWindowAddFile).toHaveBeenCalledWith(true);
  });

  it("projektre kattintva betölti a fájlokat és nyitja a listát", async () => {
    const setProjOpen = vi.fn();

    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve([]),
      })
    ));

    render(
      <RightPanel
        selectedInvId={1}
        projectSelected={project}
        projOpen={{}}
        setProjOpen={setProjOpen}
        showWindowAddfile={false}
        setShowWindowAddFile={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Teszt projekt"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "api/investigations/projects/files/load",
        expect.objectContaining({ method: "Post" })
      );
      expect(setProjOpen).toHaveBeenCalled();
    });
  });
});