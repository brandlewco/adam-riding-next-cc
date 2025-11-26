import { memo, useEffect, useState } from "react";
import { motion } from "motion/react";

const sharedImageTransition = {
  layout: { duration: 0.25, ease: "easeInOut" },
};

const SharedImageFrame = memo(function SharedImageFrame({
  layoutId,
  block = {},
  variant = "main",
  hidden = false,
  children,
  thumbMargin = 0,
  shareLayout = true,
  elevation,
  thumbFillWidth = true,
  maintainAspect = false,
  thumbHeight = 184,
  maxMainWidth,
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateMobileState = () => setIsMobile(mediaQuery.matches);
    updateMobileState();

    if (mediaQuery.addEventListener) mediaQuery.addEventListener("change", updateMobileState);
    else mediaQuery.addListener(updateMobileState);

    return () => {
      if (mediaQuery.removeEventListener) mediaQuery.removeEventListener("change", updateMobileState);
      else mediaQuery.removeListener(updateMobileState);
    };
  }, []);

  const width = block.width || 1600;
  const height = block.height || 1066;
  const isDev = process.env.NODE_ENV !== "production";
  const hasDimensions = Number.isFinite(width) && Number.isFinite(height);
  const resolvedThumbHeight = isMobile ? 120 : thumbHeight;

  const shouldUseSharedLayout = Boolean(shareLayout && layoutId);
  const resolvedLayoutId = shouldUseSharedLayout ? layoutId : undefined;

  const computedThumbWidth =
    hasDimensions && resolvedThumbHeight ? (width / height) * resolvedThumbHeight : null;

  const thumbVariantStyles = thumbFillWidth
    ? {
        width: "100%",
        height: "100%",
        maxWidth: "100%",
        maxHeight: "100%",
        overflow: "visible",
        flexShrink: 0,
        marginInline: thumbMargin,
      }
    : {
        height: "100%",
        width: "auto",
        maxWidth: "100%",
        maxHeight: "100%",
        overflow: "visible",
        flexShrink: 0,
        marginInline: thumbMargin,
      };

  const mainWidth = maxMainWidth || "min(90vw, 1100px)";
  const mainHeight = "80vh";

  const variantStyles =
    variant === "thumb"
      ? maintainAspect
        ? {
            height: resolvedThumbHeight,
            width: computedThumbWidth || "auto",
            maxWidth: "100%",
            maxHeight: "100%",
            overflow: "hidden",
            flexShrink: 0,
            marginInline: thumbMargin,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }
        : thumbVariantStyles
      : maintainAspect
        ? {
            width: "fit-content",
            maxWidth: mainWidth,
            height: "auto",
            maxHeight: mainHeight,
            flexShrink: 0,
          }
        : {
            width: mainWidth,
            maxWidth: mainWidth,
            height: mainHeight,
            maxHeight: mainHeight,
          };

  const aspectStyle =
    variant !== "thumb" && maintainAspect && width && height
      ? {
          aspectRatio: `${width} / ${height}`,
          overflow: "hidden",
          maxWidth: `${width}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }
      : variant !== "thumb" && maintainAspect
        ? {
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }
        : {};

  const containerClass =
    variant === "thumb"
      ? "relative inline-flex items-center justify-center min-w-fit"
      : "relative flex items-center justify-center px-4 sm:px-0";

  const shouldAnimateLayout = shouldUseSharedLayout;

  if (isDev && shouldUseSharedLayout && layoutId) {
    console.log("[SharedImageFrame] layout", {
      variant,
      layoutId,
      hidden,
      shareLayout: shouldUseSharedLayout,
      blockWidth: block.width,
      blockHeight: block.height,
    });
  }

  return (
    <motion.div
      layoutId={resolvedLayoutId}
      className={containerClass}
      style={{
        ...variantStyles,
        ...aspectStyle,
        visibility: hidden ? "hidden" : "visible",
        pointerEvents: hidden ? "none" : "auto",
        zIndex: elevation !== undefined ? elevation : undefined,
      }}
      {...(shouldAnimateLayout
        ? { layout: true, transition: sharedImageTransition }
        : {})}
      {...(isDev
        ? {
            "data-debug-shared-frame": JSON.stringify({
              variant,
              layoutId: resolvedLayoutId,
              shareLayout: shouldUseSharedLayout,
              hidden,
            }),
          }
        : {})}
    >
      {children}
    </motion.div>
  );
});
SharedImageFrame.displayName = "SharedImageFrame";

export { SharedImageFrame, sharedImageTransition };
