import Link from "next/link";

export default function GlobalError({ block = {}, dataBinding }) {
  const title = block.title || "Oops, nothing found here.";
  const description =
    block.description || "The page you were looking for has vanished.";
  const buttonText = block.button_text || "Go home";
  const buttonHref = block.button_href || "/";

  return (
    <section
      className="py-24 text-center flex flex-col items-center justify-center"
      data-cms-bind={dataBinding}
    >
      <div className="max-w-xl px-6">
        <h1 className="text-3xl font-semibold tracking-tight mb-6">{title}</h1>
        <p className="text-base text-gray-600 mb-8">{description}</p>
        <Link
          href={buttonHref}
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold uppercase tracking-wide bg-black text-white hover:bg-gray-900 transition"
        >
          {buttonText}
        </Link>
      </div>
    </section>
  );
}
