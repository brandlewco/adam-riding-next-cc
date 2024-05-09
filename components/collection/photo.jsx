import MarkdownIt from "markdown-it";
import Image from "next/image"; // Import the Next.js Image component

const md = new MarkdownIt({ html: true });

export default function CollectionPhoto({ block, dataBinding }) {

  return (
    <section className="gallery" data-cms-bind={dataBinding} >
            <Image
                src={block.image.image_path}
                alt="Slide Image"
                layout="fill"
                objectFit="contain"
                priority={page === 0}
            />
    </section>
  );
}
