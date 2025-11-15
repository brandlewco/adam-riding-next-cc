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
}) {
  const width = block.width || 1600;
  const height = block.height || 1066;

  const aspectStyle =
    variant === "thumb"
      ? {}
      : width && height
      ? { aspectRatio: `${width} / ${height}` }
      : { aspectRatio: "4 / 3" };

  const variantStyles =
    variant === "thumb"
      ? {
          height: "100%",
          width: "auto",
          maxWidth: "none",
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
      ? "relative inline-flex items-center justify-center"
      : "relative flex items-center justify-center";

  const shouldAnimateLayout = variant === "thumb" && shareLayout;
  const resolvedLayoutId = shareLayout ? layoutId : undefined;

  return (
    <motion.div
      layoutId={resolvedLayoutId}
      className={containerClass}
      style={{
        ...aspectStyle,
        ...variantStyles,
        visibility: hidden ? "hidden" : "visible",
        pointerEvents: hidden ? "none" : "auto",
        zIndex: elevation !== undefined ? elevation : undefined,
      }}
      {...(shouldAnimateLayout
        ? { layout: true, transition: sharedImageTransition }
        : {})}
    >
      {children}
    </motion.div>
  );
});
SharedImageFrame.displayName = "SharedImageFrame";

export { SharedImageFrame, sharedImageTransition };
