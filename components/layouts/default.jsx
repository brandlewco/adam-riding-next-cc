import Head from "next/head";
import { NextSeo } from "next-seo";
import data from "../../lib/data";
import Navigation from "./navigation";

export default function DefaultLayout({ children, page }) {
  const title = page?.data.title
    ? `${page.data.title} | ${data.site.site_title}`
    : data.site.site_title;
  const description = page?.data.seo?.page_description || data.site.description;
  const image = page?.data.seo?.feature_image || data.site.image;
  const image_alt = page?.data.seo?.feature_image_alt || data.site.image_alt;

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
        noindex={page.data.seo?.no_index || false}
        title={title}
        description={description}
        canonical={`${data.site.baseurl}${
          page.data.seo?.canonical_url || page.slug
        }`}
        openGraph={{
          url: data.site.baseurl,
          title: title,
          description: description,
          type: `${page.data.seo?.open_graph_type || "website"}`,
          images: [
            {
              url: image,
              alt: image_alt,
            },
          ],
        }}
        twitter={{
          handle: `${
            page.data.seo?.author_twitter_handle || data.site.twitter_site
          }`,
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
