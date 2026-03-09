document.addEventListener('DOMContentLoaded', () => {
    // Header scroll effect
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        header.classList.toggle('header--scrolled', window.scrollY > 50);
    });

    // Mobile menu
    const burger = document.getElementById('burger');
    const nav = document.getElementById('nav');

    burger.addEventListener('click', () => {
        burger.classList.toggle('active');
        nav.classList.toggle('open');
    });

    nav.querySelectorAll('.nav__link').forEach(link => {
        link.addEventListener('click', () => {
            burger.classList.remove('active');
            nav.classList.remove('open');
        });
    });

    // Active nav link on scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav__link');

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY + 100;
        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');
            if (scrollY >= top && scrollY < top + height) {
                navLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === '#' + id);
                });
            }
        });
    });

    // Portfolio filter
    const filterBtns = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio__item');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            portfolioItems.forEach(item => {
                if (filter === 'all' || item.dataset.category === filter) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        });
    });

    // Counter animation
    const counters = document.querySelectorAll('.stat__number');
    let counterAnimated = false;

    function animateCounters() {
        counters.forEach(counter => {
            const target = +counter.dataset.count;
            const duration = 2000;
            const start = performance.now();

            function update(now) {
                const progress = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                counter.textContent = Math.floor(eased * target);
                if (progress < 1) requestAnimationFrame(update);
            }

            requestAnimationFrame(update);
        });
    }

    // Scroll reveal
    const revealElements = document.querySelectorAll(
        '.section__title, .section__subtitle, .portfolio__filters, .portfolio__item, ' +
        '.about__image, .about__content, .service-card, .contact__form, .contact__info'
    );

    revealElements.forEach(el => el.classList.add('reveal'));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);

                // Trigger counter animation when about section is visible
                if (!counterAnimated && entry.target.closest('.about')) {
                    counterAnimated = true;
                    animateCounters();
                }
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(el => observer.observe(el));

    // Contact form
    const form = document.getElementById('contact-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('.btn');
        btn.textContent = 'Отправлено!';
        btn.style.background = '#c9a96e';
        btn.style.color = '#0a0a0a';
        setTimeout(() => {
            btn.textContent = 'Отправить';
            btn.style.background = '';
            btn.style.color = '';
            form.reset();
        }, 3000);
    });

    // Lightbox
    const lightbox = document.getElementById('lightbox');
    const lightboxContent = lightbox.querySelector('.lightbox__content');

    portfolioItems.forEach(item => {
        item.addEventListener('click', () => {
            const bg = item.querySelector('.portfolio__img');
            const clone = bg.cloneNode(true);
            clone.style.width = '80vw';
            clone.style.height = '80vh';
            clone.style.minHeight = 'auto';
            clone.style.borderRadius = '4px';
            lightboxContent.innerHTML = '';
            lightboxContent.appendChild(clone);
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    lightbox.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
    });
});
