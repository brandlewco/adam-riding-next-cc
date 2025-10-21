import DefaultLayout from "../components/layouts/default";
import Filer from "@cloudcannon/filer";
import { motion, LayoutGroup, useAnimation } from "framer-motion";
import ExportedImage from "next-image-export-optimizer";
import Link from "next/link";
import { useState, useCallback, useMemo, useEffect, useRef, memo } from "react";
import { flushSync } from "react-dom";
import React from "react";
// Page: Collections carousel
// - Renders a horizontally-scrolling, responsive carousel on desktop
//   and a stacked/mobile-friendly layout on smaller viewports.
// - Responsibilities:
//   * measure container and compute card dimensions
//   * drive framer-motion `controls` to animate the track
//   * provide keyboard/wheel/touch navigation and hover previews
//   * expose next/prev controls and mobile condensed buttons

const filer = new Filer({ path: "content" });

const INTRO_IDLE = "idle";
const INTRO_PLAYING = "playing";
const INTRO_DONE = "done";
// NOTE: intro state controls a short staggered reveal so the track settles
//       before cards become fully visible (prevents visual jump).

const getImageId = (imagePath) => {
  if (!imagePath) return "image-unknown";
  const base = imagePath.split("/").pop() || imagePath;
  return base.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
};

const MemoizedExportedImage = memo(
  ({ src, alt, width, height, style = {}, ...rest }) => (
    <ExportedImage
      src={src}
      alt={alt}
      width={width || 192}
      height={height || 192}
      sizes="(max-width:640px)30vw,10vw"
      style={{ width: "100%", height: "100%", objectFit: "contain", ...style }}
      {...rest}
    />
  )
);
MemoizedExportedImage.displayName = "MemoizedExportedImage";

