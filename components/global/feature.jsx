import Link from "next/link";

export default function GlobalFeature( {block, dataBinding}) {
    let content = ''
    if (block.reversed){
        content = <>
            <div class="row align-items-center">
                <div class="col-lg-6">
                    <div class="feature-item-banner mb-sm-8 mb-lg-10 mb-xxl-15 mb-7">
                    <div class="card-image">
                        <img src={block.image_path} alt="card-images" loading="lazy" />
                    </div>
                    <div class="effect-one">
                        <img
                        src="/images/feature/effect-1.png"
                        alt="effect-image"
                        loading="lazy"
                        />
                    </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="feature-item-content mb-xl-15 mb-md-10 mb-7 ps-xxl-8 ps-0">
                    <h2>{block.title}</h2>
                    <p>{block.description}</p>
                    <div class="Learn-more">
                        { block.btn && 
                            <Link href={block.btn.link}>
                                {block.btn.text}
                                <i class="ph-arrow-right"></i>    
                            </Link>
                        }
                    </div>
                    </div>
                </div>
            </div>
        </>
    } else {
        content = <>
            <div class="row align-items-center">
                <div class="col-lg-6 order-2 order-lg-1">
                    <div class="feature-item-content mb-xl-15 mb-md-10 mb-7 ps-xxl-8 ps-0">
                    <h2 class="pe-xl-0">{block.title}</h2>
                    <p>{block.description}</p>
                    <div class="Learn-more">
                        { block.btn && 
                            <Link href={block.btn.link}>
                                {block.btn.text}
                                <i class="ph-arrow-right"></i>
                            </Link>
                        }
                    </div>
                    </div>
                </div>
                <div class="col-lg-6 order-1 order-lg-2">
                    <div class="feature-item-banner mb-sm-8 mb-lg-10 mb-xxl-15 mb-7">
                    <div class="card-image">
                        <img src={block.image_path} alt="card-images" loading="lazy" />
                    </div>
                    <div class="effect-two">
                        <img
                        src="/images/feature/effect-2.png"
                        alt="effect-image"
                        loading="lazy"
                        />
                    </div>
                    </div>
                </div>
            </div> 
        </>
    }
	return (
        <section class="feature pt-sm-10 pt-5 pb-4">
            <div class="container">
                {content}
            </div>
        </section>
	);
}
