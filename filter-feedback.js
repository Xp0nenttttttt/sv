document.querySelectorAll('.filter-group select, .filter-group input')
    .forEach(el => {
        el.addEventListener('change', () => {
            const group = el.closest('.filter-group');
            group.classList.remove('changed');
            void group.offsetWidth; // reset animation
            group.classList.add('changed');
        });
    });