function HomePage({ page, collections }) {
	// Component responsibilities summary:
	// - compute responsive card sizes (cardWidth, cardGap)
	// - keep the sliding track position in `controls` (framer-motion)
	// - handle user input (wheel, pointer, keyboard, touch)
	// - expose next/prev controls and mobile condensed buttons
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeDirection, setActiveDirection] = useState(null);
  const controls = useAnimation();
  const totalCollections = collections.length;
  const containerRef = useRef(null);
  const animatingRef = useRef(false);
  const baseOffsetRef = useRef(0);
  const wheelDeltaRef = useRef(0);
  const [containerWidth, setContainerWidth] = useState(0);
  // Drive the intro fade so the track settles before the cards become visible.
  const [introState, setIntroState] = useState(INTRO_IDLE);
  const introRafRef = useRef(null);
  const introTimeoutRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // ResizeObserver: keeps containerWidth up to date so the card size
    // calculations remain accurate across resizes / orientation changes.
    const observer = new ResizeObserver((entries) => {
      if (!entries.length) return;
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (introState !== INTRO_IDLE) return;
    introRafRef.current = requestAnimationFrame(() => {
      setIntroState(INTRO_PLAYING);
    });
    return () => {
      if (introRafRef.current !== null) {
        cancelAnimationFrame(introRafRef.current);
        introRafRef.current = null;
      }
    };
  }, [introState]);

  useEffect(() => {
    if (introState !== INTRO_PLAYING) return;
    introTimeoutRef.current = setTimeout(() => {
      setIntroState(INTRO_DONE);
    }, 900);
    return () => {
      if (introTimeoutRef.current) {
        clearTimeout(introTimeoutRef.current);
        introTimeoutRef.current = null;
      }
    };
  }, [introState]);

  useEffect(() => {
    return () => {
      if (introRafRef.current !== null) {
        cancelAnimationFrame(introRafRef.current);
      }
      if (introTimeoutRef.current) {
        clearTimeout(introTimeoutRef.current);
      }
    };
  }, []);

  const CARD_GAP_DESKTOP = 160;
  const CARD_GAP_MOBILE = 32;
  const MIN_CARD_WIDTH = 200;
  const MAX_CARD_WIDTH = 720;

  const showPeeking = totalCollections >= 6;
  const visibleCount = totalCollections === 0 ? 0 : showPeeking ? 6 : Math.min(totalCollections, 6);
  const isMobile = containerWidth && containerWidth < 768;
  const cardGap = isMobile ? CARD_GAP_MOBILE : CARD_GAP_DESKTOP;

  // Derive a fixed card width so six cards stay visible with the outer two peeking in.
  let computedWidth = 0;
  if (containerWidth && visibleCount > 0) {
    if (showPeeking) {
      computedWidth = (containerWidth - 5 * cardGap) / 5;
    } else {
      computedWidth = (containerWidth - (visibleCount - 1) * cardGap) / visibleCount;
    }
  }
  if (!Number.isFinite(computedWidth) || computedWidth <= 0) {
    computedWidth = containerWidth && visibleCount
      ? containerWidth / Math.max(visibleCount, 1)
      : 0;
  }

  let cardWidth = containerWidth ? computedWidth : 0;
  if (containerWidth) {
    const maxAllowed = Math.min(MAX_CARD_WIDTH, containerWidth);
    if (showPeeking) {
      const peekMin = Math.min(120, containerWidth / Math.max(visibleCount || 1, 1));
      cardWidth = Math.max(cardWidth, peekMin);
    } else {
      const standardMin = Math.min(MIN_CARD_WIDTH, containerWidth / Math.max(visibleCount || 1, 1));
      cardWidth = Math.max(cardWidth, standardMin);
    }
    cardWidth = Math.min(cardWidth, maxAllowed);
  }

  const travelDistance = visibleCount > 0 ? cardWidth + cardGap : 0;

  const extraCardCount = activeDirection === "next" ? 1 : 0;
  const effectiveVisibleCount = visibleCount + extraCardCount;

  const trackWidth =
    effectiveVisibleCount > 0 && cardWidth
      ? effectiveVisibleCount * cardWidth +
        Math.max(effectiveVisibleCount - 1, 0) * cardGap
      : 0;

  const coreOffsets = useMemo(() => {
    if (!visibleCount) return [];
    if (showPeeking) {
      return Array.from({ length: visibleCount }, (_, idx) => idx - 2);
    }
    return Array.from({ length: visibleCount }, (_, idx) => idx);
  }, [showPeeking, visibleCount]);

  const extraOffsets = useMemo(() => {
    if (!coreOffsets.length) return [];
    const leading = coreOffsets[0] - 1;
    const trailing = coreOffsets[coreOffsets.length - 1] + 1;
    return [leading, ...coreOffsets, trailing];
  }, [coreOffsets]);

  const coreMin = coreOffsets[0] ?? 0;
  const coreMax = coreOffsets[coreOffsets.length - 1] ?? 0;

  const displayedCollections = useMemo(() => {
    if (!totalCollections || extraOffsets.length === 0) return [];
    return extraOffsets.map((offset) => {
      const normalizedIndex =
        (currentIndex + offset + totalCollections) % totalCollections;
      return {
        collection: collections[normalizedIndex],
        absoluteIndex: normalizedIndex,
        offset,
      };
    });
  }, [collections, currentIndex, extraOffsets, totalCollections]);

  // Keep the carousel shifted so the edge cards remain half visible while idling.
  const baseOffset = useMemo(() => {
    if (!showPeeking || !cardWidth || !visibleCount || !containerWidth) return 0;
    const span = (visibleCount - 1) * (cardWidth + cardGap);
    const upperRight = containerWidth - span;
    const lowerRight = containerWidth - (span + cardWidth);
    const lowerBound = Math.max(-cardWidth, lowerRight);
    const upperBound = Math.min(0, upperRight);

    if (lowerBound >= upperBound) {
      const fallback = Math.min(upperBound, -cardGap / 2);
      return Number.isFinite(fallback) ? fallback : 0;
    }

    const midpoint = (lowerBound + upperBound) / 2;
    const epsilon = Math.min(cardWidth * 0.05, 16);
    return Math.max(lowerBound + epsilon, Math.min(upperBound - epsilon, midpoint));
  }, [cardGap, cardWidth, containerWidth, showPeeking, visibleCount]);

  useEffect(() => {
    controls.set({ x: baseOffset || 0 });
  }, [baseOffset, controls]);

  useEffect(() => {
    baseOffsetRef.current = baseOffset || 0;
  }, [baseOffset]);

  const handleMouseEnter = useCallback((absoluteIndex) => {
    setHoverIndex(absoluteIndex);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(-1);
  }, []);

  const shiftCarousel = useCallback(
    (direction) => {
      // Shift the visible window by one card in `direction`.
      // Steps:
      // 1) guard early (no-op if animating or insufficient data)
      // 2) set active direction to influence which extra card is rendered
      // 3) animate track (framer-motion controls)
      // 4) when animation completes, update currentIndex and reset track
      // This avoids a big re-layout and keeps the visual motion smooth.
      if (
        totalCollections <= 1 ||
        !cardWidth ||
        !travelDistance ||
        animatingRef.current
      ) {
        return;
      }

      setHoverIndex(-1);
      flushSync(() => {
        setActiveDirection(direction > 0 ? "next" : "prev");
      });
      animatingRef.current = true;

      const base = baseOffsetRef.current;
      const startX = base;
      const target =
        direction === -1 ? base + travelDistance : base - travelDistance;

      controls.set({ x: startX });

      controls
        .start({
          x: target,
          transition: { duration: 0.45, ease: "easeInOut" },
        })
        .then(() => {
          flushSync(() => {
            setCurrentIndex((prev) =>
              (prev + direction + totalCollections) % totalCollections
            );
          });
          const latestBase = baseOffsetRef.current;
          controls.set({ x: latestBase });
        })
        .catch(() => {})
        .finally(() => {
          animatingRef.current = false;
          wheelDeltaRef.current = 0;
          setActiveDirection(null);
        });
    },
    [cardWidth, controls, totalCollections, travelDistance]
  );

  const handleNext = useCallback(() => {
    shiftCarousel(1);
  }, [shiftCarousel]);

  const handlePrev = useCallback(() => {
    shiftCarousel(-1);
  }, [shiftCarousel]);

  const handleWheel = useCallback(
    (event) => {
      if (totalCollections <= 1 || !travelDistance || animatingRef.current) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
      if (!delta) return;

      wheelDeltaRef.current += delta;
      const threshold = 40;

      if (wheelDeltaRef.current <= -threshold) {
        event.preventDefault();
        wheelDeltaRef.current = 0;
        handlePrev();
        return;
      }

      if (wheelDeltaRef.current >= threshold) {
        event.preventDefault();
        wheelDeltaRef.current = 0;
        handleNext();
      }
    },
    [handleNext, handlePrev, totalCollections, travelDistance]
  );

  return (
    <DefaultLayout page={page}>
      <LayoutGroup id="collection-layout">
        <div className="flex flex-col h-screen items-center justify-center w-full">
          <div className="relative w-full" ref={containerRef}>
            {totalCollections > 0 && cardWidth > 0 && (
              <>
                <div className="w-full" onWheel={handleWheel}>
                  <motion.ul
                    className="relative flex flex-nowrap items-stretch"
                    style={{
                      gap: `${cardGap}px`,
                      width: trackWidth ? `${trackWidth}px` : "auto",
                    }}
                    initial={false}
                    animate={controls}
                  >
                    {displayedCollections.map(
                      ({ collection, absoluteIndex, offset }) => {
                        const imageCount = collection.imageCount || 0;
                        const imageId = getImageId(collection.firstImagePath);
                        const aspectStyle =
                          collection.width && collection.height
                            ? { aspectRatio: `${collection.width} / ${collection.height}` }
                            : { aspectRatio: "4 / 3" };

                        const isCore = offset >= coreMin && offset <= coreMax;
                        const isLeadingExtra = offset === coreMin - 1;
                        const isTrailingExtra = offset === coreMax + 1;
                        const shouldShow =
                          isCore ||
                          (activeDirection === "prev" && isLeadingExtra) ||
                          (activeDirection === "next" && isTrailingExtra);
                        const introOrder = coreOffsets.indexOf(offset);
                        const introDelay = introOrder >= 0 ? introOrder * 0.08 : 0;

                        if (!shouldShow) {
                          return null;
                        }

                        const baseStyles = {
                          flex: "0 0 auto",
                          width: `${cardWidth}px`,
                          minWidth: `${cardWidth}px`,
                          overflow: "visible",
                        };

                        if (isLeadingExtra && activeDirection === "prev") {
                          const offsetDistance =
                            travelDistance || cardWidth + cardGap;
                          Object.assign(baseStyles, {
                            position: "absolute",
                            left: `-${offsetDistance}px`,
                            top: 0,
                            pointerEvents: "none",
                          });
                        }

                        return (
                          <motion.li
                            key={`${offset}-${collection.slug}-${absoluteIndex}`}
                            data-collection={collection.slug}
                            className="flex flex-col items-center text-right relative group"
                            style={baseStyles}
                            onMouseEnter={() => handleMouseEnter(absoluteIndex)}
                            onMouseLeave={handleMouseLeave}
                          >
                            <motion.div
                              className="w-full"
                              initial={
                                introState === INTRO_DONE
                                  ? false
                                  : { opacity: 0, y: 16 }
                              }
                              animate={
                                introState === INTRO_IDLE
                                  ? { opacity: 0, y: 16 }
                                  : { opacity: 1, y: 0 }
                              }
                              transition={
                                introState === INTRO_PLAYING && introOrder !== -1
                                  ? {
                                      duration: 0.45,
                                      ease: "easeOut",
                                      delay: introDelay,
                                    }
                                  : { duration: 0.25, ease: "easeOut" }
                              }
                            >
                              <Link href={`/collection/${collection.slug}`}>
                                <motion.div
                                  // keep the card wrapper as a normal element (no layout),
                                  // to avoid extra shared-element matches that interfere with the carousel.
                                  whileHover={{ scale: 1.03 }}
                                  transition={{ scale: { duration: 0.2 } }}
                                  className="flex flex-col items-center w-full"
                                  style={{ transformOrigin: "50% 0%" }}
                                >
                                  <span
                                    className={`absolute left-0 -top-6 text-xs text-black bg-white bg-opacity-80 py-1 rounded pointer-events-none transition-opacity duration-200 ${
                                      hoverIndex === absoluteIndex
                                        ? "opacity-100"
                                        : "opacity-0"
                                    }`}
                                    style={{ zIndex: 2 }}
                                  >
                                    {collection.title}
                                  </span>
                                  <motion.div
                                    // single shared element for image transitions
                                    layoutId={`image-media-${imageId}`}
                                    transition={{ duration: 0.45, ease: "easeInOut" }}
                                    className="flex items-center justify-center w-full min-w-0"
                                    style={{
                                      // enforce identical aspect box on thumb and detail
                                      ...aspectStyle,
                                      width: "100%",
                                      height: "100%",
                                      transformOrigin: "50% 0%",
                                      willChange: "transform, opacity",
                                      WebkitBackfaceVisibility: "hidden",
                                      backfaceVisibility: "hidden",
                                    }}
                                  >
                                    <MemoizedExportedImage
                                      src={collection.firstImagePath}
                                      alt={collection.firstImageAlt || "Collection image"}
                                      width={collection.width}
                                      height={collection.height}
                                      // image fills the aspect box so ratio remains constant
                                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                    />
                                  </motion.div>
                                   <div className="flex flex-row justify-end w-full">
                                     <span className="mt-2 text-xs text-gray-700 font-mono">
                                       1/{imageCount}
                                     </span>
                                   </div>
                                </motion.div>
                              </Link>
                            </motion.div>
                          </motion.li>
                        );
                      }
                    )}
                  </motion.ul>
                </div>
                {totalCollections > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="hidden md:flex bg-white p-2 absolute left-8 top-1/2 -translate-y-1/2 text-xs uppercase tracking-widest"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="hidden md:flex bg-white p-2 absolute right-8 top-1/2 -translate-y-1/2 text-xs uppercase tracking-widest"
                    >
                      Next
                    </button>
                  </>
                )}
              </>
            )}

            {totalCollections > 1 && (
              <div className="md:hidden w-full mt-6 flex justify-between px-2 gap-4 text-xs uppercase tracking-widest">
                <button type="button" onClick={handlePrev}>
                  P
                </button>
                <button type="button" onClick={handleNext}>
                  N
                </button>
              </div>
            )}
          </div>
        </div>
      </LayoutGroup>
    </DefaultLayout>
  );
}

