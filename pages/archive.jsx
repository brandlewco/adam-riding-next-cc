import DefaultLayout from '../components/layouts/default';
import Filer from '@cloudcannon/filer';
import { motion, AnimatePresence } from 'framer-motion';
import ExportedImage from 'next-image-export-optimizer';
import sizeOf from 'image-size';
import path from 'path';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router'; // Import useRouter

const filer = new Filer({ path: 'content' });

function ArchivePage({ page, photos }) {
  const [currentImage, setCurrentImage] = useState(null);
  const [direction, setDirection] = useState('');
  const router = useRouter();

  const handleImageClick = useCallback((index) => {
    setCurrentImage(index);
    setDirection('');
  }, []);

  const handleNavigation = useCallback(
    (direction) => {
      setDirection(direction);
      setCurrentImage((prevIndex) => {
        if (direction === 'right') {
          return (prevIndex + 1) % photos.length;
        } else if (direction === 'left') {
          return (prevIndex - 1 + photos.length) % photos.length;
        }
        return prevIndex;
      });
    },
    [photos.length]
  );

  const handleClose = useCallback(() => {
    setCurrentImage(null);
  }, []);

  // Close the expanded view when navigating to ARCHIVE
  useEffect(() => {
    const handleRouteChange = (url) => {
      if (url === '/archive') {
        handleClose();
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router, handleClose]);

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
        type: 'spring',
        stiffness: 150,
        damping: 25,
        duration: 0.2,
      },
    }),
  };

  const gridVariants = {
    hidden: { opacity: 0 },
    visible: (index) => ({
      opacity: 1,
      transition: { delay: index * 0.1, duration: 0.3 },
    }),
  };

  return (
    <DefaultLayout page={page}>
      <div className={`h-screen p-4 ${currentImage !== null ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <ul className="grid grid-cols-3 sm:grid-cols-[repeat(15,minmax(0,1fr))] gap-4">
          {photos.map((photo, index) => (
            <li
              key={index}
              className={`flex justify-center items-start overflow-hidden ${
                currentImage !== null ? 'hidden' : ''
              }`}
              style={{ alignItems: 'flex-start' }}
              onClick={() => handleImageClick(index)}
            >
              <motion.div
                layout
                layoutId={`image-${photo.slug}-${photo.image_path}`}
                initial="hidden"
                animate="visible"
                variants={gridVariants}
                custom={index}
                className="relative cursor-pointer hover:scale-105 transition-transform duration-200"
              >
                <PhotoBlock photo={photo} />
              </motion.div>
            </li>
          ))}
        </ul>

        {/* Expanded Image View */}
        <AnimatePresence custom={direction} mode="wait">
          {currentImage !== null && (
            <motion.div
              key={currentImage}
              layoutId={`image-${photos[currentImage].slug}-${photos[currentImage].image_path}`}
              variants={internalVariants}
              initial="enter"
              animate="center"
              exit="exit"
              custom={direction}
              className="fixed z-50 overflow-x-hidden"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                position: 'relative',
                width: 'auto',
                overflow: 'hidden',
              }}
            >
              <motion.section
                className="photo flex w-auto relative overflow-hidden"
                style={{ height: '100vh' }}
              >
                <div
                  className="flex flex-col justify-end items-end w-auto relative overflow-hidden"
                  style={{ height: '70vh' }}
                >
                  <ExportedImage
                    src={photos[currentImage].image_path}
                    alt={photos[currentImage].alt_text || 'Expanded image'}
                    width={photos[currentImage].width}
                    height={photos[currentImage].height}
                    style={{
                      objectFit: 'contain',
                      width: 'auto',
                      height: '70vh',
                    }}
                  />
                  {/* Caption below the expanded image */}
                  <div className="text-sm font-bold mt-2">
                    {photos[currentImage].alt_text || 'Expanded image'}
                  </div>
                </div>
              </motion.section>

              {/* Navigation Controls */}
              <div
                className="absolute top-[10%] left-0 h-full w-1/6 cursor-pointer clickable-area"
                onClick={() => handleNavigation('left')}
                id="click-left"
              />
              <div
                className="absolute top-[10%] right-0 h-full w-1/6 cursor-pointer clickable-area"
                onClick={() => handleNavigation('right')}
                id="click-right"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close Button - Fixed outside the expanded image */}
        {currentImage !== null && (
          <div
            className="fixed text-sm font-bold cursor-pointer uppercase"
            style={{ left: '1rem', top: '1rem', zIndex: 100 }}
            onClick={handleClose}
          >
            CLOSE
          </div>
        )}
      </div>
    </DefaultLayout>
  );
}

function PhotoBlock({ photo }) {
  return (
    <div className="flex justify-center items-start overflow-hidden" style={{ width: '100%', height: 'auto' }}>
      <ExportedImage
        src={photo.image_path}
        alt={photo.alt_text || 'Photo image'}
        width={photo.width}
        height={photo.height}
        sizes="(max-width: 800px) 100vw, 50vw"
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
}

export default ArchivePage;

export async function getStaticProps() {
  const page = await filer.getItem('archive.md', { folder: 'pages' });
  const photos = [];

  for (const photoBlock of page.data.content_blocks) {
    if (photoBlock._bookshop_name === 'collection/photo' && photoBlock.image_path) {
      try {
        const imagePath = path.join(process.cwd(), 'public', photoBlock.image_path);
        const dimensions = sizeOf(imagePath);

        photos.push({
          title: photoBlock.title || null,
          slug: photoBlock.slug || null,
          image_path: photoBlock.image_path,
          alt_text: photoBlock.alt_text || 'Photo image',
          width: dimensions.width,
          height: dimensions.height,
        });
      } catch (error) {
        console.error(`Error getting dimensions for image ${photoBlock.image_path}:`, error);
        photos.push({
          title: photoBlock.title || null,
          slug: photoBlock.slug || null,
          image_path: photoBlock.image_path,
          alt_text: photoBlock.alt_text || 'Photo image',
          width: 800,
          height: 600,
        });
      }
    }
  }

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
      photos,
    },
  };
}
