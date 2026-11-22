document.addEventListener("DOMContentLoaded", function() {

    const cards = document.querySelectorAll(".value-card");

    cards.forEach(function(card) {

        card.addEventListener("mouseenter", function() {

            card.style.transform = "translateY(-5px)";

        });

        card.addEventListener("mouseleave", function() {

            card.style.transform = "translateY(0)";

        });

    });

});