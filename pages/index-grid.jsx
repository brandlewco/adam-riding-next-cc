import DefaultLayout from "../components/layouts/default";
import Filer from "@cloudcannon/filer";
import { motion, LayoutGroup, useAnimationControls } from "motion/react";
import ExportedImage from "next-image-export-optimizer";
import Link from "next/link";
import { useState, useCallback, useMemo, useEffect, useRef, memo } from "react";
import { flushSync } from "react-dom";
import React from "react";
import sizeOf from "image-size";
import path from "path";

const filer = new Filer({ path: "content" });

const INTRO_IDLE = "idle";
const INTRO_PLAYING = "playing";
const INTRO_DONE = "done";
const INTRO_DURATION = 0.33;
const INTRO_STAGGER = 0.05;

const getImageId = (imagePath) => {
  if (!imagePath) return "image-unknown";
  const base = imagePath.split("/").pop() || imagePath;
  return base.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
};

const introVariants = {
  hidden: { opacity: 0, y: 0 },
  visible: (order) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: INTRO_DURATION,
      delay: order * INTRO_STAGGER,
      ease: "easeOut",
    },
  }),
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
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeDirection, setActiveDirection] = useState(null);
  const controls = useAnimationControls();
  const totalCollections = collections.length;
  const containerRef = useRef(null);
  const animatingRef = useRef(false);
  const baseOffsetRef = useRef(0);
  const wheelDeltaRef = useRef(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Drive the intro fade so the track settles before the cards become visible.
  const [introState, setIntroState] = useState(INTRO_IDLE);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries.length) return;
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const CARD_GAP_DESKTOP = 120;
  const CARD_GAP_MOBILE = 32;
  const MIN_CARD_WIDTH = 200;
  const MAX_CARD_WIDTH = 720;

  const showPeeking = totalCollections >= 8;
  const visibleCount =
    totalCollections === 0
      ? 0
      : showPeeking
      ? 8
      : Math.min(totalCollections, 8);
  const isMobile = containerWidth && containerWidth < 768;
  const cardGap = isMobile ? CARD_GAP_MOBILE : CARD_GAP_DESKTOP;

  // Derive a fixed card width so six cards stay visible with the outer two peeking in.
  let computedWidth = 0;
  if (containerWidth && visibleCount > 0) {
    if (showPeeking) {
      computedWidth = (containerWidth - 7 * cardGap) / 7;
    } else {
      computedWidth =
        (containerWidth - (visibleCount - 1) * cardGap) / visibleCount;
    }
  }
  if (!Number.isFinite(computedWidth) || computedWidth <= 0) {
    computedWidth =
      containerWidth && visibleCount
        ? containerWidth / Math.max(visibleCount, 1)
        : 0;
  }

  let cardWidth = containerWidth ? computedWidth : 0;
  if (containerWidth) {
    const maxAllowed = Math.min(MAX_CARD_WIDTH, containerWidth);
    if (showPeeking) {
      const peekMin = Math.min(
        120,
        containerWidth / Math.max(visibleCount || 1, 1)
      );
      cardWidth = Math.max(cardWidth, peekMin);
    } else {
      const standardMin = Math.min(
        MIN_CARD_WIDTH,
        containerWidth / Math.max(visibleCount || 1, 1)
      );
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
    return extraOffsets.map((offset, slotIndex) => {
      const normalizedIndex =
        (currentIndex + offset + totalCollections) % totalCollections;
      return {
        collection: collections[normalizedIndex],
        absoluteIndex: normalizedIndex,
        offset,
        slotId: `slot-${slotIndex}`,
      };
    });
  }, [collections, currentIndex, extraOffsets, totalCollections]);

  // Keep the carousel shifted so the edge cards remain half visible while idling.
  const baseOffset = useMemo(() => {
    if (!showPeeking || !cardWidth || !visibleCount || !containerWidth)
      return 0;
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
    return Math.max(
      lowerBound + epsilon,
      Math.min(upperBound - epsilon, midpoint)
    );
  }, [cardGap, cardWidth, containerWidth, showPeeking, visibleCount]);

  useEffect(() => {
    controls.set({ x: baseOffset || 0 });
  }, [baseOffset, controls]);

  useEffect(() => {
    baseOffsetRef.current = baseOffset || 0;
  }, [baseOffset]);

  // Start intro animation once cardWidth is ready (layout settled)
  useEffect(() => {
    if (!cardWidth || introState !== INTRO_IDLE) return;

    setIntroState(INTRO_PLAYING);

    const timeout = setTimeout(() => {
      setIntroState(INTRO_DONE);
    }, 900);

    return () => {
      clearTimeout(timeout);
    };
  }, [cardWidth, introState]);

  const handleMouseEnter = useCallback((absoluteIndex) => {
    setHoverIndex(absoluteIndex);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(-1);
  }, []);

  const shiftCarousel = useCallback(
    (direction) => {
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
      if (totalCollections <= 1 || !travelDistance || animatingRef.current)
        return;
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
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
                      ({ collection, absoluteIndex, offset, slotId }) => {
                        const imageCount = collection.imageCount || 0;
                        const imageId = getImageId(collection.firstImagePath);
                        const aspectStyle =
                          collection.width && collection.height
                            ? {
                                aspectRatio: `${collection.width} / ${collection.height}`,
                              }
                            : { aspectRatio: "4 / 3" };

                        const isCore = offset >= coreMin && offset <= coreMax;
                        const isLeadingExtra = offset === coreMin - 1;
                        const isTrailingExtra = offset === coreMax + 1;
                        const isExtra = isLeadingExtra || isTrailingExtra;
                        const shouldShow =
                          !isExtra ||
                          (isLeadingExtra && activeDirection === "prev") ||
                          (isTrailingExtra && activeDirection === "next");

                        const introOrder = coreOffsets.indexOf(offset);
                        const shouldAnimateIntro = introOrder >= 0;
                        const introMotionProps = shouldAnimateIntro
                          ? {
                              variants: introVariants,
                              initial: "hidden",
                              animate:
                                introState === INTRO_IDLE
                                  ? "hidden"
                                  : "visible",
                              custom: introOrder,
                            }
                          : { initial: false };

                        const baseStyles = {
                          flex: "0 0 auto",
                          width: `${cardWidth}px`,
                          minWidth: `${cardWidth}px`,
                          overflow: "visible",
                          pointerEvents: isExtra ? "none" : "auto",
                        };

                        if (isExtra && !shouldShow) {
                          baseStyles.display = "none";
                        } else if (isLeadingExtra) {
                          const offsetDistance =
                            travelDistance || cardWidth + cardGap;
                          Object.assign(baseStyles, {
                            position: "absolute",
                            left: `-${offsetDistance}px`,
                            top: 0,
                          });
                        }

                        return (
                          <motion.li
                            key={slotId}
                            data-collection={collection.slug}
                            className="flex flex-col items-center text-right relative group"
                            style={baseStyles}
                            onMouseEnter={() => handleMouseEnter(absoluteIndex)}
                            onMouseLeave={handleMouseLeave}
                          >
                            <motion.div className="w-full" {...introMotionProps}>
                              <Link href={`/collection/${collection.slug}`}>
                                <motion.div
                                  layout
                                  layoutId={`image-card-${imageId}`}
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
                                    layout
                                    layoutId={`image-media-${imageId}`}
                                    transition={{
                                      duration: 0.45,
                                      ease: "easeInOut",
                                    }}
                                    className="flex items-center justify-center w-full"
                                    style={{
                                      ...aspectStyle,
                                      width: "100%",
                                      transformOrigin: "50% 0%",
                                    }}
                                  >
                                    <MemoizedExportedImage
                                      src={collection.firstImagePath}
                                      alt={
                                        collection.firstImageAlt ||
                                        "Collection image"
                                      }
                                      width={collection.width}
                                      height={collection.height}
                                      style={{ height: "100%" }}
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
                      className="hidden md:flex text-white absolute left-4 top-1/2 -translate-y-1/2 text-xs uppercase tracking-widest"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="hidden md:flex text-white absolute right-4 top-1/2 -translate-y-1/2 text-xs uppercase tracking-widest"
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
