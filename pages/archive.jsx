import DefaultLayout from '../components/layouts/default';
import Filer from '@cloudcannon/filer';
import { motion, AnimatePresence } from 'framer-motion';
import ExportedImage from 'next-image-export-optimizer';
import sizeOf from 'image-size';
import path from 'path';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

const filer = new Filer({ path: 'content' });

function ArchivePage({ page, photos }) {
  const [currentImage, setCurrentImage] = useState(null);
  const [direction, setDirection] = useState('');
  const [isReturningFromExpandedView, setIsReturningFromExpandedView] = useState(false);
  const router = useRouter();
  const initialLoadRef = useRef(true);

  const handleImageClick = useCallback((index) => {
    setCurrentImage(index);
    setDirection('');
    setIsReturningFromExpandedView(true);
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
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router, handleClose]);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
    } else {
      setIsReturningFromExpandedView(false);
    }
  }, [router.asPath]);

  // Variants for the overall expanded view container (used for showing and hiding)
  const expandedViewVariants = {
    enter: { opacity: 0 },
    center: {
      opacity: 1,
      transition: {
        opacity: { duration: 0.3 },
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
        duration: 0.33,
        delay: index * 0.05,
      },
    }),
  };

  return (
    <DefaultLayout page={page}>
      <div className={`h-screen p-4 ${currentImage !== null ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <ul className="grid grid-cols-3 sm:grid-cols-[repeat(9,minmax(0,1fr))] gap-4 gap-y-32">
          {photos.map((photo, index) => (
            <motion.li
              key={index}
              initial="hidden"
              animate="visible"
              exit="exit"
              custom={index}
              variants={gridVariants}
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
              className="fixed z-50 overflow-x-hidden mt-8 sm:mt-0"
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
                  className='sm:max-h-75vh'
                  style={{
                    objectFit: 'contain',
                    width: 'auto',
                    transform: 'none',
                  }}
                />
                <div className="text-sm mt-2">
                  {photos[currentImage].alt_text || 'Expanded image'}
                </div>
              </motion.section>

              {/* Navigation Controls */}
              <div
                className="fixed top-0 left-0 h-full w-1/6 cursor-pointer clickable-area"
                onClick={() => handleNavigation('left')}
                id="click-left"
              >
                        <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute sm:hidden h-8 w-8 top-1/2"
                  fill="currentColor"
                  viewBox="0 0 320 512">
                    <path d="M15 239c-9.4 9.4-9.4 24.6 0 33.9L207 465c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9L65.9 256 241 81c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0L15 239z" />
                  </svg>
              </div>
              <div
                className="fixed top-0 right-0 h-full w-1/6 cursor-pointer clickable-area"
                onClick={() => handleNavigation('right')}
                id="click-right"
              >
                        <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute sm:hidden h-8 w-8 top-1/2 right-0"
                fill="currentColor"
                viewBox="0 0 320 512">
                  <path d="M305 239c9.4 9.4 9.4 24.6 0 33.9L113 465c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l175-175L79 81c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0L305 239z" />
              </svg>  
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close Button - Fixed outside the expanded image */}
        {currentImage !== null && (
          <div
            className="fixed text-sm cursor-pointer uppercase"
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