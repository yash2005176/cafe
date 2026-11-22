document.addEventListener("DOMContentLoaded", function() {

    // Mobile Navbar

    const toggle = document.querySelector(".nav-toggle");

    const nav = document.querySelector(".nav-menu");

    if (toggle && nav) {

        toggle.addEventListener("click", function() {

            nav.classList.toggle("open");

        });

    }

    // Close menu after clicking link

    const navLinks = document.querySelectorAll(".nav-menu a");

    navLinks.forEach(function(link) {

        link.addEventListener("click", function() {

            nav.classList.remove("open");

        });

    });

    // Dynamic Year

    const yearElements = document.querySelectorAll(".year");

    yearElements.forEach(function(element) {

        element.textContent = new Date().getFullYear();

    });

    // Scroll Animation

    const observer = new IntersectionObserver(

        function(entries) {

            entries.forEach(function(entry) {

                if (entry.isIntersecting) {

                    entry.target.classList.add("visible");

                    observer.unobserve(entry.target);

                }

            });

        },

        {
            threshold: 0.12
        }

    );

    const revealElements = document.querySelectorAll(".reveal");

    revealElements.forEach(function(element) {

        observer.observe(element);

    });

});