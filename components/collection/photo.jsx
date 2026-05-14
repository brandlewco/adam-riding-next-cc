import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import {
  getOptimizedImageProps,
  MAIN_IMAGE_BASE_WIDTHS,
  MAIN_IMAGE_SIZES,
  THUMB_IMAGE_BASE_WIDTHS,
} from "../../lib/image-optimizer";

function CollectionPhoto({
  block = {},
  setImageLoaded,
  dataBinding,
  variant = "main",
  waitUntilInView = false,
  inViewMargin = "200px",
  imageIdentifier,
  forceEager = false,
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

  const updateThumbAlignmentInset = useCallback(() => {
    if (variant !== "thumb") return;

    const img = imageRef.current;
    if (!img) return;

    const button = img.closest("button");
    if (!button) return;

    const boxWidth = img.clientWidth;
    const boxHeight = img.clientHeight;
    if (!boxWidth || !boxHeight) return;

    const naturalRatio =
      img.naturalWidth > 0 && img.naturalHeight > 0
        ? img.naturalWidth / img.naturalHeight
        : null;
    const fallbackWidth = Number(block.width);
    const fallbackHeight = Number(block.height);
    const fallbackRatio =
      fallbackWidth > 0 && fallbackHeight > 0
        ? fallbackWidth / fallbackHeight
        : null;
    const ratio = naturalRatio || fallbackRatio;
    if (!ratio) return;

    const renderedContentWidth = Math.min(boxWidth, boxHeight * ratio);
    const rightInset = Math.max(0, (boxWidth - renderedContentWidth) / 2);
    button.style.setProperty(
      "--thumb-image-right-inset",
      `${rightInset}px`
    );
  }, [block.height, block.width, variant]);

  const handleImageLoad = useCallback(() => {
    updateThumbAlignmentInset();

    if (typeof setImageLoaded === "function") {
      setImageLoaded(
        typeof imageIdentifier !== "undefined" ? imageIdentifier : true
      );
    }
  }, [imageIdentifier, setImageLoaded, updateThumbAlignmentInset]);

  const imageRef = useRef(null);
  const setCombinedImageRef = useCallback(
    (node) => {
      imageRef.current = node;
      if (waitUntilInView) {
        observe(node);
      }
    },
    [observe, waitUntilInView]
  );

  const width = Number(block.width);
  const height = Number(block.height);
  const hasDimensions =
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0;
  const aspectRatio = hasDimensions ? `${width} / ${height}` : undefined;
  const rawSrc = block.image_path || block.src || "";
  const safeSrc = typeof rawSrc === "string" ? rawSrc : "";

  const sizes =
    variant === "thumb"
      ? "(max-width: 767px) 120px, 184px"
      : MAIN_IMAGE_SIZES;
  const className =
    variant === "thumb"
      ? "h-full w-full object-contain thumb-image"
      : "max-h-full w-auto h-auto -mx-6 sm:mx-0 object-contain thumb-image";

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
              overflow: "hidden",
        };

  const placeholderStyle = {
    display: "block",
    width: "100%",
    height: "100%",
    borderRadius: 2,
    ...(aspectRatio ? { aspectRatio } : {}),
    overflow: "hidden",
  };

  const optimizedImage = getOptimizedImageProps(safeSrc, {
    srcWidth: variant === "thumb" ? 184 : 1100,
    sizes,
    baseWidths:
      variant === "thumb" ? THUMB_IMAGE_BASE_WIDTHS : MAIN_IMAGE_BASE_WIDTHS,
    maxWidth: variant === "thumb" ? 368 : 1920,
  });
  const [imageSrc, setImageSrc] = useState(() => optimizedImage.src || safeSrc);
  const [imageSrcSet, setImageSrcSet] = useState(
    () => optimizedImage.srcSet || undefined
  );
  const [hasFallback, setHasFallback] = useState(false);

  useEffect(() => {
    setImageSrc(optimizedImage.src || safeSrc);
    setImageSrcSet(optimizedImage.srcSet || undefined);
    setHasFallback(false);
  }, [optimizedImage.src, optimizedImage.srcSet, safeSrc]);

  const handleImageError = useCallback(() => {
    if (!safeSrc || hasFallback) return;
    setHasFallback(true);
    setImageSrc(safeSrc);
    setImageSrcSet(undefined);
  }, [hasFallback, safeSrc]);

  useEffect(() => {
    if (variant !== "thumb" || typeof window === "undefined") return undefined;

    const handleResize = () => updateThumbAlignmentInset();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [updateThumbAlignmentInset, variant]);

  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      handleImageLoad();
    }
  }, [handleImageLoad, imageSrc]);

  const shouldEagerLoad = variant === "main" || forceEager;

  if (!safeSrc || !hasEnteredView) {
    return (
      <span
        ref={waitUntilInView ? observe : undefined}
        data-cms-bind={dataBinding}
        style={placeholderStyle}
      />
    );
  }

  return (
    <img
      ref={setCombinedImageRef}
      src={imageSrc || safeSrc}
      srcSet={imageSrcSet}
      sizes={optimizedImage.sizes}
      alt={block.alt_text || "Slide Image"}
      width={hasDimensions ? width : undefined}
      height={hasDimensions ? height : undefined}
      className={className}
      style={style}
      data-cms-bind={dataBinding}
      loading={shouldEagerLoad ? "eager" : "lazy"}
      decoding={shouldEagerLoad ? undefined : "async"}
      onLoad={handleImageLoad}
      onError={handleImageError}
    />
  );
}

export default memo(CollectionPhoto);