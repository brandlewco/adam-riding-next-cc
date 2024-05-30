import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import DefaultLayout from '../../components/layouts/default';
import Filer from '@cloudcannon/filer';
import Navigation from '../../components/layouts/navigation';
import Blocks from '../../components/shared/blocks';
import CollectionPhoto from '../../components/collection/photo';

const filer = new Filer({ path: 'content' });

export default function CollectionPage({ page, nextSlug, prevSlug }) {
  const [currentImage, setCurrentImage] = useState(0);
  const [animationDirection, setAnimationDirection] = useState(true); // true for downward, false for upward
  const [isOverview, setIsOverview] = useState(false); // state for overview
  const router = useRouter();
  const currentImageRef = useRef(null);

  const imageCount = page.data.content_blocks.length;

  useEffect(() => {
    if (isOverview && currentImageRef.current) {
      currentImageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isOverview]);

  const generateGridPosition = (index) => {
    const colStart = (index % 5) + 1; // Ensure column starts within a 6-column grid
    const rowSpan = Math.random() < 0.2 ? 3 : 5; // Randomize row span to 2 or 3
    const colSpan = Math.random() < 0.5 ? 2 : 4; // Randomize column span to 2 or 3

    // Add larger random margins to create more gaps
    const marginTop = Math.random() * 10; // Random margin-top up to 5vh
    const marginLeft = Math.random() * 10; // Random margin-left up to 5vw

    return {
      gridColumn: `span ${colSpan}`,
      gridRow: `span ${rowSpan}`,
      marginTop: `${marginTop}rem`,
      marginLeft: `${marginLeft}rem`,
      zIndex: 1
    };
  };


  const variants = {
    enter: (direction) => ({
      opacity: 0,
      y: direction ? 1000 : -1000, // If direction is true, enter from below, otherwise from above
    }),
    center: {
      zIndex: 1,
      opacity: 1,
      y: 0,
    },
    exit: (direction) => ({
      opacity: 0,
      y: direction ? -1000 : 1000, // If direction is true, exit to above, otherwise to below
    }),
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      let newIndex;
      let direction = event.key === 'ArrowDown'; // true for down, false for up

      if (event.key === 'ArrowRight') {
        router.push(`/collection/${nextSlug}`);
      } else if (event.key === 'ArrowLeft') {
        router.push(`/collection/${prevSlug}`);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (event.key === 'ArrowDown') {
          newIndex = (currentImage + 1) % imageCount; // Loop forward
        } else {
          newIndex = (currentImage - 1 + imageCount) % imageCount; // Loop backward
        }
        setCurrentImage(newIndex);
        setAnimationDirection(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentImage, nextSlug, prevSlug, imageCount, router]);

  useEffect(() => {
    if (router.query.overview) {
      setIsOverview(true);
    }
  }, [router.query.overview]);

  const handleAreaClick = (area) => {
    let newIndex;
    let direction;
    if (area === 'right') {
      router.push(`/collection/${nextSlug}`);
    } else if (area === 'left') {
      router.push(`/collection/${prevSlug}`);
    } else if (area === 'down') {
      newIndex = (currentImage + 1) % imageCount;
      setAnimationDirection(true);
      setCurrentImage(newIndex);
    } else if (area === 'up') {
      newIndex = (currentImage - 1 + imageCount) % imageCount;
      setAnimationDirection(false);
      setCurrentImage(newIndex);
    }
  };

  const handleImageClick = (index) => {
    setCurrentImage(index);
    setIsOverview(false);
  };

  if (isOverview) {
    return (
      <DefaultLayout page={page}>
        <Navigation page={page} />
        <div id="overview-view" className="grid grid-cols-12 gap-4 p-4 auto-rows-auto">
          {page.data.content_blocks.map((block, index) => (
            <motion.div
              key={index}
              ref={index === currentImage ? currentImageRef : null}
              style={generateGridPosition(index)}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              layoutId={`image-${page.slug}-${block.image_path}`} // Ensure consistency
              data-layout-id={`image-${page.slug}-${block.image_path}`} // Ensure consistency
              onClick={() => handleImageClick(index)}
            >
              <CollectionPhoto block={block} dataBinding="" />
            </motion.div>
          ))}
        </div>
        {/* <button
          className="absolute top-4 right-4 p-2 bg-blue-500 text-white rounded"
          onClick={() => setIsOverview(false)} // Add button to return to normal view
        >
          Back to View
        </button> */}
      </DefaultLayout>
    );
  }


  return (
    <DefaultLayout page={page}>
      <Navigation page={page} />
      <div
        className="absolute left-0 top-0 h-full w-1/6 cursor-pointer"
        onClick={() => handleAreaClick('left')}
        style={{ zIndex: 2, maxHeight: '90vh' }}
      />
      <div
        className="absolute right-0 top-0 h-full w-1/6 cursor-pointer"
        onClick={() => handleAreaClick('right')}
        style={{ zIndex: 2, maxHeight: '90vh' }}
      />
      <div
        className="absolute left-0 top-0 h-1/6 w-full cursor-pointer"
        onClick={() => handleAreaClick('up')}
        style={{ zIndex: 2 }}
      />
      <div
        className="absolute left-0 bottom-14 h-1/6 w-full cursor-pointer"
        onClick={() => handleAreaClick('down')}
        style={{ zIndex: 2 }}
      />
      <div id="collection-view" className="flex flex-end h-screen w-screen overflow-hidden relative z-0">
        <AnimatePresence initial={false} custom={animationDirection}>
          <motion.div
            key={currentImage}
            layoutId={`image-${page.slug}-${page.data.content_blocks[currentImage].image_path}`} // Ensure consistency
            custom={animationDirection} // Pass the direction as custom prop to variants
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              y: { type: 'tween', ease: 'easeInOut', duration: 0.3 },
              opacity: { duration: 0.3 },
            }}
            data-layout-id={`image-${page.slug}-${page.data.content_blocks[currentImage].image_path}`}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <Blocks content_blocks={page.data.content_blocks} currentImage={currentImage} />
          </motion.div>
        </AnimatePresence>
      </div>
    </DefaultLayout>
  );
}

export async function getStaticPaths() {
  // Fetch slugs from the 'collection' folder now
  const slugs = (await filer.listItemSlugs('collection')).map((slug) => ({ params: { slug } }));
  // Adjust ignored slugs as necessary, depending on your 'collection' content
  const ignored = { '404': true };

  return {
    paths: slugs.filter(({ params }) => !ignored[params.slug]),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const slugs = await filer.listItemSlugs('collection');
  const currentIndex = slugs.indexOf(params.slug);

  // Calculate next and previous slugs, wrapping around to create a loop
  const nextSlug = currentIndex >= 0 && currentIndex < slugs.length - 1 ? slugs[currentIndex + 1] : slugs[0];
  const prevSlug = currentIndex > 0 ? slugs[currentIndex - 1] : slugs[slugs.length - 1];

  const page = await filer.getItem(`${params.slug}.md`, { folder: 'collection' });

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)), // Ensure page data is serializable
      nextSlug,
      prevSlug,
    },
  };
}
