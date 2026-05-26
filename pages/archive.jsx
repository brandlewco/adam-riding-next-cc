import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import DefaultLayout from "../components/layouts/default";
import Filer from "@cloudcannon/filer";
import Blocks from "../components/shared/blocks";
import { useEffect, useState, useCallback, useRef, memo, useMemo } from "react";
import { useSwipeable } from "react-swipeable";
import sizeOf from "image-size";
import path from "path";
import { SharedImageFrame } from "../components/shared/shared-image-frame";
import {
  getOptimizedImageProps,
  MAIN_IMAGE_BASE_WIDTHS,
  MAIN_IMAGE_SIZES,
  STRIP_THUMB_BASE_WIDTHS,
} from "../lib/image-optimizer";

const filer = new Filer({ path: "content" });
const REMOTE_DIMENSION_BYTE_LIMIT = 65535;
const REMOTE_DIMENSION_TIMEOUT_MS = 8000;
const remoteDimensionsCache = new Map();

async function probeRemoteImageDimensions(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") return null;
  if (remoteDimensionsCache.has(imageUrl)) {
    return remoteDimensionsCache.get(imageUrl);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REMOTE_DIMENSION_TIMEOUT_MS);

  try {
    const response = await fetch(imageUrl, {
      headers: { Range: `bytes=0-${REMOTE_DIMENSION_BYTE_LIMIT}` },
      signal: controller.signal,
    });

    if (!response.ok) {
      remoteDimensionsCache.set(imageUrl, null);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const dimensions = sizeOf(buffer);
    const width = Number(dimensions?.width);
    const height = Number(dimensions?.height);

    if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
      const resolved = { width, height };
      remoteDimensionsCache.set(imageUrl, resolved);
      return resolved;
    }

    remoteDimensionsCache.set(imageUrl, null);
    return null;
  } catch {
    remoteDimensionsCache.set(imageUrl, null);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function HiddenPreloadImage({ src, width = 64, height = 64 }) {
  if (!src) return null;
  const optimized = getOptimizedImageProps(src, {
    srcWidth: 1100,
    sizes: MAIN_IMAGE_SIZES,
    baseWidths: MAIN_IMAGE_BASE_WIDTHS,
    maxWidth: 1920,
  });

  return (
    <div
      style={{
        position: "fixed",
        width: 1,
        height: 1,
        overflow: "hidden",
        opacity: 0,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <img
        src={optimized.src || src}
        srcSet={optimized.srcSet || undefined}
        sizes={optimized.sizes}
        alt=""
        width={width}
        height={height}
        loading="eager"
        decoding="async"
      />
    </div>
  );
}

const getImageId = (imagePath) => {
  if (!imagePath) return "image-unknown";
  const base = imagePath.split("/").pop() || imagePath;
  return base.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
};

const separatorBlockNames = new Set(["collection/seperator", "collection/separator"]);

const isSeparatorBlock = (block) => {
  if (!block || typeof block !== "object") return false;
  return separatorBlockNames.has(block._bookshop_name);
};

function buildSliderData(blocks = []) {
  const sliderEntries = [];
  const blockIndexToSlide = {};

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];

    if (isSeparatorBlock(block)) {
      let end = i + 1;
      while (end < blocks.length && !isSeparatorBlock(blocks[end])) {
        end += 1;
      }

      if (end < blocks.length && isSeparatorBlock(blocks[end])) {
        const betweenIndices = [];
        for (let idx = i + 1; idx < end; idx += 1) {
          if (!isSeparatorBlock(blocks[idx])) betweenIndices.push(idx);
        }

        const candidateBlocks = betweenIndices
          .map((idx) => blocks[idx])
          .filter(Boolean);
        const hasTwoImages =
          candidateBlocks.length === 2 &&
          candidateBlocks.every((candidate) => Boolean(candidate.image_path));

        if (hasTwoImages) {
          const slideIndex = sliderEntries.length;
          sliderEntries.push({
            type: "diptych",
            contentIndices: betweenIndices,
            blocks: candidateBlocks,
            id: `diptych-${betweenIndices.join("-")}`,
          });
          betweenIndices.forEach((idx) => {
            blockIndexToSlide[idx] = slideIndex;
          });
          i = end;
          continue;
        }
      }

      continue;
    }

    const slideIndex = sliderEntries.length;
    sliderEntries.push({
      type: "single",
      contentIndices: [i],
      blocks: [block],
      id: `single-${i}`,
    });
    blockIndexToSlide[i] = slideIndex;
  }

  return { sliderEntries, blockIndexToSlide };
}

const GalleryStripThumbnail = memo(function GalleryStripThumbnail({
  thumbIdx,
  block,
  isCurrent,
  relativeIndex,
  onSelect,
}) {
  if (!block) return null;
  const imagePath = typeof block.image_path === "string" ? block.image_path : "";
  if (!imagePath) return null;

  const optimizedThumb = getOptimizedImageProps(imagePath, {
    srcWidth: 64,
    sizes: "32px",
    baseWidths: STRIP_THUMB_BASE_WIDTHS,
  });

  const alt = block.alt_text || "Archive thumbnail";
  const width = block.width || 400;
  const height = block.height || 300;

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(thumbIdx)}
      className="w-full border border-transparent transition h-auto w-auto md:h-8 md:w-8"
      aria-label={`Show image ${thumbIdx + 1}`}
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: isCurrent ? 1 : 0.5, y: 0 }}
      transition={{
        delay: 0.15 + Math.max(relativeIndex, 0) * 0.03,
        duration: 0.35,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <div className="mx-auto h-8 w-8">
        <img
          src={optimizedThumb.src || imagePath}
          srcSet={optimizedThumb.srcSet || undefined}
          sizes={optimizedThumb.sizes}
          alt={alt}
          width={width}
          height={height}
          className="h-full w-full object-cover"
          style={{ display: "block" }}
          loading="lazy"
          decoding="async"
        />
      </div>
    </motion.button>
  );
});
GalleryStripThumbnail.displayName = "GalleryStripThumbnail";

