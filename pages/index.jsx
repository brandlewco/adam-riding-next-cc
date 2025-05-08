import CollectionPage, {
  getStaticProps as getCollectionStaticProps,
} from "./collection/[slug]";

export default function Home(props) {
  // Render the collection page for the "overview" (or whatever your home collection is)
  // Pass source="home" to enable looping logic
  return <CollectionPage {...props} source="home" />;
}

// Use the getStaticProps from collection/[slug].jsx, targeting slug "overview"
export async function getStaticProps(context) {
  return getCollectionStaticProps({ params: { slug: "overview" } });
}
