const transition = document.getElementById("page-transition");

document.querySelectorAll("a[href]").forEach(link => {
    const url = link.getAttribute("href");

    // liens internes uniquement
    if (!url.startsWith("http") && !url.startsWith("#")) {
        link.addEventListener("click", e => {
            e.preventDefault();
            transition.classList.add("active");

            setTimeout(() => {
                window.location.href = url;
            }, 450);
        });
    }
});
