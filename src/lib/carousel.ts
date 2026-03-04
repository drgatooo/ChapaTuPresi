export const setupCarousel = () => {
    const carousel = document.getElementById("newsCarousel");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    if (!carousel || !prevBtn || !nextBtn) return;

    const getScrollTarget = (direction: string) => {
        const items = Array.from(carousel.querySelectorAll("a"));
        const scrollLeft = carousel.scrollLeft;
        const carouselWidth = carousel.offsetWidth;
        const gap = 24; // El gap que definiste en el flex

        // Encontramos el índice de la noticia que está actualmente más visible
        const currentIndex = items.findIndex((item) => {
            return item.offsetLeft - carousel.offsetLeft >= scrollLeft - 10;
        });

        if (direction === "next") {
            // Buscamos la primera noticia que esté fuera del rango actual de visión
            const nextItem = items.find(
                (item) => item.offsetLeft - carousel.offsetLeft > scrollLeft + 10,
            );
            return nextItem ? nextItem.offsetLeft - carousel.offsetLeft : null;
        } else {
            // Buscamos la noticia anterior
            const prevItem = items
                .slice()
                .reverse()
                .find(
                    (item) => item.offsetLeft - carousel.offsetLeft < scrollLeft - 10,
                );
            return prevItem ? prevItem.offsetLeft - carousel.offsetLeft : null;
        }
    };

    nextBtn.addEventListener("click", () => {
        const target = getScrollTarget("next");
        if (target !== null) {
            carousel.scrollTo({ left: target, behavior: "smooth" });
        }
    });

    prevBtn.addEventListener("click", () => {
        const target = getScrollTarget("prev");
        if (target !== null) {
            carousel.scrollTo({ left: target, behavior: "smooth" });
        }
    });

    // Feedback visual de los botones
    const updateButtons = () => {
        const isAtStart = carousel.scrollLeft <= 5;
        const isAtEnd =
            carousel.scrollLeft + carousel.offsetWidth >= carousel.scrollWidth - 5;

        prevBtn.style.opacity = isAtStart ? "0.3" : "1";
        prevBtn.style.pointerEvents = isAtStart ? "none" : "auto";

        nextBtn.style.opacity = isAtEnd ? "0.3" : "1";
        nextBtn.style.pointerEvents = isAtEnd ? "none" : "auto";
    };

    carousel.addEventListener("scroll", updateButtons);
    // Ejecutar una vez al inicio
    updateButtons();
};