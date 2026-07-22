const rankingState = {
    type: "global",
    period: "month",
    limit: 20,
    currentUser: null,
    challengeIds: {
        "challenge-x": null,
        "challenge-y": null
    }
};
document.addEventListener("DOMContentLoaded", async () => {
    const rankingPage = document.querySelector(".ranking-page");

    if (!rankingPage) {
        return;
    }

    try {
        await initializeRankingPage();
    } catch (error) {
        console.error("Erreur d'initialisation du classement :", error);
        showRankingError("Impossible de charger les classements.");
    }
});
async function initializeRankingPage() {
    await loadCurrentRankingUser();
    await loadActiveChallenges();
    initializeRankingTabs();
    initializePeriodSelector();

    await refreshRanking();
}
async function loadCurrentRankingUser() {
    const {
        data: { user },
        error: authError
    } = await supabase.auth.getUser();

    if (authError) {
        throw authError;
    }

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(`
            id,
            full_name,
            xp,
            team_id,
            hire_date,
            teams (
                id,
                name
            )
        `)
        .eq("id", user.id)
        .single();

    if (profileError) {
        throw profileError;
    }

    rankingState.currentUser = profile;
}
