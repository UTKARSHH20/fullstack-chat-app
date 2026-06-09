import { useEffect, useState } from "react";
import { axiosInstance } from "../../lib/axios";
import ImageLightbox from "./ImageLightbox";
import { Images } from "lucide-react";

const MediaGallery = ({ selectedUserId }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/messages/${selectedUserId}/media`);
        setImages(res.data);
      } catch (err) {
        console.error("Failed to fetch media:", err);
      } finally {
        setLoading(false);
      }
    };

    if (selectedUserId) fetchMedia();
  }, [selectedUserId]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-40">
        <span className="loading loading-spinner" />
      </div>
    );

  if (images.length === 0)
    return (
      <div className="flex flex-col items-center justify-center h-40 text-zinc-500 gap-2">
        <Images size={36} />
        <p className="text-sm">No images shared yet</p>
      </div>
    );

  return (
    <>
      <div className="grid grid-cols-3 gap-1 p-2">
        {images.map((msg, index) => (
          <img
            key={msg._id}
            src={msg.image}
            alt="shared media"
            className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80 transition"
            onClick={() => setLightboxIndex(index)}
          />
        ))}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={images.map((m) => m.image)}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
};

export default MediaGallery;