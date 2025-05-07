import CollectionPage, {
  getStaticProps as getCollectionStaticProps,
} from "./collection/[slug]";

export default function Home(props) {
  // Render the collection page for the "overview" collection
  return <CollectionPage {...props} />;
}

// Use the getStaticProps from collection/[slug].jsx, targeting slug "overview"
export async function getStaticProps(context) {
  return getCollectionStaticProps({ params: { slug: "overview" } });
}
