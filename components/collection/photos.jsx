import MarkdownIt from 'markdown-it';
const md = new MarkdownIt({ html: true });
import React, { useEffect, useRef, useState } from 'react';
import { FullPage, Slide } from 'react-full-page';

export default function CollectionPhotos({ block, dataBinding }) {
    const fullPageRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Custom throttle function
    function throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        }
    }

    const handleKeyDown = throttle((event) => {
        if (!fullPageRef.current) return;

        let newIndex = currentIndex;
        if (event.key === 'ArrowUp') {
            newIndex = Math.max(currentIndex - 1, 0);
        } else if (event.key === 'ArrowDown') {
            newIndex = Math.min(currentIndex + 1, block.images.length - 1);
        }

        if (newIndex !== currentIndex) {
            setCurrentIndex(newIndex);
            fullPageRef.current.scrollToSlide(newIndex);  // Navigate using scrollToSlide
        }
    }, 5000); // Throttle the event handling to once every 300 milliseconds

    const afterChangeHandler = (info) => {
        setCurrentIndex(info.to);  // Update the current index based on the slide index after change
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [currentIndex]);  // Include currentIndex in dependencies to update closure

    return (
        <section className="gallery" data-cms-bind={dataBinding}>
            <FullPage ref={fullPageRef} afterChange={afterChangeHandler}>
                {block.images.map((q, i) => (
                    <Slide key={i}>
                        <figure className="flex justify-end items-center h-screen">
                            <img src={q.image_path} alt="Slide Image" className="h-[95%]" />
                        </figure>
                    </Slide>
                ))}
            </FullPage>
        </section>
    );
}
