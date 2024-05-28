import MarkdownIt from "markdown-it";
import ExportedImage from "next-image-export-optimizer";

const md = new MarkdownIt({ html: true });

export default function CollectionPhoto({ block, dataBinding }) {
  return (
    <section  data-cms-bind={dataBinding} className="photo flex justify-end items-start w-auto relative" style={{ height: '90vh' }}>
        <ExportedImage
          src={block.image_path}
          alt={block.alt_text || "Slide Image"}
          fill
          style={{ objectFit: "cover" }}
          priority
        />
    </section>
  );
}
