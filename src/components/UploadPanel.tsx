import { Button } from "./Button";
import { StatusBanner } from "./StatusBanner";
import type { StatusMessage } from "../types";

type UploadPanelProps = {
  bucketName: string;
  bucketId?: string;
  file?: File;
  status: StatusMessage;
  onBucketNameChange: (value: string) => void;
  onFileChange: (file?: File) => void;
  onCreateBucket: () => void;
  onUpload: () => void;
};

export const UploadPanel = ({
  bucketName,
  bucketId,
  file,
  status,
  onBucketNameChange,
  onFileChange,
  onCreateBucket,
  onUpload,
}: UploadPanelProps) => (
  <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-[1fr_auto] items-end">
      <div>
        <label className="text-sm text-slate-300">Bucket name</label>
        <input
          className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-vault-400/60"
          placeholder="game-assets"
          value={bucketName}
          onChange={(event) => onBucketNameChange(event.target.value)}
        />
      </div>
      <Button onClick={onCreateBucket}>Create Bucket</Button>
    </div>
    <div className="grid gap-4 md:grid-cols-[1fr_auto] items-end">
      <div>
        <label className="text-sm text-slate-300">Upload JSON, PNG, or JPG</label>
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm">
          <label
            htmlFor="asset-file"
            className="cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-slate-200 hover:border-vault-400/60 hover:text-white transition"
          >
            Choose File
          </label>
          <span className="text-xs text-slate-400">
            {file ? `${file.name} · ${file.type}` : "No file selected"}
          </span>
        </div>
        <input
          id="asset-file"
          type="file"
          accept=".json,image/png,image/jpeg"
          className="hidden"
          onChange={(event) => onFileChange(event.target.files?.[0])}
        />
        <div className="mt-2 text-xs text-slate-400">
          {file ? "Ready to upload." : "Select a JSON, PNG, or JPG asset file."}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Bucket: {bucketId ?? "not created"}
        </div>
      </div>
      <Button variant="secondary" onClick={onUpload}>
        Upload Asset
      </Button>
    </div>
    <StatusBanner state={status.state} message={status.message} />
  </div>
);
