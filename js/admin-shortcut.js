const adminShortcutStorageKey = "cafeHangoutAdminShortcut";
const adminShortcutClickWindow = 3000;

function openAdminLogin(message) {
    if (message) {
        sessionStorage.setItem("adminLoginMessage", message);
    }

    window.location.assign("admin/login.html");
}

async function openAdminDestination() {
    try {
        const { data: sessionData, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        if (sessionData.session) {
            const { data, error } = await supabaseClient.auth.getUser();

            if (error) {
                throw error;
            }

            if (data.user && await verifyAdmin(data.user)) {
                window.location.assign("admin/dashboard.html");
                return;
            }

            if (data.user) {
                const { error: signOutError } =
                    await supabaseClient.auth.signOut();

                if (signOutError) {
                    console.error(
                        "Could not clear the unauthorized session:",
                        signOutError
                    );
                }

                openAdminLogin(
                    "This account is not authorized to access the admin panel."
                );
                return;
            }

            const { error: signOutError } =
                await supabaseClient.auth.signOut();

            if (signOutError) {
                console.error("Could not clear the unverified session:", signOutError);
            }

            openAdminLogin("Unable to verify admin access. Please try again.");
            return;
        }

        openAdminLogin();
    } catch (error) {
        console.error("Could not verify the admin session:", error);
        openAdminLogin("Unable to verify admin access. Please try again.");
    }
}

document.addEventListener("click", function(event) {
    const target = event.target;
    const brandLink = target instanceof Element
        ? target.closest(".site-header .brand")
        : null;

    if (!brandLink) {
        sessionStorage.removeItem(adminShortcutStorageKey);
        return;
    }

    const now = Date.now();
    const [storedCount, storedTimestamp] =
        (sessionStorage.getItem(adminShortcutStorageKey) || "").split(":");
    const previousCount = Number(storedCount);
    const previousTimestamp = Number(storedTimestamp);
    const isWithinWindow =
        Number.isFinite(previousCount) &&
        Number.isFinite(previousTimestamp) &&
        now >= previousTimestamp &&
        now - previousTimestamp <= adminShortcutClickWindow;
    const clickCount = isWithinWindow ? previousCount + 1 : 1;

    if (clickCount < 5) {
        sessionStorage.setItem(
            adminShortcutStorageKey,
            `${clickCount}:${now}`
        );

        if (
            window.location.pathname.endsWith("/") ||
            window.location.pathname.endsWith("/index.html")
        ) {
            event.preventDefault();
        }

        return;
    }

    event.preventDefault();
    sessionStorage.removeItem(adminShortcutStorageKey);
    openAdminDestination();
});
