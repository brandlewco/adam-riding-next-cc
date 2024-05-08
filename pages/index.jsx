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
  const [isReturning, setIsReturning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = () => {
      setIsReturning(true); // Set to true when navigating away
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events]);

    return (
      <DefaultLayout page={page}>
            <ul className="flex flex-row justify-start">
        {collections.map((collection, index) => (
          <li key={index}>
            <Link href={`/collection/${collection.slug}`}>
                <motion.div
                  layout
                  layoutId={`image-${collection.firstImagePath}`}
                  initial={isReturning ? { opacity: 1 } : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: isReturning ? 0 : index * 0.3 }}
                  >
                  <Image
                    src={collection.firstImagePath}
                    alt={collection.firstImageAlt || 'Collection image'}
                    style={{
                      width: '100%',
                      height: '300px',
                    }}
                    width={500}
                    height={300}
                  />
                </motion.div>
            </Link>
          </li>
        ))}
      </ul>
    </DefaultLayout>
    )
  }
  
export default HomePage
  
export async function getStaticProps({ params }) {
  const page = await filer.getItem('index.md', { folder: 'pages' }); // Fetch the index.md which includes references to collections
  const collections = [];

  for (const collectionPath of page.data.collections) {
    const correctedPath = collectionPath.replace(/^content\//, '');
    const collection = await filer.getItem(correctedPath, { folder: '' });
    // Find the first content block with a _bookshop_name of 'collection/photos'
    const photoBlock = collection.data.content_blocks.find(block => block._bookshop_name === 'collection/photos');

    const firstImage = photoBlock?.images[0]; // Get the first image if available

    collections.push({
      title: collection.data.title, // Extract the title from the front matter
      path: correctedPath, // Store the corrected path for any further use
      slug: collection.data.slug, // Store the slug for the collection
      firstImagePath: firstImage ? firstImage.image_path : null, // Store the first image path if available
      firstImageAlt: firstImage ? firstImage.alt_text : '' // Store the alt text of the first image if available
    });
  }

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)), // Ensure all content is serializable
      collections // This now includes objects with titles, paths, and first image details
    }
  };
}
