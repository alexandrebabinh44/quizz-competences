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
