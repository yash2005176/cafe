const ADMIN_EMAIL = "maulichakor007@gmail.com";

async function verifyAdmin(user) {
    if (!user || !user.id || !user.email) {
        return false;
    }

    const { data, error } = await supabaseClient.rpc("is_admin");

    if (error) {
        throw error;
    }

    return data === true;
}

function redirectToAdminLogin(message) {
    if (message) {
        sessionStorage.setItem("adminLoginMessage", message);
    }

    window.location.replace("login.html");
}

async function protectAdminPage() {
    let user;

    try {
        const { data: sessionData, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        if (!sessionData.session) {
            redirectToAdminLogin("Please sign in to continue.");
            return null;
        }

        const { data, error } = await supabaseClient.auth.getUser();

        if (error) {
            throw error;
        }

        user = data.user;

        if (!user) {
            redirectToAdminLogin("Please sign in to continue.");
            return null;
        }

        if (!(await verifyAdmin(user))) {
            const { error: signOutError } =
                await supabaseClient.auth.signOut();

            if (signOutError) {
                console.error("Could not clear the unauthorized session:", signOutError);
            }

            redirectToAdminLogin("This account is not authorized to access the admin panel.");
            return null;
        }

        return user;
    } catch (error) {
        console.error("Admin access verification failed:", error);

        if (user) {
            const { error: signOutError } =
                await supabaseClient.auth.signOut();

            if (signOutError) {
                console.error("Could not clear the unverified session:", signOutError);
            }
        }

        redirectToAdminLogin("Unable to verify admin access. Please try again.");
        return null;
    }
}

async function logoutAdmin() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Logout failed:", error);
        alert("Logout failed. Please try again.");
        return;
    }

    window.location.replace("../index.html");
}

document.addEventListener("DOMContentLoaded", function() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", logoutAdmin);
    }
});
