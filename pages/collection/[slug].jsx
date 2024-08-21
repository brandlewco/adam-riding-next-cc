import { motion } from 'framer-motion';
import { useAnimationDirection } from '../../hooks/AnimationDirectionContext';
import DefaultLayout from '../../components/layouts/default';
import Filer from '@cloudcannon/filer';
import Blocks from '../../components/shared/blocks';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';

const filer = new Filer({ path: 'content' });

function CollectionPage({ page, nextSlug, prevSlug }) {
  const [currentImage, setCurrentImage] = useState(0);
  const { direction, setDirection } = useAnimationDirection();
  const router = useRouter();
  const imageCount = page.data.content_blocks.length;
  const isOverview = Boolean(router.query.overview);

  useEffect(() => {
    const imageIndex = parseInt(router.query.image);
    if (!isNaN(imageIndex) && imageIndex >= 0 && imageIndex < imageCount) {
      setCurrentImage(imageIndex);
    }
  }, [router.query.image, imageCount]);

  const handleAreaClick = (area) => {
    if (area === 'right') {
      setDirection('right');
      router.push(`/collection/${nextSlug}`);
    } else if (area === 'left') {
      setDirection('left');
      router.push(`/collection/${prevSlug}`);
    } else if (area === 'down') {
      setDirection('down');
      setCurrentImage((prevImage) => (prevImage + 1) % imageCount);
    } else if (area === 'up') {
      setDirection('up');
      setCurrentImage((prevImage) => (prevImage - 1 + imageCount) % imageCount);
    }
  };

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'ArrowRight') {
        setDirection('right');
        router.push(`/collection/${nextSlug}`);
      } else if (event.key === 'ArrowLeft') {
        setDirection('left');
        router.push(`/collection/${prevSlug}`);
      } else if (event.key === 'ArrowDown') {
        setDirection('down');
        setCurrentImage((prevImage) => (prevImage + 1) % imageCount);
      } else if (event.key === 'ArrowUp') {
        setDirection('up');
        setCurrentImage((prevImage) => (prevImage - 1 + imageCount) % imageCount);
      }
    },
    [currentImage, nextSlug, prevSlug, imageCount, router, setDirection]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const internalVariants = {
    enter: (direction) => ({
      opacity: 0,
      y: direction === 'up' ? '100%' : direction === 'down' ? '-100%' : 0,
    }),
    center: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        opacity: { duration: 0.3 },
      },
    },
    exit: (direction) => ({
      opacity: 0,
      y: direction === 'up' ? '-100%' : direction === 'down' ? '100%' : 0,
      transition: {
        duration: 0.3,
        opacity: { duration: 0.3 },
      },
    }),
  };

  const generateFigureStyle = (block) => ({
    width: block.width ? `${block.width}%` : '100%',
    marginTop: block.top || '0px',
    marginLeft: block.left || '0px',
    marginRight: block.right || '0px',
  });

  return (
    <DefaultLayout page={page}>
      {!isOverview && (
        <>
          <div
            id="click-left"
            className="absolute left-0 top-0 h-full w-1/6 cursor-pointer clickable-area"
            onClick={() => handleAreaClick('left')}
            style={{ zIndex: 10 }}
          />
          <div
            id="click-right"
            className="absolute right-0 top-0 h-full w-1/6 cursor-pointer clickable-area"
            onClick={() => handleAreaClick('right')}
            style={{ zIndex: 10 }}
          />
          <div
            id="click-up"
            className="absolute left-0 top-0 h-1/6 w-full cursor-pointer clickable-area"
            onClick={() => handleAreaClick('up')}
            style={{ zIndex: 10 }}
          />
          <div
            id="click-down"
            className="absolute left-0 bottom-14 h-1/6 w-full cursor-pointer clickable-area"
            onClick={() => handleAreaClick('down')}
            style={{ zIndex: 10 }}
          />
        </>
      )}
      <motion.div
        key={currentImage}
        custom={direction}
        layoutId={`collection-${page.slug}`}
        variants={internalVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          y: { type: 'tween', ease: 'easeInOut', duration: 0.5 },
          opacity: { duration: 0.5 },
        }}
        className={`relative w-auto right-0 ${
          isOverview
            ? 'flex flex-wrap justify-between items-center overflow-y-auto p-12'
            : ''
        }`}
        style={{
          overflowY: isOverview ? 'auto' : 'hidden',
        }}
      >
        {isOverview ? (
          page.data.content_blocks.map((block, i) => (
            <figure key={i} style={generateFigureStyle(block)}>
              <Blocks content_blocks={[block]} currentImage={0} />
            </figure>
          ))
        ) : (
          <section
            className="photo flex justify-end items-start w-auto relative overflow-hidden"
            style={{ height: '100vh' }}
          >
            <Blocks
              content_blocks={page.data.content_blocks}
              currentImage={currentImage}
            />
          </section>
        )}
      </motion.div>
    </DefaultLayout>
  );
}

export default React.memo(CollectionPage);

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