/* =========================
   THÈME CLAIR / SOMBRE
========================= */


function getSavedTheme() {

    return (
        localStorage.getItem(
            "nickel_master_theme"
        ) || "light"
    );
}


function applyTheme(theme) {

    document.documentElement.setAttribute(
        "data-theme",
        theme
    );

    updateThemeButton(theme);
}


function applySavedTheme() {

    const savedTheme =
        getSavedTheme();

    applyTheme(savedTheme);
}


function toggleTheme() {

    const currentTheme =
        document.documentElement
            .getAttribute(
                "data-theme"
            ) || "light";


    const newTheme =
        currentTheme === "dark"
            ? "light"
            : "dark";


    localStorage.setItem(
        "nickel_master_theme",
        newTheme
    );


    applyTheme(newTheme);
}


function updateThemeButton(theme) {

    const button =
        document.getElementById(
            "themeToggle"
        );


    if (!button) {
        return;
    }


    if (theme === "dark") {

        button.innerHTML =
            "☀️ Mode clair";

    } else {

        button.innerHTML =
            "🌙 Mode sombre";
    }
}


document.addEventListener(
    "DOMContentLoaded",
    applySavedTheme
);
