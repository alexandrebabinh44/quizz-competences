const rankingState = {
    type: "global",
    period: "month",
    limit: 10,
    currentUser: null,
    profiles: [],
    teams: [],
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
        validateSupabaseConfiguration();
        await initializeRankingPage();
    } catch (error) {
        console.error("Erreur d'initialisation du classement :", error);
        showRankingError(
            error?.message || "Impossible de charger les classements."
        );
    }
});

function validateSupabaseConfiguration() {
    if (
        typeof SUPABASE_URL === "undefined" ||
        typeof SUPABASE_KEY === "undefined" ||
        !SUPABASE_URL ||
        !SUPABASE_KEY
    ) {
        throw new Error(
            "SUPABASE_URL ou SUPABASE_KEY est manquant dans app.js."
        );
    }
}

async function initializeRankingPage() {
    initializeRankingTabs();
    initializePeriodSelector();

    await Promise.all([
        loadProfiles(),
        loadTeams()
    ]);

    loadCurrentRankingUser();

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

function getRequestHeaders(extraHeaders = {}) {
    return {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        ...extraHeaders
    };
}

async function fetchSupabase(path, options = {}) {
    const response = await fetch(
        `${SUPABASE_URL}${path}`,
        {
            ...options,
            headers: getRequestHeaders(options.headers || {})
        }
    );

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            errorText ||
            `Erreur Supabase HTTP ${response.status}`
        );
    }

    if (response.status === 204) {
        return null;
    }

    const text = await response.text();

    return text ? JSON.parse(text) : null;
}

async function loadProfiles() {
    const data = await fetchSupabase(
        "/rest/v1/profiles?select=id,full_name,xp,team_id,hire_date&order=full_name.asc"
    );

    rankingState.profiles = Array.isArray(data) ? data : [];
}

async function loadTeams() {
    const data = await fetchSupabase(
        "/rest/v1/teams?select=id,name&order=name.asc"
    );

    rankingState.teams = Array.isArray(data) ? data : [];
}

function loadCurrentRankingUser() {
    const profileId = localStorage.getItem("profile_id");

    if (!profileId) {
        window.location.href = "index.html";
        return;
    }

    rankingState.currentUser =
        rankingState.profiles.find(
            profile => String(profile.id) === String(profileId)
        ) || null;

    if (!rankingState.currentUser) {
        throw new Error(
            "Le profil connecté est introuvable dans la table profiles."
        );
    }
}

