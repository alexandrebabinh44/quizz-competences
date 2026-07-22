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
function initializeRankingTabs() {
    const tabs = document.querySelectorAll(".ranking-tab");

    tabs.forEach((tab) => {
        tab.addEventListener("click", async () => {
            const rankingType = tab.dataset.ranking;

            if (!rankingType || rankingType === rankingState.type) {
                return;
            }

            rankingState.type = rankingType;

            tabs.forEach((item) => {
                const isActive = item === tab;

                item.classList.toggle("active", isActive);
                item.setAttribute(
                    "aria-selected",
                    isActive ? "true" : "false"
                );
            });

            updatePeriodAvailability();
            await refreshRanking();
        });
    });
}
function initializePeriodSelector() {
    const periodSelect = document.getElementById("ranking-period");

    if (!periodSelect) {
        return;
    }

    periodSelect.value = rankingState.period;

    periodSelect.addEventListener("change", async (event) => {
        rankingState.period = event.target.value;
        await refreshRanking();
    });
}
function getPeriodStart(period) {
    const now = new Date();

    switch (period) {
        case "day": {
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            return start.toISOString();
        }

        case "week": {
            const start = new Date(now);
            const currentDay = start.getDay();
            const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;

            start.setDate(start.getDate() - daysSinceMonday);
            start.setHours(0, 0, 0, 0);

            return start.toISOString();
        }

        case "month": {
            const start = new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            );

            return start.toISOString();
        }

        case "all":
        default:
            return null;
    }
}
async function fetchGlobalAllTimeRanking() {
    const { data, error } = await supabase
        .from("profiles")
        .select(`
            id,
            full_name,
            xp,
            team_id,
            teams (
                id,
                name
            )
        `)
        .order("xp", { ascending: false });

    if (error) {
        throw error;
    }

    return (data || []).map((profile, index) => ({
        rank: index + 1,
        id: profile.id,
        name: profile.full_name,
        teamName: profile.teams?.name || "Sans équipe",
        score: Number(profile.xp || 0)
    }));
}
async function fetchGlobalPeriodRanking(period) {
    const startDate = getPeriodStart(period);

    const { data, error } = await supabase.rpc(
        "get_global_xp_ranking",
        {
            p_start_date: startDate
        }
    );

    if (error) {
        throw error;
    }

    return (data || []).map((row, index) => ({
        rank: index + 1,
        id: row.profile_id,
        name: row.full_name,
        teamName: row.team_name || "Sans équipe",
        score: Number(row.score || 0)
    }));
}
async function fetchGlobalRanking() {
    if (rankingState.period === "all") {
        return fetchGlobalAllTimeRanking();
    }

    return fetchGlobalPeriodRanking(rankingState.period);
}
