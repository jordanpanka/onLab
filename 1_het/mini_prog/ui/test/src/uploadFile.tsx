import { Box, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
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
            <DialogContent >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

                    <label>Choose files</label>
                    <input
                        type="file"
                        multiple
                        onChange={(e) => {
                            const files = e.currentTarget.files;
                            if (files) setFile(files);
                        }}
                    />

                    <label>Choose a directory</label>
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

                </Box>
            </DialogContent>
            <DialogActions>
                <button onClick={()=>setOpen(false)}>Cancel</button>
                <button onClick={link}>Upload</button>
            </DialogActions>
        </Dialog>
    );
}