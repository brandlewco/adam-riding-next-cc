import ExportedImage from "next-image-export-optimizer";
import { memo, useCallback } from "react";

const MemoizedExportedImage = memo(ExportedImage);
MemoizedExportedImage.displayName = 'MemoizedExportedImage';

function CollectionPhoto({ block, setImageLoaded }) {
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, [setImageLoaded]);

  return (
    <MemoizedExportedImage
      src={block.image_path}
      alt={block.alt_text || "Slide Image"}
      priority
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1920px) 40vw, 33vw"
      className="img-w"
      style={{
        objectFit: 'contain',
      }}
      onLoad={handleImageLoad}
    />
  );
}

export default memo(CollectionPhoto);