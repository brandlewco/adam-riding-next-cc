import { memo } from "react";
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
}) {
  const isDev = process.env.NODE_ENV !== "production";

  const shouldUseSharedLayout = Boolean(shareLayout && layoutId);
  const resolvedLayoutId = shouldUseSharedLayout ? layoutId : undefined;

  const variantStyles =
    variant === "thumb"
      ? thumbFillWidth
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
          }
      : {
          width: "min(90vw, 1100px)",
          maxHeight: "80vh",
          height: "80vh",
        };

  const containerClass =
    variant === "thumb"
      ? "relative inline-flex items-center justify-center min-w-fit"
      : "relative flex items-center justify-center";

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
