import DefaultLayout from "../components/layouts/default";
import Filer from "@cloudcannon/filer";
import { motion, AnimatePresence } from "framer-motion";
import ExportedImage from "next-image-export-optimizer";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useRouter } from "next/router";
import React from "react";
import sizeOf from "image-size";
import path from "path";

const filer = new Filer({ path: "content" });

const MemoizedExportedImage = memo(({ src, alt, width, height }) => (
  <ExportedImage
    src={src}
    alt={alt}
    priority
    width={width}
    height={height}
    style={{ objectFit: "cover" }}
    sizes="(max-width: 480px) 50vw, 300px"
  />
));
MemoizedExportedImage.displayName = "MemoizedExportedImage";

function HomePage({ page, collections }) {
  const router = useRouter();
  const [hoverIndex, setHoverIndex] = useState(-1);
  const hoverRefs = useRef([]);
  const titleRefs = useRef([]);
  const [visibleIndices, setVisibleIndices] = useState(new Set());

  useEffect(() => {
    const handleRouteChange = () => {
      console.log("Route change complete");
    };

    router.events.on("routeChangeComplete", handleRouteChange);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  useEffect(() => {
    hoverRefs.current.forEach((ref) => {
      if (ref) {
        ref.style.setProperty("transform-origin", "top left", "important");
      }
    });
  }, [hoverIndex, collections.length]);

  const handleMouseEnter = useCallback((index) => {
    setHoverIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(-1);
  }, []);

  const getMaxWidthClass = (totalItems) => {
    return `sm:max-w-[calc((100%-${totalItems - 1}*1rem)/${totalItems})]`;
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const newVisibleIndices = new Set(visibleIndices);
        entries.forEach((entry) => {
          const index = parseInt(entry.target.dataset.index, 10);
          if (entry.isIntersecting) {
            newVisibleIndices.add(index);
          } else {
            newVisibleIndices.delete(index);
          }
        });
        if (newVisibleIndices.size !== visibleIndices.size) {
          setVisibleIndices(newVisibleIndices);
        }
      },
      {
        rootMargin: "-10% 0px -10% 0px", // Adjust root margin to trigger 20% from top and bottom
        threshold: [0, 1], // Detect when the title is fully in view and fully out of view
      }
    );

    titleRefs.current.forEach((ref, index) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      titleRefs.current.forEach((ref) => {
        if (ref) {
          observer.unobserve(ref);
        }
      });
    };
  }, [collections.length, visibleIndices]);

  const gridVariants = {
    hidden: { opacity: 0 },
    visible: (index) => ({
      opacity: 1,
      transition: {
        duration: 0.5,
        delay: index * 0.1,
      },
    }),
  };

  return (
    <DefaultLayout page={page}>
      <div className="pl-4 pr-3 sm:pr-4 pt-4 pb-36 sm:pb-4 borderoverflow-y-auto h-screen max-w-7xl ml-auto mr-auto mt-20">
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-24 items-end sm:items-start">
          <AnimatePresence>
            {collections.map((collection, collectionIndex) => {
              const maxWidthClass = getMaxWidthClass(collections.length);
              const imageCount = collection.imageCount || 0;
              return (
                <motion.li
                  key={collectionIndex}
                  className={`flex-1 ${maxWidthClass} text-right relative group`}
                  onMouseEnter={() => handleMouseEnter(collectionIndex)}
                  onMouseLeave={handleMouseLeave}
                  ref={(el) => (hoverRefs.current[collectionIndex] = el)}
                  data-index={collectionIndex}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  custom={collectionIndex}
                  variants={gridVariants}
                >
                  <Link href={`/collection/${collection.slug}`} passHref>
                    <motion.div
                      layoutId={`collection-${collection.slug}`}
                      whileHover={{ scale: 1.1 }}
                      transition={{
                        scale: { duration: 0.2 },
                      }}
                      style={{ originX: "50%", originY: 0 }}
                      className="flex flex-col relative"
                    >
                      <span
                        className={`absolute left-0 -top-6 text-xs text-black bg-white bg-opacity-80 py-1 rounded pointer-events-none transition-opacity duration-200
                          ${
                            hoverIndex === collectionIndex
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        style={{ zIndex: 2 }}
                      >
                        {collection.title}
                      </span>
                      <div
                        className="relative w-full"
                        style={{
                          paddingTop: `${
                            (collection.height / collection.width) * 100
                          }%`,
                        }}
                      >
                        <motion.div
                          className="absolute top-0 left-0 w-full h-full"
                          layoutId={`image-${collection.slug}`}
                        >
                          <MemoizedExportedImage
                            src={collection.firstImagePath}
                            alt={collection.firstImageAlt || "Collection image"}
                            width={collection.width}
                            height={collection.height}
                            sizes="(max-width: 640px) 50vw, 16vw"
                          />
                        </motion.div>
                      </div>
                      <div className="flex flex-row justify-end">
                        <span className="mt-2 text-xs text-gray-700 font-mono">
                          1/{imageCount}
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
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
