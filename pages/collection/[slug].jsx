import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import DefaultLayout from "../../components/layouts/default";
import Filer from "@cloudcannon/filer";
import Blocks from "../../components/shared/blocks";
import React, { useEffect, useState, useCallback, memo, useRef } from "react";
import { useRouter } from "next/router";
import ExportedImage from "next-image-export-optimizer";
import { useSwipeable } from "react-swipeable";
import sizeOf from "image-size";
import path from "path";

const filer = new Filer({ path: "content" });

/**
 * HiddenPreloadImage => preloads the next/prev image or next/prev collection's first image
 */
function HiddenPreloadImage({ src, width = 64, height = 64 }) {
  return (
    <div style={{ width: 0, height: 0, overflow: "hidden" }}>
      <ExportedImage src={src} alt="" width={width} height={height} priority />
    </div>
  );
}

// For your main images
const MemoizedExportedImage = memo(function MemoizedExportedImage({
  src,
  alt,
  width,
  height,
  ...rest
}) {
  return (
    <ExportedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      {...rest}
    />
  );
});
MemoizedExportedImage.displayName = "MemoizedExportedImage";

/** GridThumbnail => used for overlay if `source==='index'` */
const GridThumbnail = memo(function GridThumbnail({ block, index, onClick }) {
  return (
    <motion.div
      key={index}
      onClick={() => onClick(index)}
      className="cursor-pointer hover:opacity-80 transition-opacity w-24 h-24 sm:w-20 sm:h-20 md:w-16 md:h-16 lg:w-14 lg:h-14 overflow-hidden"
      variants={{
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
      }}
    >
      <MemoizedExportedImage
        src={block.image_path}
        alt={block.alt_text || "Thumb"}
        width={64}
        height={64}
        sizes="(max-width: 640px) 10vw,5vw"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </motion.div>
  );
});
GridThumbnail.displayName = "GridThumbnail";

const gallerySources = new Set(["home", "index", "index-list"]);

