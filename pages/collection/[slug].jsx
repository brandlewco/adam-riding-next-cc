import { motion, AnimatePresence } from "framer-motion";
import DefaultLayout from "../../components/layouts/default";
import Filer from "@cloudcannon/filer";
import Blocks from "../../components/shared/blocks";
import React, { useEffect, useState, useCallback, memo, useRef } from "react";
import { useRouter } from "next/router";
import ExportedImage from "next-image-export-optimizer";
import { useSwipeable } from "react-swipeable";

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

/**
 * RowThumbnail => used for 'index-list' row of 32×32
 */
const RowThumbnail = memo(function RowThumbnail({
  block,
  index,
  currentImage,
  handleThumbnailClick,
}) {
  return (
    <motion.div
      key={index}
      onClick={() => handleThumbnailClick(index)}
      className={`cursor-pointer relative mb-2 hover:opacity-100 transition-opacity ${
        currentImage === index ? "opacity-100" : "opacity-50"
      }`}
      style={{
        width: 32,
        height: 32,
        overflow: "hidden",
      }}
    >
      <MemoizedExportedImage
        src={block.image_path}
        alt={block.alt_text || "Thumbnail"}
        width={32}
        height={32}
        sizes="(max-width:640px)10vw,1vw"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </motion.div>
  );
});
RowThumbnail.displayName = "RowThumbnail";

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
  // track user hover area for preloading
  const [hoveredArea, setHoveredArea] = useState(null);

  // Ref for the overlay content (thumbnails grid)
  const overlayContentRef = useRef(null);

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

  // 2) handle thumbnail click => jump to index (and open thumbs grid if not already open)
  const handleThumbnailClick = useCallback((index) => {
    setShowThumbs(true);
    setCurrentImage(index);
    setDirection("");
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
  const MainImageSection =
    source !== "index-list" && source !== "index" ? (
      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          key={currentImage}
          layoutId={`collection-${page.data.slug}`}
          layout
          variants={internalVariants}
          initial="enter"
          animate="center"
          exit="exit"
          custom={direction}
          className="relative w-full p-4"
          style={{ position: "relative" }}
          {...swipeHandlers}
        >
          <section className="flex flex-col-reverse md:flex-row justify-center md:justify-start items-stretch h-[90vh] md:h-85vh w-full">
            {/* Spacer for left 1/2 (title is absolutely positioned) */}
            <div className="hidden md:block w-1/2" />
            {/* Image on right */}
            <div className="flex flex-col items-end w-full ml-auto">
              {/* Mobile: caption above image, left-aligned, only for home page */}
              {source === "home" && (
                <div className="block md:hidden text-sm mb-2 text-left w-full">
                  {page.data.content_blocks[currentImage]?.alt_text || ""}
                </div>
              )}
              <Blocks
                content_blocks={page.data.content_blocks}
                currentImage={currentImage}
                setImageLoaded={setImageLoaded}
              />
              {/* Mobile: counter and thumbnail button below image, right-aligned, only for home page */}
              {source === "home" && (
                <div className="block md:hidden w-full flex flex-col items-end mt-2 z-20">
                  <div className="flex flex-row items-center gap-2">
                    <span className="text-sm leading-none">
                      {currentImage + 1} / {imageCount}
                    </span>
                    <div>
                      {showThumbs ? (
                        <button
                          onClick={() => setShowThumbs(false)}
                          className="text-sm leading-none text-black hover:opacity-80"
                          aria-label="Close thumbnails"
                        >
                          — Close
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowThumbs(true)}
                          className="text-sm leading-none text-black hover:opacity-80"
                          aria-label="Show thumbnails"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {ThumbnailsIcon}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Desktop: counter and thumbnail button below image, right-aligned */}
              <div className="hidden md:flex w-full flex-col items-end mt-2 z-20">
                <div className="flex flex-row items-center gap-2">
                  <span className="text-sm leading-none">
                    {currentImage + 1} / {imageCount}
                  </span>
                  {/* Show thumbnail button for index.jsx (source === "home") */}
                  {source === "home" && (
                    <div>
                      {showThumbs ? (
                        <button
                          onClick={() => setShowThumbs(false)}
                          className="text-sm leading-none text-black hover:opacity-80"
                          aria-label="Close thumbnails"
                        >
                          — Close
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowThumbs(true)}
                          className="text-sm leading-none text-black hover:opacity-80"
                          aria-label="Show thumbnails"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {ThumbnailsIcon}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {/* Desktop: title under count/buttons, right-aligned */}
                <div className="block md:hidden text-sm mt-2 text-right w-full">
                  {page.data.title}
                </div>
              </div>
            </div>
          </section>
        </motion.div>
      </AnimatePresence>
    ) : (
      // Existing code for index-list and index
      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          key={currentImage}
          layoutId={`collection-${page.data.slug}`}
          layout
          variants={internalVariants}
          initial="enter"
          animate="center"
          exit="exit"
          custom={direction}
          className="relative w-auto p-4"
          style={{ position: "relative" }}
          {...swipeHandlers}
        >
          <section className="photo flex flex-col-reverse md:flex-col justify-center md:justify-start items-end relative h-[90vh] md:h-85vh w-full md:w-auto">
            <Blocks
              content_blocks={page.data.content_blocks}
              currentImage={currentImage}
              setImageLoaded={setImageLoaded}
            />
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

  // Thumbs overlay for all non-index-list/index pages (including index.jsx/"home")
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
    exit: { opacity: 0 },
  };

  const thumbVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { duration: 0.33 },
    },
    exit: { opacity: 0 },
  };

  // Show thumbs overlay for "home" (index.jsx) and "index"
  const ThumbsOverlay = (source === "home" || source === "index") && (
    <AnimatePresence>
      {showThumbs && (
        <motion.div
          key="thumbs-overlay"
          className="fixed inset-0 z-40 bg-white bg-opacity-90 flex flex-col items-center justify-center"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          {/* Overlay background for click-to-close */}
          <div
            className="absolute inset-0"
            style={{ zIndex: 0 }}
            aria-hidden="true"
            onClick={() => setShowThumbs(false)}
          />
          {/* Close button, absolutely positioned above overlay */}
          <button
            className="absolute top-2 left-2 text-sm leading-none text-black z-50 p-2"
            onClick={() => setShowThumbs(false)}
          >
            Close
          </button>
          <div
            className="flex flex-wrap p-4 md:p-16 mt-8 md:mt-0 justify-center items-center overflow-y-auto w-full relative"
            style={{ zIndex: 2 }}
            onClick={() => setShowThumbs(false)}
          >
            <div className="max-w-8xl w-full relative pointer-events-none">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-24 justify-items-center w-full">
                {page.data.content_blocks.map((block, idx) => (
                  <motion.div
                    key={idx}
                    variants={thumbVariants}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImage(idx);
                      setShowThumbs(false);
                      setDirection("");
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.33 }}
                    whileHover={{ scale: 1.1 }}
                    className="cursor-pointer transition-opacity origin-center origin-top ease-in-out pointer-events-auto"
                  >
                    <ExportedImage
                      src={block.image_path}
                      alt={block.alt_text || "Thumbnail"}
                      width={block.width}
                      height={block.height}
                      sizes="(max-width:640px)30vw,10vw"
                      className="object-contain w-full h-auto"
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // old row if source==='index-list'
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
    7: "grid-cols-7",
    8: "grid-cols-8",
    9: "grid-cols-9",
    10: "grid-cols-10",
  };
  const gridClass = imageCount <= 9 ? gridClasses[imageCount] : "grid-cols-10";

  const OldThumbRow = source === "index-list" && (
    <div className="fixed bottom-12 left-0 right-0 flex justify-center overflow-none space-x-2 z-50 px-4 md:px-0">
      <div
        className={`grid gap-2 ${gridClass} md:grid-flow-col justify-center md:justify-start`}
      >
        {page.data.content_blocks.map((block, idx) => (
          <RowThumbnail
            key={idx}
            block={block}
            index={idx}
            currentImage={currentImage}
            handleThumbnailClick={handleThumbnailClick}
          />
        ))}
      </div>
    </div>
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

  return (
    <DefaultLayout page={page}>
      {/* Top-left info for desktop */}
      <div className="hidden md:flex flex-row items-center md:absolute top-1/2 left-1/6 text-left z-20 gap-2 mt-[-8px]">
        <div className="text-sm leading-none">
          {source === "home"
            ? page.data.content_blocks[currentImage]?.alt_text || ""
            : page.data.title}
        </div>
        {source === "index" && (
          <div className="flex">
            {showThumbs ? (
              <button
                onClick={() => setShowThumbs(false)}
                className="text-sm leading-none text-black hover:opacity-80"
                aria-label="Close thumbnails"
              >
                — Close
              </button>
            ) : (
              <button
                onClick={() => setShowThumbs(true)}
                className="text-sm leading-none text-black hover:opacity-80"
                aria-label="Show thumbnails"
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                {ThumbnailsIcon}
              </button>
            )}
          </div>
        )}
      </div>

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

      {/* Left/Right clickable areas */}
      <div
        id="click-left"
        className="absolute left-0 top-[10%] h-[80%] w-1/6 md:w-1/2 cursor-pointer clickable-area"
        onClick={() => handleAreaClick("left")}
        onMouseEnter={() => handleAreaHover("left")}
        onMouseLeave={() => setHoveredArea(null)}
        style={{ zIndex: 10 }}
      />
      <div
        id="click-right"
        className="absolute right-0 top-[10%] h-[80%] w-1/6 cursor-pointer clickable-area"
        onClick={() => handleAreaClick("right")}
        onMouseEnter={() => handleAreaHover("right")}
        onMouseLeave={() => setHoveredArea(null)}
        style={{ zIndex: 10 }}
      />

      {/* Main single-image section */}
      {MainImageSection}

      {/* Thumbs overlay if index */}
      {ThumbsOverlay}

      {/* Old row if index-list */}
      {OldThumbRow}
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

  // fallback dimension
  collection.data.content_blocks = collection.data.content_blocks.map(
    (block) => ({
      ...block,
      width: block.width || 32,
      height: block.height || 32,
    })
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
