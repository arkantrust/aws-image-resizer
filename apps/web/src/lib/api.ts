export interface GalleryImage {
  uuid: string;
  url: string;
}

async function asJson<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body && typeof body.error === "string" ? body.error : `request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

export async function fetchImages(): Promise<GalleryImage[]> {
  const res = await fetch("/api/images");
  const { images } = await asJson<{ images: GalleryImage[] }>(res);
  return images;
}

export async function uploadImage(file: File): Promise<GalleryImage> {
  const presignRes = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type }),
  });
  const { uuid, uploadUrl } = await asJson<{ uuid: string; uploadUrl: string }>(presignRes);

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`upload to storage failed (${putRes.status})`);
  }

  const completeRes = await fetch(`/api/uploads/${uuid}/complete`, { method: "POST" });
  return asJson<GalleryImage>(completeRes);
}
