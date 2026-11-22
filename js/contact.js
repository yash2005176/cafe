document.addEventListener("DOMContentLoaded", function() {
    const form = document.querySelector(".contact-form");
    const status = document.querySelector(".form-status");
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent.trim();
    let isSubmitting = false;

    form.addEventListener("submit", async function(event) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        const values = {
            name: form.elements.namedItem("name").value.trim(),
            email: form.elements.namedItem("email").value.trim(),
            phone: form.elements.namedItem("phone").value.trim(),
            subject: form.elements.namedItem("subject").value.trim(),
            message: form.elements.namedItem("message").value.trim()
        };

        const emailIsValid =
            form.elements.namedItem("email").validity.valid &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email);

        if (!values.name || !emailIsValid || !values.message) {
            status.textContent = "Please enter your name, a valid email address, and a message.";
            status.className = "form-status error";
            return;
        }

        isSubmitting = true;
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
        status.textContent = "";
        status.className = "form-status";

        try {
            const { error } = await supabaseClient
                .from("contact_messages")
                .insert({
                    name: values.name,
                    email: values.email,
                    phone: values.phone || null,
                    subject: values.subject || null,
                    message: values.message
                });

            if (error) {
                throw error;
            }

            form.reset();
            status.textContent = "Your message has been sent. Thank you for contacting Cafe Hangout.";
            status.className = "form-status success";
        } catch (error) {
            console.error("Contact message could not be submitted:", error);
            status.textContent = "We couldn't send your message. Please try again later.";
            status.className = "form-status error";
        } finally {
            isSubmitting = false;
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
});