const getImageId = (imagePath) => {
  if (!imagePath) return "image-unknown";
  const base = imagePath.split("/").pop() || imagePath;
  return base.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
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
  const imageCount = page.data.content_blocks.length;

  // state for current image index
  const [currentImage, setCurrentImage] = useState(0);
  // direction for left/right
  const [direction, setDirection] = useState("");
  // track if the main image loaded
  const [imageLoaded, setImageLoaded] = useState(false);
  // toggles overlay if source==='index'
  const [showThumbs, setShowThumbs] = useState(false);
  const [hoveredArea, setHoveredArea] = useState(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [hoverHalf, setHoverHalf] = useState(null);
  const [closingFromThumb, setClosingFromThumb] = useState(false);

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

  useEffect(() => {
    const queryIndex = parseInt(router.query.image);
    if (!isNaN(queryIndex) && queryIndex >= 0 && queryIndex < imageCount) {
      setCurrentImage(queryIndex);
    }
  }, [router.query.image, imageCount]);

  // SVG for the "thumbnails" button
  const ThumbnailsIcon = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24.01 24.01"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline", verticalAlign: "middle" }}
      aria-hidden="true"
      focusable="false"
    >
      <rect fill="#010101" width="10" height="10" />
      <rect fill="#010101" y="14.01" width="10" height="10" />
      <rect fill="#010101" x="14.01" y="14.01" width="10" height="10" />
      <rect fill="#010101" x="14.01" width="10" height="10" />
    </svg>
  );

  // 1) handle area click
  const handleAreaClick = useCallback(
    (area) => {
      // Special case: on home page (index.jsx, source === "home"), loop within overview collection only
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
          // last image => go next collection => direction='down', ?image=0
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
          // first image => go prev collection => direction='up', ?image=0
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


  useEffect(() => {
    if (!closingFromThumb || !showThumbs) return;
    let rafId = requestAnimationFrame(() => {
      const rafId2 = requestAnimationFrame(() => {
        setShowThumbs(false);
        setClosingFromThumb(false);
      });
      rafId = rafId2;
    });
    return () => cancelAnimationFrame(rafId);
  }, [closingFromThumb, showThumbs]);

  const handleThumbnailSelect = useCallback((index, event) => {
    if (event) event.stopPropagation();
    setDirection("");
    setCurrentImage(index);
    setClosingFromThumb(true);
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
    },
    [handleAreaClick]
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
      opacity: 0,
      x: dir === "left" ? "100%" : dir === "right" ? "-100%" : 0,
    }),
    center: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 150,
        damping: 25,
        duration: 0.4,
        delay: -0.2,
      },
    },
    exit: (dir) => ({
      opacity: 0,
      x: dir === "left" ? "-100%" : dir === "right" ? "100%" : 0,
      transition: { duration: 0.3 },
    }),
  };

  // Main image section with title/caption and controls (default view only, home page)
  const currentBlock = page.data.content_blocks[currentImage] || {};
  const currentImageId =
    getImageId(currentBlock.image_path) || `${page.data.slug}-${currentImage}`;
  const detailAspectStyle =
    currentBlock.width && currentBlock.height
      ? { aspectRatio: `${currentBlock.width} / ${currentBlock.height}` }
      : { aspectRatio: "4 / 3" };

  const MainImageSection = isGalleryView ? (
    <AnimatePresence custom={direction} mode="wait">
      <motion.div
        key={currentImage}
        variants={internalVariants}
        initial="enter"
        animate="center"
        exit="exit"
        custom={direction}
        className="relative w-full p-4 h-full flex flex-col justify-center"
        style={{ position: "relative" }}
        {...swipeHandlers}
      >
        <section className="flex justify-center items-stretch md:h-[75vh] md:-mt-12 w-full">
          <motion.div
            layout
            layoutId={`image-card-${currentImageId}`}
            className="flex justify-center"
            style={{ transformOrigin: "50% 0%" }}
            onLayoutAnimationComplete={() => {
              if (closingFromThumb && showThumbs) {
                setShowThumbs(false);
                setClosingFromThumb(false);
              }
            }}
          >
            <motion.div
              layout
              layoutId={`image-media-${currentImageId}`}
              className="flex items-center justify-center w-full"
              transition={{ duration: 0.45, ease: "easeInOut" }}
              style={{
                width: "100%",
                transformOrigin: "50% 0%",
                ...detailAspectStyle,
              }}
            >
              <div className="relative w-full h-full flex flex-col items-center" style={{ width: "100%" }}>
                <Blocks
                  content_blocks={page.data.content_blocks}
                  currentImage={currentImage}
                  setImageLoaded={setImageLoaded}
                />
              </div>
            </motion.div>
          </motion.div>
        </section>
      </motion.div>
    </AnimatePresence>
  ) : (
    <AnimatePresence custom={direction} mode="wait">
      <motion.div
        key={currentImage}
        variants={internalVariants}
        initial="enter"
        animate="center"
        exit="exit"
        custom={direction}
        className="relative w-auto p-4"
        style={{ position: "relative" }}
        {...swipeHandlers}
      >
        <section className="photo flex flex-col-reverse md:flex-col justify-center md:justify-start items-end relative h-[70vh] md:h-85vh w-full md:w-auto">
          <motion.div
            layout
            layoutId={`image-card-${currentImageId}`}
            className="flex justify-center w-full"
            style={{ transformOrigin: "50% 0%" }}
            onLayoutAnimationComplete={() => {
              if (closingFromThumb && showThumbs) {
                setShowThumbs(false);
                setClosingFromThumb(false);
              }
            }}
          >
            <motion.div
              layout
              layoutId={`image-media-${currentImageId}`}
              className="flex items-center justify-center w-full"
              transition={{ duration: 0.45, ease: "easeInOut" }}
              style={{
                width: "100%",
                transformOrigin: "50% 0%",
                ...detailAspectStyle,
              }}
            >
              <div className="relative w-full h-full" style={{ width: "100%" }}>
                <Blocks
                  content_blocks={page.data.content_blocks}
                  currentImage={currentImage}
                  setImageLoaded={setImageLoaded}
                />
              </div>
            </motion.div>
          </motion.div>
          {imageLoaded && (
            <div className="relative w-full md:hidden pb-2 md:pb-0 pt-4 text-left">
              <div className="text-sm leading-none">
                {page.data.title} - {currentImage + 1} / {imageCount}
              </div>
            </div>
          )}
          {source === "index" &&
            page.data.content_blocks[currentImage]?.alt_text && (
              <p className="w-full text-sm mt-2 self-end text-left md:text-right">
                {page.data.content_blocks[currentImage].alt_text}
              </p>
            )}
        </section>
      </motion.div>
    </AnimatePresence>
  );

  const ThumbsOverlay = isGalleryView && (
    <AnimatePresence>
      {showThumbs && (
        <motion.div
          key="thumbs-overlay"
          className="fixed inset-0 z-40 bg-white bg-opacity-95 flex flex-col items-center justify-center"
          style={{ pointerEvents: closingFromThumb ? "none" : "auto" }}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          <div
            className="absolute inset-0"
            style={{ zIndex: 0 }}
            aria-hidden="true"
            onClick={() => {
              if (!closingFromThumb) setShowThumbs(false);
            }}
          />
          {!closingFromThumb && (
            <button
              className="absolute top-2 right-2 text-sm leading-none text-black z-50 p-2"
              onClick={() => {
                setClosingFromThumb(false);
                setShowThumbs(false);
              }}
            >
              Close
            </button>
          )}
          <div
            className="flex flex-wrap p-4 md:p-16 mt-8 md:mt-0 justify-center items-center overflow-y-auto w-full relative"
            style={{ zIndex: 2 }}
            onClick={() => {
              if (!closingFromThumb) setShowThumbs(false);
            }}
          >
            <div className="w-full md:px-10 relative pointer-events-none">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-12 md:gap-40 justify-items-center items-center w-full">
                {page.data.content_blocks.map((block, idx) => {
                  const thumbId = getImageId(block.image_path);
                  const isCurrentThumb = idx === currentImage;
                  return (
                    <motion.div
                      key={idx}
                      variants={thumbVariants}
                      onClick={(e) => handleThumbnailSelect(idx, e)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.33 }}
                      whileHover={{ scale: 1.1 }}
                      className="cursor-pointer transition-opacity origin-center origin-top ease-in-out pointer-events-auto h-24 md:h-48"
                      style={{
                        overflow: "visible",
                      }}
                    >
                      <motion.div
                        layoutId={
                          isCurrentThumb ? `image-card-${thumbId}` : undefined
                        }
                        className="inline-flex"
                      >
                        <motion.div
                          layoutId={
                            isCurrentThumb
                              ? `image-media-${thumbId}`
                              : undefined
                          }
                          className="inline-flex"
                        >
                          <ExportedImage
                            src={block.image_path}
                            alt={block.alt_text || "Thumbnail"}
                            width={block.width}
                            height={block.height}
                            sizes="(max-width:640px)30vw,10vw"
                            className="w-full h-full object-contain"
                          />
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  /**
   * Preloading logic:
   *  - next/prev image in same collection
   *  - nextFirstImage if boundary + hovered on right
   *  - prevFirstImage if boundary + hovered on left
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
      <LayoutGroup id="collection-layout">
        {isGalleryView ? (
          <>
            <div className="fixed top-4 left-4 text-sm leading-none z-40 pointer-events-none">
              {page.data.content_blocks[currentImage].alt_text}
            </div>
            <button
              className="fixed top-4 right-4 text-sm leading-none z-40 bg-white bg-opacity-80 hover:bg-opacity-100 transition"
              onClick={() => {
                setClosingFromThumb(false);
                setShowThumbs((prev) => !prev);
                setDirection("");
              }}
            >
              {showThumbs ? "Close" : "Thumbnail"}
            </button>
          </>
        ) : (
          <div className="hidden md:flex flex-row items-center md:absolute top-1/2 left-1/6 text-left z-20 gap-2 mt-[-8px]">
            <div className="text-sm leading-none">{page.data.title}</div>
            {source === "index" && (
              <div className="flex">
                <button
                  onClick={() => {
                    setClosingFromThumb(false);
                    setShowThumbs((prev) => !prev);
                  }}
                  className="text-sm leading-none text-black hover:opacity-80"
                >
                  {showThumbs ? "Close" : "Thumbnail"}
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
          <div className="fixed bottom-[3rem] left-0 right-0 z-40 px-4">
            <div
              className="grid md:flex md:flex-nowrap gap-1 md:gap-2 justify-center"
              style={{
                gridTemplateColumns: `repeat(${Math.max(
                  galleryThumbnailIndices.length,
                  1
                )}, minmax(0, 1fr))`,
              }}
            >
              {galleryThumbnailIndices.map((thumbIdx) => {
                const thumbBlock = page.data.content_blocks[thumbIdx];
                if (!thumbBlock) return null;
                const isCurrent = thumbIdx === currentImage;
                return (
                  <button
                    key={`gallery-strip-${thumbIdx}`}
                    onClick={() => {
                      setDirection("");
                      setCurrentImage(thumbIdx);
                    }}
                    className={`w-full border border-transparent transition h-auto w-auto md:h-8 md:w-8 ${
                      isCurrent ? "opacity-100" : "opacity-50 hover:opacity-100"
                    }`}
                    aria-label={`Show image ${thumbIdx + 1}`}
                  >
                    <ExportedImage
                      src={thumbBlock.image_path}
                      alt={thumbBlock.alt_text || "Collection thumbnail"}
                      width={thumbBlock.width || 64}
                      height={thumbBlock.height || 64}
                      className="w-full h-full object-cover"
                      style={{ display: "block" }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
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
            className={`ml-6 -translate-y-1/2 text-xs uppercase tracking-widest transition-opacity duration-200 px-3 py-1 bg-white bg-opacity-80 ${
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
            className={`mr-6 -translate-y-1/2 text-xs uppercase tracking-widest transition-opacity duration-200 px-3 py-1 bg-white bg-opacity-80 ${
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
      </LayoutGroup>
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
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.33 },
  },
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
