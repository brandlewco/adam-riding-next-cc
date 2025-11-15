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
  thumbAspect = true,
}) {
  const width = block.width || 1600;
  const height = block.height || 1066;

  const shouldApplyAspect = variant === "thumb" ? thumbAspect : true;

  const aspectStyle = shouldApplyAspect
    ? width && height
      ? { aspectRatio: `${width} / ${height}` }
      : { aspectRatio: "4 / 3" }
    : {};

  const variantStyles =
    variant === "thumb"
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
          width: "min(90vw, 1100px)",
          maxHeight: "80vh",
          height: "80vh",
        };

  const containerClass =
    variant === "thumb"
      ? "relative inline-flex items-center justify-center"
      : "relative flex items-center justify-center";

  const shouldAnimateLayout = shareLayout;
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
