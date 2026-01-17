const konami = [
    "ArrowUp", "ArrowUp",
    "ArrowDown", "ArrowDown",
    "ArrowLeft", "ArrowRight",
    "ArrowLeft", "ArrowRight",
    "b", "a"
];

let index = 0;

window.addEventListener("keydown", e => {
    if (e.key === konami[index]) {
        index++;
        if (index === konami.length) {
            document.body.classList.toggle("ultra-neon");
            index = 0;
        }
    } else {
        index = 0;
    }
});
