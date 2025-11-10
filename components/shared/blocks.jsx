import React from "react";
import components from "../../components/**/*.jsx";

const getComponentKey = (name) => {
    return `../../components/${name}.jsx`;
};

function Blocks({
  content_blocks = [],
  blocks,
  currentIndex,
  setImageLoaded,
  componentProps,
  render,
}) {
  const blockList = Array.isArray(content_blocks) && content_blocks.length
    ? content_blocks
    : Array.isArray(blocks) ? blocks : [];

  return (
    <>
      {blockList.map((block, i) => {
        if (typeof currentIndex === "number" && i !== currentIndex) {
          return null;
        }

        const bindingSource = blockList === content_blocks ? "content_blocks" : "blocks";
        const newDataBinding = `#${bindingSource}.${i}`;
        const componentPath = getComponentKey(block._bookshop_name);
        const TargetComponent = Object.entries(components).filter(([k]) =>
          k.endsWith(componentPath)
        )?.[0]?.[1]?.default;

        const extraProps =
          typeof componentProps === "function"
            ? componentProps({ block, index: i }) || {}
            : componentProps || {};

        if (!TargetComponent && process.env.NODE_ENV !== "production") {
          console.warn(`Component not found for ${block._bookshop_name}: ${componentPath}`);
        }

        const element = TargetComponent ? (
          <TargetComponent
            block={block}
            dataBinding={newDataBinding}
            setImageLoaded={setImageLoaded}
            {...extraProps}
          />
        ) : (
          <div
            key={i}
            data-missing-component={block._bookshop_name || "unknown"}
            style={{ display: "none" }}
          />
        );

        const keyedElement = React.isValidElement(element)
          ? React.cloneElement(element, { key: i })
          : element;

        if (render) {
          return render({ element: keyedElement, block, index: i });
        }

        return keyedElement;
      })}
    </>
  );
}

export default Blocks;
