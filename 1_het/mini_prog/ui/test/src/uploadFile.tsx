import type { Dispatch } from "preact/hooks";

type UploadFileProps = {
  setFile: Dispatch<FileList>;
  link: () => Promise<void>;
  answer: string;
};

export function UploadFile({ setFile, link, answer }: UploadFileProps) {
    return <div>
        <input 
        type="file" 
        multiple 
        /*webkitdirectory="" */
        onChange={(e) => {
            const files = e.currentTarget.files;
            if (files) setFile(files);
        }}></input>
        <button onClick={link}>Upload</button>
        <div>{answer}</div>
    </div>
}