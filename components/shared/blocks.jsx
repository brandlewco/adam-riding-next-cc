import React from "react";
import components from "../../components/**/*.jsx";

const getComponentKey = (name) => {
    return `../../components/${name}.jsx`;
};

function Blocks({
  content_blocks = [],
  currentIndex,
  setImageLoaded,
  componentProps,
  render,
}) {
  return (
    <>
      {content_blocks.map((block, i) => {
        if (typeof currentIndex === "number" && i !== currentIndex) {
          return null;
        }

        const newDataBinding = `#content_blocks.${i}`;
        const componentPath = getComponentKey(block._bookshop_name);
        const TargetComponent = Object.entries(components).filter(([k]) =>
          k.endsWith(componentPath)
        )?.[0]?.[1]?.default;

        if (!TargetComponent) {
          throw new Error(`Component not found for ${block._bookshop_name}: ${componentPath}`);
        }

        const extraProps =
          typeof componentProps === "function"
            ? componentProps({ block, index: i }) || {}
            : componentProps || {};

        const element = (
          <TargetComponent
            block={block}
            dataBinding={newDataBinding}
            setImageLoaded={setImageLoaded}
            {...extraProps}
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
