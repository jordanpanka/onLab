import { Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import type { Dispatch } from "preact/hooks";

type UploadFileProps = {
    setFile: Dispatch<FileList>;
    link: () => Promise<void>;
    /*answer: string;*/
    open: boolean,
    setOpen: (b: boolean) => void
};

export function UploadFile({ setFile, link, open, setOpen }: UploadFileProps) {
    return (
        <Dialog open={open} onClose={() => setOpen(false)}>
            <DialogTitle></DialogTitle>
            <DialogContent>
                <input type="file"
                    multiple
                    //@ts-ignore 
                    webkitdirectory
                    onChange={(e) => { const files = e.currentTarget.files; if (files) setFile(files) }}></input>
                {/* Fájl feltöltés */}
                <input
                    type="file"
                    multiple
                    onChange={(e) => {
                        const files = e.currentTarget.files;
                        if (files) setFile(files);
                    }}
                />

                {/* Mappa feltöltés */}
                <input
                    type="file"
                    multiple
                    //@ts-ignore 
                    webkitdirectory
                    onChange={(e) => {
                        const files = e.currentTarget.files;
                        if (files) setFile(files);
                    }}
                />
            </DialogContent>
            <DialogActions>
                <button onClick={link}>Upload</button>
            </DialogActions>
        </Dialog>
    );
}