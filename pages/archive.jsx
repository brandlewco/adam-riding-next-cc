import DefaultLayout from '../components/layouts/default';
import Filer from '@cloudcannon/filer';
import { motion, AnimatePresence } from 'framer-motion';
import ExportedImage from 'next-image-export-optimizer';
import sizeOf from 'image-size';
import path from 'path';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSwipeable } from 'react-swipeable';

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

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'ArrowRight') {
        handleNavigation('right');
      } else if (event.key === 'ArrowLeft') {
        handleNavigation('left');
      }
    },
    [handleNavigation]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleNavigation('right'),
    onSwipedRight: () => handleNavigation('left'),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

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
        delay: 0.3 + index * 0.03,
      },
    }),
  };

  // LazyLoad Component
function LazyLoad({ children, rootMargin = '200px' }) {
  const ref = useRef();
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    // Create an Intersection Observer
    const observer = new IntersectionObserver(
      ([entry], observer) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(entry.target); // Unobserve instead of disconnecting completely
        }
      },
      {
        rootMargin: '0px',
        threshold: 0.1, // Load when 10% of the item is visible
      }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin]);

  return <div ref={ref}>{isInView ? children : null}</div>;
}

  return (
    <DefaultLayout page={page}>
      <div className={`h-screen  ${currentImage !== null ? 'overflow-hidden p-0' : 'overflow-y-auto overflow-x-hidden pt-4 pl-4 pr-3 pb-24'}`}>
        <ul className="grid grid-cols-3 sm:grid-cols-[repeat(9,minmax(0,1fr))] gap-4 gap-y-24">
          <AnimatePresence>
            {photos.map((photo, index) => (
              <motion.li
                key={index}
                initial="hidden"
                animate="visible"
                exit="exit"
                custom={index}
                variants={gridVariants}
                className={`flex justify-center items-start ${
                  currentImage !== null ? 'hidden' : ''
                } relative cursor-pointer transition-transform duration-200`}
                style={{
                  alignItems: 'flex-start',
                  transform: 'none !important',
                  transformOrigin: 'top center !important',
                }}
                onClick={() => handleImageClick(index)}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.33 }}
                  whileHover={{ scale: 1.1 }}
                  className="relative origin-center origin-top"
                >
                  <LazyLoad>
                  <ExportedImage
                    src={photo.image_path}
                    alt={photo.alt_text || 'Photo image'}
                    width={photo.width}
                    height={photo.height}
                    sizes="(max-width: 640px) 30vw, 10vw"
                    className='object-contain h-auto w-full'
                    loading="lazy"
                  />
                  </LazyLoad>
                </motion.div>
              </motion.li>
            ))}
          </AnimatePresence>
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
              className="fixed flex flex-col sm:flex-row flex-end w-full transform-none z-50 overflow-x-hidden p-4 mt-8 sm:mt-0"
              {...swipeHandlers} // Add swipe handlers
            >
              <motion.section
                className="photo flex flex-col items-end w-auto relative overflow-hidden"
                style={{ height: '100vh', width: '100%', maxWidth: '100vw' }}
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
                  sizes="(max-width: 640px) 100vw, 30vw"
                  className="md:h-85vh w-full md:w-auto self-end"
                  style={{
                    objectFit: 'contain',
                    transform: 'none',
                  }}
                  loading="eager" // Ensure the expanded view image loads immediately when viewed
                />
                <div className="text-sm mt-2 self-end">
                  {photos[currentImage].alt_text || 'Expanded image'}
                </div>
              </motion.section>

              {/* Navigation Controls */}
              <div
                className="fixed top-0 left-0 h-full w-1/6 md:w-1/2 cursor-pointer clickable-area"
                onClick={() => handleNavigation('left')}
                id="click-left"
              >
              </div>
              <div
                className="fixed top-0 right-0 h-full w-1/6 cursor-pointer clickable-area"
                onClick={() => handleNavigation('right')}
                id="click-right"
              >
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close Button - Fixed outside the expanded image */}
        {currentImage !== null && (
          <div
            className="absolute text-sm cursor-pointer uppercase p-4 top-0 left-0 z-50"
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
          image_path: photoBlock.image_path || null,
          alt_text: photoBlock.alt_text || 'Photo image',
          width: dimensions.width  || 400,
          height: dimensions.height || 300,
        });
      } catch (error) {
        console.error(`Error getting dimensions for image ${photoBlock.image_path}:`, error);
        photos.push({
          title: photoBlock.title || null,
          slug: photoBlock.slug || null,
          image_path: photoBlock.image_path  || null,
          alt_text: photoBlock.alt_text || 'Photo image',
          width: 400,
          height: 300,
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