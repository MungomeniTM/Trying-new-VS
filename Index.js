document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');

    if(toggle && navMenu){
        toggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e){
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if(target){
                target.scrollIntoView({ behavior:'smooth', block:'start' });
            }
            if(navMenu.classList.contains('active')){
                navMenu.classList.remove('active');
            }
        });
    });
});
