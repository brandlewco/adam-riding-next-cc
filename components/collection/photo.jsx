import ExportedImage from "next-image-export-optimizer";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";

const MemoizedExportedImage = memo(ExportedImage);
MemoizedExportedImage.displayName = "MemoizedExportedImage";

function CollectionPhoto({
  block = {},
  setImageLoaded,
  dataBinding,
  variant = "main",
  waitUntilInView = false,
  inViewMargin = "200px",
  imageIdentifier,
}) {
  const [hasEnteredView, setHasEnteredView] = useState(!waitUntilInView);

  const [observe, inView] = useInView({
    triggerOnce: true,
    rootMargin: inViewMargin,
    skip: !waitUntilInView,
  });

  useEffect(() => {
    if (waitUntilInView && inView) {
      setHasEnteredView(true);
    }
  }, [inView, waitUntilInView]);

  const handleImageLoad = useCallback(() => {
    if (typeof setImageLoaded === "function") {
      setImageLoaded(
        typeof imageIdentifier !== "undefined" ? imageIdentifier : true
      );
    }
  }, [imageIdentifier, setImageLoaded]);

  const width = block.width || 1600;
  const height = block.height || 1066;
  const aspectRatio = width && height ? `${width} / ${height}` : undefined;
  const rawSrc = block.image_path || block.src || "";
  const normalizedSrc = useMemo(() => {
    if (!rawSrc) return rawSrc;
    if (rawSrc.startsWith("http")) return rawSrc;
    const [cleanPath] = rawSrc.split("?");
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(cleanPath || "");
    return hasExtension ? cleanPath : `${cleanPath}.jpg`;
  }, [rawSrc]);

  const sizes =
    variant === "thumb"
      ? "(max-width:640px)30vw,10vw"
      : "(max-width: 640px) 100vw, (max-width: 1920px) 60vw, 50vw";
  const className =
    variant === "thumb"
      ? "h-full w-full object-contain thumb-image "
      : "max-h-full w-auto h-auto object-contain thumb-image";

  const style =
    variant === "thumb"
      ? {
          height: "100%",
          width: "auto",
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          display: "block",
          willChange: "transform, opacity",
          ...(aspectRatio ? { aspectRatio } : {}),
        }
      : {
          maxWidth: "100%",
          maxHeight: "100%",
          willChange: "transform, opacity",
          ...(aspectRatio ? { aspectRatio } : {}),
        };

  const placeholderStyle = {
    display: "block",
    width: "100%",
    height: "100%",
    backgroundColor: "#f5f5f5",
    borderRadius: 2,
    ...(aspectRatio ? { aspectRatio } : {}),
  };

  if (!hasEnteredView) {
    return (
      <span
        ref={waitUntilInView ? observe : undefined}
        data-cms-bind={dataBinding}
        style={placeholderStyle}
      />
    );
  }

  return (
    <MemoizedExportedImage
      ref={waitUntilInView ? observe : undefined}
      src={normalizedSrc}
      alt={block.alt_text || "Slide Image"}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      style={style}
      data-cms-bind={dataBinding}
      placeholder="empty"
      loading={variant === "main" ? "eager" : "lazy"}
      fetchPriority={variant === "main" ? "high" : "auto"}
      decoding="async"
      onLoad={handleImageLoad}
    />
  );
}

export default memo(CollectionPhoto);