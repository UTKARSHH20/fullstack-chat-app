import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";

const ImageLightbox = ({ images, initialIndex, onClose }) => {
  const [current, setCurrent] = useState(initialIndex);

  const prev = () => setCurrent((i) => (i - 1 + images.length) % images.length);
  const next = () => setCurrent((i) => (i + 1) % images.length);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleDownload = async () => {
    const response = await fetch(images[current]);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `image-${current + 1}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Stop click from closing when clicking image area */}
      <div
        className="relative flex items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-red-400"
        >
          <X size={28} />
        </button>

        {/* Prev */}
        <button onClick={prev} className="text-white hover:text-zinc-300">
          <ChevronLeft size={40} />
        </button>

        {/* Image */}
        <img
          src={images[current]}
          alt={`media-${current}`}
          className="max-h-[80vh] max-w-[75vw] rounded-lg object-contain"
        />

        {/* Next */}
        <button onClick={next} className="text-white hover:text-zinc-300">
          <ChevronRight size={40} />
        </button>

        {/* Download */}
        <button
          onClick={handleDownload}
          className="absolute -bottom-10 right-0 text-white hover:text-green-400 flex items-center gap-1 text-sm"
        >
          <Download size={18} /> Download
        </button>

        {/* Counter */}
        <span className="absolute -bottom-10 left-0 text-zinc-400 text-sm">
          {current + 1} / {images.length}
        </span>
      </div>
    </div>
  );
};

export default ImageLightbox;