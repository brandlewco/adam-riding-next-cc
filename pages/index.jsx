import DefaultLayout from '../components/layouts/default';
import Blocks from '../components/shared/blocks';
import Filer from '@cloudcannon/filer';
import Image from 'next/image';
const filer = new Filer({ path: 'content' });

function HomePage({ page, collections }) {
    return (
      <DefaultLayout page={page}>
      <div>
        <ul className='flex flex-row'>
          {collections.map((collection, index) => (
            <li key={index}>
              {collection.firstImagePath && (
                <div style={{ width: '300px', height: 'auto', overflow: 'hidden' }}>
                <Image
                  src={collection.firstImagePath}
                  alt={collection.firstImageAlt || 'Collection image'}
                  width={500} // Example width; adjust based on your layout needs
                  height={300}
                  layout='responsive' // Makes the image scale based on the width of the parent but maintain the aspect ratio
                  objectFit='contain' // This ensures that the image is scaled to fit within the frame without being cropped
                />
              </div>          
                )}
            </li>
          ))}
        </ul>
      </div>
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
