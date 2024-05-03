import DefaultLayout from '../components/layouts/default';
import Blocks from '../components/shared/blocks';
import Filer from '@cloudcannon/filer';

const filer = new Filer({ path: 'content' });

function HomePage({ page, collections }) {
    return (
      <DefaultLayout page={page}>
      <div>
        <h1>Collections</h1>
        <ul>
          {collections.map((collection, index) => (
            <li key={index}>{collection.title}</li> // Correct: Accessing the title property
          ))}
        </ul>
      </div>
    </DefaultLayout>
    )
  }
  
export default HomePage
  
export async function getStaticProps({ params }) {
  const page = await filer.getItem('index.md', { folder: 'pages' }); // Fetch the index.md which includes references to collections

  // Initialize an array to store collection details
  const collections = [];

  for (const collectionPath of page.data.collections) {
    // Remove any redundant base path if the paths in index.md already include it
    const correctedPath = collectionPath.replace(/^content\//, '');
    const collection = await filer.getItem(correctedPath, { folder: '' });

    collections.push({
      title: collection.data.title, // Extract the title from the front matter
      path: correctedPath // Store the corrected path for any further use
    });
  }

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)), // Ensure all content is serializable
      collections // This now includes objects with titles and paths
    }
  };
}
