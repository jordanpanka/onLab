import type { Dispatch } from "preact/hooks";

type UploadFileProps = {
  setFile: Dispatch<File | null>;
  link: () => Promise<void>;
  answer: string;
};

export function UploadFile({ setFile, link, answer }: UploadFileProps) {
    return <div>
        <input type="file" accept=".pdf, .docx, .txt" onChange={(e) => {
            const selected = e.currentTarget.files?.[0];
            if (selected) setFile(selected);
        }}></input>
        <button onClick={link}>Upload</button>
        <div>{answer}</div>
    </div>
}