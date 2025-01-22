import { motion, AnimatePresence } from 'framer-motion';
import DefaultLayout from '../../components/layouts/default';
import Filer from '@cloudcannon/filer';
import Blocks from '../../components/shared/blocks';
import React, { useEffect, useState, useCallback, memo } from 'react';
import { useRouter } from 'next/router';
import ExportedImage from 'next-image-export-optimizer';
import { useSwipeable } from 'react-swipeable';

const filer = new Filer({ path: 'content' });

// 1) Memoized ExportedImage (ensures numeric width/height)
const MemoizedExportedImage = memo(({ src, alt, width, height, ...rest }) => (
  <ExportedImage
    src={src}
    alt={alt}
    width={width}
    height={height}
    {...rest}
  />
));
MemoizedExportedImage.displayName = 'MemoizedExportedImage';

/**
 * RowThumbnail (32×32 squares) => used only when source === 'index-list'.
 * We'll call this RowThumbnail to avoid confusion with the grid overlay component.
 */
const RowThumbnail = memo(function RowThumbnail({
  block,
  index,
  currentImage,
  handleThumbnailClick,
}) {
  return (
    <motion.div
      key={index}
      onClick={() => handleThumbnailClick(index)}
      className={`cursor-pointer relative mb-2 hover:opacity-100 transition-opacity ${
        currentImage === index ? 'opacity-100' : 'opacity-50'
      }`}
      style={{
        transition: 'transform 0.3s',
        transformOrigin: 'center',
        width: '32px',
        height: '32px',
        overflow: 'hidden',
      }}
    >
      <MemoizedExportedImage
        src={block.image_path}
        alt={block.alt_text || 'Thumbnail'}
        width={32}
        height={32}
        sizes="(max-width: 640px) 10vw, 1vw"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </motion.div>
  );
});
RowThumbnail.displayName = 'RowThumbnail';

/**
 * GridThumbnail => used for the full-page overlay if source === 'index'.
 * These are larger thumbs, with staggered fade-in.
 */
const GridThumbnail = memo(function GridThumbnail({ block, index, onClick }) {
  return (
    <motion.div
      key={index}
      onClick={() => onClick(index)}
      className="cursor-pointer hover:opacity-80 transition-opacity w-24 h-24 sm:w-20 sm:h-20 md:w-16 md:h-16 lg:w-14 lg:h-14 overflow-hidden"
      variants={{
        hidden: { opacity: 0, y: 10 },
        show:   { opacity: 1, y: 0 },
        exit:   { opacity: 0, y: -10 },
      }}
    >
      <MemoizedExportedImage
        src={block.image_path}
        alt={block.alt_text || 'Thumbnail'}
        width={64}
        height={64}
        sizes="(max-width: 640px) 10vw, 5vw"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </motion.div>
  );
});
GridThumbnail.displayName = 'GridThumbnail';

