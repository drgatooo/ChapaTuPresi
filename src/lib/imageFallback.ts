export function prepareFallback(imageClass: string) {
    const imgs = document.querySelectorAll<HTMLImageElement>(
        `img.${imageClass}`,
    );

    console.log(imgs)
    imgs.forEach((img) => {
        img.onerror = () => fallback(img as HTMLImageElement, img.src);
    });
}

function fallback(img: HTMLImageElement, url?: string) {
    if (!url) return;
    img.onerror = null;
    img.src = url.replace(".jpg", ".jpeg");
}