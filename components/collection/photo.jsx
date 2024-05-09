import MarkdownIt from "markdown-it";
import Image from "next/image"; // Import the Next.js Image component

const md = new MarkdownIt({ html: true });

export default function CollectionPhoto({ block, dataBinding }) {
  return (
    <section  data-cms-bind={dataBinding} className="photo flex justify-end items-start w-auto relative" style={{ height: '90vh' }}>
            <Image
                src={block.image_path}
                alt={block.alt_text || "Slide Image"}
                layout="fill"
                objectFit="contain"
            />
    </section>
  );
}
