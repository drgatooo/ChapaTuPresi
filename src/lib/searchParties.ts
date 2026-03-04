const searchInput = document.getElementById(
    "party-search",
) as HTMLInputElement;
const positionFilter = document.getElementById(
    "posicion-filter",
) as HTMLSelectElement;
const showMoreBtn = document.getElementById("show-more-btn");
const showMoreText = showMoreBtn?.querySelector("span");
const showMoreIcon = document.getElementById("show-more-icon");
const partyCards = document.querySelectorAll(".party-card");
const noResults = document.getElementById("no-results");

let isExpanded = false;
const LIMIT = 6;

const normalizeText = (text: string) => {
    return text
        .toLowerCase()
        .normalize("NFD") // Descompone caracteres (ej: 'ó' -> 'o' + '´')
        .replace(/[\u0300-\u036f]/g, ""); // Elimina las marcas de acentos
};

export function updateDisplay() {
    const searchTerms = normalizeText(searchInput.value.trim())
        .split(/\s+/)
        .filter(term => term.length > 0);
    const positionValue = positionFilter.value.toLowerCase();

    // 1. Filtrar quiénes coinciden con búsqueda Y posición
    const matchingCards = Array.from(partyCards).filter((card) => {
        const name = card.getAttribute("data-name") || "";
        const siglas = card.getAttribute("data-siglas") || "";
        const candidate = card.getAttribute("data-candidate") || "";
        const posicion = card.getAttribute("data-posicion") || "";

        const searchableText = normalizeText(`${name} ${siglas} ${candidate}`);

        const matchesSearch = searchTerms.every(term => 
            searchableText.includes(term)
        );
        const matchesPosition =
            positionValue === "todos" || posicion === positionValue;

        return matchesSearch && matchesPosition;
    });

    // 2. Ocultar todos primero
    partyCards.forEach(
        (card) => ((card as HTMLElement).style.display = "none"),
    );

    // 3. Mostrar solo los que coinciden, respetando el límite si no está expandido
    matchingCards.forEach((card, index) => {
        if (isExpanded || index < LIMIT) {
            (card as HTMLElement).style.display = "block";
        }
    });

    // 4. Manejar visibilidad y texto del botón "Ver más"
    if (matchingCards.length > LIMIT) {
        showMoreBtn?.parentElement?.classList.remove("hidden");
        if (isExpanded) {
            if (showMoreText) showMoreText.innerText = "Ver menos";
            showMoreIcon?.classList.add("rotate-180");
        } else {
            if (showMoreText)
                showMoreText.innerText = `Ver más (${matchingCards.length - LIMIT} más)`;
            showMoreIcon?.classList.remove("rotate-180");
        }
    } else {
        showMoreBtn?.parentElement?.classList.add("hidden");
    }

    // 5. Estado vacío
    if (matchingCards.length === 0) {
        noResults?.classList.remove("hidden");
        noResults?.classList.add("flex");
    } else {
        noResults?.classList.add("hidden");
        noResults?.classList.remove("flex");
    }
}

// Event Listeners
searchInput?.addEventListener("input", () => {
    isExpanded = false; // Resetear expansión al buscar
    updateDisplay();
});

positionFilter?.addEventListener("change", () => {
    isExpanded = false; // Resetear expansión al filtrar
    updateDisplay();
});

showMoreBtn?.addEventListener("click", () => {
    isExpanded = !isExpanded;
    updateDisplay();
});

// Ejecutar al cargar