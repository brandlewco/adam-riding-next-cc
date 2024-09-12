import { motion, AnimatePresence } from 'framer-motion';
import DefaultLayout from '../../components/layouts/default';
import Filer from '@cloudcannon/filer';
import Blocks from '../../components/shared/blocks';
import React, { useEffect, useState, useCallback, memo } from 'react';
import { useRouter } from 'next/router';
import ExportedImage from 'next-image-export-optimizer';

const filer = new Filer({ path: 'content' });

const CollectionPage = ({ page }) => {
  const [currentImage, setCurrentImage] = useState(0);
  const [direction, setDirection] = useState('');
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

  const handleThumbnailClick = (index) => {
    setCurrentImage(index);
    setDirection('');
  };

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
        duration: 0.4, // Slightly slower movement
        delay: -0.2, // Starts entering slightly before exit completes
        opacity: { duration: 0.6, ease: 'easeOut' }, // Slower opacity change
      },
    },
    exit: (direction) => ({
      opacity: 0,
      x: direction === 'left' ? '-100%' : direction === 'right' ? '100%' : 0,
      transition: {
        type: 'spring',
        stiffness: 150,
        damping: 25,
        duration: 0.2, // Keeps the exit quick
      },
    }),
  };

  return (
    <DefaultLayout page={page}>
      {/* Collection Info in the Top Right Corner */}
      <div className="hidden sm:block sm:absolute top-4 left-4 text-left">
        <div className="text-sm">{page.data.title} - {`${currentImage + 1} / ${imageCount}`}</div>
      </div>

      <div
        id="click-left"
        className="absolute left-0 top-[10%] h-[80%] w-1/6 cursor-pointer clickable-area"
        onClick={() => handleAreaClick('left')}
        style={{ zIndex: 10 }}>
          <svg
          xmlns="http://www.w3.org/2000/svg"
          className="absolute sm:hidden h-8 w-8 top-1/2"
          fill="currentColor"
          viewBox="0 0 320 512">
            <path d="M15 239c-9.4 9.4-9.4 24.6 0 33.9L207 465c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9L65.9 256 241 81c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0L15 239z" />
          </svg>
      </div>
      <div
        id="click-right"
        className="absolute right-0 top-[10%] h-[80%] w-1/6 cursor-pointer clickable-area"
        onClick={() => handleAreaClick('right')}
        style={{ zIndex: 10 }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="absolute sm:hidden h-8 w-8 top-1/2 right-0"
          fill="currentColor"
          viewBox="0 0 320 512">
            <path d="M305 239c9.4 9.4 9.4 24.6 0 33.9L113 465c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l175-175L79 81c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0L305 239z" />
        </svg>  
      </div>
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
          className="relative w-auto overflow-hidden"
          style={{ position: 'relative' }} // Ensures the positioning is correct
        >
          <section
            className="photo flex flex-col sm:flex-row sm:justify-end items-end sm:items-start w-auto relative overflow-hidden p-4"
            style={{ height: '100vh' }}
          >
            <Blocks content_blocks={page.data.content_blocks} currentImage={currentImage} />
            <div className="relative sm:hidden pt-4 text-left">
              <div className="text-sm">{page.data.title} - {`${currentImage + 1} / ${imageCount}`}</div>
            </div>
          </section>
        </motion.div>
      </AnimatePresence>

      {/* Thumbnail Selector */}
      <div className="fixed bottom-24 left-0 right-0 flex justify-center overflow-none space-x-2 z-50 px-4 sm:px-0">
        <div className="grid grid-cols-10 sm:grid-flow-col gap-2 overflow-hidden">
          {page.data.content_blocks.map((block, index) => (
            <motion.div
              key={index}
              onClick={() => handleThumbnailClick(index)}
              className={`cursor-pointer relative h-8 w-8 ${
                currentImage === index ? 'opacity-100' : 'opacity-50'
              }`}
              style={{
                transition: 'transform 0.3s',
                transformOrigin: 'center',
              }}
            >
              <ExportedImage
                src={block.image_path}
                alt={block.alt_text || 'Thumbnail'}
                className="absolute top-0 left-0 object-cover w-full h-full hover:opacity-100 overflow-hidden"
                height={32}
                width={32}
                style={{
                  transition: 'opacity 0.33s',
                }} // Adjusts the size without overflow
              />
            </motion.div>
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