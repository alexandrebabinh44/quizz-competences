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

        showRankingError(
            error?.message || "Impossible de charger les classements."
        );
    }
});

async function initializeRankingPage() {
    if (
        typeof supabaseClient === "undefined" ||
        !supabaseClient?.auth
    ) {
        throw new Error(
            "Le client Supabase n'est pas initialisé. Vérifie que app.js est chargé avant ranking.js."
        );
    }

    await loadCurrentRankingUser();

    initializeRankingTabs();
    initializePeriodSelector();

    try {
        await loadActiveChallenges();
    } catch (error) {
        console.warn(
            "Les challenges ne sont pas encore disponibles :",
            error
        );
    }

    updatePeriodAvailability();

    await refreshRanking();
}

async function loadCurrentRankingUser() {
    const {
        data: { user },
        error: authError
    } = await supabaseClient.auth.getUser();

    if (authError) {
        throw authError;
    }

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const { data: profile, error: profileError } =
        await supabaseClient
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

            if (
                !rankingType ||
                rankingType === rankingState.type
            ) {
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
    const periodSelect =
        document.getElementById("ranking-period");

    if (!periodSelect) {
        return;
    }

    periodSelect.value = rankingState.period;

    periodSelect.addEventListener(
        "change",
        async (event) => {
            rankingState.period = event.target.value;

            await refreshRanking();
        }
    );
}

function updatePeriodAvailability() {
    const periodSelect =
        document.getElementById("ranking-period");

    if (!periodSelect) {
        return;
    }

    const isSeniority =
        rankingState.type === "seniority";

    periodSelect.disabled = isSeniority;

    if (isSeniority) {
        rankingState.period = "all";
        periodSelect.value = "all";
        return;
    }

    if (
        rankingState.period === "all" &&
        periodSelect.value === "all"
    ) {
        rankingState.period = "month";
        periodSelect.value = "month";
    }
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

            const daysSinceMonday =
                currentDay === 0
                    ? 6
                    : currentDay - 1;

            start.setDate(
                start.getDate() - daysSinceMonday
            );

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
    const { data, error } = await supabaseClient
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

    return (data || []).map(
        (profile, index) => ({
            rank: index + 1,
            id: profile.id,
            name: profile.full_name,
            teamName:
                profile.teams?.name ||
                "Sans équipe",
            score: Number(profile.xp || 0)
        })
    );
}

async function fetchGlobalPeriodRanking(period) {
    const startDate = getPeriodStart(period);

    const { data, error } =
        await supabaseClient.rpc(
            "get_global_xp_ranking",
            {
                p_start_date: startDate
            }
        );

    if (error) {
        throw error;
    }

    return (data || []).map(
        (row, index) => ({
            rank: index + 1,
            id: row.profile_id,
            name: row.full_name,
            teamName:
                row.team_name ||
                "Sans équipe",
            score: Number(row.score || 0)
        })
    );
}

async function fetchGlobalRanking() {
    if (rankingState.period === "all") {
        return fetchGlobalAllTimeRanking();
    }

    return fetchGlobalPeriodRanking(
        rankingState.period
    );
}

async function fetchTeamRanking() {
    const isAllTime =
        rankingState.period === "all";

    const startDate = isAllTime
        ? null
        : getPeriodStart(
            rankingState.period
        );

    const { data, error } =
        await supabaseClient.rpc(
            "get_team_xp_ranking",
            {
                p_start_date: startDate,
                p_use_total_xp: isAllTime
            }
        );

    if (error) {
        throw error;
    }

    return (data || []).map(
        (row, index) => ({
            rank: index + 1,
            id: row.team_id,
            name: row.team_name,
            score: Number(row.score || 0)
        })
    );
}

async function loadActiveChallenges() {
    const { data, error } =
        await supabaseClient
            .from("challenges")
            .select("id, name")
            .eq("is_active", true)
            .order(
                "created_at",
                { ascending: true }
            )
            .limit(2);

    if (error) {
        throw error;
    }

    const challenges = data || [];

    if (challenges[0]) {
        rankingState.challengeIds[
            "challenge-x"
        ] = challenges[0].id;

        updateChallengeTabLabel(
            "challenge-x",
            challenges[0].name
        );
    }

    if (challenges[1]) {
        rankingState.challengeIds[
            "challenge-y"
        ] = challenges[1].id;

        updateChallengeTabLabel(
            "challenge-y",
            challenges[1].name
        );
    }
}

function updateChallengeTabLabel(
    type,
    label
) {
    const tab = document.querySelector(
        `.ranking-tab[data-ranking="${type}"]`
    );

    if (tab) {
        tab.textContent = label;
    }
}

async function fetchChallengeRanking(type) {
    const challengeId =
        rankingState.challengeIds[type];

    if (!challengeId) {
        return [];
    }

    const startDate =
        rankingState.period === "all"
            ? null
            : getPeriodStart(
                rankingState.period
            );

    const { data, error } =
        await supabaseClient.rpc(
            "get_individual_challenge_ranking",
            {
                p_challenge_id: challengeId,
                p_start_date: startDate
            }
        );

    if (error) {
        throw error;
    }

    return (data || []).map(
        (row, index) => ({
            rank: index + 1,
            id: row.profile_id,
            name: row.full_name,
            teamName:
                row.team_name ||
                "Sans équipe",
            score: Number(row.score || 0)
        })
    );
}

async function fetchSeniorityRanking() {
    const { data, error } =
        await supabaseClient
            .from("profiles")
            .select(`
                id,
                full_name,
                hire_date,
                team_id,
                teams (
                    id,
                    name
                )
            `)
            .not(
                "hire_date",
                "is",
                null
            )
            .order(
                "hire_date",
                { ascending: true }
            );

    if (error) {
        throw error;
    }

    return (data || []).map(
        (profile, index) => ({
            rank: index + 1,
            id: profile.id,
            name: profile.full_name,
            teamName:
                profile.teams?.name ||
                "Sans équipe",
            hireDate:
                profile.hire_date,
            seniority:
                formatSeniority(
                    profile.hire_date
                )
        })
    );
}

function formatSeniority(hireDate) {
    if (!hireDate) {
        return "Non renseignée";
    }

    const start = new Date(hireDate);
    const now = new Date();

    let years =
        now.getFullYear() -
        start.getFullYear();

    let months =
        now.getMonth() -
        start.getMonth();

    if (months < 0) {
        years -= 1;
        months += 12;
    }

    if (now.getDate() < start.getDate()) {
        months -= 1;

        if (months < 0) {
            years -= 1;
            months += 12;
        }
    }

    const yearsText =
        years > 0
            ? `${years} an${
                years > 1 ? "s" : ""
            }`
            : "";

    const monthsText =
        months > 0
            ? `${months} mois`
            : "";

    return [yearsText, monthsText]
        .filter(Boolean)
        .join(" ") ||
        "Moins d'un mois";
}

async function refreshRanking() {
    showRankingLoading(true);
    hideRankingError();

    try {
        let rows = [];

        switch (rankingState.type) {
            case "global":
                rows =
                    await fetchGlobalRanking();
                break;

            case "teams":
                rows =
                    await fetchTeamRanking();
                break;

            case "challenge-x":
            case "challenge-y":
                rows =
                    await fetchChallengeRanking(
                        rankingState.type
                    );
                break;

            case "seniority":
                rows =
                    await fetchSeniorityRanking();
                break;

            default:
                rows = [];
        }

        renderRanking(rows);
    } catch (error) {
        console.error(
            "Erreur classement :",
            error
        );

        showRankingError(
            error?.message ||
            "Une erreur est survenue pendant le chargement du classement."
        );
    } finally {
        showRankingLoading(false);
    }
}

function getVisibleRankingRows(rows) {
    const topRows = rows.slice(
        0,
        rankingState.limit
    );

    const currentUserId =
        rankingState.currentUser?.id;

    if (!currentUserId) {
        return {
            topRows,
            currentUserRow: null
        };
    }

    const targetId =
        rankingState.type === "teams"
            ? rankingState.currentUser
                .team_id
            : currentUserId;

    const currentUserRow = rows.find(
        (row) =>
            String(row.id) ===
            String(targetId)
    );

    const alreadyVisible =
        topRows.some(
            (row) =>
                String(row.id) ===
                String(targetId)
        );

    return {
        topRows,
        currentUserRow:
            alreadyVisible
                ? null
                : currentUserRow
    };
}

function renderRankingHeader() {
    const head =
        document.getElementById(
            "ranking-head"
        );

    if (!head) {
        return;
    }

    if (rankingState.type === "teams") {
        head.innerHTML = `
            <tr>
                <th>#</th>
                <th>Équipe</th>
                <th>XP</th>
            </tr>
        `;

        return;
    }

    if (
        rankingState.type ===
        "seniority"
    ) {
        head.innerHTML = `
            <tr>
                <th>#</th>
                <th>Nom</th>
                <th>Équipe</th>
                <th>Date d’arrivée</th>
                <th>Ancienneté</th>
            </tr>
        `;

        return;
    }

    if (
        rankingState.type ===
            "challenge-x" ||
        rankingState.type ===
            "challenge-y"
    ) {
        head.innerHTML = `
            <tr>
                <th>#</th>
                <th>Nom</th>
                <th>Équipe</th>
                <th>PTS</th>
            </tr>
        `;

        return;
    }

    head.innerHTML = `
        <tr>
            <th>#</th>
            <th>Nom</th>
            <th>Équipe</th>
            <th>XP</th>
        </tr>
    `;
}

function renderRanking(rows) {
    renderRankingHeader();

    const body =
        document.getElementById(
            "ranking-body"
        );

    if (!body) {
        return;
    }

    body.innerHTML = "";

    if (!rows.length) {
        body.innerHTML = `
            <tr>
                <td colspan="5">
                    Aucun résultat pour cette période.
                </td>
            </tr>
        `;

        return;
    }

    const {
        topRows,
        currentUserRow
    } = getVisibleRankingRows(rows);

    topRows.forEach((row) => {
        body.appendChild(
            createRankingRow(row)
        );
    });

    if (currentUserRow) {
        body.appendChild(
            createRankingSeparator()
        );

        body.appendChild(
            createRankingRow(
                currentUserRow,
                true
            )
        );
    }
}

function createRankingRow(
    row,
    isCurrentUser = false
) {
    const tr =
        document.createElement("tr");

    if (isCurrentUser) {
        tr.classList.add(
            "current-user-row"
        );
    }

    if (rankingState.type === "teams") {
        tr.innerHTML = `
            <td>${row.rank}</td>
            <td>${escapeHtml(row.name)}</td>
            <td>${formatNumber(row.score)} XP</td>
        `;

        return tr;
    }

    if (
        rankingState.type ===
        "seniority"
    ) {
        tr.innerHTML = `
            <td>${row.rank}</td>
            <td>${escapeHtml(row.name)}</td>
            <td>${escapeHtml(row.teamName)}</td>
            <td>${formatDate(row.hireDate)}</td>
            <td>${escapeHtml(row.seniority)}</td>
        `;

        return tr;
    }

    const unit =
        rankingState.type ===
            "challenge-x" ||
        rankingState.type ===
            "challenge-y"
            ? "PTS"
            : "XP";

    tr.innerHTML = `
        <td>${row.rank}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.teamName)}</td>
        <td>${formatNumber(row.score)} ${unit}</td>
    `;

    return tr;
}

function createRankingSeparator() {
    const tr =
        document.createElement("tr");

    tr.classList.add(
        "ranking-separator"
    );

    const td =
        document.createElement("td");

    td.colSpan = 5;
    td.textContent = "•••";

    tr.appendChild(td);

    return tr;
}

function formatNumber(value) {
    return new Intl.NumberFormat(
        "fr-FR"
    ).format(
        Number(value || 0)
    );
}

function formatDate(value) {
    if (!value) {
        return "Non renseignée";
    }

    return new Intl.DateTimeFormat(
        "fr-FR"
    ).format(
        new Date(value)
    );
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showRankingLoading(show) {
    const loading =
        document.getElementById(
            "ranking-loading"
        );

    if (loading) {
        loading.hidden = !show;
    }
}

function showRankingError(message) {
    const errorBox =
        document.getElementById(
            "ranking-error"
        );

    if (!errorBox) {
        return;
    }

    errorBox.textContent = message;
    errorBox.hidden = false;
}

function hideRankingError() {
    const errorBox =
        document.getElementById(
            "ranking-error"
        );

    if (errorBox) {
        errorBox.hidden = true;
        errorBox.textContent = "";
    }
}
