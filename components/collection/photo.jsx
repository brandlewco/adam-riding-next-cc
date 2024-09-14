import MarkdownIt from "markdown-it";
import ExportedImage from "next-image-export-optimizer";
import { useState, useEffect } from "react";

const md = new MarkdownIt({ html: true });

export default function CollectionPhoto({ block, setImageLoaded }) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!block.image_path) {
      console.error("Image path is not defined");
      return;
    }

    const img = new Image();
    img.src = block.image_path;

    img.onload = () => {
      setDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      setImageLoaded(true);
    };

    img.onerror = (error) => {
      console.error(`Failed to load image: ${block.image_path}`, error);
    };
  }, [block.image_path, setImageLoaded]);

  if (dimensions.width === 0 || dimensions.height === 0) {
    return <div></div>;
  }

  return (
    <ExportedImage
      src={block.image_path}
      alt={block.alt_text || "Slide Image"}
      priority
      width={dimensions.width}
      height={dimensions.height}
      sizes="(max-width: 800px) 100vw, (max-width: 1920px) 40vw, 33vw"
      className="sm:h-75vh w-full sm:w-auto"
    />
  );
}