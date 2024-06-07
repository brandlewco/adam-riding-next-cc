import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import DefaultLayout from "../../components/layouts/default";
import Filer from "@cloudcannon/filer";
import Blocks from "../../components/shared/blocks";
import CollectionPhoto from "../../components/collection/photo";

const filer = new Filer({ path: "content" });

export default function CollectionPage({ page, nextSlug, prevSlug }) {
  const [currentImage, setCurrentImage] = useState(0);
  const [animationDirection, setAnimationDirection] = useState('up');
  const router = useRouter();
  const isOverview = Boolean(router.query.overview);
  const imageCount = page.data.content_blocks.length;

  useEffect(() => {
    const imageIndex = parseInt(router.query.image);
    if (!isNaN(imageIndex) && imageIndex >= 0 && imageIndex < imageCount) {
      setCurrentImage(imageIndex);
    }
  }, [router.query.image, imageCount]);

  useEffect(() => {
    if (isOverview) {
      document.body.classList.remove("overflow-y-hidden");
    } else {
      document.body.classList.add("overflow-y-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-y-hidden");
    };
  }, [isOverview]);

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

  const variants = {
    enter: (direction) => ({
      opacity: 0,
      x: direction === 'left' ? -1000 : direction === 'right' ? 1000 : 0,
      y: direction === 'up' ? -1000 : direction === 'down' ? 1000 : 0,
    }),
    center: {
      opacity: 1,
      x: 0,
      y: 0,
    },
    exit: (direction) => ({
      opacity: 0,
      x: direction === 'left' ? 1000 : direction === 'right' ? -1000 : 0,
      y: direction === 'up' ? 1000 : direction === 'down' ? -1000 : 0,
    }),
  };

  const handleAreaClick = (area) => {
    let newIndex;
    if (area === "right") {
      setAnimationDirection('right');
      router.push({
        pathname: `/collection/${nextSlug}`,
        query: { direction: 'right' },
      });
    } else if (area === "left") {
      setAnimationDirection('left');
      router.push({
        pathname: `/collection/${prevSlug}`,
        query: { direction: 'left' },
      });
    } else if (area === "down") {
      newIndex = (currentImage + 1) % imageCount;
      setAnimationDirection('down');
      setCurrentImage(newIndex);
    } else if (area === "up") {
      newIndex = (currentImage - 1 + imageCount) % imageCount;
      setAnimationDirection('up');
      setCurrentImage(newIndex);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      let newIndex;
      if (event.key === "ArrowRight") {
        setAnimationDirection('right');
        router.push({
          pathname: `/collection/${nextSlug}`,
          query: { direction: 'right' },
        });
      } else if (event.key === "ArrowLeft") {
        setAnimationDirection('left');
        router.push({
          pathname: `/collection/${prevSlug}`,
          query: { direction: 'left' },
        });
      } else if (event.key === "ArrowDown") {
        newIndex = (currentImage + 1) % imageCount;
        setAnimationDirection('down');
        setCurrentImage(newIndex);
      } else if (event.key === "ArrowUp") {
        newIndex = (currentImage - 1 + imageCount) % imageCount;
        setAnimationDirection('up');
        setCurrentImage(newIndex);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentImage, nextSlug, prevSlug, imageCount, router]);

  useEffect(() => {
    const direction = router.query.direction;
    if (direction) {
      setAnimationDirection(direction);
    }
  }, [router.query.direction]);

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
                transition={{ duration: 0.3, delay: index * 0.1 }}
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
    <AnimatePresence initial={false} custom={animationDirection}>
      <motion.div
        key={router.pathname} // Use the pathname as key to ensure re-mounting on route change
        initial="enter"
        animate="center"
        exit="exit"
        custom={animationDirection}
        variants={variants}
        transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
      >
        <DefaultLayout page={page}>
          <div className="absolute left-0 top-0 h-full w-1/6 cursor-pointer" onClick={() => handleAreaClick("left")} style={{ zIndex: 2, maxHeight: "90vh" }} />
          <div className="absolute right-0 top-0 h-full w-1/6 cursor-pointer" onClick={() => handleAreaClick("right")} style={{ zIndex: 2, maxHeight: "90vh" }} />
          <div className="absolute left-0 top-0 h-1/6 w-full cursor-pointer" onClick={() => handleAreaClick("up")} style={{ zIndex: 2 }} />
          <div className="absolute left-0 bottom-14 h-1/6 w-full cursor-pointer" onClick={() => handleAreaClick("down")} style={{ zIndex: 2 }} />
          <AnimatePresence initial={false} custom={animationDirection}>
            <motion.div
              key={currentImage}
              custom={animationDirection}
              layoutId={`image-${page.slug}-${page.data.content_blocks[currentImage].image_path}`}
              variants={variants}
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
      </motion.div>
    </AnimatePresence>
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
      page: JSON.parse(JSON.stringify(page)), // Ensure page data is serializable
      nextSlug,
      prevSlug,
    },
  };
}