export default React.memo(HomePage);

export async function getStaticProps() {
  const page = await filer.getItem("index-grid.md", { folder: "pages" });
  const collections = [];

  for (const collectionPath of page.data.collections) {
    const correctedPath = collectionPath.replace(/^content\//, "");
    const collection = await filer.getItem(correctedPath, { folder: "" });

    let photoBlocks = [];
    if (Array.isArray(collection.data.content_blocks)) {
      photoBlocks = collection.data.content_blocks.filter(
        (block) => block && block._bookshop_name === "collection/photo"
      );
    }

    const imageCount = photoBlocks.length;
    const firstPhotoBlock = photoBlocks[0];

    if (firstPhotoBlock && firstPhotoBlock.image_path) {
      try {
        const imagePath = path.join(
          process.cwd(),
          "public",
          firstPhotoBlock.image_path
        );
        const dimensions = sizeOf(imagePath);

        collections.push({
          title: collection.data.title,
          path: correctedPath,
          slug: collection.data.slug || correctedPath.split("/").pop(),
          firstImagePath: firstPhotoBlock.image_path,
          firstImageAlt: firstPhotoBlock.alt_text || "Default Alt Text",
          width: dimensions.width,
          height: dimensions.height,
          imageCount,
        });
      } catch (error) {
        collections.push({
          title: collection.data.title,
          path: correctedPath,
          slug: collection.data.slug || correctedPath.split("/").pop(),
          firstImagePath: firstPhotoBlock.image_path,
          firstImageAlt: firstPhotoBlock.alt_text || "Default Alt Text",
          width: 480,
          height: 320,
          imageCount,
        });
      }
    } else {
      console.log("No valid images found for:", collection.data.title);
    }
  }

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
      collections,
    },
  };
}
