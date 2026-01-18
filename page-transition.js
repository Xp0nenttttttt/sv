window.addEventListener("DOMContentLoaded", () => {
    const transition = document.getElementById("page-transition");
    if (!transition) return;

    // 🔥 TRANSITION D'ENTRÉE
    transition.classList.add("enter");

    // Nettoyage après l'animation
    setTimeout(() => {
        transition.classList.remove("enter");
        transition.style.opacity = "0";
    }, 800);

    // 🔁 TRANSITION DE SORTIE (déjà existante)
    document.querySelectorAll("a[href]").forEach(link => {
        const url = link.getAttribute("href");

        if (
            url &&
            !url.startsWith("http") &&
            !url.startsWith("#") &&
            !link.hasAttribute("target")
        ) {
            link.addEventListener("click", e => {
                e.preventDefault();
                transition.classList.remove("active");
                void transition.offsetWidth;
                transition.classList.add("active");

                setTimeout(() => {
                    window.location.href = url;
                }, 650);
            });
        }
    });
});
