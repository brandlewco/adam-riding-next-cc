import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import DefaultLayout from "../../components/layouts/default";
import Filer from "@cloudcannon/filer";
import Blocks from "../../components/shared/blocks";
import CollectionPhoto from "../../components/collection/photo";
import { useAnimationDirection } from "../../hooks/useAnimationDirection";

const filer = new Filer({ path: "content" });

export default function CollectionPage({ page, nextSlug, prevSlug }) {
  const [currentImage, setCurrentImage] = useState(0);
  const { setDirection } = useAnimationDirection();
  const router = useRouter();
  const isOverview = Boolean(router.query.overview);
  const imageCount = page.data.content_blocks.length;

  const [internalDirection, setInternalDirection] = useState('up');

  useEffect(() => {
    const imageIndex = parseInt(router.query.image);
    if (!isNaN(imageIndex) && imageIndex >= 0 && imageIndex < imageCount) {
      setCurrentImage(imageIndex);
    }
  }, [router.query.image, imageCount]);

  useEffect(() => {
    if (isOverview) {
      document.body.classList.remove("overflow-hidden");
      document.body.classList.add("overflow-y-scroll");
    } else {
      document.body.classList.add("overflow-hidden");
      document.body.classList.remove("overflow-y-scroll");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isOverview]);

  const handleAreaClick = (area) => {
    let newIndex;
    if (area === "right") {
      setDirection('right');
      router.push(`/collection/${nextSlug}`);
    } else if (area === "left") {
      setDirection('left');
      router.push(`/collection/${prevSlug}`);
    } else if (area === "down") {
      newIndex = (currentImage + 1) % imageCount;
      setInternalDirection('down');
      setCurrentImage(newIndex);
    } else if (area === "up") {
      newIndex = (currentImage - 1 + imageCount) % imageCount;
      setInternalDirection('up');
      setCurrentImage(newIndex);
    }
  };

  const handleKeyDown = useCallback((event) => {
    let newIndex;
    if (event.key === "ArrowRight") {
      setDirection('right');
      router.push(`/collection/${nextSlug}`);
    } else if (event.key === "ArrowLeft") {
      setDirection('left');
      router.push(`/collection/${prevSlug}`);
    } else if (event.key === "ArrowDown") {
      newIndex = (currentImage + 1) % imageCount;
      setInternalDirection('down');
      setCurrentImage(newIndex);
    } else if (event.key === "ArrowUp") {
      newIndex = (currentImage - 1 + imageCount) % imageCount;
      setInternalDirection('up');
      setCurrentImage(newIndex);
    }
  }, [currentImage, nextSlug, prevSlug, imageCount, router, setDirection]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const internalVariants = {
    enter: (direction) => ({
      opacity: 0,
      x: 0,
      y: direction === 'up' ? -1000 : direction === 'down' ? 1000 : 0,
    }),
    center: {
      opacity: 1,
      x: 0,
      y: 0,
    },
    exit: (direction) => ({
      opacity: 0,
      x: 0,
      y: direction === 'up' ? 1000 : direction === 'down' ? -1000 : 0,
    }),
  };

  const toggleOverview = () => {
    const newQuery = { ...router.query };
    if (newQuery.overview) {
      delete newQuery.overview;
    } else {
      newQuery.overview = "true";
    }
    router.push({ pathname: router.pathname, query: newQuery }, undefined, {
      shallow: true,
    });
  };

  const handleImageClick = (index) => {
    setCurrentImage(index);
    const newQuery = { ...router.query };
    delete newQuery.overview;
    newQuery.image = index;
    router.push({ pathname: router.pathname, query: newQuery }, undefined, {
      shallow: true,
    });
  };

  const generateGridPosition = (index) => {
    const colSpan = Math.random() < 0.5 ? 3 : 5;
    const rowSpan = Math.random() < 0.2 ? 1 : 3;
    const marginTop = Math.random() * 10;
    const marginLeft = Math.random() * 10;
    return {
      gridColumn: `span ${colSpan}`,
      gridRow: `span ${rowSpan}`,
      marginTop: `${marginTop}rem`,
      marginLeft: `${marginLeft}rem`,
      zIndex: 1,
    };
  };

  if (isOverview) {
    return (
      <DefaultLayout page={page}>
        <LayoutGroup>
          <div id="overview-view" className="grid grid-cols-12 gap-4 p-4 auto-rows-auto">
            {page.data.content_blocks.map((block, index) => (
              <motion.div
                key={index}
                style={generateGridPosition(index)}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                layoutId={`image-${page.slug}-${block.image_path}`}
                onClick={() => handleImageClick(index)}
              >
                <CollectionPhoto block={block} currentImage={currentImage} layoutId={`image-${page.slug}-${block.image_path}`} />
              </motion.div>
            ))}
          </div>
        </LayoutGroup>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout page={page}>
      <div className="absolute left-0 top-0 h-full w-1/6 cursor-pointer clickable-area" onClick={() => handleAreaClick("left")} style={{ zIndex: 10 }} />
      <div className="absolute right-0 top-0 h-full w-1/6 cursor-pointer clickable-area" onClick={() => handleAreaClick("right")} style={{ zIndex: 10 }} />
      <div className="absolute left-0 top-0 h-1/6 w-full cursor-pointer clickable-area" onClick={() => handleAreaClick("up")} style={{ zIndex: 10 }} />
      <div className="absolute left-0 bottom-14 h-1/6 w-full cursor-pointer clickable-area" onClick={() => handleAreaClick("down")} style={{ zIndex: 10 }} />
      <AnimatePresence initial={false}>
        <motion.div
          key={currentImage}
          custom={internalDirection}
          layoutId={`image-${page.slug}-${page.data.content_blocks[currentImage].image_path}`}
          variants={internalVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "tween", ease: "easeInOut", duration: 0.3 },
            y: { type: "tween", ease: "easeInOut", duration: 0.3 },
            opacity: { duration: 0.3 },
          }}
          className="absolute w-full"
        >
          <section className="photo flex justify-end items-start w-auto relative overflow-hidden" style={{ height: "90vh" }}>
            <Blocks content_blocks={page.data.content_blocks} currentImage={currentImage} />
          </section>
        </motion.div>
      </AnimatePresence>
    </DefaultLayout>
  );
}

export async function getStaticPaths() {
  const slugs = (await filer.listItemSlugs("collection")).map((slug) => ({ params: { slug } }));
  const ignored = { 404: true };
  return {
    paths: slugs.filter(({ params }) => !ignored[params.slug]),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const slugs = await filer.listItemSlugs("collection");
  const currentIndex = slugs.indexOf(params.slug);
  const nextSlug = currentIndex >= 0 && currentIndex < slugs.length - 1 ? slugs[currentIndex + 1] : slugs[0];
  const prevSlug = currentIndex > 0 ? slugs[currentIndex - 1] : slugs[slugs.length - 1];
  const page = await filer.getItem(`${params.slug}.md`, { folder: "collection" });
  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
      nextSlug,
      prevSlug,
    },
  };
}
