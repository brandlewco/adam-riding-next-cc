import DefaultLayout from '../components/layouts/default';
import Filer from '@cloudcannon/filer';
import { motion, AnimatePresence } from 'framer-motion';
import ExportedImage from 'next-image-export-optimizer';
import sizeOf from 'image-size';
import path from 'path';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';

const filer = new Filer({ path: 'content' });

function ArchivePage({ page, photos }) {
  const [currentImage, setCurrentImage] = useState(null);
  const [direction, setDirection] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);
  const router = useRouter();

  const handleImageClick = useCallback((index) => {
    setCurrentImage(index);
    setDirection('');
    setInitialLoad(false);
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

  useEffect(() => {
    const handleRouteChange = (url) => {
      if (url === '/archive') {
        handleClose();
        setInitialLoad(false);
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router, handleClose]);

  // Variants for the overall expanded view container (used for showing and hiding)
  const expandedViewVariants = {
    enter: { opacity: 0 },
    center: {
      opacity: 1,
      transition: {
        opacity: { duration: 0.4 },
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.3 },
    },
  };

  // Variants for the image navigation inside the expanded view (left and right movement)
  const navigationVariants = {
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

  // Variants for the grid items with simple opacity control
  const gridVariants = {
    hidden: { opacity: 0, transform: 'none' },
    visible: (index) => ({
      opacity: 1,
      transform: 'none',
      transition: {
        delay: initialLoad ? index * 0.025 : 0,
        duration: 0.3,
      },
    }),
  };

  return (
    <DefaultLayout page={page}>
      <div className={`h-screen p-4 ${currentImage !== null ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <ul className="grid grid-cols-3 sm:grid-cols-[repeat(15,minmax(0,1fr))] gap-4 gap-y-8">
          {photos.map((photo, index) => (
            <motion.li
              key={index}
              initial={initialLoad ? 'hidden' : false}
              animate="visible"
              exit="exit"
              variants={gridVariants}
              custom={index}
              className={`flex justify-center items-start overflow-hidden ${
                currentImage !== null ? 'hidden' : ''
              } relative cursor-pointer hover:scale-105 transition-transform duration-200`}
              style={{
                alignItems: 'flex-start',
                transform: 'none !important',
                transformOrigin: 'center !important',
              }}
              onClick={() => handleImageClick(index)}
            >
              <ExportedImage
                src={photo.image_path}
                alt={photo.alt_text || 'Photo image'}
                width={photo.width}
                height={photo.height}
                sizes="(max-width: 800px) 100vw, 20vw"
                style={{
                  objectFit: 'contain',
                  height: 'auto',
                  width: '100%',
                }}
              />
            </motion.li>
          ))}
        </ul>

        {/* Expanded Image View */}
        <AnimatePresence custom={direction} mode="wait">
          {currentImage !== null && (
            <motion.div
              key={currentImage}
              layoutId={`image-${photos[currentImage].slug}-${photos[currentImage].image_path}`}
              variants={expandedViewVariants} // Use for overall expanded view animations
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
                transform: 'none',
              }}
            >
              <motion.section
                className="photo flex flex-col items-end w-auto relative overflow-hidden"
                style={{ height: '100vh', width: '100%' }}
                variants={navigationVariants} // Use for left and right navigation animations
                initial="enter"
                animate="center"
                exit="exit"
                custom={direction}
              >
                <ExportedImage
                  src={photos[currentImage].image_path}
                  alt={photos[currentImage].alt_text || 'Expanded image'}
                  width={photos[currentImage].width}
                  height={photos[currentImage].height}
                  sizes="(max-width: 1080px) 100vw, 1080px"
                  style={{
                    objectFit: 'contain',
                    width: 'auto',
                    maxHeight: '70vh',
                    transform: 'none',
                  }}
                />
                <div className="text-sm font-bold mt-2">
                  {photos[currentImage].alt_text || 'Expanded image'}
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
