import React from "react";
import * as blogList from "../../components/blog/list.jsx";
import * as collectionPhoto from "../../components/collection/photo.jsx";
import * as collectionSeparator from "../../components/collection/separator.jsx";
import * as collectionText from "../../components/collection/text.jsx";
import * as collectionVideo from "../../components/collection/video.jsx";
import * as globalError from "../../components/global/error.jsx";
import * as homeIndex from "../../components/home/index.jsx";
import * as icon from "../../components/icon.jsx";
import * as layoutDefault from "../../components/layouts/default.jsx";
import * as layoutNavigation from "../../components/layouts/navigation.jsx";
import * as postsSummary from "../../components/posts/summary.jsx";
import * as sharedError from "../../components/shared/error.jsx";
import * as sharedImageFrame from "../../components/shared/shared-image-frame.jsx";

const components = {
  "../../components/blog/list.jsx": blogList,
  "../../components/collection/photo.jsx": collectionPhoto,
  "../../components/collection/separator.jsx": collectionSeparator,
  "../../components/collection/text.jsx": collectionText,
  "../../components/collection/video.jsx": collectionVideo,
  "../../components/global/error.jsx": globalError,
  "../../components/home/index.jsx": homeIndex,
  "../../components/icon.jsx": icon,
  "../../components/layouts/default.jsx": layoutDefault,
  "../../components/layouts/navigation.jsx": layoutNavigation,
  "../../components/posts/summary.jsx": postsSummary,
  "../../components/shared/error.jsx": sharedError,
  "../../components/shared/shared-image-frame.jsx": sharedImageFrame,
};

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
