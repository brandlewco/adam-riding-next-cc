import DefaultLayout from "../components/layouts/default";
import Filer from "@cloudcannon/filer";
import { motion, AnimatePresence } from "framer-motion";
import ExportedImage from "next-image-export-optimizer";
import { useState, useCallback, useEffect, useRef, memo } from "react";
import { useRouter } from "next/router";
import { useSwipeable } from "react-swipeable";
import { useInView } from "react-intersection-observer"; // Import useInView

const filer = new Filer({ path: "content" });

const MemoizedExportedImage = memo(
  ({ src, alt, width, height, className, style, sizes, ...rest }) => (
    <ExportedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      className={className}
      style={style}
      sizes={sizes}
      {...rest} // Pass any additional props
    />
  )
);
MemoizedExportedImage.displayName = "MemoizedExportedImage";

function ArchivePage({ page, photos }) {
  const [currentImage, setCurrentImage] = useState(null);
  const [direction, setDirection] = useState("");
  const router = useRouter();

  const handleImageClick = useCallback((index) => {
    setCurrentImage(index);
    setDirection("");
  }, []);

  const handleNavigation = useCallback(
    (direction) => {
      setDirection(direction);
      setCurrentImage((prevIndex) => {
        if (direction === "right") {
          return (prevIndex + 1) % photos.length;
        } else if (direction === "left") {
          return (prevIndex - 1 + photos.length) % photos.length;
        }
        return prevIndex;
      });
    },
    [photos.length]
  );

  const handleClose = useCallback(() => {
    setCurrentImage(null);
  }, []);

  useEffect(() => {
    const handleRouteChange = (url) => {
      if (url === "/archive") {
        handleClose();
      }
    };

    router.events.on("routeChangeStart", handleRouteChange);

    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router, handleClose]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "ArrowRight") {
        handleNavigation("right");
      } else if (event.key === "ArrowLeft") {
        handleNavigation("left");
      }
    },
    [handleNavigation]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleNavigation("right"),
    onSwipedRight: () => handleNavigation("left"),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  // Variants for the overall expanded view container (used for showing and hiding)
  const expandedViewVariants = {
    enter: { opacity: 0 },
    center: {
      opacity: 1,
      transition: {
        opacity: { duration: 0.3 },
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.3 },
    },
  };

  // Variants for the image navigation inside the expanded view (left and right movement)
  const navigationVariants = {
    enter: (direction) => ({
      opacity: 0,
      x: direction === "left" ? "100%" : direction === "right" ? "-100%" : 0,
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
        opacity: { duration: 0.6, ease: "easeOut" },
      },
    },
    exit: (direction) => ({
      opacity: 0,
      x: direction === "left" ? "-100%" : direction === "right" ? "100%" : 0,
      transition: {
        opacity: { duration: 0.3 },
      },
    }),
  };
  const gridVariants = {
    hidden: { opacity: 0, transform: "none" },
    visible: (index) => ({
      opacity: 1,
      transform: "none",
      transition: {
        duration: 0.33,
        delay: 0.3 + index * 0.03,
      },
    }),
  };

  return (
    <DefaultLayout page={page}>
      <div
        className={`h-screen ${
          currentImage !== null
            ? "overflow-hidden p-0"
            : "overflow-y-auto overflow-x-hidden pt-4 pl-4 pr-3 pb-24"
        }`}
      >
        <ul className="grid grid-cols-3 sm:grid-cols-[repeat(9,minmax(0,1fr))] gap-4 gap-y-24">
          <AnimatePresence>
            {photos.map((photo, index) => (
              <motion.li
                key={index}
                initial="hidden"
                animate="visible"
                exit="exit"
                custom={index}
                variants={gridVariants}
                className={`flex justify-center items-start ${
                  currentImage !== null ? "hidden" : ""
                } relative cursor-pointer transition-transform duration-200`}
                style={{
                  alignItems: "flex-start",
                  transform: "none !important",
                  transformOrigin: "top center !important",
                }}
                onClick={() => handleImageClick(index)}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.33 }}
                  whileHover={{ scale: 1.1 }}
                  className="relative origin-center origin-top"
                >
                  <MemoizedExportedImage
                    src={photo.image_path}
                    alt={photo.alt_text || "Photo image"}
                    width={photo.width}
                    height={photo.height}
                    sizes="(max-width: 640px) 30vw, 12vw"
                    className="object-contain h-auto w-full"
                    loading="lazy"
                  />
                </motion.div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {/* Expanded Image View */}
        <AnimatePresence custom={direction} mode="wait">
          {currentImage !== null && (
            <motion.div
              key={currentImage}
              layoutId={`image-${photos[currentImage].slug}-${photos[currentImage].image_path}`}
              variants={expandedViewVariants}
              initial="enter"
              animate="center"
              exit="exit"
              custom={direction}
              className="fixed flex flex-col sm:flex-row flex-end w-full transform-none z-50 overflow-x-hidden p-4 mt-8 sm:mt-0"
              {...swipeHandlers}
            >
              <motion.section
                className="photo flex flex-col items-end w-auto relative overflow-hidden"
                style={{ height: "100vh", width: "100%", maxWidth: "100vw" }}
                variants={navigationVariants}
                initial="enter"
                animate="center"
                exit="exit"
                custom={direction}
              >
                <MemoizedExportedImage
                  src={photos[currentImage].image_path}
                  alt={photos[currentImage].alt_text || "Expanded image"}
                  width={photos[currentImage].width}
                  height={photos[currentImage].height}
                  sizes="(max-width: 640px) 100vw, 30vw"
                  className="md:h-85vh w-full md:w-auto self-end"
                  style={{
                    objectFit: "contain",
                    transform: "none",
                  }}
                  loading="lazy"
                />
                <div className="text-sm mt-2 self-end">
                  {photos[currentImage].alt_text || "Expanded image"}
                </div>
              </motion.section>

              {/* Navigation Controls */}
              <div
                className="fixed top-0 left-0 h-full w-1/6 md:w-1/2 cursor-pointer clickable-area"
                onClick={() => handleNavigation("left")}
                id="click-left"
              ></div>
              <div
                className="fixed top-0 right-0 h-full w-1/6 cursor-pointer clickable-area"
                onClick={() => handleNavigation("right")}
                id="click-right"
              ></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close Button - Fixed outside the expanded image */}
        {currentImage !== null && (
          <div
            className="absolute text-sm cursor-pointer uppercase p-4 top-0 left-0 z-50"
            onClick={handleClose}
          >
            CLOSE
          </div>
        )}
      </div>
    </DefaultLayout>
  );
}

export default ArchivePage;

export async function getStaticProps() {
  const page = await filer.getItem("archive.md", { folder: "pages" });
  const photos = [];

  for (const photoBlock of page.data.content_blocks) {
    if (
      photoBlock._bookshop_name === "collection/photo" &&
      photoBlock.image_path
    ) {
      // Adjust image_path to be relative to 'public' directory
      photos.push({
        title: photoBlock.title || null,
        slug: photoBlock.slug || null,
        image_path: photoBlock.image_path,
        alt_text: photoBlock.alt_text || "Photo image",
        width: photoBlock.width || 800,
        height: photoBlock.height || 600,
      });
    }
  }

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
      photos,
    },
  };
}
