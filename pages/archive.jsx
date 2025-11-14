import DefaultLayout from "../components/layouts/default";
import Filer from "@cloudcannon/filer";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import sizeOf from "image-size";
import path from "path";
import { useState, useCallback, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import { SharedImageFrame } from "../components/shared/shared-image-frame";
import Blocks from "../components/shared/blocks";

const filer = new Filer({ path: "content" });

const getImageId = (imagePath) => {
  if (!imagePath) return "image-unknown";
  const base = imagePath.split("/").pop() || imagePath;
  return base.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
};

const overlayVariants = {
  hidden: {
    backgroundColor: "rgba(255,255,255,0)",
  },
  show: {
    backgroundColor: "rgba(255,255,255,1)",
    transition: { duration: 0.25 },
  },
  exit: {
    backgroundColor: "rgba(255,255,255,0)",
    transition: { duration: 0.2 },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
  exit: { opacity: 0 },
};

const thumbVariants = {
  hidden: {
    opacity: 0,
    y: 16,
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

function ArchivePage({ page, photos }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayClosing, setOverlayClosing] = useState(false);
  const [direction, setDirection] = useState("");
  const [shouldAnimateThumbs, setShouldAnimateThumbs] = useState(false);
  const [loadedThumbs, setLoadedThumbs] = useState(() => new Set());
  const [shareLayoutMain, setShareLayoutMain] = useState(false);

  const registerThumbLoaded = useCallback((index) => {
    if (typeof index !== "number") return;
    setLoadedThumbs((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const handleOpen = useCallback(
    (index) => {
      const photo = photos[index];
      if (!photo) return;
      setDirection("");
      setActiveIndex(index);
      setOverlayClosing(false);
      setOverlayOpen(true);
      setShareLayoutMain(true);
    },
    [photos]
  );

  const handleClose = useCallback(() => {
    if (activeIndex === null) return;
    setDirection("");
    setShareLayoutMain(true);
    setOverlayOpen(false);
    setOverlayClosing(true);
  }, [activeIndex]);

  const handleNext = useCallback(() => {
    if (!overlayOpen || activeIndex === null || photos.length <= 1) return;
    setShareLayoutMain(false);
    setDirection("right");
    setActiveIndex((idx) => {
      if (idx === null) return idx;
      return (idx + 1) % photos.length;
    });
  }, [overlayOpen, activeIndex, photos.length]);

  const handlePrev = useCallback(() => {
    if (!overlayOpen || activeIndex === null || photos.length <= 1) return;
    setShareLayoutMain(false);
    setDirection("left");
    setActiveIndex((idx) => {
      if (idx === null) return idx;
      return (idx - 1 + photos.length) % photos.length;
    });
  }, [overlayOpen, activeIndex, photos.length]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!overlayOpen) return;
      if (event.key === "Escape") handleClose();
      if (event.key === "ArrowRight") handleNext();
      if (event.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [overlayOpen, handleClose, handleNext, handlePrev]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShouldAnimateThumbs(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (overlayOpen && !overlayClosing) {
      const frame = requestAnimationFrame(() => {
        setShareLayoutMain(false);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [overlayOpen, overlayClosing]);

  useEffect(() => {
    if (!overlayOpen && overlayClosing) {
      const timeout = setTimeout(() => {
        setOverlayClosing(false);
        setActiveIndex(null);
        setDirection("");
        setShareLayoutMain(false);
      }, 450);
      return () => clearTimeout(timeout);
    }
  }, [overlayOpen, overlayClosing]);

  const activePhoto =
    activeIndex !== null && photos[activeIndex] ? photos[activeIndex] : null;

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

  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleNext,
    onSwipedRight: handlePrev,
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  const sliderVisible = overlayOpen || overlayClosing;
  const sliderWrapperProps = overlayClosing ? {} : swipeHandlers;
  const currentBlockIndex =
    typeof activeIndex === "number" && activeIndex >= 0 ? activeIndex : null;
  const activeKey =
    currentBlockIndex !== null && photos[currentBlockIndex]
      ? photos[currentBlockIndex].image_path || currentBlockIndex
      : currentBlockIndex;

  const mainImageContent =
    currentBlockIndex !== null
      ? (
          <Blocks
            content_blocks={photos}
            currentIndex={currentBlockIndex}
            componentProps={() => ({ variant: "main" })}
            render={({ element, block, index }) => (
              <SharedImageFrame
                key={`slider-${index}`}
                layoutId={`image-media-${getImageId(block.image_path)}`}
                block={block}
                variant="main"
                shareLayout={shareLayoutMain}
                hidden={!sliderVisible}
                elevation={sliderVisible ? 200 : undefined}
              >
                {element}
              </SharedImageFrame>
            )}
          />
        )
      : null;

  const MainImageSection =
    sliderVisible && mainImageContent ? (
      <div
        className="relative z-10 flex justify-center items-center h-full w-full p-4 overflow-hidden"
      {...sliderWrapperProps}
      >
          <AnimatePresence custom={direction} initial={false} mode="sync">
            <motion.div
              key={activeKey}
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
      </div>
    ) : null;

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

  return (
    <DefaultLayout page={page}>
      <LayoutGroup id="archive-layout" crossfade={false}>
        <div className="h-full overflow-y-scroll p-4 md:p-16 mt-8 md:mt-0">
          <motion.ul
            className="grid grid-cols-4 lg:grid-cols-6 gap-16 lg:gap-36 justify-items-center items-center w-full"
            variants={containerVariants}
            initial="hidden"
            animate={shouldAnimateThumbs ? "show" : "hidden"}
          >
            <Blocks
              content_blocks={photos}
              componentProps={thumbComponentProps}
              render={({ element, block, index }) => {
                const imageId = getImageId(block.image_path);
                const layoutId = `image-media-${imageId}`;
                const isActiveThumb = index === activeIndex;
                const hideThumb = overlayOpen && isActiveThumb;
                const thumbReady = shouldAnimateThumbs && loadedThumbs.has(index);
                const thumbZIndex =
                  isActiveThumb && (overlayOpen || overlayClosing) ? 40 : undefined;

                return (
                  <motion.li
                    key={`${layoutId}-${index}`}
                    variants={thumbVariants}
                    initial="hidden"
                    animate={thumbReady ? "show" : "hidden"}
                    custom={index}
                    className="relative flex flex-col items-end pb-10"
                    style={{ zIndex: thumbZIndex }}
                  >
                    <motion.button
                      type="button"
                      onClick={() => handleOpen(index)}
                      className="flex h-full flex-col items-center focus:outline-none"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="relative flex items-center justify-center w-full overflow-visible pointer-events-auto h-[100px] lg:h-[160px]">
                        <SharedImageFrame
                          layoutId={layoutId}
                          block={block}
                          variant="thumb"
                          hidden={hideThumb}
                        >
                          {element}
                        </SharedImageFrame>
                      </div>
                    </motion.button>
                    <span className="mt-3 block text-right text-xs tracking-wide">
                      {index + 1}
                    </span>
                  </motion.li>
                );
              }}
            />
          </motion.ul>
        </div>

        {sliderVisible && activePhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              className="absolute inset-0 bg-white"
              variants={overlayVariants}
              initial="hidden"
              animate={overlayOpen ? "show" : "exit"}
              style={{ pointerEvents: overlayOpen ? "auto" : "none" }}
            />

            <div className="relative flex h-full w-full items-center justify-center">
              <div
                className="absolute inset-0"
                onClick={(event) => {
                  event.stopPropagation();
                  handleClose();
                }}
                aria-hidden="true"
              />
              <div className="absolute top-6 left-6 text-xs lowercase tracking-widest pointer-events-none z-[70]">
                {activePhoto.alt_text || "Untitled"}
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleClose();
                }}
                className="absolute top-6 right-6 text-xs uppercase tracking-widest pointer-events-auto z-[70]"
              >
                CLOSE
              </button>
              {photos.length > 1 && overlayOpen && (
                <>
                  <div className="flex absolute inset-y-0 left-0 w-1/2 items-center justify-start pointer-events-auto z-30">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handlePrev();
                      }}
                      className="text-xs uppercase tracking-widest transition-opacity duration-200 px-3 py-1 bg-white bg-opacity-80"
                    >
                      <span className="hidden md:block">Prev</span>
                      <span className="md:hidden">P</span>
                    </button>
                  </div>
                  <div className="flex absolute inset-y-0 right-0 w-1/2 items-center justify-end pointer-events-auto z-30">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleNext();
                      }}
                      className="text-xs uppercase tracking-widest transition-opacity duration-200 px-3 py-1 bg-white bg-opacity-80"
                    >
                      <span className="hidden md:block">Next</span>
                      <span className="md:hidden">N</span>
                    </button>
                  </div>
                </>
              )}

              {MainImageSection}
            </div>
          </div>
        )}
      </LayoutGroup>
    </DefaultLayout>
  );
}

export default ArchivePage;

export async function getStaticProps() {
  const page = await filer.getItem("archive.md", { folder: "pages" });
  const photos = (page.data.content_blocks || [])
    .filter(
      (block) =>
        block?._bookshop_name === "collection/photo" && block.image_path
    )
    .map((block) => {
      try {
        const imagePath = path.join(process.cwd(), "public", block.image_path);
        const { width = 200, height = 300 } = sizeOf(imagePath);
        return {
          _bookshop_name: "collection/photo",
          image_path: block.image_path,
          alt_text: block.alt_text || "Archive image",
          width,
          height,
        };
      } catch {
        return {
          _bookshop_name: "collection/photo",
          image_path: block.image_path,
          alt_text: block.alt_text || "Archive image",
          width: 400,
          height: 300,
        };
      }
    });

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
      photos,
    },
  };
}
