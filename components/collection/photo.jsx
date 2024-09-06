import MarkdownIt from "markdown-it";
import ExportedImage from "next-image-export-optimizer";
import { useState, useEffect } from "react";

const md = new MarkdownIt({ html: true });

export default function CollectionPhoto({ block, dataBinding }) {
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
    };

    img.onerror = (error) => {
      console.error(`Failed to load image: ${block.image_path}`, error);
    };
  }, [block.image_path]);

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
      style={{ maxHeight: "75vh", margin: "1rem 1rem 0 0" }}
      unoptimized // Add this property if you don't have a custom loader
    />
  );
}