//
// Main CollectionPage
//
const CollectionPage = ({
  page,
  source,      // 'index' => we show overlay grid & "Thumbs" button; 'index-list' => old row
  slugArray,   // used by _app.js for up/down
  currentSlug, // used by _app.js for up/down
}) => {
  const [currentImage, setCurrentImage] = useState(0);
  const [direction, setDirection] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showThumbs, setShowThumbs] = useState(false); // toggles overlay if source === 'index'
  const router = useRouter();
  const imageCount = page.data.content_blocks.length;

  // Possibly read ?image=N from URL
  useEffect(() => {
    const imageIndex = parseInt(router.query.image);
    if (!isNaN(imageIndex) && imageIndex >= 0 && imageIndex < imageCount) {
      setCurrentImage(imageIndex);
    }
  }, [router.query.image, imageCount]);

  // Left/Right arrow or clickable area logic
  const handleAreaClick = useCallback((area) => {
    if (area === 'right') {
      setDirection('right');
      setCurrentImage((prev) => (prev + 1) % imageCount);
    } else if (area === 'left') {
      setDirection('left');
      setCurrentImage((prev) => (prev - 1 + imageCount) % imageCount);
    }
  }, [imageCount]);

  // On row or grid thumbnail click
  const handleThumbnailClick = useCallback((index) => {
    setCurrentImage(index);
    setDirection('');
    setShowThumbs(false); // close overlay if open
  }, []);

  // Keyboard arrow nav
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'ArrowRight') {
      handleAreaClick('right');
    } else if (event.key === 'ArrowLeft') {
      handleAreaClick('left');
    }
  }, [handleAreaClick]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Swiping left/right
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleAreaClick('right'),
    onSwipedRight: () => handleAreaClick('left'),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  // Basic framer-motion variants for the main image transitions
  const internalVariants = {
    enter: (dir) => ({
      opacity: 0,
      x: dir === 'left' ? '100%' : dir === 'right' ? '-100%' : 0,
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
    exit: (dir) => ({
      opacity: 0,
      x: dir === 'left' ? '-100%' : dir === 'right' ? '100%' : 0,
      transition: {
        opacity: { duration: 0.3 },
      },
    }),
  };

  // Main displayed image area
  const MainImageSection = (
    <AnimatePresence custom={direction} mode="wait">
      <motion.div
        key={currentImage}
        layoutId={`collection-${page.data.slug}`}
        layout
        variants={internalVariants}
        initial="enter"
        animate="center"
        exit="exit"
        custom={direction}
        className="relative w-auto overflow-hidden p-4"
        style={{ position: 'relative' }}
        {...swipeHandlers}
      >
        <section className="photo flex flex-col md:flex-row md:justify-end items-end md:items-start relative overflow-hidden md:h-85vh h-screen w-full md:w-auto">
          <Blocks
            content_blocks={page.data.content_blocks}
            currentImage={currentImage}
            setImageLoaded={setImageLoaded}
          />
          {imageLoaded && (
            <div className="relative md:hidden pt-4 text-left">
              <div className="text-sm leading-none">
                {page.data.title} - {`${currentImage + 1} / ${imageCount}`}
              </div>
            </div>
          )}
        </section>
      </motion.div>
    </AnimatePresence>
  );

  // "Thumbs" button if source === 'index'
  const ThumbsButton = (source === 'index') && (
    <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-50">
      <button
        onClick={() => setShowThumbs(true)}
        className="text-sm leading-none px-3 py-1 bg-white text-black"
      >
        Thumbs
      </button>
    </div>
  );

  // The overlay grid if source === 'index'
  const containerVariants = {
    hidden: {
      opacity: 0,
      transition: { when: 'afterChildren' },
    },
    show: {
      opacity: 1,
      transition: {
        when: 'beforeChildren',
        staggerChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      transition: { when: 'afterChildren' },
    },
  };

  const ThumbsGridOverlay = (source === 'index') && (
    <AnimatePresence>
      {showThumbs && (
        <motion.div
          key="thumbs-overlay"
          initial="hidden"
          animate="show"
          exit="exit"
          variants={containerVariants}
          // White full-screen background
          className="fixed inset-0 z-50 bg-white bg-opacity-80 flex flex-col items-center justify-center"
        >
          {/* "Close" text exactly where the Thumbs button was */}
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2">
            <span
              onClick={() => setShowThumbs(false)}
              className="cursor-pointer text-sm leading-none hover:opacity-60 transition-opacity"
            >
              Close
            </span>
          </div>

          {/* Full-page grid, near full width */}
          <div className="w-full h-full flex flex-col justify-center items-center overflow-y-auto pt-12 pb-24 px-4 ">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4 justify-items-center w-full">
              {page.data.content_blocks.map((block, index) => (
                <motion.div
                  key={index}
                  variants={{
                    hidden: { opacity: 0, y: 0 },
                    show:   { opacity: 1, y: 0 },
                    exit:   { opacity: 0, y: 0},
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleThumbnailClick(index)}
                >
                  <ExportedImage
                    src={block.image_path}
                    alt={block.alt_text || 'Thumbnail'}
                    width={block.width}
                    height={block.height}
                    sizes="(max-width: 640px) 30vw, 10vw"
                    className="object-contain w-full h-auto"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // If from index-list => old row of thumbs (32×32)
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

  const OldThumbRow = (source === 'index-list') && (
    <div className="fixed bottom-12 left-0 right-0 flex justify-center overflow-none space-x-2 z-50 px-4 md:px-0">
      <div className={`grid gap-2 ${gridClass} md:grid-flow-col justify-center md:justify-start`}>
        {page.data.content_blocks.map((block, index) => (
          <RowThumbnail
            key={index}
            block={block}
            index={index}
            currentImage={currentImage}
            handleThumbnailClick={handleThumbnailClick}
          />
        ))}
      </div>
    </div>
  );

  return (
    <DefaultLayout page={page}>
      {/* Desktop Info */}
      <div className="hidden md:block md:absolute top-4 left-4 text-left">
        <div className="text-sm leading-none">
          {page.data.title} - {`${currentImage + 1} / ${imageCount}`}
        </div>
      </div>

      {/* Left/Right nav areas */}
      <div
        id="click-left"
        className="absolute left-0 top-[10%] h-[80%] w-1/6 md:w-1/2 cursor-pointer clickable-area"
        onClick={() => handleAreaClick('left')}
        style={{ zIndex: 10 }}
      />
      <div
        id="click-right"
        className="absolute right-0 top-[10%] h-[80%] w-1/6 cursor-pointer clickable-area"
        onClick={() => handleAreaClick('right')}
        style={{ zIndex: 10 }}
      />

      {/* Main single-image section */}
      {MainImageSection}

      {/* "Thumbs" button & overlay if source === 'index' */}
      {ThumbsButton}
      {ThumbsGridOverlay}

      {/* Old row if source === 'index-list' */}
      {OldThumbRow}
    </DefaultLayout>
  );
};

const MemoizedCollectionPage = memo(CollectionPage);
MemoizedCollectionPage.displayName = 'CollectionPage';
export default MemoizedCollectionPage;

//
// getStaticPaths & getStaticProps
//
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
  // Your existing logic that returns `source`, `slugArray`, `currentSlug` for up/down in _app.js
  // plus any nextSlug, prevSlug if you wish. We keep it intact.

  const collections = await filer.getItems('collection');
  const indexPage = await filer.getItem('index.md', { folder: 'pages' });
  const indexListPage = await filer.getItem('index-list.md', { folder: 'pages' });

  // Build arrays of slugs from index.md and index-list.md
  const indexSlugs = [];
  for (const path of indexPage.data.collections) {
    const coll = await filer.getItem(path.replace(/^content\//, ''), { folder: '' });
    if (coll && coll.data.slug) indexSlugs.push(coll.data.slug);
  }
  const indexListSlugs = [];
  for (const path of indexListPage.data.collections) {
    const coll = await filer.getItem(path.replace(/^content\//, ''), { folder: '' });
    if (coll && coll.data.slug) indexListSlugs.push(coll.data.slug);
  }

  // Find the actual collection
  const collection = collections.find(
    (col) => col.data.slug === params.slug
  );
  if (!collection) {
    return { notFound: true };
  }

  // fallback dimension
  collection.data.content_blocks = collection.data.content_blocks.map((block) => ({
    ...block,
    width: block.width || 32,
    height: block.height || 32,
  }));

  const slug = collection.data.slug;

  // Decide source & build slugArray for up/down in _app.js
  let source = 'none';
  let slugArray = [];

  if (indexSlugs.includes(slug)) {
    source = 'index';
    slugArray = indexSlugs;
  } else if (indexListSlugs.includes(slug)) {
    source = 'index-list';
    slugArray = indexListSlugs;
  }

  return {
    props: {
      page: JSON.parse(JSON.stringify(collection)),

      // For up/down nav in _app.js
      slugArray,
      currentSlug: slug,

      // New logic for row vs overlay
      source,
    },
  };
}
