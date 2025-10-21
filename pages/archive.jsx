import DefaultLayout from "../components/layouts/default";
import Filer from "@cloudcannon/filer";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import ExportedImage from "next-image-export-optimizer";
import sizeOf from "image-size";
import path from "path";
import { useState, useCallback, useEffect } from "react";
import { useSwipeable } from "react-swipeable";

// Page: Archive gallery
// - Renders a grid of archived photos.
// - Clicking a thumbnail opens a crossfading/lightbox overlay.
// - Supports keyboard navigation, swipe gestures, and shared-element transitions
//   (the image's `layoutId` is used to animate between the thumb and the overlay).

const filer = new Filer({ path: "content" });

const getImageId = (imagePath) => {
  if (!imagePath) return "image-unknown";
  const base = imagePath.split("/").pop() || imagePath;
  return base.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
};

const overlayVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
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
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.33 },
  },
  exit: { opacity: 0 },
};

const CLOSE_ANIMATION_TIMEOUT = 520;

function ArchivePage({ page, photos }) {
  // Lightbox / overlay state summary:
  // - currentIndex: index of photo shown in overlay, null when closed
  // - sharedId: used to keep a consistent layoutId for shared-element transitions
  // - closingToThumb / pendingClose: flags to drive the closing animation and cleanup
  // - shouldAnimateThumbs: small hydration-driven flag to trigger staggered thumb animation

  const [currentIndex, setCurrentIndex] = useState(null);
  const [direction, setDirection] = useState("");
  const [hoverHalf, setHoverHalf] = useState(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [sharedId, setSharedId] = useState(null);
  const [closingToThumb, setClosingToThumb] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  const [shouldAnimateThumbs, setShouldAnimateThumbs] = useState(false);
  const [isSharedTransition, setIsSharedTransition] = useState(false);
  const [transitionType, setTransitionType] = useState("shared"); // "shared" or "slider"

  const handleOpen = useCallback(
    (index) => {
      // Open the overlay:
      // - set sharedId to the thumbnail id so the motion `layoutId` can match
      // - set transitionType to "shared" for shared-element animation
      const imageId = getImageId(photos[index].image_path);
      setSharedId(imageId);
      setTransitionType("shared"); // Shared-element animation
      setClosingToThumb(false);
      setPendingClose(false);
      setCurrentIndex(index);
      setDirection("");
    },
    [photos]
  );

  const handleClose = useCallback(() => {
    // Close the overlay:
    // - set sharedId so the overlay can animate back to the thumb's layoutId
    // - set transitionType to "shared" for shared-element animation
    if (currentIndex === null) return;
    const imageId = getImageId(photos[currentIndex].image_path);
    setSharedId(imageId);
    setTransitionType("shared"); // Shared-element animation
    setClosingToThumb(true);
    setPendingClose(true);
  }, [currentIndex, photos]);

  const handleNext = useCallback(() => {
    // Slider-only transition: set transitionType to "slider"
    if (!photos.length) return;
    setSharedId(null);
    setTransitionType("slider"); // Slider-only animation
    setClosingToThumb(false);
    setPendingClose(false);
    setDirection("right");
    setCurrentIndex((idx) => (idx + 1) % photos.length);
  }, [photos.length]);

  const handlePrev = useCallback(() => {
    // Slider-only transition: set transitionType to "slider"
    if (!photos.length) return;
    setSharedId(null);
    setTransitionType("slider"); // Slider-only animation
    setClosingToThumb(false);
    setPendingClose(false);
    setDirection("left");
    setCurrentIndex((idx) => (idx - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (currentIndex === null) return;
      if (event.key === "Escape") handleClose();
      if (event.key === "ArrowRight") handleNext();
      if (event.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex, handleClose, handleNext, handlePrev]);

  useEffect(() => {
    const media = window.matchMedia("(hover: none) and (pointer: coarse)");
    const updateTouchState = () => setIsTouchDevice(media.matches);
    updateTouchState();
    media.addEventListener("change", updateTouchState);
    const handlePointerDown = (event) => {
      if (event.pointerType === "mouse") setIsTouchDevice(false);
      if (event.pointerType === "touch" || event.pointerType === "pen") {
        setIsTouchDevice(true);
        setHoverHalf(null);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      media.removeEventListener("change", updateTouchState);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!pendingClose || !closingToThumb) return;
    const timer = setTimeout(() => {
      setPendingClose(false);
      setClosingToThumb(false);
      setSharedId(null);
      setCurrentIndex(null);
    }, CLOSE_ANIMATION_TIMEOUT);
    return () => clearTimeout(timer);
  }, [pendingClose, closingToThumb]);

  useEffect(() => {
    // Trigger the stagger animation right after hydration so direct visits match client navigations.
    const frame = requestAnimationFrame(() => setShouldAnimateThumbs(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // After opening via a thumbnail (shared transition), flip to slider mode on the next frame.
// This prevents the first Prev/Next from using a shared-element exit.
useEffect(() => {
  if (currentIndex !== null && transitionType === "shared") {
    const id = requestAnimationFrame(() => {
      setTransitionType("slider");
      // Once we're in slider mode, ensure no shared target is present
      // so pagination never tries to animate back to a thumb.
      setSharedId(null);
    });
    return () => cancelAnimationFrame(id);
  }
}, [currentIndex, transitionType]);


  const activePhoto = currentIndex === null ? null : photos[currentIndex];
  const activeImageId = activePhoto ? getImageId(activePhoto.image_path) : null;
  const isSharedActiveImage =
    Boolean(sharedId) && sharedId === activeImageId && !!activeImageId;
  const showPrevButton = isTouchDevice || hoverHalf === "left";
  const showNextButton = isTouchDevice || hoverHalf === "right";

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

  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleNext,
    onSwipedRight: handlePrev,
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  return (
    <DefaultLayout page={page}>
      <LayoutGroup id="archive-layout" type="crossfade">
        {/* Thumbnails grid */}
        <div className="h-full overflow-y-scroll">
          <motion.ul
            className="grid grid-cols-[repeat(5,minmax(0,1fr))] sm:grid-cols-[repeat(10,minmax(0,1fr))] lg:grid-cols-[repeat(12,minmax(0,1fr))] gap-4 gap-y-16 md:gap-y-32 pt-4 pl-4 pr-3 pb-24"
            variants={containerVariants}
            initial="hidden"
            animate={shouldAnimateThumbs ? "show" : "hidden"}
          >
            {photos.map((photo, index) => {
              const imageId = getImageId(photo.image_path);
              const mediaLayoutId = `image-media-${imageId}`;

              return (
                <motion.li key={index} variants={thumbVariants} className="relative pb-10">
                  <motion.button
                    type="button"
                    onClick={() => handleOpen(index)}
                    className="w-full focus:outline-none"
                  >
                    <motion.div className="w-full" whileHover={{ scale: 1.1 }}>
                      <motion.div layoutId={mediaLayoutId} className="w-full min-w-0">
                        <ExportedImage
                          src={photo.image_path}
                          alt={photo.alt_text || "Archive image"}
                          width={photo.width}
                          height={photo.height}
                          className="w-full h-full object-contain"
                        />
                      </motion.div>
                    </motion.div>
                    <span className="absolute bottom-0 right-0 mt-3 block text-right text-xs tracking-wide">
                      {index + 1}
                    </span>
                  </motion.button>
                </motion.li>
              );
            })}
          </motion.ul>
        </div>

        <AnimatePresence>
          {activePhoto && (
            // Overlay:
            // - full-screen fixed overlay
            // - shared-element transition: overlay image uses same `layoutId` as thumb
            // - swipe / mouse left-right regions and mobile buttons available
            <motion.div
              key="archive-overlay"
              className="fixed inset-0 z-40 flex items-center justify-center bg-white"
              variants={overlayVariants}
              initial="hidden"
              animate="show"
              exit={closingToThumb ? "show" : "exit"}
            >
              <div className="relative flex h-full w-full items-center justify-center">
                <div
                  className="absolute inset-0"
                  onClick={handleClose}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleClose();
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="absolute top-6 right-6 text-xs uppercase tracking-widest pointer-events-auto z-[70]"
                >
                  Close
                </button>
                {photos.length > 1 && (
                  <>
                    <div
                      className="flex absolute inset-y-0 left-0 w-1/2 items-center justify-start pointer-events-auto z-30"
                      onClick={handlePrev}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handlePrev();
                        }}
                        className="text-xs uppercase tracking-widest transition-opacity duration-200 px-3 py-1 bg-white bg-opacity-80"
                      >
                        Prev
                      </button>
                    </div>
                    <div
                      className="flex absolute inset-y-0 right-0 w-1/2 items-center justify-end pointer-events-auto z-30"
                      onClick={handleNext}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleNext();
                        }}
                        className="text-xs uppercase tracking-widest transition-opacity duration-200 px-3 py-1 bg-white bg-opacity-80"
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}

                <AnimatePresence custom={direction} mode="wait">
                  <motion.div
                    key={activePhoto.image_path}
                    variants={internalVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    custom={direction}
                    className="relative z-10 flex justify-center items-center max-h-[85vh] w-full max-w-6xl px-6"
                    {...swipeHandlers}
                  >
                    {/* Apply layoutId only during shared-element transitions */}
                    <motion.div
                        // Only participate in shared-element animation when explicitly in "shared" mode
                        // and only when we have a specific thumbnail to pair with.
                        layoutId={
                          transitionType === "shared" && sharedId
                            ? `image-media-${sharedId}`
                            : undefined
                        }
                        className="relative w-full"
                        style={{
                          aspectRatio: `${activePhoto.width} / ${activePhoto.height}`,
                          maxHeight: "80vh",
                        }}
                        transition={{ duration: 0.45, ease: "easeInOut" }}
                      >
                      <ExportedImage
                        src={activePhoto.image_path}
                        alt={activePhoto.alt_text || "Archive image"}
                        width={activePhoto.width}
                        height={activePhoto.height}
                        className="absolute inset-0 w-full h-full object-contain"
                        style={{ display: "block" }}
                      />
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
        const { width = 400, height = 300 } = sizeOf(imagePath);
        return {
          image_path: block.image_path,
          alt_text: block.alt_text || "Archive image",
          width,
          height,
        };
      } catch {
        return {
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
