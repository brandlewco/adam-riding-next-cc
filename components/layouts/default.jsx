import Head from "next/head";
import { NextSeo } from "next-seo";
import data from "../../lib/data";
import Navigation from "./navigation";

export default function DefaultLayout({ children, page }) {
  const hasPageData = Boolean(page && page.data);
  const slug = page?.slug || "";
  const seo = hasPageData ? page.data.seo || {} : {};

  const title = hasPageData && page.data.title
    ? `${page.data.title} | ${data.site.site_title}`
    : data.site.site_title;
  const description = seo.page_description || data.site.description;
  const image = seo.feature_image || data.site.image;
  const image_alt = seo.feature_image_alt || data.site.image_alt;
  const canonicalPath = seo.canonical_url || slug;
  const openGraphType = seo.open_graph_type || "website";
  const noIndex = seo.no_index || false;
  const twitterHandle = seo.author_twitter_handle || data.site.twitter_site;

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-EYY75VRMHK"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-EYY75VRMHK');
            `,
          }}
        />
      </Head>

      <NextSeo
        noindex={noIndex}
        title={title}
        description={description}
        canonical={`${data.site.baseurl}${canonicalPath}`}
        openGraph={{
          url: data.site.baseurl,
          title: title,
          description: description,
          type: `${openGraphType}`,
          images: [
            {
              url: image,
              alt: image_alt,
            },
          ],
        }}
        twitter={{
          handle: `${twitterHandle}`,
          site: `${data.site.twitter_site}`,
          cardType: "summary_large_image",
        }}
        additionalLinkTags={[
          {
            rel: "icon",
            href: `${data.site.favicon_image}`,
            type: "image/x-icon",
          },
          {
            rel: "shortcut icon",
            href: `${data.site.favicon_icon}`,
            type: "image/x-icon",
          },
          { rel: "apple-touch-icon", href: `${data.site.favicon_image}` },
          {
            rel: "icon",
            type: "image/png",
            href: `${data.site.favicon_image}`,
          },
        ]}
      />
      {children}
      <script src="/js/script.js" defer></script>
    </>
  );
}
