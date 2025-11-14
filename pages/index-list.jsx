import DefaultLayout from "../components/layouts/default";
import Filer from "@cloudcannon/filer";
import { motion, AnimatePresence } from "framer-motion";
import ExportedImage from "next-image-export-optimizer";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import React from "react";
import sizeOf from "image-size";
import path from "path";

const filer = new Filer({ path: "content" });

/*
Page: Index (list) overview
- Shows a vertical list of collection titles on the left.
- Hovering a title shows the collection's first image on the right using
  an AnimatePresence fade and a shared layoutId for cross-page animations.
- Key responsibilities: maintain hover refs and
  center/contain preview images at a constrained height (70vh / 85vh).
*/

function IndexPage({ page, collections }) {
  // Hover logic:
  // - hoverIndex: which title is hovered
  // - hoverRefs: DOM refs to the title items used for transform origin tweaks
  const router = useRouter();
  const [hoverIndex, setHoverIndex] = useState(-1);
  const hoverRefs = useRef([]);

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

  const handleMouseEnter = useCallback(
    (index) => {
      setHoverIndex(index);
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(-1);
  }, []);

  const getImageId = (imagePath) => {
    if (!imagePath) return "image-unknown";
    const base = imagePath.split("/").pop() || imagePath;
    return base.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
  };

  return (
    <DefaultLayout page={page}>
      {/* left: titles; right: preview image */}
      <div className="flex flex-col md:flex-row justify-start md:h-screen">
        {/* Titles on the left */}
        <div className="absolute left-0 top-0 w-full p-4 overflow-y-auto">
          <ul className="flex flex-col gap-2">
            {collections.map((collection, collectionIndex) => (
              <motion.li
                key={collectionIndex}
                className="text-xl md:text-2xl cursor-pointer"
                ref={(el) => (hoverRefs.current[collectionIndex] = el)}
                data-index={collectionIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: 0.3 + collectionIndex * 0.1,
                  duration: 0.1,
                }}
              >
                <Link
                  href={`/collection/${collection.slug}`}
                  passHref
                  className="leading-tight text-black"
                  onMouseEnter={() => handleMouseEnter(collectionIndex)}
                  onMouseLeave={handleMouseLeave}
                >
                  {collection.title}
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Image on the right */}
        <div className="photo flex flex-row justify-center items-stretch w-full h-full">
          <AnimatePresence mode="wait">
            {hoverIndex !== -1 && (
              <motion.div
                key={hoverIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: 0 }}
                className="flex justify-center items-center"
              >
                {(() => {
                  const current = collections[hoverIndex];
                  const imageId = getImageId(current.firstImagePath);
                  const aspectRatio =
                    current.width && current.height
                      ? `${current.width} / ${current.height}`
                      : undefined;
                  return (
                    <motion.div
                      layoutId={`image-media-${imageId}`}
                      className="flex flex-col items-center h-[70vh] md:h-85vh min-w-0"
                      style={{ minWidth: 0, willChange: "transform, opacity" }}
                    >
                      <ExportedImage
                        src={current.firstImagePath}
                        alt={current.firstImageAlt || "Collection image"}
                        priority
                        width={current.width}
                        height={current.height}
                        sizes="(max-width: 640px) 100vw, (max-width: 1920px) 50vw, 50vw"
                        className="object-contain h-full w-auto max-w-full"
                      />
                    </motion.div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DefaultLayout>
  );
}

export default IndexPage;

export async function getStaticProps() {
  const page = await filer.getItem("index-list.md", { folder: "pages" });
  const collections = [];

  for (const collectionPath of page.data.collections) {
    const correctedPath = collectionPath.replace(/^content\//, "");
    const collection = await filer.getItem(correctedPath, { folder: "" });

    const firstPhotoBlock = collection.data.content_blocks.find(
      (block) => block._bookshop_name === "collection/photo"
    );

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
          slug: collection.data.slug || correctedPath.split("/").pop(), // Ensure slug is set correctly
          firstImagePath: firstPhotoBlock.image_path,
          firstImageAlt: firstPhotoBlock.alt_text || "Default Alt Text",
          width: dimensions.width,
          height: dimensions.height,
        });
      } catch (error) {
        console.error(
          `Error getting dimensions for image ${firstPhotoBlock.image_path}:`,
          error
        );
        // Handle the error or set default dimensions
        collections.push({
          title: collection.data.title,
          path: correctedPath,
          slug: collection.data.slug || correctedPath.split("/").pop(), // Ensure slug is set correctly
          firstImagePath: firstPhotoBlock.image_path,
          firstImageAlt: firstPhotoBlock.alt_text || "Default Alt Text",
          width: 480, // Default width
          height: 320, // Default height assuming a 3:2 aspect ratio
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
