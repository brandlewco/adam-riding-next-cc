import components from '../../components/**/*.jsx';

const getComponentKey = (name) => {
    return `../../components/${name}.jsx`;
};

function Blocks({ content_blocks, nextSlug, prevSlug }) {  // Include nextSlug and prevSlug in props
    return (
        <>
            {content_blocks.map((block, i) => {
                const newDataBinding = `#content_blocks.${i}`;
                const componentPath = getComponentKey(block._bookshop_name);
                const TargetComponent = Object.entries(components).filter(([k]) =>
                    k.endsWith(componentPath)
                )?.[0]?.[1]?.default;

                if (!TargetComponent) {
                    throw new Error(`Component not found for ${block._bookshop_name}: ${componentPath}`);
                }
                // Pass nextSlug and prevSlug if the component is CollectionPhotos
                if (block._bookshop_name === 'collection/photos') {
                    return <TargetComponent block={block} dataBinding={newDataBinding} key={i} nextSlug={nextSlug} prevSlug={prevSlug} />;
                }
                return <TargetComponent block={block} dataBinding={newDataBinding} key={i} />;
            })}
        </>
    );
}

export default Blocks;