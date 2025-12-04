import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import DefaultLayout from "../../components/layouts/default";
import Filer from "@cloudcannon/filer";
import Blocks from "../../components/shared/blocks";
import { useEffect, useState, useCallback, useRef, memo, useMemo } from "react";
import { useRouter } from "next/router";
import ExportedImage from "next-image-export-optimizer";
import { useSwipeable } from "react-swipeable";
import sizeOf from "image-size";
import path from "path";
import { SharedImageFrame } from "../../components/shared/shared-image-frame";

const filer = new Filer({ path: "content" });

/**
 * HiddenPreloadImage => preloads the next/prev image or next/prev collection's first image
 */
function HiddenPreloadImage({ src, width = 64, height = 64 }) {
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

const gallerySources = new Set(["home", "index", "index-list"]);
const separatorBlockNames = new Set(["collection/seperator", "collection/separator"]);
const OPTIMIZED_SIZES = [64, 184, 256, 512, 640, 768, 1024, 1280, 2048];

const resolveOptimizedSrc = (imagePath, requestedSize = 64) => {
  if (!imagePath || typeof imagePath !== "string") return null;
  if (imagePath.startsWith("http")) return null;

  const normalizedSrc = imagePath.replace(/^\/+/, "");
  if (normalizedSrc.startsWith("uploads/opt/")) {
    return `/${normalizedSrc}`;
  }
  if (!normalizedSrc.startsWith("uploads/")) return null;
  const segments = normalizedSrc.split("/");
  const filename = segments.pop();
  if (!filename) return null;
  const baseName = filename.replace(/\.[^/.]+$/, "");

  const targetSize = OPTIMIZED_SIZES.find((size) => size >= requestedSize) || OPTIMIZED_SIZES[OPTIMIZED_SIZES.length - 1];
  return `/uploads/opt/${baseName}-opt-${targetSize}.WEBP`;
};

const getImageId = (imagePath) => {
  if (!imagePath) return "image-unknown";
  const base = imagePath.split("/").pop() || imagePath;
  return base.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
};

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
  block,
  blockIndex,
  isCurrent,
  relativeIndex,
  onSelect,
  ariaLabel,
  onLoad,
}) {
  const dimOpacity = 0.45;
  const targetThumbSize = 32;
  const optimizedThumbSrc = useMemo(() => {
    if (!block?.image_path) return null;
    return resolveOptimizedSrc(block.image_path, targetThumbSize);
  }, [block?.image_path]);
  const handleThumbReady = useCallback(() => {
    if (typeof onLoad === "function") {
      onLoad(blockIndex);
    }
  }, [blockIndex, onLoad]);

  if (!block) return null;

  const alt = block.alt_text || "Collection thumbnail";
  const resolvedLabel = ariaLabel || `Show image ${alt}`;
  const baseThumbSrc = optimizedThumbSrc || block.image_path;
  const thumbIsOptimized = Boolean(optimizedThumbSrc);

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className="w-full border border-transparent transition h-auto md:h-8 md:w-8"
      aria-label={resolvedLabel}
    >
      <div className="relative mx-auto h-6 w-6 sm:h-8 sm:w-8">
        <ExportedImage
          src={baseThumbSrc}
          alt={alt}
          width={targetThumbSize}
          height={targetThumbSize}
          sizes="32px"
          className="h-full w-full object-cover"
          style={{ display: "block", transform: "translateZ(0)" }}
          loading="eager"
          unoptimized={thumbIsOptimized}
          onLoad={handleThumbReady}
          onLoading={handleThumbReady}
        />
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 bg-white pointer-events-none"
          initial={false}
          animate={{ opacity: isCurrent ? 0 : dimOpacity }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          style={{ willChange: "opacity", }}
        />
      </div>
    </motion.button>
  );
});
GalleryStripThumbnail.displayName = "GalleryStripThumbnail";

const stripChunkVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

