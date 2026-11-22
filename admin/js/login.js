const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginBtn = document.getElementById("loginBtn");

function setLoginMessage(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = `message ${type}`;
}

function resetLoginButton() {
    loginBtn.disabled = false;
    loginBtn.innerHTML = `
        <i class="fa-solid fa-right-to-bracket"></i>
        Login to Dashboard
    `;
}

async function checkExistingLogin() {
    const storedMessage = sessionStorage.getItem("adminLoginMessage");

    if (storedMessage) {
        setLoginMessage(storedMessage, "error");
        sessionStorage.removeItem("adminLoginMessage");
    }

    try {
        const { data: sessionData, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        if (!sessionData.session) {
            return;
        }

        const { data, error } = await supabaseClient.auth.getUser();

        if (error) {
            throw error;
        }

        if (!data.user) {
            return;
        }

        if (await verifyAdmin(data.user)) {
            window.location.replace("dashboard.html");
            return;
        }

        const { error: signOutError } =
            await supabaseClient.auth.signOut();

        if (signOutError) {
            console.error("Could not clear the unauthorized session:", signOutError);
        }

        setLoginMessage(
            "This account is not authorized to access the admin panel.",
            "error"
        );
    } catch (error) {
        console.error("Could not verify the existing session:", error);

        const { error: signOutError } =
            await supabaseClient.auth.signOut();

        if (signOutError) {
            console.error("Could not clear the unverified session:", signOutError);
        }

        setLoginMessage(
            "Unable to verify admin access. Please try again.",
            "error"
        );
    }
}

loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        setLoginMessage(
            "This email is not authorized to sign in as the administrator.",
            "error"
        );
        return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Logging in...
    `;
    setLoginMessage("", "");

    let signedIn = false;

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error("Supabase sign-in failed:", error);
            const errorText = String(error.message || "").toLowerCase();

            if (errorText.includes("email not confirmed")) {
                setLoginMessage(
                    "Confirm this email address in Supabase Auth before signing in.",
                    "error"
                );
            } else {
                setLoginMessage(
                    "Invalid email or password. Check the credentials for this Supabase project.",
                    "error"
                );
            }

            return;
        }

        signedIn = true;

        if (!(await verifyAdmin(data.user))) {
            const { error: signOutError } =
                await supabaseClient.auth.signOut();

            if (signOutError) {
                console.error("Could not clear the unauthorized session:", signOutError);
            }

            setLoginMessage(
                "Access denied. This account is not the configured administrator.",
                "error"
            );
            return;
        }

        setLoginMessage("Login successful.", "success");
        window.location.replace("dashboard.html");
    } catch (error) {
        console.error("Admin login could not be completed:", error);

        if (signedIn) {
            const { error: signOutError } =
                await supabaseClient.auth.signOut();

            if (signOutError) {
                console.error("Could not clear the unverified session:", signOutError);
            }
        }

        setLoginMessage(
            "Unable to verify admin access. Please try again.",
            "error"
        );
    } finally {
        resetLoginButton();
    }
});

checkExistingLogin();
