import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import DefaultLayout from "../../components/layouts/default";
import Filer from "@cloudcannon/filer";
import Blocks from "../../components/shared/blocks";
import { useEffect, useState, useCallback, useRef, memo } from "react";
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
  const alt = block.alt_text || "Collection thumbnail";
  const width = block.width || 400;
  const height = block.height || 300;

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(thumbIdx)}
      className={`w-full border border-transparent transition h-auto w-auto md:h-8 md:w-8`}
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
  const imageCount = page.data.content_blocks.length;

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

  const closeThumbOverlay = useCallback(() => {
    if (!showThumbs) return;
    setClosingFromThumb(false);
    setClosingThumbIndex(null);
    setOverlayClosing(true);
    setShowThumbs(false);
  }, [
    closingFromThumb,
    overlayClosing,
    setClosingThumbIndex,
    setClosingFromThumb,
    setOverlayClosing,
    setShowThumbs,
    showThumbs,
  ]);

  const isGalleryView = gallerySources.has(source);
  const galleryStripSize = 16;
  const currentChunk = Math.floor(currentImage / galleryStripSize);
  const chunkStart = currentChunk * galleryStripSize;
  const chunkEnd = Math.min(chunkStart + galleryStripSize, imageCount);
  const galleryThumbnailIndices = isGalleryView
    ? Array.from(
        { length: chunkEnd - chunkStart },
        (_, idx) => chunkStart + idx
      )
    : [];

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

  useEffect(() => {
    const queryIndex = parseInt(router.query.image);
    if (!isNaN(queryIndex) && queryIndex >= 0 && queryIndex < imageCount) {
      setCurrentImage(queryIndex);
    }
  }, [router.query.image, imageCount]);

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
    [
      setDirection,
      setCurrentImage,
      setOverlayClosing,
      setShowThumbs,
      setClosingFromThumb,
      setClosingThumbIndex,
      overlayClosing,
      showThumbs,
    ]
  );

  const handleGalleryStripSelect = useCallback((thumbIdx) => {
    setDirection("");
    setCurrentImage(thumbIdx);
  }, []);

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
  const currentBlock = page.data.content_blocks[currentImage] || {};
  const currentImageId =
    getImageId(currentBlock.image_path) || `${page.data.slug}-${currentImage}`;
  const shouldRenderThumbOverlay = showThumbs || overlayClosing;
  const sliderActiveDuringThumbClose = overlayClosing && closingFromThumb;
  const shouldRenderSliderFrame = !showThumbs || sliderActiveDuringThumbClose;
  const isOverlayActive = shouldRenderThumbOverlay || overlayEntering;

  const thumbGridAnimationState = overlayClosing
    ? "exit"
    : showThumbs && shouldAnimateThumbs
      ? "show"
      : "hidden";

  const mainImageContent = shouldRenderSliderFrame ? (
    <Blocks
      content_blocks={page.data.content_blocks}
      currentIndex={currentImage}
      componentProps={() => ({ variant: "main", setImageLoaded: handleMainImageLoaded })}
      render={({ element, block, index }) => (
        <SharedImageFrame
          key={`slider-${index}`}
          layoutId={`image-media-${getImageId(block.image_path)}`}
          block={block}
          variant="main"
        >
          {element}
        </SharedImageFrame>
      )}
    />
  ) : null;

  const sliderWrapperProps = isOverlayActive ? {} : swipeHandlers;

  const MainImageSection = isGalleryView ? (
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
      <div
        className="absolute inset-0"
        style={{ zIndex: 0 }}
        aria-hidden="true"
        onClick={closeThumbOverlay}
      />
      <button
        className="absolute top-2 right-2 text-sm leading-none text-black z-50 p-2"
        onClick={closeThumbOverlay}
      >
        Close
      </button>
      <div
        className="h-full w-full overflow-y-scroll p-4 md:p-16 mt-8 md:mt-0 relative"
        style={{ zIndex: 2 }}
      >
        <motion.ul
          className="grid grid-cols-4 lg:grid-cols-6 gap-16 lg:gap-36 justify-items-center items-center w-full"
          variants={containerVariants}
          initial="hidden"
          animate={thumbGridAnimationState}
        >
          <Blocks
            content_blocks={page.data.content_blocks}
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
                  className="relative flex flex-col items-end pb-10 w-fit"
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
                    <div className="relative flex items-center justify-center w-full overflow-visible pointer-events-auto h-[100px] lg:h-[160px]">
                      <SharedImageFrame
                        layoutId={sharedLayoutId}
                        block={block}
                        variant="thumb"
                        hidden={hideDuringClose}
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
  const nextImageInSameCollection =
    currentImage < imageCount - 1
      ? page.data.content_blocks[currentImage + 1]
      : null;
  const prevImageInSameCollection =
    currentImage > 0 ? page.data.content_blocks[currentImage - 1] : null;

  const showPrevButton = isTouchDevice || hoverHalf === "left";
  const showNextButton = isTouchDevice || hoverHalf === "right";

  return (
    <DefaultLayout page={page}>
      <LayoutGroup id="collection-layout" crossfade={false}>
        {/* Controls & overlay rendering */}
        {isGalleryView ? (
          <>
            <div className="fixed top-4 left-4 text-xs lowercase tracking-widest z-40 pointer-events-none">
              {page.data.content_blocks[currentImage].alt_text}
            </div>
            <button
              className="fixed top-4 right-4 text-xs uppercase tracking-widest z-40 bg-white bg-opacity-80 hover:bg-opacity-100 transition"
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
          <div className="hidden md:flex flex-row items-center md:absolute top-1/2 left-1/6 text-left z-20 gap-2 mt-[-8px]">
            <div className="text-xs lowercase tracking-widest">{page.data.title}</div>
            {source === "index" && (
              <div className="flex">
                <button
                  onClick={() => {
                    setShowThumbs((prev) => !prev);
                  }}
                  className="text-xs uppercase tracking-widest text-black hover:opacity-80"
                >
                  {showThumbs ? "CLOSE" : "THUMBNAIL"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Preload next/prev image in same collection if hovered */}
        {hoveredArea === "right" && nextImageInSameCollection && (
          <HiddenPreloadImage
            src={nextImageInSameCollection.image_path}
            width={nextImageInSameCollection.width || 64}
            height={nextImageInSameCollection.height || 64}
          />
        )}
        {hoveredArea === "left" && prevImageInSameCollection && (
          <HiddenPreloadImage
            src={prevImageInSameCollection.image_path}
            width={prevImageInSameCollection.width || 64}
            height={prevImageInSameCollection.height || 64}
          />
        )}

        {/* Preload next/prev collection's first image if boundary */}
        {hoveredArea === "right" &&
          currentImage === imageCount - 1 &&
          nextFirstImage && <HiddenPreloadImage src={nextFirstImage} />}
        {hoveredArea === "left" && currentImage === 0 && prevFirstImage && (
          <HiddenPreloadImage src={prevFirstImage} />
        )}

        {isGalleryView && imageCount > 1 && (
          <motion.div
            className="fixed bottom-[2.8rem] left-0 right-0 z-40 px-16 md:px-4"
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: stripReady ? 1 : 0, y: stripReady ? 0 : 12 }}
            transition={{ duration: 0.5, ease: [0.25, 0.8, 0.25, 1] }}
          >
            <div
              className="grid md:flex md:flex-nowrap gap-1 md:gap-2 justify-center"
              style={{
                gridTemplateColumns: `repeat(${Math.max(
                  galleryThumbnailIndices.length,
                  1
                )}, minmax(0, 1fr))`,
              }}
            >
              {galleryThumbnailIndices.map((thumbIdx) => (
                <GalleryStripThumbnail
                  key={`gallery-strip-${thumbIdx}`}
                  thumbIdx={thumbIdx}
                  block={page.data.content_blocks[thumbIdx]}
                  isCurrent={thumbIdx === currentImage}
                  relativeIndex={thumbIdx - chunkStart}
                  onSelect={handleGalleryStripSelect}
                />
              ))}
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
              className="md:hidden fixed top-1/2 left-4 text-xs uppercase tracking-widest z-40 px-1 py-1 bg-white bg-opacity-80"
              onClick={() => handleAreaClick("left")}
            >
              P
            </button>
            <button
              className="md:hidden fixed top-1/2 right-4 text-xs uppercase tracking-widest z-40 px-1 py-1 bg-white bg-opacity-80"
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

  // if we have nextSlug, load that collection => get content_blocks[0]
  if (nextSlug) {
    const nextColl = collections.find((c) => c.data.slug === nextSlug);
    if (
      nextColl &&
      nextColl.data.content_blocks &&
      nextColl.data.content_blocks.length > 0
    ) {
      // ensure fallback dimension
      const firstBlock = {
        ...nextColl.data.content_blocks[0],
        width: nextColl.data.content_blocks[0].width || 32,
        height: nextColl.data.content_blocks[0].height || 32,
      };
      nextFirstImage = firstBlock.image_path;
    }
  }

  // if we have prevSlug, load that collection => get content_blocks[0]
  if (prevSlug) {
    const prevColl = collections.find((c) => c.data.slug === prevSlug);
    if (
      prevColl &&
      prevColl.data.content_blocks &&
      prevColl.data.content_blocks.length > 0
    ) {
      const firstBlock = {
        ...prevColl.data.content_blocks[0],
        width: prevColl.data.content_blocks[0].width || 32,
        height: prevColl.data.content_blocks[0].height || 32,
      };
      prevFirstImage = firstBlock.image_path;
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
