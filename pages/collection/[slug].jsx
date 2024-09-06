import { motion, AnimatePresence } from 'framer-motion';
import DefaultLayout from '../../components/layouts/default';
import Filer from '@cloudcannon/filer';
import Blocks from '../../components/shared/blocks';
import React, { useEffect, useState, useCallback, memo } from 'react';
import { useRouter } from 'next/router';

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

  const handleAreaClick = useCallback((area) => {
    if (area === 'right') {
      setDirection('right');
      setCurrentImage((prevImage) => (prevImage + 1) % imageCount);
    } else if (area === 'left') {
      setDirection('left');
      setCurrentImage((prevImage) => (prevImage - 1 + imageCount) % imageCount);
    }
  }, [imageCount]);

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
        stiffness: 200,
        damping: 30,
        duration: 0.2,
      },
    },
    exit: (direction) => ({
      opacity: 0,
      x: direction === 'left' ? '-100%' : direction === 'right' ? '100%' : 0,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 30,
        duration: 0.2,
      },
    }),
  };

  return (
    <DefaultLayout page={page}>
      <div className="absolute top-4 left-4 text-left">
        <div className="text-lg font-bold">{page.data.title}</div>
        <div className="text-lg font-bold">{`${currentImage + 1} / ${imageCount}`}</div>
      </div>

      <div
        id="click-left"
        className="absolute left-0 top-1/6 h-4/6 w-1/6 cursor-pointer clickable-area"
        onClick={() => handleAreaClick('left')}
        style={{ zIndex: 10 }}
      />
      <div
        id="click-right"
        className="absolute right-0 top-1/6 h-4/6 w-1/6 cursor-pointer clickable-area"
        onClick={() => handleAreaClick('right')}
        style={{ zIndex: 10 }}
      />
      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          key={currentImage}
          variants={internalVariants}
          initial="enter"
          animate="center"
          exit="exit"
          custom={direction}
          className="relative w-auto overflow-hidden"
          style={{ position: 'relative' }} // Ensures the positioning is correct
        >
          <section
            className="photo flex justify-end items-start w-auto relative overflow-hidden"
            style={{ height: '100vh' }}
          >
            <Blocks
              content_blocks={page.data.content_blocks}
              currentImage={currentImage}
            />
          </section>
        </motion.div>
      </AnimatePresence>
    </DefaultLayout>
  );
};

const MemoizedCollectionPage = memo(CollectionPage);
MemoizedCollectionPage.displayName = 'CollectionPage';

export default MemoizedCollectionPage;

export async function getStaticPaths() {
  const slugs = (await filer.listItemSlugs('collection')).map((slug) => ({
    params: { slug },
  }));
  const ignored = { 404: true };
  return {
    paths: slugs.filter(({ params }) => !ignored[params.slug]),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const slugs = await filer.listItemSlugs('collection');
  const currentIndex = slugs.indexOf(params.slug);
  const nextSlug =
    currentIndex >= 0 && currentIndex < slugs.length - 1
      ? slugs[currentIndex + 1]
      : slugs[0];
  const prevSlug =
    currentIndex > 0 ? slugs[currentIndex - 1] : slugs[slugs.length - 1];
  const page = await filer.getItem(`${params.slug}.md`, {
    folder: 'collection',
  });
  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
      nextSlug,
      prevSlug,
    },
  };
}
