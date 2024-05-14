import DefaultLayout from '../components/layouts/default';
import Blocks from '../components/shared/blocks';
import Filer from '@cloudcannon/filer';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const filer = new Filer({ path: 'content' });

function HomePage({ page, collections }) {
  const router = useRouter();
  const [hoverIndex, setHoverIndex] = useState(-1);  // Tracks which item is hovered
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (router.isReady) {
      setIsInitialLoad(!performance.getEntriesByType("navigation").length);
    }
  }, [router.isReady]);

  return (
    <DefaultLayout page={page}>
      <ul className="grid grid-flow-col justify-start">
        {collections.map((collection, index) => (
          <li key={index} className="image-container" onMouseEnter={() => setHoverIndex(index)} onMouseLeave={() => setHoverIndex(-1)}>
            <Link href={`/collection/${collection.slug}`}>
              <motion.div
                layout
                layoutId={`image-${collection.slug}`}
                initial={{ opacity: isInitialLoad ? 0 : 1 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.1, transformOrigin: "top" }}
                transition={{ duration: 0.3, delay: isInitialLoad ? index * 0.3 : 0 }}
              >
                <Image
                  src={collection.firstImagePath}
                  alt={collection.firstImageAlt || 'Collection image'}
                  height={200}
                  width={200}
                  style={{ transition: 'transform 0.3s ease-in-out', width: 'auto', height: '200px' }}
                />
                <motion.span
                  style={{ opacity: hoverIndex === index ? 1 : 0, transition: 'opacity 0.3s' }}
                >
                  {collection.title}
                </motion.span>
              </motion.div>
            </Link>
          </li>
        ))}
      </ul>
    </DefaultLayout>
  );
}

export default HomePage;

export async function getStaticProps({ params }) {
  const page = await filer.getItem('index.md', { folder: 'pages' });
  const collections = [];

  for (const collectionPath of page.data.collections) {
    const correctedPath = collectionPath.replace(/^content\//, '');
    const collection = await filer.getItem(correctedPath, { folder: '' });

    const firstPhotoBlock = collection.data.content_blocks.find(block => block._bookshop_name === 'collection/photo');

    if (firstPhotoBlock && firstPhotoBlock.image_path) {
      collections.push({
        title: collection.data.title,
        path: correctedPath,
        slug: collection.data.slug,
        firstImagePath: firstPhotoBlock.image_path,
        firstImageAlt: firstPhotoBlock.alt_text || 'Default Alt Text'
      });
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