const thumbVariants = {
  hidden: {
    opacity: 0,
    y: 0,
    filter: "blur(8px)",
  },
  show: (order = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.4,
      ease: [0.25, 0.8, 0.25, 1],
      delay: order * 0.03,
    },
  }),
  exit: { opacity: 0 },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
  exit: { opacity: 0 },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const internalVariants = {
  enter: (dir) => ({
    opacity: 1,
    x: dir === "left" ? "100%" : dir === "right" ? "-100%" : 0,
    transition: { duration: 0.55, ease: [0.5, 1, 0.89, 1] },
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: {
      type: "tween",
      duration: 0.8,
      ease: [0.5, 1, 0.89, 1],
    },
  },
  exit: (dir) => ({
    opacity: 1,
    x: dir === "left" ? "-100%" : dir === "right" ? "100%" : 0,
    transition: { duration: 0.55, ease: [0.5, 1, 0.89, 1] },
  }),
};

function ArchiveGalleryPage({ page }) {
  const contentBlocks = useMemo(() => {
    const blocks = page?.data?.content_blocks;
    return Array.isArray(blocks) ? blocks : [];
  }, [page?.data?.content_blocks]);
  const { sliderEntries, blockIndexToSlide } = useMemo(
    () => buildSliderData(contentBlocks),
    [contentBlocks]
  );
  const imageCount = sliderEntries.length;

  const blockDisplayOrder = useMemo(() => {
    const orderMap = new Map();
    let visibleIndex = 0;

    contentBlocks.forEach((block, idx) => {
      if (block?.image_path) {
        orderMap.set(idx, visibleIndex);
        visibleIndex += 1;
      }
    });

    return orderMap;
  }, [contentBlocks]);

  const [currentImage, setCurrentImage] = useState(0);
  const [direction, setDirection] = useState("");
  const [showThumbs, setShowThumbs] = useState(true); // start on grid
  const [hoveredArea, setHoveredArea] = useState(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [hoverHalf, setHoverHalf] = useState(null);
  const [overlayClosing, setOverlayClosing] = useState(false);
  const [overlayEntering, setOverlayEntering] = useState(false);
  const [thumbsLoaded, setThumbsLoaded] = useState(() => new Set());
  const [mainImageLoaded, setMainImageLoaded] = useState(true);
  const previousImageRef = useRef(0);
  const [stripReady, setStripReady] = useState(false);
  const thumbAnimationFrameRef = useRef(null);
  const [shouldAnimateThumbs, setShouldAnimateThumbs] = useState(false);
  const [closingFromThumb, setClosingFromThumb] = useState(false);
  const [closingThumbIndex, setClosingThumbIndex] = useState(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const updateViewportSize = () => {
      setViewportSize({
        width: window.innerWidth || 0,
        height: window.innerHeight || 0,
      });
    };

    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);
    window.addEventListener("orientationchange", updateViewportSize);

    return () => {
      window.removeEventListener("resize", updateViewportSize);
      window.removeEventListener("orientationchange", updateViewportSize);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const frame = window.requestAnimationFrame(() => setStripReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (showThumbs) {
      setOverlayClosing(false);
      setOverlayEntering(true);
    }
  }, [showThumbs]);

  useEffect(() => {
    if (!showThumbs && !overlayClosing) {
      setOverlayEntering(false);
    }
  }, [overlayClosing, showThumbs]);

  useEffect(() => {
    if (!showThumbs) return undefined;
    setShouldAnimateThumbs(false);

    if (typeof window === "undefined") {
      setShouldAnimateThumbs(true);
      return undefined;
    }

    thumbAnimationFrameRef.current = window.requestAnimationFrame(() => {
      setShouldAnimateThumbs(true);
      thumbAnimationFrameRef.current = null;
    });

    return () => {
      if (thumbAnimationFrameRef.current) {
        window.cancelAnimationFrame(thumbAnimationFrameRef.current);
        thumbAnimationFrameRef.current = null;
      }
    };
  }, [showThumbs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(hover: none) and (pointer: coarse)");
    const updateTouchState = () => setIsTouchDevice(media.matches);
    updateTouchState();
    if (media.addEventListener)
      media.addEventListener("change", updateTouchState);
    else media.addListener(updateTouchState);

    const handlePointerDown = (event) => {
      if (event.pointerType === "mouse") setIsTouchDevice(false);
      if (event.pointerType === "touch" || event.pointerType === "pen") {
        setIsTouchDevice(true);
        setHoverHalf(null);
        setHoveredArea(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      if (media.removeEventListener)
        media.removeEventListener("change", updateTouchState);
      else media.removeListener(updateTouchState);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const closeThumbOverlay = useCallback(() => {
    if (!showThumbs) return;
    setClosingFromThumb(false);
    setClosingThumbIndex(null);
    setOverlayClosing(true);
    setShowThumbs(false);
  }, [showThumbs]);

  const registerThumbLoaded = useCallback((index) => {
    if (typeof index !== "number") return;
    setThumbsLoaded((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const thumbComponentProps = useCallback(
    ({ index }) => ({
      variant: "thumb",
      waitUntilInView: true,
      inViewMargin: "500px",
      imageIdentifier: index,
      setImageLoaded: registerThumbLoaded,
    }),
    [registerThumbLoaded]
  );

  const handleMainImageLoaded = useCallback(() => {
    setMainImageLoaded(true);
  }, []);

  useEffect(() => {
    if (previousImageRef.current !== currentImage) {
      setMainImageLoaded(false);
      previousImageRef.current = currentImage;
    }
  }, [currentImage]);

  const renderSlideFrames = useCallback(
    (slide, diptychMainHeight) => {
      if (!slide) return null;
      const isDiptychSlide = slide.type === "diptych";
      return slide.contentIndices.map((blockIndex) => (
        <Blocks
          key={`slide-block-${blockIndex}`}
          content_blocks={contentBlocks}
          currentIndex={blockIndex}
          componentProps={() => ({
            variant: "main",
            setImageLoaded: handleMainImageLoaded,
          })}
          render={({ element, block, index }) => {
            if (!block?.image_path) return null;
            if (isDiptychSlide) {
              return (
                <div key={`slider-${index}`} className="block min-w-0 h-full">
                  <SharedImageFrame
                    layoutId={`image-media-${getImageId(block.image_path)}`}
                    block={block}
                    variant="main"
                    maintainAspect
                    maxMainWidth="100%"
                    maxMainHeight={diptychMainHeight}
                    isDiptych
                  >
                    {element}
                  </SharedImageFrame>
                </div>
              );
            }

            return (
              <SharedImageFrame
                key={`slider-${index}`}
                layoutId={`image-media-${getImageId(block.image_path)}`}
                block={block}
                variant="main"
                maintainAspect
              >
                {element}
              </SharedImageFrame>
            );
          }}
        />
      ));
    },
    [contentBlocks, handleMainImageLoaded]
  );

  const handleAreaClick = useCallback(
    (area) => {
      if (area === "right") {
        setDirection("left");
        setCurrentImage((prev) => (prev + 1) % imageCount);
      } else if (area === "left") {
        setDirection("right");
        setCurrentImage((prev) => (prev - 1 + imageCount) % imageCount);
      }
    },
    [imageCount]
  );

  const handleThumbnailSelect = useCallback(
    (index, event) => {
      if (event) event.stopPropagation();
      const targetSlide = blockIndexToSlide?.[index];
      if (typeof targetSlide !== "number") return;
      setCurrentImage(targetSlide);
      setDirection("");
      if (showThumbs) {
        if (typeof window !== "undefined") {
          window.requestAnimationFrame(() => {
            setClosingFromThumb(true);
            setClosingThumbIndex(index);
            setOverlayClosing(true);
            setShowThumbs(false);
          });
        } else {
          setClosingFromThumb(true);
          setClosingThumbIndex(index);
          setOverlayClosing(true);
          setShowThumbs(false);
        }
      }
    },
    [blockIndexToSlide, showThumbs]
  );

  const handleGalleryStripSelect = useCallback((slideIndex) => {
    if (typeof slideIndex !== "number") return;
    if (slideIndex < 0 || slideIndex >= imageCount) return;
    setDirection("");
    setCurrentImage(slideIndex);
    if (!showThumbs) {
      setShowThumbs(true);
      setOverlayClosing(false);
    }
  }, [imageCount, showThumbs]);

  const handleThumbsOverlayAnimationComplete = useCallback(
    (definition) => {
      if (definition === "show") {
        setOverlayEntering(false);
      }
      if (definition === "exit") {
        setOverlayClosing(false);
        setClosingFromThumb(false);
        setClosingThumbIndex(null);
        setShouldAnimateThumbs(false);
      }
    },
    []
  );

  const handleHoverZoneEnter = useCallback(
    (area) => {
      if (!isTouchDevice) {
        setHoverHalf(area);
        setHoveredArea(area);
      }
    },
    [isTouchDevice]
  );

  const handleHoverZoneLeave = useCallback(() => {
    if (!isTouchDevice) {
      setHoverHalf(null);
      setHoveredArea(null);
    }
  }, [isTouchDevice]);

  const reopenThumbGrid = useCallback(() => {
    if (showThumbs) return;
    setShowThumbs(true);
    setOverlayClosing(false);
  }, [showThumbs]);

  const handleKeyDown = useCallback(
    (evt) => {
      if (evt.key === "ArrowRight") handleAreaClick("right");
      else if (evt.key === "ArrowLeft") handleAreaClick("left");
      else if (evt.key === "Escape" && !showThumbs) {
        reopenThumbGrid();
      }
    },
    [handleAreaClick, reopenThumbGrid, showThumbs]
  );
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleAreaClick("right"),
    onSwipedRight: () => handleAreaClick("left"),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  const shouldRenderThumbOverlay = showThumbs || overlayClosing;
  const sliderActiveDuringThumbClose = overlayClosing;
  const shouldRenderSliderFrame = !showThumbs || sliderActiveDuringThumbClose;
  const isOverlayActive = shouldRenderThumbOverlay || overlayEntering;

  const thumbGridAnimationState = overlayClosing
    ? "exit"
    : showThumbs && shouldAnimateThumbs
      ? "show"
      : "hidden";

  const currentSlide = sliderEntries[currentImage] || null;
  const currentAltLabel =
    (currentSlide?.blocks
      ?.map((block) => block?.alt_text)
      .filter(Boolean)
      .join(" / ")) || page.data.title || "Untitled";
  const isCurrentSlideDiptych = currentSlide?.type === "diptych";
  const diptychMobileMainHeight = useMemo(() => {
    if (!isCurrentSlideDiptych || !currentSlide) return undefined;
    if (!viewportSize.width || viewportSize.width >= 1024) return undefined;

    const diptychBlocks = (currentSlide.blocks || []).slice(0, 2);
    if (diptychBlocks.length !== 2) return undefined;

    const ratios = diptychBlocks
      .map((block) => {
        const width = Number(block?.width);
        const height = Number(block?.height);
        if (!Number.isFinite(width) || width <= 0) return null;
        if (!Number.isFinite(height) || height <= 0) return null;
        return width / height;
      })
      .filter(Boolean);

    if (ratios.length !== 2) return undefined;

    const horizontalPadding = 32;
    const gap = viewportSize.width >= 768 ? 40 : 16;
    const availableWidth = Math.max(0, viewportSize.width - horizontalPadding);
    const rawHeight = (availableWidth - gap) / (ratios[0] + ratios[1]);

    if (!Number.isFinite(rawHeight) || rawHeight <= 0) return undefined;

    const maxByViewport = viewportSize.height > 0 ? viewportSize.height * 0.8 : rawHeight;
    const clampedHeight = Math.max(120, Math.min(rawHeight, maxByViewport));

    return `${Math.round(clampedHeight)}px`;
  }, [currentSlide, isCurrentSlideDiptych, viewportSize.height, viewportSize.width]);
  const slideLayoutClass = isCurrentSlideDiptych
    ? "flex gap-4 flex-row md:gap-10 items-stretch md:items-start justify-center w-full max-w-[100vw] lg:max-w-[80vw] px-4"
    : "flex items-center justify-center w-full h-full";
  const slideLayoutStyle = isCurrentSlideDiptych
    ? { width: "100%", marginInline: "auto" }
    : undefined;

  const mainImageContent =
    shouldRenderSliderFrame && currentSlide ? (
      <div className={slideLayoutClass} style={slideLayoutStyle}>
        {renderSlideFrames(currentSlide, diptychMobileMainHeight)}
      </div>
    ) : null;

  const sliderWrapperProps = isOverlayActive ? {} : swipeHandlers;

  const MainImageSection = (
    <motion.div
      className="relative z-10 flex justify-center items-center h-full w-full p-5 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: mainImageLoaded ? 1 : 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      {...sliderWrapperProps}
    >
      {isOverlayActive ? (
        mainImageContent
      ) : (
        <AnimatePresence custom={direction} initial={false} mode="sync">
          <motion.div
            key={currentImage}
            className="absolute inset-0 flex justify-center items-center"
            variants={internalVariants}
            initial="enter"
            animate="center"
            exit="exit"
            custom={direction}
            style={{ width: "100%", height: "100%" }}
          >
            {mainImageContent}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );

  const ThumbsOverlay = shouldRenderThumbOverlay ? (
    <motion.div
      key="thumbs-overlay"
      className="fixed inset-0 z-40 bg-white flex flex-col items-center justify-center"
      style={{
        pointerEvents: "auto",
        willChange: "opacity, transform",
        WebkitBackfaceVisibility: "hidden",
        backfaceVisibility: "hidden",
      }}
      variants={containerVariants}
      initial="hidden"
      animate={showThumbs ? "show" : "exit"}
      onAnimationComplete={handleThumbsOverlayAnimationComplete}
    >
      <div
        className="absolute inset-0"
        style={{ zIndex: 0 }}
        aria-hidden="true"
        onClick={closeThumbOverlay}
      />
      <div
        className="h-full w-full overflow-y-scroll overflow-x-hidden p-4 md:py-16 mt-8 md:mt-0 relative"
        style={{ zIndex: 2 }}
      >
        <motion.ul
          className="flex flex-wrap gap-y-12 lg:gap-y-32 5k:gap-y-64 justify-items-center items-center w-full"
          variants={containerVariants}
          initial="hidden"
          animate={thumbGridAnimationState}
        >
          <Blocks
            content_blocks={contentBlocks}
            componentProps={thumbComponentProps}
            render={({ element, block, index }) => {
              if (!block?.image_path) return null;
              const thumbId = getImageId(block.image_path);
              const isActiveThumb = index === currentImage;
              const isClosingThumb = closingThumbIndex === index;
              const sharedLayoutId = `image-media-${thumbId}`;
              const thumbIsLoaded = thumbsLoaded.has(index);
              const hideDuringClose =
                overlayClosing && closingFromThumb && !isClosingThumb;
              const thumbReady = shouldAnimateThumbs && thumbIsLoaded;
              const thumbAnimationVariant = overlayClosing
                ? "exit"
                : thumbReady
                  ? "show"
                  : "hidden";

              return (
                <motion.li
                  key={`${thumbId}-${index}`}
                  variants={thumbVariants}
                  className="relative flex flex-col items-center  w-1/2 sm:w-1/4 xl:w-1/6"
                  initial="hidden"
                  animate={thumbAnimationVariant}
                  custom={index}
                  style={hideDuringClose ? { opacity: 0 } : undefined}
                >
                  <motion.button
                    type="button"
                    onClick={(e) => handleThumbnailSelect(index, e)}
                    className="flex h-full flex-col items-center focus:outline-none"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="relative flex items-center justify-center overflow-visible pointer-events-auto h-[120px] lg:h-[184px]">
                      <SharedImageFrame
                        layoutId={sharedLayoutId}
                        block={block}
                        variant="thumb"
                        hidden={hideDuringClose}
                        thumbHeightMobile={120}
                        maintainAspect
                      >
                        {element}
                      </SharedImageFrame>
                    </div>
                    <span
                      className="pointer-events-none mt-8 text-xs tracking-wide text-black w-full text-right"
                      style={{
                        paddingRight: "var(--thumb-image-right-inset, 0px)",
                      }}
                    >
                      {(blockDisplayOrder.get(index) ?? index) + 1}
                    </span>
                  </motion.button>
                </motion.li>
              );
            }}
          />
        </motion.ul>
      </div>
    </motion.div>
  ) : null;

  const sanitizeBlocks = (blocks) =>
    Array.isArray(blocks)
      ? blocks.filter((block) => block && block.image_path)
      : [];
  const nextSlideBlocks =
    currentImage < imageCount - 1
      ? sanitizeBlocks(sliderEntries[currentImage + 1]?.blocks)
      : sanitizeBlocks(sliderEntries[0]?.blocks);
  const prevSlideBlocks =
    currentImage > 0
      ? sanitizeBlocks(sliderEntries[currentImage - 1]?.blocks)
      : sanitizeBlocks(sliderEntries[imageCount - 1]?.blocks);
  const nextSlidePrimary = nextSlideBlocks[0] || null;
  const prevSlidePrimary = prevSlideBlocks[0] || null;

  const showPrevButton = isTouchDevice || hoverHalf === "left";
  const showNextButton = isTouchDevice || hoverHalf === "right";
  const shouldPreloadAdjacentSlides = !showThumbs;

  const galleryStripSize = 16;
  const visibleStripCount = Math.min(imageCount, galleryStripSize);
  const galleryThumbnailIndices = Array.from(
    { length: visibleStripCount },
    (_, idx) => (idx + currentImage) % imageCount
  );

  return (
    <DefaultLayout page={page}>
      <LayoutGroup id="archive-gallery" crossfade={false}>
        <div className="fixed top-4 left-4 text-xs tracking-widest z-40 pointer-events-none">
          {currentAltLabel}
        </div>

        {MainImageSection}
        {ThumbsOverlay}

        {!showThumbs && (
          <button
            type="button"
            className="fixed top-4 right-4 text-xs uppercase tracking-widest text-black z-50"
            onClick={reopenThumbGrid}
          >
            CLOSE
          </button>
        )}

        <div
          className="hidden md:flex fixed inset-y-0 left-0 w-1/2 z-30 items-center justify-start pointer-events-auto"
          onMouseEnter={() => handleHoverZoneEnter("left")}
          onMouseMove={() => handleHoverZoneEnter("left")}
          onMouseLeave={handleHoverZoneLeave}
          onClick={() => handleAreaClick("left")}
        >
          <button
            className={`-translate-y-1/2 text-xs uppercase tracking-widest transition-opacity duration-200 p-4 ${
              showPrevButton
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleAreaClick("left");
            }}
          >
            Prev
          </button>
        </div>

        <div
          className="hidden md:flex fixed inset-y-0 right-0 w-1/2 z-30 items-center justify-end pointer-events-auto"
          onMouseEnter={() => handleHoverZoneEnter("right")}
          onMouseMove={() => handleHoverZoneEnter("right")}
          onMouseLeave={handleHoverZoneLeave}
          onClick={() => handleAreaClick("right")}
        >
          <button
            className={`-translate-y-1/2 text-xs uppercase tracking-widest transition-opacity duration-200 p-4 ${
              showNextButton
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleAreaClick("right");
            }}
          >
            Next
          </button>
        </div>

        {!showThumbs && (
          <>
            <button
              type="button"
              aria-label="Previous"
              className="md:hidden fixed top-0 left-0 h-full w-10 z-40"
              onClick={() => handleAreaClick("left")}
            >
              <span className="sr-only">Previous</span>
            </button>
            <button
              type="button"
              aria-label="Next"
              className="md:hidden fixed top-0 right-0 h-full w-10 z-40"
              onClick={() => handleAreaClick("right")}
            >
              <span className="sr-only">Next</span>
            </button>
          </>
        )}

        {shouldPreloadAdjacentSlides && nextSlidePrimary && (
          <HiddenPreloadImage
            src={nextSlidePrimary?.image_path}
            width={nextSlidePrimary?.width || 64}
            height={nextSlidePrimary?.height || 64}
          />
        )}
        {shouldPreloadAdjacentSlides && prevSlidePrimary && (
          <HiddenPreloadImage
            src={prevSlidePrimary?.image_path}
            width={prevSlidePrimary?.width || 64}
            height={prevSlidePrimary?.height || 64}
          />
        )}
      </LayoutGroup>
    </DefaultLayout>
  );
}

export default ArchiveGalleryPage;

export async function getStaticProps() {
  const page = await filer.getItem("archive.md", { folder: "pages" });
  const blocks = Array.isArray(page.data.content_blocks)
    ? page.data.content_blocks
    : [];

  const enrichedBlocks = await Promise.all(blocks.map(async (block) => {
    if (!block || !block.image_path) return block;

    let width = block.width;
    let height = block.height;
    const numericWidth = Number(width);
    const numericHeight = Number(height);
    const hasNumericDimensions =
      Number.isFinite(numericWidth) &&
      Number.isFinite(numericHeight) &&
      numericWidth > 0 &&
      numericHeight > 0;
    const isFallbackDefaultDimensions =
      numericWidth === 1600 && numericHeight === 1066;
    const isRemoteImage =
      typeof block.image_path === "string" &&
      (block.image_path.startsWith("http://") ||
        block.image_path.startsWith("https://"));

    if (isRemoteImage && (!hasNumericDimensions || isFallbackDefaultDimensions)) {
      const remoteDimensions = await probeRemoteImageDimensions(block.image_path);
      if (remoteDimensions) {
        width = remoteDimensions.width;
        height = remoteDimensions.height;
      }
    }

    if ((!width || !height) && !isRemoteImage) {
      try {
        const normalizedPath = block.image_path.replace(/^\/+/, "");
        const imagePath = path.join(process.cwd(), "public", normalizedPath);
        const dimensions = sizeOf(imagePath);
        width = dimensions.width;
        height = dimensions.height;
      } catch {
        width = 1600;
        height = 1066;
      }
    } else if (!width || !height) {
      width = 1600;
      height = 1066;
    }

    return {
      ...block,
      width,
      height,
    };
  }));

  page.data.content_blocks = enrichedBlocks;

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
    },
  };
}
