import MarkdownIt from "markdown-it";
import ExportedImage from "next-image-export-optimizer";
import { useState, useEffect } from "react";

const md = new MarkdownIt({ html: true });

export default function CollectionPhoto({ block, dataBinding }) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const img = new Image();
    img.src = block.image_path;
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      setDimensions({
        width: 2048, // Example width
        height: 2048 / aspectRatio, // Calculate height based on the aspect ratio
      });
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
    />
  );
}
