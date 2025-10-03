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
    width={192}
    height={192}
    className="object-contain w-full h-auto"
    sizes="(max-width:640px)30vw,10vw"
  />
));
MemoizedExportedImage.displayName = "MemoizedExportedImage";

function HomePage({ page, collections }) {
  const router = useRouter();
  const [hoverIndex, setHoverIndex] = useState(-1);
  const hoverRefs = useRef([]);
  const visibleCollections = collections.slice(0, 8);

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
  }, [hoverIndex, visibleCollections.length]);

  const handleMouseEnter = useCallback((index) => {
    setHoverIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(-1);
  }, []);

  const gridVariants = {
    hidden: { opacity: 0 },
    visible: (index) => ({
      opacity: 1,
      transition: {
        duration: 0.5,
        delay: index * 0.08,
      },
    }),
  };

  return (
    <DefaultLayout page={page}>
      <div className="flex h-screen items-center justify-center w-full px-4 md:px-16 overflow-x-auto scroll-smooth snap-x snap-mandatory">
          <ul className="flex items-center gap-8 md:gap-16 px-[12vw] py-8">
            <AnimatePresence>
              {visibleCollections.map((collection, collectionIndex) => {
                const imageCount = collection.imageCount || 0;
                const edgeOffsetClass =
                  collectionIndex === 0
                    ? "-ml-[10vw]"
                    : collectionIndex === visibleCollections.length - 1
                    ? "mr-[10vw]"
                    : "";
                return (
                  <motion.li
                    key={collectionIndex}
                    className={`snap-start flex flex-col items-center text-right relative group min-w-[18vw] md:min-w-[12vw] ${edgeOffsetClass}`}
                    onMouseEnter={() => handleMouseEnter(collectionIndex)}
                    onMouseLeave={handleMouseLeave}
                    ref={(el) => (hoverRefs.current[collectionIndex] = el)}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    custom={collectionIndex}
                    variants={gridVariants}
                  >
                    <Link href={`/collection/${collection.slug}`} passHref>
                      <motion.div
                        layoutId={`collection-${collection.slug}`}
                        whileHover={{ scale: 1.06 }}
                        transition={{ scale: { duration: 0.2 } }}
                        className="flex flex-col relative"
                      >
                        <span
                          className={`absolute left-0 -top-6 text-xs text-black bg-white bg-opacity-80 py-1 px-2 rounded pointer-events-none transition-opacity duration-200 ${
                            hoverIndex === collectionIndex
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        >
                          {collection.title}
                        </span>
                        <motion.div layoutId={`image-${collection.slug}`}>
                          <MemoizedExportedImage
                            src={collection.firstImagePath}
                            alt={collection.firstImageAlt || "Collection image"}
                          />
                        </motion.div>
                        <span className="mt-2 text-xs text-gray-700 font-mono">
                          1/{imageCount}
                        </span>
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
