import DefaultLayout from '../components/layouts/default';
import Filer from '@cloudcannon/filer';
import { motion } from 'framer-motion';
import ExportedImage from 'next-image-export-optimizer';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import useStore from '../lib/store';
import React from 'react';
import sizeOf from 'image-size';
import path from 'path';

const filer = new Filer({ path: 'content' });

function HomePage({ page, collections }) {
  const router = useRouter();
  const [hoverIndex, setHoverIndex] = useState(-1);
  const hoverRefs = useRef([]);
  const titleRefs = useRef([]);
  const [visibleIndices, setVisibleIndices] = useState(new Set());

  const handleAnimationComplete = useCallback(() => {
    console.log('Animation complete');
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      console.log('Route change complete');
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  useEffect(() => {
    hoverRefs.current.forEach((ref) => {
      if (ref) {
        ref.style.setProperty('transform-origin', 'top left', 'important');
      }
    });
  }, [hoverIndex, collections.length]);

  const handleMouseEnter = useCallback((index) => {
    setHoverIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(-1);
  }, []);

  const getMaxWidthClass = (totalItems) => {
    return `sm:max-w-[calc((100%-${totalItems - 1}*1rem)/${totalItems})]`;
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const newVisibleIndices = new Set(visibleIndices);
        entries.forEach((entry) => {
          const index = parseInt(entry.target.dataset.index, 10);
          if (entry.isIntersecting) {
            newVisibleIndices.add(index);
          } else {
            newVisibleIndices.delete(index);
          }
        });
        if (newVisibleIndices.size !== visibleIndices.size) {
          setVisibleIndices(newVisibleIndices);
        }
      },
      {
        rootMargin: '-20% 0px -20% 0px', // Adjust root margin to trigger 20% from top and bottom
        threshold: [0, 1], // Detect when the title is fully in view and fully out of view
      }
    );

    titleRefs.current.forEach((ref, index) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      titleRefs.current.forEach((ref) => {
        if (ref) {
          observer.unobserve(ref);
        }
      });
    };
  }, [collections.length, visibleIndices]);

  return (
    <DefaultLayout page={page}>
      <div className="p-4 border border-gray-300 overflow-y-auto h-screen">
        <ul className="flex flex-col sm:flex-row items-end sm:items-start gap-4">
          {collections.map((collection, collectionIndex) => {
            const maxWidthClass = getMaxWidthClass(collections.length);
            return (
              <li
                key={collectionIndex}
                className={`flex-1 max-w-[60%] sm:max-w-[calc((100%-${collections.length - 1}*1rem)/${collections.length})] ml-auto ${maxWidthClass} text-right`}
                onMouseEnter={() => handleMouseEnter(collectionIndex)}
                onMouseLeave={handleMouseLeave}
                ref={(el) => (hoverRefs.current[collectionIndex] = el)}
                data-index={collectionIndex}
              >
                <Link href={`/collection/${collection.slug}`} passHref>
                <motion.div
                    layoutId={`collection-${collection.slug}`}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.1 }}
                    transition={{ opacity: { duration: 0.33, delay: collectionIndex * 0.1 } }} // Apply delay only to opacity animation
                    onAnimationComplete={handleAnimationComplete}
                    style={{ originX: '50%', originY: 0}}
                    className="flex flex-col"
                  >
                    <ExportedImage
                      src={collection.firstImagePath}
                      alt={collection.firstImageAlt || 'Collection image'}
                      width={collection.width}
                      height={collection.height}
                      priority
                      sizes="(max-width: 480px) 100vw, 480px"
                    />
                    <motion.span
                      ref={(el) => (titleRefs.current[collectionIndex] = el)}
                      data-index={collectionIndex}
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity:
                          hoverIndex === collectionIndex ||
                          (visibleIndices.has(collectionIndex) && window.innerWidth < 640)
                            ? 1
                            : 0,
                      }}
                      transition={{ duration: 0.33, }}
                      className='text-sm leading-tight'
                    >
                      {collection.title}
                    </motion.span>
                  </motion.div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </DefaultLayout>
  );
}

export default React.memo(HomePage);

export async function getStaticProps() {
  const page = await filer.getItem('index.md', { folder: 'pages' });
  const collections = [];

  for (const collectionPath of page.data.collections) {
    const correctedPath = collectionPath.replace(/^content\//, '');
    const collection = await filer.getItem(correctedPath, { folder: '' });

    const firstPhotoBlock = collection.data.content_blocks.find(block => block._bookshop_name === 'collection/photo');

    if (firstPhotoBlock && firstPhotoBlock.image_path) {
      try {
        const imagePath = path.join(process.cwd(), 'public', firstPhotoBlock.image_path);
        const dimensions = sizeOf(imagePath);
        const aspectRatio = dimensions.width / dimensions.height;
        const newWidth = 480;
        const newHeight = Math.round(newWidth / aspectRatio);

        collections.push({
          title: collection.data.title,
          path: correctedPath,
          slug: collection.data.slug || correctedPath.split('/').pop(), // Ensure slug is set correctly
          firstImagePath: firstPhotoBlock.image_path,
          firstImageAlt: firstPhotoBlock.alt_text || 'Default Alt Text',
          width: newWidth,
          height: newHeight,
        });
      } catch (error) {
        console.error(`Error getting dimensions for image ${firstPhotoBlock.image_path}:`, error);
        // Handle the error or set default dimensions
        collections.push({
          title: collection.data.title,
          path: correctedPath,
          slug: collection.data.slug || correctedPath.split('/').pop(), // Ensure slug is set correctly
          firstImagePath: firstPhotoBlock.image_path,
          firstImageAlt: firstPhotoBlock.alt_text || 'Default Alt Text',
          width: 480, // Default width
          height: auto, // Default height assuming a 3:2 aspect ratio
        });
      }
    } else {
      console.log('No valid images found for:', collection.data.title);
    }
  }

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
      collections
    }
  };
}