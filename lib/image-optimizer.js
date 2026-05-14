const BASE_RESPONSIVE_WIDTHS = [600, 1200, 1920];

export const GRID_IMAGE_SIZES = "(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 12vw";
export const LIST_IMAGE_SIZES = "(max-width: 768px) calc(100vw - 2rem), (max-width: 1220px) calc(100vw - 2rem), 1100px";
export const MAIN_IMAGE_SIZES = "(max-width: 768px) calc(100vw - 2rem), (max-width: 1220px) calc(100vw - 2rem), 1100px";

export const MAIN_IMAGE_BASE_WIDTHS = [480, 768, 960, 1100];
export const LIST_IMAGE_BASE_WIDTHS = [480, 768, 960, 1100];
export const GRID_IMAGE_BASE_WIDTHS = [240, 360, 480, 640];
export const THUMB_IMAGE_BASE_WIDTHS = [120, 184];
export const STRIP_THUMB_BASE_WIDTHS = [32, 64];
export const PRELOAD_IMAGE_BASE_WIDTHS = [64, 128];

const getResponsiveWidths = (baseWidths = BASE_RESPONSIVE_WIDTHS, maxWidth) => {
  const widthSet = new Set();

  baseWidths.forEach((width) => {
    if (!Number.isFinite(width) || width <= 0) return;
    const oneX = Math.round(width);
    const twoX = Math.round(width * 2);

    if (!Number.isFinite(maxWidth) || maxWidth <= 0 || oneX <= maxWidth) {
      widthSet.add(oneX);
    }
    if (!Number.isFinite(maxWidth) || maxWidth <= 0 || twoX <= maxWidth) {
      widthSet.add(twoX);
    }
  });

  return Array.from(widthSet).sort((a, b) => a - b);
};

export function getOptimizedUrl(path, width) {
  if (!path || typeof path !== "string") return "";

  if (path.startsWith("http")) {
    if (!Number.isFinite(width) || width <= 0) return path;

    try {
      const url = new URL(path);
      url.searchParams.set("width", String(width));
      return url.toString();
    } catch {
      const separator = path.includes("?") ? "&" : "?";
      return `${path}${separator}width=${width}`;
    }
  }

  if (path.startsWith("/uploads")) {
    return path;
  }

  return path;
}

export function getOptimizedSrcSet(
  path,
  baseWidths = BASE_RESPONSIVE_WIDTHS,
  maxWidth
) {
  if (!path || typeof path !== "string") return "";

  return getResponsiveWidths(baseWidths, maxWidth)
    .map((width) => `${getOptimizedUrl(path, width)} ${width}w`)
    .join(", ");
}

export function getOptimizedImageProps(
  path,
  {
    srcWidth = 1200,
    sizes = "100vw",
    baseWidths = BASE_RESPONSIVE_WIDTHS,
    maxWidth,
  } = {}
) {
  if (!path || typeof path !== "string") {
    return {
      src: "",
      srcSet: "",
      sizes,
    };
  }

  return {
    src: getOptimizedUrl(path, srcWidth),
    srcSet: getOptimizedSrcSet(path, baseWidths, maxWidth),
    sizes,
  };
}