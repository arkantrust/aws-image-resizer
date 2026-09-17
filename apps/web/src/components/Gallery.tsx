import type { GalleryImage } from "@/lib/api";

interface GalleryProps {
  images: GalleryImage[];
  loading: boolean;
}

export function Gallery({ images, loading }: GalleryProps) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading images…</p>;
  }

  if (images.length === 0) {
    return <p className="text-sm text-muted-foreground">No images yet. Upload one above.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {images.map(image => (
        <img
          key={image.uuid}
          src={image.url}
          alt=""
          loading="lazy"
          className="aspect-square w-full rounded-md border object-cover"
        />
      ))}
    </div>
  );
}
