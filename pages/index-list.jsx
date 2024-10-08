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

function IndexPage({ page, collections }) {
  const router = useRouter();
  const [hoverIndex, setHoverIndex] = useState(-1);
  const hoverRefs = useRef([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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
      const img = new Image();
      img.src = collections[index].firstImagePath;
      img.onload = () => {
        setDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
    },
    [collections]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(-1);
  }, []);

  return (
    <DefaultLayout page={page}>
      <div className="flex flex-col md:flex-row justify-start md:h-screen">
        {/* Titles on the left */}
        <div className="w-full md:w-1/3 p-4 overflow-y-auto">
          <ul className="flex flex-col gap-2">
            {collections.map((collection, collectionIndex) => (
              <motion.li
                key={collectionIndex}
                className="text-xl md:text-2xl cursor-pointer"
                ref={(el) => (hoverRefs.current[collectionIndex] = el)}
                data-index={collectionIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + collectionIndex * 0.1, duration: 0.1 }}
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
        <div className="photo md:w-2/3 w-full flex flex-col sm:flex-row sm:justify-end items-end sm:items-start relative overflow-hidden p-4">
          <AnimatePresence mode="wait">
            {hoverIndex !== -1 && (
              <motion.div
                key={hoverIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: 0 }}
                className="absolute right-4 top-4"
              >
                <ExportedImage
                  src={collections[hoverIndex].firstImagePath}
                  alt={collections[hoverIndex].firstImageAlt || "Collection image"}
                  priority
                  width={collections[hoverIndex].width}
                  height={collections[hoverIndex].height}
                  sizes="(max-width: 640px) 100vw, (max-width: 1920px) 50vw, 50vw"
                  className="md:h-85vh w-full md:w-auto"
                  style={{
                    objectFit: "contain",
                  }}
                />
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