import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import DefaultLayout from "../components/layouts/default";
import Filer from "@cloudcannon/filer";
import Blocks from "../components/shared/blocks";
import { useEffect, useState, useCallback, useRef, memo } from "react";
import ExportedImage from "next-image-export-optimizer";
import { useSwipeable } from "react-swipeable";
import sizeOf from "image-size";
import path from "path";
import { SharedImageFrame } from "../components/shared/shared-image-frame";

const filer = new Filer({ path: "content" });

function HiddenPreloadImage({ src, width = 64, height = 64 }) {
  if (!src) return null;
  return (
    <div style={{ width: 0, height: 0, overflow: "hidden" }}>
      <ExportedImage
        src={src}
        alt=""
        width={width}
        height={height}
        sizes="64px"
        loading="eager"
        priority={false}
      />
    </div>
  );
}

const getImageId = (imagePath) => {
  if (!imagePath) return "image-unknown";
  const base = imagePath.split("/").pop() || imagePath;
  return base.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
};

const GalleryStripThumbnail = memo(function GalleryStripThumbnail({
  thumbIdx,
  block,
  isCurrent,
  relativeIndex,
  onSelect,
}) {
  if (!block) return null;
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
        <ExportedImage
          src={block.image_path}
          alt={alt}
          width={width}
          height={height}
          sizes="32px"
          className="h-full w-full object-cover"
          style={{ display: "block" }}
          loading="lazy"
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
  const photos = page.data.content_blocks || [];
  const imageCount = photos.length;

  const [currentImage, setCurrentImage] = useState(0);
  const [direction, setDirection] = useState("");
  const [showThumbs, setShowThumbs] = useState(true); // start on grid
  const [hoveredArea, setHoveredArea] = useState(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [hoverHalf, setHoverHalf] = useState(null);
  const [overlayClosing, setOverlayClosing] = useState(false);
  const [overlayEntering, setOverlayEntering] = useState(false);
  const [thumbsLoaded, setThumbsLoaded] = useState(() => new Set());
  const [mainImageLoaded, setMainImageLoaded] = useState(false);
  const [stripReady, setStripReady] = useState(false);
  const thumbAnimationFrameRef = useRef(null);
  const [shouldAnimateThumbs, setShouldAnimateThumbs] = useState(false);
  const [closingFromThumb, setClosingFromThumb] = useState(false);
  const [closingThumbIndex, setClosingThumbIndex] = useState(null);

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

  const handleAreaClick = useCallback(
    (area) => {
      if (area === "right") {
        setDirection("right");
        setCurrentImage((prev) => (prev + 1) % imageCount);
      } else if (area === "left") {
        setDirection("left");
        setCurrentImage((prev) => (prev - 1 + imageCount) % imageCount);
      }
    },
    [imageCount]
  );

  const handleThumbnailSelect = useCallback(
    (index, event) => {
      if (event) event.stopPropagation();
      setCurrentImage(index);
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
    [showThumbs]
  );

  const handleGalleryStripSelect = useCallback((thumbIdx) => {
    setDirection("");
    setCurrentImage(thumbIdx);
    if (!showThumbs) {
      setShowThumbs(true);
      setOverlayClosing(false);
    }
  }, [showThumbs]);

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

  const mainImageContent = shouldRenderSliderFrame ? (
    <Blocks
      content_blocks={photos}
      currentIndex={currentImage}
      componentProps={() => ({ variant: "main", setImageLoaded: handleMainImageLoaded })}
      render={({ element, block, index }) => (
        <SharedImageFrame
          key={`slider-${index}`}
          layoutId={`image-media-${getImageId(block.image_path)}`}
          block={block}
          variant="main"
          maintainAspect
        >
          {element}
        </SharedImageFrame>
      )}
    />
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
        className="h-full w-full overflow-y-scroll p-4 md:py-16 mt-8 md:mt-0 relative"
        style={{ zIndex: 2 }}
      >
        <motion.ul
          className="flex flex-wrap gap-y-12 lg:gap-y-32 5k:gap-y-72 justify-items-center items-center w-full"
          variants={containerVariants}
          initial="hidden"
          animate={thumbGridAnimationState}
        >
          <Blocks
            content_blocks={photos}
            componentProps={thumbComponentProps}
            render={({ element, block, index }) => {
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
                  className="relative flex flex-col items-center pb-10 w-1/2 md:w-1/4 xl:w-1/6"
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
                    <div className="relative flex items-center justify-center w-full overflow-visible pointer-events-auto h-[120px] lg:h-[184px]">
                      <SharedImageFrame
                        layoutId={sharedLayoutId}
                        block={block}
                        variant="thumb"
                        hidden={hideDuringClose}
                        maintainAspect
                      >
                        {element}
                      </SharedImageFrame>
                      <span className="pointer-events-none absolute right-0 -bottom-12 mt-1 text-xs tracking-wide text-black">
                        {index + 1}
                      </span>
                    </div>
                  </motion.button>
                </motion.li>
              );
            }}
          />
        </motion.ul>
      </div>
    </motion.div>
  ) : null;

  const nextImage =
    currentImage < imageCount - 1 ? photos[currentImage + 1] : photos[0];
  const prevImage =
    currentImage > 0 ? photos[currentImage - 1] : photos[imageCount - 1];

  const showPrevButton = isTouchDevice || hoverHalf === "left";
  const showNextButton = isTouchDevice || hoverHalf === "right";

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
          {photos[currentImage]?.alt_text || "Untitled"}
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
              className="md:hidden fixed h-full fixed flex flex-col justify-center top-0 left-0 text-xs uppercase tracking-widest z-40 px-1 py-1"
              onClick={() => handleAreaClick("left")}
            >
              P
            </button>
            <button
              className="md:hidden fixed h-full fixed flex flex-col justify-center top-0  right-0 text-xs uppercase tracking-widest z-40 px-1 py-1"
              onClick={() => handleAreaClick("right")}
            >
              N
            </button>
          </>
        )}

        

        {hoveredArea === "right" && nextImage && (
          <HiddenPreloadImage
            src={nextImage?.image_path}
            width={nextImage?.width || 64}
            height={nextImage?.height || 64}
          />
        )}
        {hoveredArea === "left" && prevImage && (
          <HiddenPreloadImage
            src={prevImage?.image_path}
            width={prevImage?.width || 64}
            height={prevImage?.height || 64}
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

  const enrichedBlocks = blocks.map((block) => {
    if (!block || !block.image_path) return block;

    let width = block.width;
    let height = block.height;

    if (!width || !height) {
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
    }

    return {
      ...block,
      width,
      height,
    };
  });

  page.data.content_blocks = enrichedBlocks;

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
    },
  };
}
