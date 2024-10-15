import { motion, AnimatePresence } from 'framer-motion';
import DefaultLayout from '../../components/layouts/default';
import Filer from '@cloudcannon/filer';
import Blocks from '../../components/shared/blocks';
import React, { useEffect, useState, useCallback, memo } from 'react';
import { useRouter } from 'next/router';
import ExportedImage from 'next-image-export-optimizer';
import { useSwipeable } from 'react-swipeable';

const filer = new Filer({ path: 'content' });

const MemoizedExportedImage = memo(({ src, alt, width, height }) => (
  <ExportedImage
    src={src}
    alt={alt}
    priority
    width={width}
    height={height}
    style={{ objectFit: 'cover' }}
    sizes="(max-width: 640px) 5vw, 1vw"
  />
));
MemoizedExportedImage.displayName = 'MemoizedExportedImage';

const Thumbnail = memo(({ block, index, currentImage, handleThumbnailClick }) => (
  <motion.div
    key={index}
    onClick={() => handleThumbnailClick(index)}
    className={`cursor-pointer relative mb-2 ${
      currentImage === index ? 'opacity-100' : 'opacity-50'
    }`}
    style={{
      transition: 'transform 0.3s',
      transformOrigin: 'center',
      width: '32px',
      height: '32px',
    }}
  >
    <MemoizedExportedImage
      src={block.image_path}
      alt={block.alt_text || 'Thumbnail'}
      width={32}
      height={32}
      sizes="(max-width: 640px) 10vw, 1vw"
      className="hover:opacity-100"
      style={{
        objectFit: 'contain',
        transition: 'opacity 0.33s',
      }}
    />
  </motion.div>
));
Thumbnail.displayName = 'Thumbnail';

const CollectionPage = ({ page }) => {
  const [currentImage, setCurrentImage] = useState(0);
  const [direction, setDirection] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const router = useRouter();
  const imageCount = page.data.content_blocks.length;

  useEffect(() => {
    const imageIndex = parseInt(router.query.image);
    if (!isNaN(imageIndex) && imageIndex >= 0 && imageIndex < imageCount) {
      setCurrentImage(imageIndex);
    }
  }, [router.query.image, imageCount]);

  const handleAreaClick = useCallback(
    (area) => {
      if (area === 'right') {
        setDirection('right');
        setCurrentImage((prevImage) => (prevImage + 1) % imageCount);
      } else if (area === 'left') {
        setDirection('left');
        setCurrentImage((prevImage) => (prevImage - 1 + imageCount) % imageCount);
      }
    },
    [imageCount]
  );

  const handleThumbnailClick = useCallback((index) => {
    setCurrentImage(index);
    setDirection('');
  }, []);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'ArrowRight') {
        handleAreaClick('right');
      } else if (event.key === 'ArrowLeft') {
        handleAreaClick('left');
      }
    },
    [handleAreaClick]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleAreaClick('right'),
    onSwipedRight: () => handleAreaClick('left'),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  const internalVariants = {
    enter: (direction) => ({
      opacity: 0,
      x: direction === 'left' ? '100%' : direction === 'right' ? '-100%' : 0,
    }),
    center: {
      opacity: 1,
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 150,
        damping: 25,
        duration: 0.4,
        delay: -0.2,
        opacity: { duration: 0.6, ease: 'easeOut' },
      },
    },
    exit: (direction) => ({
      opacity: 0,
      x: direction === 'left' ? '-100%' : direction === 'right' ? '100%' : 0,
      transition: {
        opacity: { duration: 0.3 },
      },
    }),
  };

  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
    9: 'grid-cols-9',
    10: 'grid-cols-10',
  };

  const gridClass = imageCount <= 9 ? gridClasses[imageCount] : 'grid-cols-10';

  return (
    <DefaultLayout page={page}>
      {/* Collection Info in the Top Right Corner */}
      <div className="hidden sm:block sm:absolute top-4 left-4 text-left">
        <div className="text-sm">{page.data.title} - {`${currentImage + 1} / ${imageCount}`}</div>
      </div>

      <div
        id="click-left"
        className="absolute left-0 top-[10%] h-[80%] w-1/6 md:w-1/2 cursor-pointer clickable-area"
        onClick={() => handleAreaClick('left')}
        style={{ zIndex: 10 }}
      ></div>
      <div
        id="click-right"
        className="absolute right-0 top-[10%] h-[80%] w-1/6 cursor-pointer clickable-area"
        onClick={() => handleAreaClick('right')}
        style={{ zIndex: 10 }}
      ></div>
      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          key={currentImage}
          layoutId={`collection-${page.data.slug}`} // Ensure layoutId matches the one in index.jsx
          layout
          variants={internalVariants}
          initial="enter"
          animate="center"
          exit="exit"
          custom={direction}
          className="relative w-auto overflow-hidden p-4"
          style={{ position: 'relative' }} // Ensures the positioning is correct
          {...swipeHandlers} // Add swipe handlers
        >
          <section
            className="photo flex flex-col sm:flex-row sm:justify-end items-end sm:items-start relative overflow-hidden md:h-85vh h-screen w-full md:w-auto overflow-hidden"
          >
            <Blocks content_blocks={page.data.content_blocks} currentImage={currentImage} setImageLoaded={setImageLoaded} />
            {imageLoaded && (
              <div className="relative sm:hidden pt-4 text-left">
                <div className="text-sm">{page.data.title} - {`${currentImage + 1} / ${imageCount}`}</div>
              </div>
            )}
          </section>
        </motion.div>
      </AnimatePresence>

      {/* Thumbnail Selector */}
      <div className="fixed bottom-12 left-0 right-0 flex justify-center overflow-none space-x-2 z-50 px-4 sm:px-0">
        <div className={`grid gap-2 ${gridClass} md:grid-flow-col justify-center sm:justify-start`}>
          {page.data.content_blocks.map((block, index) => (
            <Thumbnail
              key={index}
              block={block}
              index={index}
              currentImage={currentImage}
              handleThumbnailClick={handleThumbnailClick}
            />
          ))}
        </div>
      </div>
    </DefaultLayout>
  );
};

const MemoizedCollectionPage = memo(CollectionPage);
MemoizedCollectionPage.displayName = 'CollectionPage';

export default MemoizedCollectionPage;

export async function getStaticPaths() {
  const collections = await filer.getItems('collection');
  const paths = collections.map((collection) => ({
    params: { slug: collection.data.slug || collection.slug },
  }));

  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const collections = await filer.getItems('collection');
  const indexPage = await filer.getItem('index.md', { folder: 'pages' });

  const collection = collections.find(
    (col) => col.data.slug === params.slug || col.slug === params.slug
  );

  if (!collection) {
    return {
      notFound: true,
    };
  }

  const orderedSlugs = indexPage.data.collections.map((collectionPath) => {
    const parts = collectionPath.split('/');
    return parts[parts.length - 1].replace('.md', '');
  });

  const currentIndex = orderedSlugs.indexOf(params.slug);
  const nextSlug = currentIndex >= 0 && currentIndex < orderedSlugs.length - 1 ? orderedSlugs[currentIndex + 1] : orderedSlugs[0];
  const prevSlug = currentIndex > 0 ? orderedSlugs[currentIndex - 1] : orderedSlugs[orderedSlugs.length - 1];

  return {
    props: {
      page: JSON.parse(JSON.stringify(collection)),
      nextSlug,
      prevSlug,
    },
  };
}