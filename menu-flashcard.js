(() => {
    const menu = document.getElementById('menuFlashcard');
    menu.addEventListener('click', event => { if (event.target.closest('button')) menu.open = false; });
    document.addEventListener('pointerdown', event => { if (!menu.contains(event.target)) menu.open = false; });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menu.open) {
            event.preventDefault();
            event.stopPropagation();
            menu.open = false;
            menu.querySelector('summary').focus();
        }
    }, true);
})();
