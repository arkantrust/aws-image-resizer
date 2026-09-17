import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImage, type GalleryImage } from "@/lib/api";
import { useRef, useState } from "react";

interface UploadFormProps {
  onUploaded: (image: GalleryImage) => void;
}

export function UploadForm({ onUploaded }: UploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setStatus("uploading");
    setError(null);
    try {
      const image = await uploadImage(file);
      onUploaded(image);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "upload failed");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="image-upload">Upload an image</Label>
      <Input
        ref={inputRef}
        id="image-upload"
        type="file"
        accept="image/*"
        disabled={status === "uploading"}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {status === "uploading" && <p className="text-sm text-muted-foreground">Uploading…</p>}
      {status === "error" && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
