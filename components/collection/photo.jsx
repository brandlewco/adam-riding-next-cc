import ExportedImage from "next-image-export-optimizer";
import { memo, useCallback } from "react";

const MemoizedExportedImage = memo(ExportedImage);
MemoizedExportedImage.displayName = "MemoizedExportedImage";

function CollectionPhoto({ block, setImageLoaded, dataBinding, variant = "main" }) {
  const handleImageLoad = useCallback(() => {
    if (setImageLoaded) setImageLoaded(true);
  }, [setImageLoaded]);

  const width = block.width || 1600;
  const height = block.height || 1066;
  const sizes =
    variant === "thumb"
      ? "(max-width:640px)30vw,10vw"
      : "(max-width: 640px) 100vw, (max-width: 1920px) 60vw, 50vw";
  const className =
    variant === "thumb"
      ? "h-full w-auto object-contain"
      : "max-h-full w-auto h-auto object-contain";

  const style =
    variant === "thumb"
      ? {
          height: "100%",
          width: "auto",
          maxWidth: "none",
          maxHeight: "100%",
          display: "block",
        }
      : { maxWidth: "100%", maxHeight: "100%" };

  return (
    <MemoizedExportedImage
      src={block.image_path}
      alt={block.alt_text || "Slide Image"}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      style={style}
      data-cms-bind={dataBinding}
      onLoad={handleImageLoad}
    />
  );
}

export default memo(CollectionPhoto);