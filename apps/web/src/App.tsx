import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gallery } from "@/components/Gallery";
import { UploadForm } from "@/components/UploadForm";
import { fetchImages, type GalleryImage } from "@/lib/api";
import { useEffect, useState } from "react";
import "./index.css";

export function App() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImages()
      .then(setImages)
      .finally(() => setLoading(false));
  }, []);

  const handleUploaded = (image: GalleryImage) => {
    setImages(prev => [image, ...prev]);
  };

  return (
    <div className="container mx-auto max-w-3xl p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Image Gallery</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <UploadForm onUploaded={handleUploaded} />
          <Gallery images={images} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
