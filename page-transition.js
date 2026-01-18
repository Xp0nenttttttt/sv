window.addEventListener("DOMContentLoaded", () => {
    const transition = document.getElementById("page-transition");
    if (!transition) return;

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
                transition.classList.remove("active"); // reset
                void transition.offsetWidth; // force reflow
                transition.classList.add("active");

                setTimeout(() => {
                    window.location.href = url;
                }, 650);
            });
        }
    });
});
