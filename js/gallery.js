document.addEventListener("DOMContentLoaded", function() {

    const galleryItems = document.querySelectorAll(".gallery-item");

    const lightbox = document.querySelector(".lightbox");

    const lightboxImage = lightbox.querySelector("img");

    const closeButton = document.querySelector(".lightbox-close");

    // Open image

    galleryItems.forEach(function(item) {

        item.addEventListener("click", function() {

            const image = item.querySelector("img");

            lightboxImage.src = image.src;

            lightboxImage.alt = image.alt;

            lightbox.classList.add("open");

            lightbox.setAttribute("aria-hidden", "false");

        });

    });

    // Close lightbox

    function closeLightbox() {

        lightbox.classList.remove("open");

        lightbox.setAttribute("aria-hidden", "true");

        lightboxImage.removeAttribute("src");

    }

    closeButton.addEventListener("click", closeLightbox);

    // Close on background click

    lightbox.addEventListener("click", function(event) {

        if (event.target === lightbox) {

            closeLightbox();

        }

    });

    // Close with Escape

    document.addEventListener("keydown", function(event) {

        if (event.key === "Escape") {

            closeLightbox();

        }

    });

});