function CollectionPage({
  page,
  source,
  slugArray,
  currentSlug,

  // Additional props from getStaticProps:
  nextSlug,
  prevSlug,
  nextFirstImage,
  prevFirstImage,
}) {
  const router = useRouter();
  const contentBlocks = useMemo(() => {
    const blocks = page?.data?.content_blocks;
    return Array.isArray(blocks) ? blocks : [];
  }, [page?.data?.content_blocks]);
  const { sliderEntries, blockIndexToSlide } = useMemo(
    () => buildSliderData(contentBlocks),
    [contentBlocks]
  );
  const imageCount = sliderEntries.length;
  const { stripItems, slideToStripIndices } = useMemo(() => {
    const items = [];
    const slideStripIndexMap = new Map();

    contentBlocks.forEach((block, blockIndex) => {
      if (!block || !block.image_path) return;
      const slideIndex = blockIndexToSlide?.[blockIndex];
      if (typeof slideIndex !== "number") return;
      const stripIndex = items.length;
      const entry = {
        id: `strip-${blockIndex}`,
        block,
        blockIndex,
        slideIndex,
      };
      items.push(entry);
      if (!slideStripIndexMap.has(slideIndex)) {
        slideStripIndexMap.set(slideIndex, []);
      }
      slideStripIndexMap.get(slideIndex).push(stripIndex);
    });

    return {
      stripItems: items,
      slideToStripIndices: slideStripIndexMap,
    };
  }, [contentBlocks, blockIndexToSlide]);
  const stripLength = stripItems.length;

  // state for current image index
  const [currentImage, setCurrentImage] = useState(0);
  // direction for left/right
  const [direction, setDirection] = useState("");
  // toggles overlay if source==='index'
  const [showThumbs, setShowThumbs] = useState(false);
  const [hoveredArea, setHoveredArea] = useState(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [hoverHalf, setHoverHalf] = useState(null);
  const [overlayClosing, setOverlayClosing] = useState(false);
  const [overlayEntering, setOverlayEntering] = useState(false);
  const [thumbsLoaded, setThumbsLoaded] = useState(() => new Set());
  const [mainImageLoaded, setMainImageLoaded] = useState(false);
  const [resolvedStripSize, setResolvedStripSize] = useState(null);
  const thumbAnimationFrameRef = useRef(null);
  const [shouldAnimateThumbs, setShouldAnimateThumbs] = useState(false);
  const [closingFromThumb, setClosingFromThumb] = useState(false);
  const [closingThumbIndex, setClosingThumbIndex] = useState(null);
  const [galleryChunkStart, setGalleryChunkStart] = useState(0);
  const galleryStripSize = resolvedStripSize ?? 16;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(max-width: 767px)");
    const resolveSize = () => setResolvedStripSize(media.matches ? 10 : 16);
    resolveSize();
    if (media.addEventListener) media.addEventListener("change", resolveSize);
    else media.addListener(resolveSize);
    return () => {
      if (media.removeEventListener) media.removeEventListener("change", resolveSize);
      else media.removeListener(resolveSize);
    };
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

  const closeThumbOverlay = useCallback(() => {
    if (!showThumbs) return;
    setClosingFromThumb(false);
    setClosingThumbIndex(null);
    setOverlayClosing(true);
    setShowThumbs(false);
  }, [showThumbs]);

  const isGalleryView = gallerySources.has(source);
  const visibleStripCount = Math.min(stripLength, galleryStripSize);
  const normalizedChunkStart = stripLength
    ? ((galleryChunkStart % stripLength) + stripLength) % stripLength
    : 0;
  const galleryThumbnailIndices = useMemo(() => {
    if (!isGalleryView || stripLength <= 0) return [];
    return Array.from({ length: visibleStripCount }, (_, idx) =>
      (normalizedChunkStart + idx) % stripLength
    );
  }, [isGalleryView, stripLength, visibleStripCount, normalizedChunkStart]);
  const galleryStripEntries = useMemo(
    () => galleryThumbnailIndices.map((stripIndex) => stripItems[stripIndex]),
    [galleryThumbnailIndices, stripItems]
  );
  const chunkKey = `${normalizedChunkStart}-${visibleStripCount}`;
  const [stripChunkState, setStripChunkState] = useState(() => ({
    key: chunkKey,
    total: galleryStripEntries.length,
    loaded: new Set(),
    ready: true,
  }));
  const [activeChunkKey, setActiveChunkKey] = useState(chunkKey);
  const [activeStripEntries, setActiveStripEntries] = useState(
    galleryStripEntries
  );

  useEffect(() => {
    setStripChunkState({
      key: chunkKey,
      total: galleryStripEntries.length,
      loaded: new Set(),
      ready: galleryStripEntries.length === 0,
    });
  }, [chunkKey, galleryStripEntries.length]);

  useEffect(() => {
    if (stripChunkState.ready && stripChunkState.key === chunkKey) {
      setActiveChunkKey(chunkKey);
      setActiveStripEntries(galleryStripEntries);
    }
  }, [stripChunkState, chunkKey, galleryStripEntries]);

  const pendingStripEntries = chunkKey !== activeChunkKey
    ? galleryStripEntries
    : null;
  const isTransitioningChunks = Boolean(pendingStripEntries);
  const stripLayoutClass =
    "grid md:flex md:flex-nowrap gap-1 md:gap-2 justify-center";
  const hasResolvedStripSize = resolvedStripSize !== null;
  const shouldRenderStrip =
    isGalleryView &&
    imageCount > 1 &&
    hasResolvedStripSize &&
    activeStripEntries.length > 0;

  const registerStripThumbLoaded = useCallback(
    (blockIndex) => {
      if (typeof blockIndex !== "number") return;
      setStripChunkState((prev) => {
        if (prev.key !== chunkKey) return prev;
        if (prev.loaded.has(blockIndex)) return prev;
        const nextLoaded = new Set(prev.loaded);
        nextLoaded.add(blockIndex);
        const ready = prev.total > 0 ? nextLoaded.size >= prev.total : true;
        return { ...prev, loaded: nextLoaded, ready };
      });
    },
    [chunkKey]
  );

  const isIndexWithinStrip = useCallback(
    (index, start) => {
      if (stripLength === 0) return false;
      if (stripLength <= galleryStripSize) return true;
      const end = (start + galleryStripSize) % stripLength;
      if (start + galleryStripSize <= stripLength) {
        return index >= start && index < start + galleryStripSize;
      }
      return index >= start || index < end;
    },
    [stripLength, galleryStripSize]
  );

  useEffect(() => {
    if (!isGalleryView || stripLength === 0) return;

    if (stripLength <= galleryStripSize) {
      if (galleryChunkStart !== 0) {
        setGalleryChunkStart(0);
      }
      return;
    }

    const start = normalizedChunkStart;
    const targetIndices = slideToStripIndices.get(currentImage) || [];
    if (targetIndices.length === 0) return;

    const allVisible = targetIndices.every((idx) =>
      isIndexWithinStrip(idx, start)
    );
    if (allVisible) return;

    const minIdx = Math.min(...targetIndices);
    setGalleryChunkStart(minIdx);
  }, [
    currentImage,
    galleryChunkStart,
    galleryStripSize,
    isGalleryView,
    isIndexWithinStrip,
    normalizedChunkStart,
    slideToStripIndices,
    stripLength,
  ]);

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

  const renderSlideFrames = useCallback(
    (slide) => {
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
                <div
                  key={`slider-${index}`}
                  className="block min-w-0"
                >
                  <SharedImageFrame
                    layoutId={`image-media-${getImageId(block.image_path)}`}
                    block={block}
                    variant="main"
                    maintainAspect
                    maxMainWidth="100%"

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

  useEffect(() => {
    const queryIndex = parseInt(router.query.image);
    if (isNaN(queryIndex) || queryIndex < 0) return;

    if (queryIndex < imageCount) {
      setCurrentImage(queryIndex);
      return;
    }

    const mappedIndex = blockIndexToSlide?.[queryIndex];
    if (typeof mappedIndex === "number") {
      setCurrentImage(mappedIndex);
    }
  }, [router.query.image, imageCount, blockIndexToSlide]);

  // 1) handle area click
  const handleAreaClick = useCallback(
    (area) => {
      if (source === "home") {
        if (area === "right") {
          setDirection("right");
          setCurrentImage((prev) => (prev + 1) % imageCount);
        } else if (area === "left") {
          setDirection("left");
          setCurrentImage((prev) => (prev - 1 + imageCount) % imageCount);
        }
        return;
      }
      if (area === "right") {
        if (currentImage === imageCount - 1) {
          if (nextSlug) {
            router.push(
              {
                pathname: `/collection/${nextSlug}`,
                query: { direction: "down", image: 0 },
              },
              `/collection/${nextSlug}?direction=down&image=0`
            );
          }
        } else {
          setDirection("right");
          setCurrentImage((prev) => prev + 1);
        }
      } else if (area === "left") {
        if (currentImage === 0) {
          if (prevSlug) {
            router.push(
              {
                pathname: `/collection/${prevSlug}`,
                query: { direction: "up", image: 0 },
              },
              `/collection/${prevSlug}?direction=up&image=0`
            );
          }
        } else {
          setDirection("left");
          setCurrentImage((prev) => prev - 1);
        }
      }
    },
    [currentImage, imageCount, nextSlug, prevSlug, router, source]
  );

  // Select a thumbnail: morph back to slider and hide the clicked thumb during pass
  const handleThumbnailSelect = useCallback(
    (blockIndex, event) => {
      if (event) event.stopPropagation();
      const targetSlide = blockIndexToSlide?.[blockIndex];
      if (typeof targetSlide !== "number") return;
      setCurrentImage(targetSlide);
      setDirection("");
      if (showThumbs) {
        if (typeof window !== "undefined") {
          window.requestAnimationFrame(() => {
            setClosingFromThumb(true);
            setClosingThumbIndex(blockIndex);
            setOverlayClosing(true);
            setShowThumbs(false);
          });
        } else {
          setClosingFromThumb(true);
          setClosingThumbIndex(blockIndex);
          setOverlayClosing(true);
          setShowThumbs(false);
        }
      }
    },
    [blockIndexToSlide, showThumbs]
  );

  const handleGalleryStripSelect = useCallback(
    (slideIndex) => {
      if (typeof slideIndex !== "number") return;
      if (slideIndex < 0 || slideIndex >= imageCount) return;
      setDirection("");
      setCurrentImage(slideIndex);
    },
    [imageCount]
  );

  const renderStripThumbnails = useCallback(
    (entries) =>
      entries.map((entry, idx) => (
        <GalleryStripThumbnail
          key={entry?.id || `gallery-strip-${idx}`}
          block={entry?.block}
          blockIndex={entry?.blockIndex}
          isCurrent={entry?.slideIndex === currentImage}
          relativeIndex={idx}
          ariaLabel={`Show slide ${(entry?.slideIndex ?? 0) + 1}`}
          onSelect={() => handleGalleryStripSelect(entry?.slideIndex)}
          onLoad={registerStripThumbLoaded}
        />
      )),
    [currentImage, handleGalleryStripSelect, registerStripThumbLoaded]
  );

  // 3) handle area hover => set hoveredArea
  const handleAreaHover = useCallback((area) => {
    setHoveredArea(area);
  }, []);

  // 4) arrow keys => left/right
  const handleKeyDown = useCallback(
    (evt) => {
      if (evt.key === "ArrowRight") handleAreaClick("right");
      else if (evt.key === "ArrowLeft") handleAreaClick("left");
      else if (evt.key === "Escape" && showThumbs) {
        closeThumbOverlay();
      }
    },
    [handleAreaClick, closeThumbOverlay, showThumbs]
  );
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // 5) swiping
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleAreaClick("right"),
    onSwipedRight: () => handleAreaClick("left"),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  // left/right transitions for main images
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

  // Main image data
  const currentSlide = sliderEntries[currentImage] || null;
  const currentAltLabel =
    (currentSlide?.blocks
      ?.map((block) => block?.alt_text)
      .filter(Boolean)
      .join(" / ")) || page.data.title;
  const closingSlideIndex =
    typeof closingThumbIndex === "number"
      ? blockIndexToSlide?.[closingThumbIndex]
      : null;
  const closingSlideBlockIndices =
    typeof closingSlideIndex === "number"
      ? new Set(sliderEntries[closingSlideIndex]?.contentIndices || [])
      : null;
  const shouldRenderThumbOverlay = showThumbs || overlayClosing;
  const sliderActiveDuringThumbClose = overlayClosing;
  const shouldRenderSliderFrame = !showThumbs || sliderActiveDuringThumbClose;
  const isOverlayActive = shouldRenderThumbOverlay || overlayEntering;

  const thumbGridAnimationState = overlayClosing
    ? "exit"
    : showThumbs && shouldAnimateThumbs
      ? "show"
      : "hidden";

  const isCurrentSlideDiptych = currentSlide?.type === "diptych";
  const slideLayoutClass = isCurrentSlideDiptych
    ? "flex flex-col gap-6 md:flex-row md:gap-10 items-center md:items-start justify-center w-full"
    : "flex items-center justify-center w-full h-full";
  const slideLayoutStyle = isCurrentSlideDiptych
    ? { maxWidth: "80vw", width: "100%", marginInline: "auto" }
    : undefined;
  const mainImageContent =
    shouldRenderSliderFrame && currentSlide ? (
      <div className={slideLayoutClass} style={slideLayoutStyle}>
        {renderSlideFrames(currentSlide)}
      </div>
    ) : null;

  const sliderWrapperProps = isOverlayActive || !currentSlide ? {} : swipeHandlers;

  const MainImageSection = isGalleryView && currentSlide ? (
    <motion.div
      className="relative z-10 flex justify-center items-center h-full w-full p-4 overflow-hidden"
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
            key={currentSlide?.id || currentImage}
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
  ) : null;

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
    [
      setOverlayEntering,
      setOverlayClosing,
      setClosingFromThumb,
      setClosingThumbIndex,
      setShouldAnimateThumbs,
    ]
  );

  const ThumbsOverlay = isGalleryView && shouldRenderThumbOverlay ? (
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
      {/* <div
        className="absolute inset-0"
        style={{ zIndex: 0 }}
        aria-hidden="true"
        onClick={closeThumbOverlay}
      /> */}
      {/* <button
        className="absolute top-2 right-2 text-xs tracking-widest leading-none text-black z-50 p-2"
        onClick={closeThumbOverlay}
      >
        CLOSE
      </button> */}
      <div
        className="h-full w-full overflow-y-scroll p-4 md:py-16 mt-8 md:mt-0 relative "
        style={{ zIndex: 2 }}
      >
        <motion.ul
          className="flex flex-wrap gap-y-12 lg:gap-y-32 5k:gap-y-72 justify-items-center items-center w-full"
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
              const isClosingThumb = closingThumbIndex === index;
              const sharedLayoutId = `image-media-${thumbId}`;
              const thumbIsLoaded = thumbsLoaded.has(index);
              const belongsToClosingSlide =
                closingSlideBlockIndices?.has(index) || isClosingThumb;
              const hideDuringClose =
                overlayClosing && closingFromThumb && !belongsToClosingSlide;
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

  /**
   * Preloading logic:
   */
  const sanitizeBlocks = (blocks) =>
    Array.isArray(blocks)
      ? blocks.filter((block) => block && block.image_path)
      : [];
  const nextSlideBlocks =
    currentImage < imageCount - 1
      ? sanitizeBlocks(sliderEntries[currentImage + 1]?.blocks)
      : [];
  const prevSlideBlocks =
    currentImage > 0
      ? sanitizeBlocks(sliderEntries[currentImage - 1]?.blocks)
      : [];

  const showPrevButton = isTouchDevice || hoverHalf === "left";
  const showNextButton = isTouchDevice || hoverHalf === "right";

  return (
    <DefaultLayout page={page}>
      <LayoutGroup id="collection-layout" crossfade={false}>
        {/* Controls & overlay rendering */}
        {isGalleryView ? (
          <>
            <div className="fixed top-4 left-4 text-xs tracking-widest z-40 pointer-events-none">
              {currentAltLabel}
            </div>
            <button
              className="fixed top-4 right-0 right-4 text-xs uppercase tracking-widest z-50 transition"
              onClick={() => {
                setDirection("");
                if (showThumbs) closeThumbOverlay();
                else setShowThumbs(true);
              }}
            >
              {showThumbs ? "CLOSE" : "THUMBNAIL"}
            </button>
          </>
        ) : (
          <div className="hidden md:flex flex-row items-center md:absolute top-1/2 left-1/6 text-left z-20 mt-[-8px]">
            <div className="text-xs tracking-widest">{page.data.title}</div>
            {source === "index" && (
              <div className="flex">
                <button
                  onClick={() => {
                    setShowThumbs((prev) => !prev);
                  }}
                  className="text-xs uppercase tracking-widest text-black"
                >
                  {showThumbs ? "CLOSE" : "THUMBNAIL"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Preload next/prev image in same collection if hovered */}
        {hoveredArea === "right" &&
          nextSlideBlocks.map((block) => (
            <HiddenPreloadImage
              key={`preload-next-${block.image_path}`}
              src={block.image_path}
              width={block.width || 64}
              height={block.height || 64}
            />
          ))}
        {hoveredArea === "left" &&
          prevSlideBlocks.map((block) => (
            <HiddenPreloadImage
              key={`preload-prev-${block.image_path}`}
              src={block.image_path}
              width={block.width || 64}
              height={block.height || 64}
            />
          ))}

        {/* Preload next/prev collection's first image if boundary */}
        {hoveredArea === "right" &&
          currentImage === imageCount - 1 &&
          nextFirstImage && <HiddenPreloadImage src={nextFirstImage} />}
        {hoveredArea === "left" && currentImage === 0 && prevFirstImage && (
          <HiddenPreloadImage src={prevFirstImage} />
        )}

        {shouldRenderStrip && (
          <motion.div
            className="fixed bottom-[2.8rem] left-0 right-0 z-40 px-4"
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: stripChunkState.ready ? 1 : 0, y: 0 }}
            transition={{ duration: 0.35, delay: 0.35, ease: [0.25, 0.8, 0.25, 1] }}
          >
            <div
              className="relative"
              aria-busy={isTransitioningChunks || undefined}
              style={{ visibility: stripChunkState.ready ? "visible" : "hidden" }}
            >
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={activeChunkKey}
                  className={stripLayoutClass}
                  variants={stripChunkVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                  style={{
                    gridTemplateColumns: `repeat(${Math.max(
                      activeStripEntries.length,
                      1
                    )}, minmax(0, 1fr))`,
                  }}
                >
                  {renderStripThumbnails(activeStripEntries)}
                </motion.div>
              </AnimatePresence>

              {pendingStripEntries && (
                <div
                  className="pointer-events-none absolute inset-0 opacity-0"
                  aria-hidden="true"
                >
                  <div
                    className={stripLayoutClass}
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(
                        pendingStripEntries.length,
                        1
                      )}, minmax(0, 1fr))`,
                    }}
                  >
                    {renderStripThumbnails(pendingStripEntries)}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {MainImageSection}
        {ThumbsOverlay}

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

        {/* Mobile prev/next buttons - only show when not in thumbnail overlay */}
        {!showThumbs && (
          <>
            <button
              className="md:hidden h-full fixed flex flex-col justify-center top-0 left-0 text-xs uppercase tracking-widest z-40 px-1 py-1"
              onClick={() => handleAreaClick("left")}
            >
              P
            </button>
            <button
              className="md:hidden h-full fixed flex flex-col justify-center top-0 right-0 text-xs uppercase tracking-widest z-40 px-1 py-1"
              onClick={() => handleAreaClick("right")}
            >
              N
            </button>
          </>
        )}
      </LayoutGroup>
      {Array.isArray(page.data.blocks) && page.data.blocks.length > 0 && (
        <section className="mt-16">
          <Blocks blocks={page.data.blocks} />
        </section>
      )}
    </DefaultLayout>
  );
}

export default CollectionPage;

/** getStaticPaths => standard **/
export async function getStaticPaths() {
  const collections = await filer.getItems("collection");
  const paths = collections.map((col) => ({
    params: { slug: col.data.slug || col.slug },
  }));
  return { paths, fallback: false };
}

/**
 * getStaticProps:
 *  - find this collection
 *  - find nextSlug, prevSlug
 *  - load next collection, prev collection => get [0] image => nextFirstImage, prevFirstImage
 */
export async function getStaticProps({ params }) {
  const collections = await filer.getItems("collection");
  const indexPage = await filer.getItem("index.md", { folder: "pages" });
  const indexListPage = await filer.getItem("index-list.md", {
    folder: "pages",
  });

  // build slug arrays
  const indexSlugs = [];
  for (const path of indexPage.data.collections) {
    const c = await filer.getItem(path.replace(/^content\//, ""), {
      folder: "",
    });
    if (c && c.data.slug) indexSlugs.push(c.data.slug);
  }
  const indexListSlugs = [];
  for (const path of indexListPage.data.collections) {
    const c = await filer.getItem(path.replace(/^content\//, ""), {
      folder: "",
    });
    if (c && c.data.slug) indexListSlugs.push(c.data.slug);
  }

  // find this collection
  const collection = collections.find((col) => col.data.slug === params.slug);
  if (!collection) {
    return { notFound: true };
  }

  const enrichWithDimensions = (blocks) => {
    if (!Array.isArray(blocks)) return [];
    return blocks.map((block) => {
      if (!block || !block.image_path) {
        return { ...block };
      }

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
          width = null;
          height = null;
        }
      }

      if (width && height) {
        return { ...block, width, height };
      }

      return { ...block };
    });
  };

  collection.data.content_blocks = enrichWithDimensions(
    collection.data.content_blocks
  );

  const slug = collection.data.slug;
  let source = "none";
  let slugArray = [];

  if (indexSlugs.includes(slug)) {
    source = "index";
    slugArray = indexSlugs;
  } else if (indexListSlugs.includes(slug)) {
    source = "index-list";
    slugArray = indexListSlugs;
  }

  // find nextSlug, prevSlug
  let nextSlug = null;
  let prevSlug = null;
  let nextFirstImage = null;
  let prevFirstImage = null;

  const i = slugArray.indexOf(slug);
  if (i >= 0) {
    const length = slugArray.length;
    const nextIndex = (i + 1) % length;
    const prevIndex = (i - 1 + length) % length;
    nextSlug = slugArray[nextIndex];
    prevSlug = slugArray[prevIndex];
  }

  const findFirstImageBlock = (blocks) => {
    if (!Array.isArray(blocks)) return null;
    for (const block of blocks) {
      if (block && block.image_path) {
        return block;
      }
    }
    return null;
  };

  // if we have nextSlug, load that collection => get first image block
  if (nextSlug) {
    const nextColl = collections.find((c) => c.data.slug === nextSlug);
    const firstImageBlock = findFirstImageBlock(nextColl?.data?.content_blocks);
    if (firstImageBlock?.image_path) {
      nextFirstImage = firstImageBlock.image_path;
    }
  }

  // if we have prevSlug, load that collection => get first image block
  if (prevSlug) {
    const prevColl = collections.find((c) => c.data.slug === prevSlug);
    const firstImageBlock = findFirstImageBlock(prevColl?.data?.content_blocks);
    if (firstImageBlock?.image_path) {
      prevFirstImage = firstImageBlock.image_path;
    }
  }

  return {
    props: {
      page: JSON.parse(JSON.stringify(collection)),
      source,
      slugArray,
      currentSlug: slug,

      // pass these so we can do cross-collection preloading
      nextSlug,
      prevSlug,
      nextFirstImage,
      prevFirstImage,
    },
  };
}

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