function initializeRankingTabs() {
    const tabs = document.querySelectorAll(".ranking-tab");

    tabs.forEach(tab => {
        tab.addEventListener("click", async () => {
            const rankingType = tab.dataset.ranking;

            if (!rankingType || rankingType === rankingState.type) {
                return;
            }

            rankingState.type = rankingType;

            tabs.forEach(item => {
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
        async event => {
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
                currentDay === 0 ? 6 : currentDay - 1;

            start.setDate(
                start.getDate() - daysSinceMonday
            );
            start.setHours(0, 0, 0, 0);

            return start.toISOString();
        }

        case "month": {
            return new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            ).toISOString();
        }

        case "all":
        default:
            return null;
    }
}

function getTeamName(teamId) {
    if (teamId === null || teamId === undefined) {
        return "Sans équipe";
    }

    const team = rankingState.teams.find(
        item => String(item.id) === String(teamId)
    );

    return team?.name || "Sans équipe";
}

async function loadActiveChallenges() {
    const data = await fetchSupabase(
        "/rest/v1/challenges?select=id,name&is_active=eq.true&order=created_at.asc&limit=2"
    );

    const challenges = Array.isArray(data) ? data : [];

    if (challenges[0]) {
        rankingState.challengeIds["challenge-x"] =
            challenges[0].id;

        updateChallengeTabLabel(
            "challenge-x",
            challenges[0].name
        );
    }

    if (challenges[1]) {
        rankingState.challengeIds["challenge-y"] =
            challenges[1].id;

        updateChallengeTabLabel(
            "challenge-y",
            challenges[1].name
        );
    }
}

function updateChallengeTabLabel(type, label) {
    const tab = document.querySelector(
        `.ranking-tab[data-ranking="${type}"]`
    );

    if (tab) {
        tab.textContent = label;
    }
}

async function fetchXpHistory(period) {
    const startDate = getPeriodStart(period);

    let path =
        "/rest/v1/xp_history?select=profile_id,amount,created_at";

    if (startDate) {
        path += `&created_at=gte.${encodeURIComponent(startDate)}`;
    }

    const data = await fetchSupabase(path);

    return Array.isArray(data) ? data : [];
}

async function fetchGlobalRanking() {
    if (rankingState.period === "all") {
        const rows = rankingState.profiles.map(profile => ({
            id: profile.id,
            name: profile.full_name || "Sans nom",
            teamName: getTeamName(profile.team_id),
            score: Number(profile.xp || 0)
        }));

        return sortAndRank(rows);
    }

    const history = await fetchXpHistory(
        rankingState.period
    );

    const totals = new Map();

    history.forEach(item => {
        const profileId = String(item.profile_id);
        const current = totals.get(profileId) || 0;

        totals.set(
            profileId,
            current + Number(item.amount || 0)
        );
    });

    const rows = rankingState.profiles.map(profile => ({
        id: profile.id,
        name: profile.full_name || "Sans nom",
        teamName: getTeamName(profile.team_id),
        score: totals.get(String(profile.id)) || 0
    }));

    return sortAndRank(rows);
}

async function fetchTeamRanking() {
    const teamTotals = new Map();

    rankingState.teams.forEach(team => {
        teamTotals.set(String(team.id), 0);
    });

    if (rankingState.period === "all") {
        rankingState.profiles.forEach(profile => {
            if (
                profile.team_id === null ||
                profile.team_id === undefined
            ) {
                return;
            }

            const key = String(profile.team_id);
            const current = teamTotals.get(key) || 0;

            teamTotals.set(
                key,
                current + Number(profile.xp || 0)
            );
        });
    } else {
        const history = await fetchXpHistory(
            rankingState.period
        );

        const profilesById = new Map(
            rankingState.profiles.map(profile => [
                String(profile.id),
                profile
            ])
        );

        history.forEach(item => {
            const profile =
                profilesById.get(String(item.profile_id));

            if (
                !profile ||
                profile.team_id === null ||
                profile.team_id === undefined
            ) {
                return;
            }

            const key = String(profile.team_id);
            const current = teamTotals.get(key) || 0;

            teamTotals.set(
                key,
                current + Number(item.amount || 0)
            );
        });
    }

    const rows = rankingState.teams.map(team => ({
        id: team.id,
        name: team.name || "Équipe sans nom",
        score: teamTotals.get(String(team.id)) || 0
    }));

    return sortAndRank(rows);
}

async function fetchChallengeRanking(type) {
    const challengeId =
        rankingState.challengeIds[type];

    if (!challengeId) {
        return [];
    }

    const startDate = getPeriodStart(
        rankingState.period
    );

    let path =
        `/rest/v1/challenge_points?select=profile_id,team_id,points,created_at&challenge_id=eq.${encodeURIComponent(challengeId)}`;

    if (startDate) {
        path += `&created_at=gte.${encodeURIComponent(startDate)}`;
    }

    const data = await fetchSupabase(path);
    const points = Array.isArray(data) ? data : [];

    const totals = new Map();

    points.forEach(item => {
        if (!item.profile_id) {
            return;
        }

        const key = String(item.profile_id);
        const current = totals.get(key) || 0;

        totals.set(
            key,
            current + Number(item.points || 0)
        );
    });

    const rows = rankingState.profiles.map(profile => ({
        id: profile.id,
        name: profile.full_name || "Sans nom",
        teamName: getTeamName(profile.team_id),
        score: totals.get(String(profile.id)) || 0
    }));

    return sortAndRank(rows);
}

async function fetchSeniorityRanking() {
    const rows = rankingState.profiles
        .filter(profile => profile.hire_date)
        .sort(
            (a, b) =>
                new Date(a.hire_date) -
                new Date(b.hire_date)
        )
        .map((profile, index) => ({
            rank: index + 1,
            id: profile.id,
            name: profile.full_name || "Sans nom",
            teamName: getTeamName(profile.team_id),
            hireDate: profile.hire_date,
            seniority: formatSeniority(
                profile.hire_date
            )
        }));

    return rows;
}

function sortAndRank(rows) {
    const sorted = [...rows].sort((a, b) => {
        const scoreDifference =
            Number(b.score || 0) -
            Number(a.score || 0);

        if (scoreDifference !== 0) {
            return scoreDifference;
        }

        return String(a.name || "").localeCompare(
            String(b.name || ""),
            "fr",
            { sensitivity: "base" }
        );
    });

    let previousScore = null;
    let previousRank = 0;

    return sorted.map((row, index) => {
        const score = Number(row.score || 0);
        const rank =
            score === previousScore
                ? previousRank
                : index + 1;

        previousScore = score;
        previousRank = rank;

        return {
            ...row,
            rank
        };
    });
}

function formatSeniority(hireDate) {
    if (!hireDate) {
        return "Non renseignée";
    }

    const start = new Date(hireDate);
    const now = new Date();

    let years =
        now.getFullYear() - start.getFullYear();

    let months =
        now.getMonth() - start.getMonth();

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
            ? `${years} an${years > 1 ? "s" : ""}`
            : "";

    const monthsText =
        months > 0
            ? `${months} mois`
            : "";

    return [yearsText, monthsText]
        .filter(Boolean)
        .join(" ") || "Moins d'un mois";
}

async function refreshRanking() {
    showRankingLoading(true);
    hideRankingError();

    try {
        let rows = [];

        switch (rankingState.type) {
            case "global":
                rows = await fetchGlobalRanking();
                break;

            case "teams":
                rows = await fetchTeamRanking();
                break;

            case "challenge-x":
            case "challenge-y":
                rows = await fetchChallengeRanking(
                    rankingState.type
                );
                break;

            case "seniority":
                rows = await fetchSeniorityRanking();
                break;

            default:
                rows = [];
        }

        renderRanking(rows);
    } catch (error) {
        console.error("Erreur classement :", error);

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
            ? rankingState.currentUser.team_id
            : currentUserId;

    if (
        targetId === null ||
        targetId === undefined
    ) {
        return {
            topRows,
            currentUserRow: null
        };
    }

    const currentUserRow = rows.find(
        row =>
            String(row.id) === String(targetId)
    );

    const alreadyVisible = topRows.some(
        row =>
            String(row.id) === String(targetId)
    );

    return {
        topRows,
        currentUserRow:
            alreadyVisible ? null : currentUserRow
    };
}

function renderRankingHeader() {
    const head =
        document.getElementById("ranking-head");

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

    if (rankingState.type === "seniority") {
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
        rankingState.type === "challenge-x" ||
        rankingState.type === "challenge-y"
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
        document.getElementById("ranking-body");

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

    topRows.forEach(row => {
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
    const tr = document.createElement("tr");

    if (isCurrentUser) {
        tr.classList.add("current-user-row");
    }

    if (rankingState.type === "teams") {
        tr.innerHTML = `
            <td>${row.rank}</td>
            <td>${escapeHtml(row.name)}</td>
            <td>${formatNumber(row.score)} XP</td>
        `;
        return tr;
    }

    if (rankingState.type === "seniority") {
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
        rankingState.type === "challenge-x" ||
        rankingState.type === "challenge-y"
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
    const tr = document.createElement("tr");
    tr.classList.add("ranking-separator");

    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "•••";

    tr.appendChild(td);

    return tr;
}

function formatNumber(value) {
    return new Intl.NumberFormat("fr-FR").format(
        Number(value || 0)
    );
}

function formatDate(value) {
    if (!value) {
        return "Non renseignée";
    }

    return new Intl.DateTimeFormat(
        "fr-FR"
    ).format(new Date(value));
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
        document.getElementById("ranking-loading");

    if (loading) {
        loading.hidden = !show;
    }
}

function showRankingError(message) {
    const errorBox =
        document.getElementById("ranking-error");

    if (!errorBox) {
        return;
    }

    errorBox.textContent = message;
    errorBox.hidden = false;
}

function hideRankingError() {
    const errorBox =
        document.getElementById("ranking-error");

    if (errorBox) {
        errorBox.hidden = true;
        errorBox.textContent = "";
    }
}
