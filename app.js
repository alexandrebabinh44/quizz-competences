const SUPABASE_URL = "https://ytcochuaiprkzbptgkvn.supabase.co";

const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0Y29jaHVhaXBya3picHRna3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTc1NzYsImV4cCI6MjA5NjMzMzU3Nn0.IvVCdv4pHXiy0X4SNVtP8KWtAmMBxQx4c-NwS2hEA7o";


/* =========================================================
   VARIABLES GLOBALES
========================================================= */

let currentQuestionIndex = 0;
let questions = [];

let trainingQuestions = [];
let trainingIndex = 0;
let trainingCorrectAnswers = 0;
let trainingStartedAt = null;

let badgePopupQueue = [];
let badgePopupRunning = false;

let badgesPageData = [];
let currentBadgeFilter = "all";


/* =========================================================
   OUTILS
========================================================= */

function supabaseHeaders(extra = {}) {
    return {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        ...extra
    };
}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}



function shuffleArray(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [result[i], result[j]] = [
            result[j],
            result[i]
        ];
    }

    return result;
}


function getLocalDayStartIso() {
    const now = new Date();

    const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
    );

    return start.toISOString();
}


function getWeekStartIso() {
    const now = new Date();

    const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
    );

    const day = start.getDay();

    const difference =
        day === 0 ? -6 : 1 - day;

    start.setDate(
        start.getDate() + difference
    );

    return start.toISOString();
}


function categoryIcon(category) {
    const name =
        String(category || "").toLowerCase();

    if (name.includes("auth")) return "🔒";

    if (
        name.includes("sécur") ||
        name.includes("secur")
    ) return "🛡️";

    if (name.includes("carte")) return "💳";

    if (name.includes("produit")) return "📦";

    if (
        name.includes("réclam") ||
        name.includes("reclam")
    ) return "💬";

    if (name.includes("conform")) return "✅";

    if (name.includes("wero")) return "💸";

    if (name.includes("pro")) return "💼";

    return "📚";
}


function getLevelLabel(level) {
    const value = Number(level || 1);

    if (value >= 50) return "Maître";
    if (value >= 30) return "Expert";
    if (value >= 15) return "Confirmé";
    if (value >= 5) return "Intermédiaire";

    return "Débutant";
}


/* =========================================================
   CONNEXION
========================================================= */

async function login() {
    const username =
        document
            .getElementById("username")
            .value
            .trim();

    const password =
        document
            .getElementById("password")
            .value
            .trim();

    if (!username || !password) {
        alert(
            "Merci de remplir l'identifiant et le mot de passe."
        );

        return;
    }

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?select=*&username=eq.${encodeURIComponent(username)}&password=eq.${encodeURIComponent(password)}`,
            {
                headers: supabaseHeaders()
            }
        );

        if (!response.ok) {
            alert(
                "Erreur Supabase : " +
                await response.text()
            );

            return;
        }

        const users = await response.json();

        if (users.length !== 1) {
            alert(
                "Identifiant ou mot de passe incorrect."
            );

            return;
        }

        const user = users[0];

        localStorage.setItem(
            "profile_id",
            user.id
        );

        localStorage.setItem(
            "full_name",
            user.full_name || ""
        );

        localStorage.setItem(
            "role",
            user.role || "user"
        );

        localStorage.setItem(
            "xp",
            String(user.xp || 0)
        );

        localStorage.setItem(
            "level",
            String(user.level || 1)
        );

        if (
            user.must_change_password === true
        ) {
            window.location.href =
                "change-password.html";
        } else {
            window.location.href =
                "home.html";
        }

    } catch (error) {
        console.error(error);

        alert(
            "Erreur de connexion à Supabase."
        );
    }
}


/* =========================================================
   DÉCONNEXION
========================================================= */

function logout() {
    const savedTheme =
        localStorage.getItem(
            "nickel_master_theme"
        );

    localStorage.clear();

    if (savedTheme) {
        localStorage.setItem(
            "nickel_master_theme",
            savedTheme
        );
    }

    window.location.href =
        "index.html";
}


/* =========================================================
   CHANGEMENT MOT DE PASSE
========================================================= */

async function changePassword() {
    const profileId =
        localStorage.getItem(
            "profile_id"
        );

    const newPassword =
        document
            .getElementById(
                "newPassword"
            )
            .value
            .trim();

    const confirmPassword =
        document
            .getElementById(
                "confirmPassword"
            )
            .value
            .trim();

    if (!profileId) {
        window.location.href =
            "index.html";

        return;
    }

    if (
        !newPassword ||
        !confirmPassword
    ) {
        alert(
            "Merci de remplir les deux champs."
        );

        return;
    }

    if (
        newPassword !==
        confirmPassword
    ) {
        alert(
            "Les mots de passe ne correspondent pas."
        );

        return;
    }

    if (newPassword.length < 6) {
        alert(
            "Le mot de passe doit contenir au moins 6 caractères."
        );

        return;
    }

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
        {
            method: "PATCH",

            headers: supabaseHeaders({
                "Content-Type":
                    "application/json",

                Prefer:
                    "return=minimal"
            }),

            body: JSON.stringify({
                password:
                    newPassword,

                must_change_password:
                    false
            })
        }
    );

    if (response.ok) {
        alert(
            "Mot de passe mis à jour."
        );

        window.location.href =
            "home.html";

    } else {
        alert(
            "Erreur : " +
            await response.text()
        );
    }
}


/* =========================================================
   PROFIL
========================================================= */

async function loadProfile() {
    const profileId =
        localStorage.getItem(
            "profile_id"
        );

    if (!profileId) {
        window.location.href =
            "index.html";

        return;
    }

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
        {
            headers: supabaseHeaders()
        }
    );

    if (!response.ok) {
        alert(
            "Erreur lors du chargement du profil."
        );

        return;
    }

    const data =
        await response.json();

    if (!data.length) {
        alert(
            "Profil introuvable."
        );

        return;
    }

    const user = data[0];

    if (
        document.getElementById(
            "fullName"
        )
    ) {
        document.getElementById(
            "fullName"
        ).innerText =
            user.full_name || "";
    }

    if (
        document.getElementById(
            "role"
        )
    ) {
        document.getElementById(
            "role"
        ).innerText =
            user.role || "";
    }

    if (
        document.getElementById(
            "position"
        )
    ) {
        document.getElementById(
            "position"
        ).innerText =
            user.position ||
            user.job_title ||
            "";
    }

    if (
        document.getElementById(
            "level"
        )
    ) {
        document.getElementById(
            "level"
        ).innerText =
            user.level || 1;
    }

    if (
        document.getElementById(
            "xp"
        )
    ) {
        document.getElementById(
            "xp"
        ).innerText =
            user.xp || 0;
    }
}
/* =========================================================
   DASHBOARD
========================================================= */

async function loadHomeDashboard() {
    const profileId =
        localStorage.getItem(
            "profile_id"
        );
updateAdminNavigation();

    if (!profileId) {
        window.location.href =
            "index.html";

        return;
    }

    try {
        await updatePresence(
            profileId
        );

        await Promise.all([
            loadHomeProfile(
                profileId
            ),

            loadHomeStats(
                profileId
            ),

            loadHomeBadgeCount(
                profileId
            ),

            loadHomeRecentBadges(
                profileId
            ),

            loadHomeCategories(),

            loadHomeWeeklyRanking(),

            loadDailyMissions(
                profileId
            ),

            loadHomeRecentActivity()
        ]);

        await loadHomeOnlineCount();

        startPresenceHeartbeat();

    } catch (error) {
        console.error(
            "Erreur dashboard :",
            error
        );
    }
}


/* =========================================================
   PROFIL DASHBOARD
========================================================= */

async function loadHomeProfile(
    profileId
) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}&select=id,full_name,role,xp,level`,
        {
            headers: supabaseHeaders()
        }
    );

    if (!response.ok) {
        throw new Error(
            await response.text()
        );
    }

    const data =
        await response.json();

    if (!data.length) {
        throw new Error(
            "Profil introuvable."
        );
    }

    const user = data[0];

    const xp =
        Number(user.xp || 0);

    const level =
        Number(user.level || 1);

    const xpInLevel =
        xp % 100;

    localStorage.setItem(
        "full_name",
        user.full_name ||
        "Utilisateur"
    );

    localStorage.setItem(
        "role",
        user.role ||
        "user"
    );

    localStorage.setItem(
        "xp",
        String(xp)
    );

    localStorage.setItem(
        "level",
        String(level)
    );

    if (
        document.getElementById(
            "welcome"
        )
    ) {
        document.getElementById(
            "welcome"
        ).innerText =
            `Bonjour ${user.full_name || "Utilisateur"} ! 👋`;
    }

    if (
        document.getElementById(
            "topUserName"
        )
    ) {
        document.getElementById(
            "topUserName"
        ).innerText =
            user.full_name ||
            "Utilisateur";
    }

    if (
        document.getElementById(
            "userLevel"
        )
    ) {
        document.getElementById(
            "userLevel"
        ).innerText =
            `Niveau ${level}`;
    }

    if (
        document.getElementById(
            "userXp"
        )
    ) {
        document.getElementById(
            "userXp"
        ).innerText =
            `${xpInLevel} / 100 XP`;
    }

    if (
        document.getElementById(
            "statXp"
        )
    ) {
        document.getElementById(
            "statXp"
        ).innerText =
            xp;
    }

    if (
        document.getElementById(
            "levelProgress"
        )
    ) {
        document.getElementById(
            "levelProgress"
        ).style.width =
            `${Math.min(
                100,
                xpInLevel
            )}%`;
    }

    if (
        document.getElementById(
            "levelLabel"
        )
    ) {
        document.getElementById(
            "levelLabel"
        ).innerText =
            getLevelLabel(level);
    }
}


/* =========================================================
   STATISTIQUES DASHBOARD
========================================================= */

async function loadHomeStats(
    profileId
) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/training_sessions?profile_id=eq.${profileId}&select=id,total_questions,correct_answers`,
        {
            headers: supabaseHeaders()
        }
    );

    if (!response.ok) {
        console.warn(
            "Statistiques indisponibles :",
            await response.text()
        );

        return;
    }

    const sessions =
        await response.json();

    const totalQuiz =
        sessions.length;

    const totalQuestions =
        sessions.reduce(
            (total, session) =>
                total +
                Number(
                    session.total_questions ||
                    0
                ),
            0
        );

    const totalCorrect =
        sessions.reduce(
            (total, session) =>
                total +
                Number(
                    session.correct_answers ||
                    0
                ),
            0
        );

    const rate =
        totalQuestions > 0
            ? Math.round(
                (
                    totalCorrect /
                    totalQuestions
                ) *
                100
            )
            : 0;

    const quizElement =
        document.getElementById(
            "statQuizCompleted"
        );

    const rateElement =
        document.getElementById(
            "statCorrectRate"
        );

    if (quizElement) {
        quizElement.innerText =
            totalQuiz;
    }

    if (rateElement) {
        rateElement.innerText =
            `${rate}%`;
    }
}


/* =========================================================
   COMPTEUR BADGES
========================================================= */

async function loadHomeBadgeCount(
    profileId
) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profile_badges?profile_id=eq.${profileId}&select=id`,
        {
            headers: supabaseHeaders()
        }
    );

    if (!response.ok) {
        console.warn(
            "Impossible de charger le nombre de badges :",
            await response.text()
        );

        return;
    }

    const badges =
        await response.json();

    const element =
        document.getElementById(
            "statBadges"
        );

    if (element) {
        element.innerText =
            badges.length;
    }
}


/* =========================================================
   DERNIERS BADGES ACCUEIL
========================================================= */

async function loadHomeRecentBadges(
    profileId
) {
    const container =
        document.getElementById(
            "recentBadges"
        );

    if (!container) {
        return;
    }

    try {
        /*
         * On récupère d'abord les 3 dernières
         * attributions de badges.
         */
        const earnedResponse =
            await fetch(
                `${SUPABASE_URL}/rest/v1/profile_badges?profile_id=eq.${profileId}&select=badge_id,earned_at&order=earned_at.desc&limit=3`,
                {
                    headers:
                        supabaseHeaders()
                }
            );

        if (!earnedResponse.ok) {
            throw new Error(
                await earnedResponse.text()
            );
        }

        const earned =
            await earnedResponse.json();

        if (!earned.length) {
            container.innerHTML = `
                <p style="color:var(--text-secondary);">
                    Aucun badge obtenu pour le moment.
                </p>
            `;

            return;
        }

        /*
         * Puis on récupère les informations
         * du catalogue badges.
         */
        const badgeIds =
            earned
                .map(
                    item =>
                        item.badge_id
                )
                .filter(Boolean);

        const badgeFilter =
            badgeIds
                .map(
                    id =>
                        `"${id}"`
                )
                .join(",");

        const badgesResponse =
            await fetch(
                `${SUPABASE_URL}/rest/v1/badges?select=id,name,icon,rarity&id=in.(${badgeFilter})`,
                {
                    headers:
                        supabaseHeaders()
                }
            );

        if (!badgesResponse.ok) {
            throw new Error(
                await badgesResponse.text()
            );
        }

        const badges =
            await badgesResponse.json();

        const byId = {};

        badges.forEach(
            badge => {
                byId[
                    badge.id
                ] =
                    badge;
            }
        );

        const rarityLabels = {
            common: "Commun",
            rare: "Rare",
            epic: "Épique",
            legendary: "Légendaire"
        };

        const rarityColors = {
            common: "#7b8794",
            rare: "#3b82f6",
            epic: "#8b5cf6",
            legendary: "#ff7a00"
        };

        container.innerHTML =
            earned
                .map(
                    item => {
                        const badge =
                            byId[
                                item.badge_id
                            ];

                        if (!badge) {
                            return "";
                        }

                        const rarity =
                            badge.rarity ||
                            "common";

                        const color =
                            rarityColors[
                                rarity
                            ] ||
                            "#7b8794";

                        return `
                            <div class="home-badge-line">

                                <span
                                    class="home-badge-icon"
                                    style="
                                        border-color:${color}55;
                                        background:${color}12;
                                    "
                                >
                                    ${escapeHtml(
                                        badge.icon ||
                                        "🏅"
                                    )}
                                </span>

                                <div>
                                    <strong>
                                        ${escapeHtml(
                                            badge.name
                                        )}
                                    </strong>

                                    <small
                                        style="
                                            color:${color};
                                            font-weight:700;
                                        "
                                    >
                                        ${
                                            rarityLabels[
                                                rarity
                                            ] ||
                                            "Commun"
                                        }
                                    </small>
                                </div>

                            </div>
                        `;
                    }
                )
                .join("");

    } catch (error) {
        console.error(
            "Erreur derniers badges :",
            error
        );

        container.innerHTML = `
            <p style="color:var(--text-secondary);">
                Impossible de charger les badges.
            </p>
        `;
    }
}


/* =========================================================
   CATÉGORIES DASHBOARD
========================================================= */

async function loadHomeCategories() {
    const container =
        document.getElementById(
            "categoryList"
        );

    if (!container) {
        return;
    }

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/questions?select=category`,
        {
            headers: supabaseHeaders()
        }
    );

    if (!response.ok) {
        container.innerHTML =
            "<div>Impossible de charger les catégories.</div>";

        return;
    }

    const rows =
        await response.json();

    const counts = {};

    rows.forEach(
        row => {
            const category =
                String(
                    row.category ||
                    ""
                ).trim();

            if (!category) {
                return;
            }

            counts[category] =
                (
                    counts[category] ||
                    0
                ) +
                1;
        }
    );

    const categories =
        Object.entries(
            counts
        )
            .sort(
                (a, b) =>
                    a[0].localeCompare(
                        b[0],
                        "fr"
                    )
            );

    if (!categories.length) {
        container.innerHTML =
            "<div>Aucune catégorie disponible.</div>";

        return;
    }

    container.innerHTML =
        categories
            .slice(0, 5)
            .map(
                ([category, count]) => `
                    <div>
                        ${categoryIcon(category)}

                        <strong>
                            ${escapeHtml(category)}
                        </strong>

                        <small>
                            ${count}
                            question${count > 1 ? "s" : ""}
                        </small>
                    </div>
                `
            )
            .join("");
}


/* =========================================================
   CLASSEMENT HEBDOMADAIRE DASHBOARD
========================================================= */

async function loadHomeWeeklyRanking() {
    const container =
        document.getElementById(
            "weeklyRanking"
        );

    if (!container) {
        return;
    }

    const start =
        encodeURIComponent(
            getWeekStartIso()
        );

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/xp_history?select=profile_id,amount&created_at=gte.${start}`,
        {
            headers: supabaseHeaders()
        }
    );

    if (!response.ok) {
        container.innerHTML =
            "<p>Classement indisponible.</p>";

        return;
    }

    const history =
        await response.json();

    const totals = {};

    history.forEach(
        entry => {
            if (!entry.profile_id) {
                return;
            }

            totals[
                entry.profile_id
            ] =
                (
                    totals[
                        entry.profile_id
                    ] ||
                    0
                ) +
                Number(
                    entry.amount ||
                    0
                );
        }
    );

    const topThree =
        Object.entries(
            totals
        )
            .sort(
                (a, b) =>
                    b[1] -
                    a[1]
            )
            .slice(
                0,
                3
            );

    if (!topThree.length) {
        container.innerHTML =
            "<p>Aucun XP gagné cette semaine.</p>";

        return;
    }

    const profilesResponse =
        await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?select=id,full_name`,
            {
                headers:
                    supabaseHeaders()
            }
        );

    const profiles =
        profilesResponse.ok
            ? await profilesResponse.json()
            : [];

    const names = {};

    profiles.forEach(
        profile => {
            names[
                profile.id
            ] =
                profile.full_name ||
                "Utilisateur";
        }
    );

    const medals =
        ["🥇", "🥈", "🥉"];

    container.innerHTML =
        topThree
            .map(
                (
                    [profileId, xp],
                    index
                ) => `
                    <p>
                        ${medals[index]}

                        ${escapeHtml(
                            names[
                                profileId
                            ] ||
                            "Utilisateur"
                        )}

                        <strong>
                            ${xp} XP
                        </strong>
                    </p>
                `
            )
            .join("");
}
/* =========================================================
   MISSIONS DU JOUR
========================================================= */

async function loadDailyMissions(
    profileId
) {
    const today =
        encodeURIComponent(
            getLocalDayStartIso()
        );

    const answersResponse =
        await fetch(
            `${SUPABASE_URL}/rest/v1/answers?profile_id=eq.${profileId}&submitted_at=gte.${today}&select=id`,
            {
                headers:
                    supabaseHeaders()
            }
        );

    if (answersResponse.ok) {
        const answers =
            await answersResponse.json();

        const element =
            document.getElementById(
                "missionQuestions"
            );

        if (element) {
            element.innerText =
                `${Math.min(
                    answers.length,
                    3
                )}/3`;
        }
    }

    const sessionsResponse =
        await fetch(
            `${SUPABASE_URL}/rest/v1/training_sessions?profile_id=eq.${profileId}&completed_at=gte.${today}&select=id`,
            {
                headers:
                    supabaseHeaders()
            }
        );

    if (sessionsResponse.ok) {
        const sessions =
            await sessionsResponse.json();

        const element =
            document.getElementById(
                "missionQuiz"
            );

        if (element) {
            element.innerText =
                `${Math.min(
                    sessions.length,
                    1
                )}/1`;
        }
    }

    const role =
        String(
            localStorage.getItem(
                "role"
            ) ||
            ""
        ).toLowerCase();

    const allowedRoles = [
        "admin",
        "direction",
        "responsable",
        "manager",
        "chef d'équipe",
        "chef_equipe",
        "conseiller senior",
        "senior"
    ];

    const correctionLine =
        document.getElementById(
            "missionCorrectionLine"
        );

    if (
        correctionLine &&
        allowedRoles.includes(
            role
        )
    ) {
        correctionLine.style.display =
            "";
    }
}


/* =========================================================
   PRÉSENCE
========================================================= */

async function updatePresence(
    profileId
) {
    if (!profileId) {
        return;
    }

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
        {
            method: "PATCH",

            headers: supabaseHeaders({
                "Content-Type":
                    "application/json",

                Prefer:
                    "return=minimal"
            }),

            body: JSON.stringify({
                last_seen_at:
                    new Date()
                        .toISOString()
            })
        }
    );

    if (!response.ok) {
        console.warn(
            "Présence non mise à jour :",
            await response.text()
        );
    }
}


async function loadHomeOnlineCount() {
    const element =
        document.getElementById(
            "onlineCount"
        );

    if (!element) {
        return;
    }

    const threshold =
        new Date(
            Date.now() -
            2 *
            60 *
            1000
        ).toISOString();

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=id&last_seen_at=gte.${encodeURIComponent(threshold)}`,
        {
            headers:
                supabaseHeaders()
        }
    );

    if (!response.ok) {
        element.innerText =
            "Présence indisponible";

        return;
    }

    const users =
        await response.json();

    const count =
        users.length;

    element.innerText =
        count === 1
            ? "1 personne connectée"
            : `${count} personnes connectées`;
}


function startPresenceHeartbeat() {
    const profileId =
        localStorage.getItem(
            "profile_id"
        );

    if (!profileId) {
        return;
    }

    if (
        window.__nickelPresenceInterval
    ) {
        clearInterval(
            window.__nickelPresenceInterval
        );
    }

    window.__nickelPresenceInterval =
        setInterval(
            async () => {
                await updatePresence(
                    profileId
                );

                if (
                    document.getElementById(
                        "onlineCount"
                    )
                ) {
                    await loadHomeOnlineCount();
                }

            },
            60000
        );
}


/* =========================================================
   ACTIVITÉ RÉCENTE
========================================================= */

async function loadHomeRecentActivity() {
    const container =
        document.getElementById(
            "recentActivity"
        );

    if (!container) {
        return;
    }

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/training_sessions?select=profile_id,category,mode,completed_at&order=completed_at.desc&limit=3`,
        {
            headers:
                supabaseHeaders()
        }
    );

    if (!response.ok) {
        container.innerHTML =
            "<p>Aucune activité disponible.</p>";

        return;
    }

    const sessions =
        await response.json();

    if (!sessions.length) {
        container.innerHTML =
            "<p>Aucune activité récente.</p>";

        return;
    }

    const profilesResponse =
        await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?select=id,full_name`,
            {
                headers:
                    supabaseHeaders()
            }
        );

    const profiles =
        profilesResponse.ok
            ? await profilesResponse.json()
            : [];

    const names = {};

    profiles.forEach(
        profile => {
            names[
                profile.id
            ] =
                profile.full_name ||
                "Utilisateur";
        }
    );

    container.innerHTML =
        sessions
            .map(
                session => {
                    let trainingName =
                        session.category;

                    if (
                        !trainingName &&
                        session.mode ===
                        "xtrem"
                    ) {
                        trainingName =
                            "Flash Xtrem";
                    }

                    if (!trainingName) {
                        trainingName =
                            "un entraînement";
                    }

                    const time =
                        new Date(
                            session.completed_at
                        )
                            .toLocaleTimeString(
                                "fr-FR",
                                {
                                    hour:
                                        "2-digit",

                                    minute:
                                        "2-digit"
                                }
                            );

                    return `
                        <p>
                            ${escapeHtml(
                                names[
                                    session.profile_id
                                ] ||
                                "Utilisateur"
                            )}

                            a terminé

                            ${escapeHtml(
                                trainingName
                            )}

                            <small>
                                ${time}
                            </small>
                        </p>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   ENTRAÎNEMENT
========================================================= */

function afficherChoixThemes() {
    const mode =
        document.getElementById(
            "choix-mode"
        );

    const themes =
        document.getElementById(
            "choix-themes"
        );

    if (mode) {
        mode.style.display =
            "none";
    }

    if (themes) {
        themes.style.display =
            "block";
    }
}


function retourChoixMode() {
    const mode =
        document.getElementById(
            "choix-mode"
        );

    const themes =
        document.getElementById(
            "choix-themes"
        );

    if (themes) {
        themes.style.display =
            "none";
    }

    if (mode) {
        mode.style.display =
            "block";
    }
}


function lancerEntrainementCible(
    category
) {
    localStorage.setItem(
        "training_mode",
        "cible"
    );

    localStorage.setItem(
        "training_category",
        category
    );

    window.location.href =
        "training-quiz.html";
}


function lancerFlash() {
    localStorage.setItem(
        "training_mode",
        "flash"
    );

    localStorage.removeItem(
        "training_category"
    );

    window.location.href =
        "training-quiz.html";
}


function lancerFlashXtrem() {
    localStorage.setItem(
        "training_mode",
        "xtrem"
    );

    localStorage.removeItem(
        "training_category"
    );

    window.location.href =
        "training-quiz.html";
}


/* =========================================================
   CHARGEMENT ENTRAÎNEMENT
========================================================= */

async function loadTrainingQuiz() {
    trainingIndex = 0;

    trainingCorrectAnswers = 0;

    trainingStartedAt =
        new Date()
            .toISOString();

    const mode =
        localStorage.getItem(
            "training_mode"
        ) ||
        "cible";

    let category =
        localStorage.getItem(
            "training_category"
        );

    let title =
        "Entraînement";


    if (mode === "cible") {
        if (!category) {
            window.location.href =
                "training.html";

            return;
        }

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/questions?select=*&category=eq.${encodeURIComponent(category)}`,
            {
                headers:
                    supabaseHeaders()
            }
        );

        if (!response.ok) {
            alert(
                "Impossible de charger les questions."
            );

            return;
        }

        trainingQuestions =
            shuffleArray(
                await response.json()
            ).slice(
                0,
                10
            );

        title =
            `Entraînement - ${category}`;
    }


    else if (mode === "flash") {
        const categoriesResponse =
            await fetch(
                `${SUPABASE_URL}/rest/v1/questions?select=category`,
                {
                    headers:
                        supabaseHeaders()
                }
            );

        if (!categoriesResponse.ok) {
            alert(
                "Impossible de charger les catégories."
            );

            return;
        }

        const rows =
            await categoriesResponse.json();

        const categories = [
            ...new Set(
                rows
                    .map(
                        row =>
                            row.category
                    )
                    .filter(Boolean)
            )
        ];

        if (!categories.length) {
            alert(
                "Aucune catégorie disponible."
            );

            return;
        }

        category =
            categories[
                Math.floor(
                    Math.random() *
                    categories.length
                )
            ];

        localStorage.setItem(
            "training_category",
            category
        );

        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/questions?select=*&category=eq.${encodeURIComponent(category)}`,
                {
                    headers:
                        supabaseHeaders()
                }
            );

        if (!response.ok) {
            alert(
                "Impossible de charger les questions."
            );

            return;
        }

        trainingQuestions =
            shuffleArray(
                await response.json()
            ).slice(
                0,
                10
            );

        title =
            `Flash - ${category}`;
    }


    else if (mode === "xtrem") {
        localStorage.removeItem(
            "training_category"
        );

        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/questions?select=*`,
                {
                    headers:
                        supabaseHeaders()
                }
            );

        if (!response.ok) {
            alert(
                "Impossible de charger les questions."
            );

            return;
        }

        trainingQuestions =
            shuffleArray(
                await response.json()
            ).slice(
                0,
                10
            );

        title =
            "Flash Xtrem";
    }


    if (!trainingQuestions.length) {
        alert(
            "Aucune question disponible."
        );

        window.location.href =
            "training.html";

        return;
    }

    const titleElement =
        document.getElementById(
            "trainingTitle"
        );

    if (titleElement) {
        titleElement.innerText =
            title;
    }

    await showTrainingQuestion();
}


/* =========================================================
   AFFICHER QUESTION
========================================================= */

async function showTrainingQuestion() {
    if (
        trainingIndex >=
        trainingQuestions.length
    ) {
        await finishTraining();

        return;
    }

    const q =
        trainingQuestions[
            trainingIndex
        ];

    const progress =
        document.getElementById(
            "trainingProgress"
        );

    if (progress) {
        progress.innerText =
            `Question ${trainingIndex + 1} / ${trainingQuestions.length}`;
    }

    const question =
        document.getElementById(
            "trainingQuestion"
        );

    if (question) {
        question.innerText =
            q.question;
    }

    const answerZone =
        document.getElementById(
            "answerZone"
        );

    if (!answerZone) {
        return;
    }

    answerZone.innerHTML = "";

    if (
        q.question_type ===
        "open"
    ) {
        answerZone.innerHTML = `
            <textarea
                id="trainingAnswer"
                rows="6"
                placeholder="Écris ta réponse ici..."
            ></textarea>
        `;
    }

    else if (
        q.question_type ===
        "true_false"
    ) {
        answerZone.innerHTML = `
            <label>
                <input
                    type="radio"
                    name="answerChoice"
                    value="A"
                >
                ${escapeHtml(q.choice_a)}
            </label>

            <br>

            <label>
                <input
                    type="radio"
                    name="answerChoice"
                    value="B"
                >
                ${escapeHtml(q.choice_b)}
            </label>
        `;
    }

    else if (
        q.question_type ===
        "single_choice"
    ) {
        answerZone.innerHTML = `
            <label><input type="radio" name="answerChoice" value="A"> ${escapeHtml(q.choice_a)}</label><br>
            <label><input type="radio" name="answerChoice" value="B"> ${escapeHtml(q.choice_b)}</label><br>
            <label><input type="radio" name="answerChoice" value="C"> ${escapeHtml(q.choice_c)}</label><br>
            <label><input type="radio" name="answerChoice" value="D"> ${escapeHtml(q.choice_d)}</label>
        `;
    }

    else if (
        q.question_type ===
        "multiple_choice"
    ) {
        answerZone.innerHTML = `
            <label><input type="checkbox" name="answerChoice" value="A"> ${escapeHtml(q.choice_a)}</label><br>
            <label><input type="checkbox" name="answerChoice" value="B"> ${escapeHtml(q.choice_b)}</label><br>
            <label><input type="checkbox" name="answerChoice" value="C"> ${escapeHtml(q.choice_c)}</label><br>
            <label><input type="checkbox" name="answerChoice" value="D"> ${escapeHtml(q.choice_d)}</label>
        `;
    }
}
/* =========================================================
   ENVOYER RÉPONSE ENTRAÎNEMENT
========================================================= */

async function submitTrainingAnswer() {
    const profileId =
        localStorage.getItem(
            "profile_id"
        );

    const q =
        trainingQuestions[
            trainingIndex
        ];

    if (!profileId || !q) {
        return;
    }

    let answer = "";

    if (
        q.question_type ===
        "open"
    ) {
        const input =
            document.getElementById(
                "trainingAnswer"
            );

        answer =
            input
                ? input.value.trim()
                : "";
    }

    else if (
        q.question_type ===
        "multiple_choice"
    ) {
        answer =
            Array.from(
                document.querySelectorAll(
                    'input[name="answerChoice"]:checked'
                )
            )
                .map(
                    input =>
                        input.value
                )
                .sort()
                .join(",");
    }

    else {
        const selected =
            document.querySelector(
                'input[name="answerChoice"]:checked'
            );

        answer =
            selected
                ? selected.value
                : "";
    }

    if (!answer) {
        alert(
            "Merci de saisir une réponse."
        );

        return;
    }

    let autoScore = null;
    let finalScore = null;
    let corrected = false;
    let isCorrect = false;


    if (
        q.question_type ===
        "true_false" ||
        q.question_type ===
        "single_choice"
    ) {
        isCorrect =
            answer ===
            q.correct_answer;

        autoScore =
            isCorrect
                ? Number(
                    q.max_points ||
                    1
                )
                : 0;

        finalScore =
            autoScore;

        corrected =
            true;
    }


    if (
        q.question_type ===
        "multiple_choice"
    ) {
        const correctChoices =
            String(
                q.correct_answer ||
                ""
            )
                .split(",")
                .map(
                    value =>
                        value.trim()
                )
                .filter(Boolean)
                .sort()
                .join(",");

        isCorrect =
            answer ===
            correctChoices;

        autoScore =
            isCorrect
                ? Number(
                    q.max_points ||
                    1
                )
                : 0;

        finalScore =
            autoScore;

        corrected =
            true;
    }


    const response =
        await fetch(
            `${SUPABASE_URL}/rest/v1/answers`,
            {
                method:
                    "POST",

                headers:
                    supabaseHeaders({
                        "Content-Type":
                            "application/json",

                        Prefer:
                            "return=minimal"
                    }),

                body:
                    JSON.stringify({
                        profile_id:
                            profileId,

                        question_id:
                            q.id,

                        answer_text:
                            answer,

                        auto_score:
                            autoScore,

                        final_score:
                            finalScore,

                        corrected:
                            corrected
                    })
            }
        );


    if (!response.ok) {
        alert(
            "Erreur enregistrement : " +
            await response.text()
        );

        return;
    }


    if (isCorrect) {
        trainingCorrectAnswers++;
    }


    await checkQuestionBadges(
        profileId
    );


    trainingIndex++;


    await showTrainingQuestion();
}


/* =========================================================
   SESSION D'ENTRAÎNEMENT
========================================================= */

async function saveTrainingSession() {
    const profileId =
        localStorage.getItem(
            "profile_id"
        );

    if (!profileId) {
        throw new Error(
            "Profil connecté introuvable."
        );
    }

    const response =
        await fetch(
            `${SUPABASE_URL}/rest/v1/training_sessions`,
            {
                method:
                    "POST",

                headers:
                    supabaseHeaders({
                        "Content-Type":
                            "application/json",

                        Prefer:
                            "return=representation"
                    }),

                body:
                    JSON.stringify({
                        profile_id:
                            profileId,

                        mode:
                            localStorage.getItem(
                                "training_mode"
                            ) ||
                            "cible",

                        category:
                            localStorage.getItem(
                                "training_category"
                            ),

                        total_questions:
                            trainingQuestions.length,

                        correct_answers:
                            trainingCorrectAnswers,

                        score:
                            trainingCorrectAnswers,

                        xp_earned:
                            5,

                        started_at:
                            trainingStartedAt,

                        completed_at:
                            new Date()
                                .toISOString()
                    })
            }
        );

    if (!response.ok) {
        throw new Error(
            await response.text()
        );
    }

    const data =
        await response.json();

    return (
        data[0]?.id ||
        null
    );
}


/* =========================================================
   FIN ENTRAÎNEMENT
========================================================= */

async function finishTraining() {
    const profileId =
        localStorage.getItem(
            "profile_id"
        );

    try {
        const sessionId =
            await saveTrainingSession();

        await addXp(
            5,
            "training_participation",
            sessionId
        );

        await checkAllBadges(
            profileId
        );

    } catch (error) {
        console.error(error);

        alert(
            "L'entraînement est terminé, mais son enregistrement n'a pas pu être finalisé : " +
            error.message
        );

        return;
    }

    const total =
        trainingQuestions.length;

    const correct =
        trainingCorrectAnswers;

    const incorrect =
        total -
        correct;

    const percentage =
        total > 0
            ? Math.round(
                (
                    correct /
                    total
                ) *
                100
            )
            : 0;

    const container =
        document.querySelector(
            ".container"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <h2>
            Entraînement terminé ✅
        </h2>

        <p>
            Score :
            <strong>
                ${correct}/${total}
            </strong>
        </p>

        <p>
            Pourcentage :
            <strong>
                ${percentage}%
            </strong>
        </p>

        <p>
            Bonnes réponses :
            <strong>
                ${correct}
            </strong>
        </p>

        <p>
            Mauvaises réponses :
            <strong>
                ${incorrect}
            </strong>
        </p>

        <p>
            <strong>
                +5 XP d'entraînement
            </strong>
        </p>

        <button
            onclick="restartCurrentTraining()"
        >
            Recommencer
        </button>

        <button
            onclick="window.location.href='training.html'"
        >
            Retour aux entraînements
        </button>

        <button
            onclick="window.location.href='home.html'"
        >
            Retour au menu
        </button>
    `;
}


function restartCurrentTraining() {
    window.location.reload();
}


/* =========================================================
   BADGES - CATALOGUE
========================================================= */

async function getBadgeByCode(
    code
) {
    const response =
        await fetch(
            `${SUPABASE_URL}/rest/v1/badges?code=eq.${encodeURIComponent(code)}&active=eq.true&select=*`,
            {
                headers:
                    supabaseHeaders()
            }
        );

    if (!response.ok) {
        throw new Error(
            "Impossible de récupérer le badge " +
            code +
            " : " +
            await response.text()
        );
    }

    const data =
        await response.json();

    return (
        data[0] ||
        null
    );
}


async function hasUserBadge(
    profileId,
    badgeId
) {
    const response =
        await fetch(
            `${SUPABASE_URL}/rest/v1/profile_badges?profile_id=eq.${profileId}&badge_id=eq.${badgeId}&occurrence_key=is.null&select=id`,
            {
                headers:
                    supabaseHeaders()
            }
        );

    if (!response.ok) {
        throw new Error(
            "Impossible de vérifier les badges obtenus : " +
            await response.text()
        );
    }

    const data =
        await response.json();

    return (
        data.length >
        0
    );
}


/* =========================================================
   ATTRIBUER BADGE
========================================================= */

async function awardBadge(
    profileId,
    badge,
    context = null
) {
    if (!profileId || !badge) {
        return false;
    }

    if (!badge.repeatable) {
        const alreadyOwned =
            await hasUserBadge(
                profileId,
                badge.id
            );

        if (alreadyOwned) {
            return false;
        }
    }

    const insertResponse =
        await fetch(
            `${SUPABASE_URL}/rest/v1/profile_badges`,
            {
                method:
                    "POST",

                headers:
                    supabaseHeaders({
                        "Content-Type":
                            "application/json",

                        Prefer:
                            "return=representation"
                    }),

                body:
                    JSON.stringify({
                        profile_id:
                            profileId,

                        badge_id:
                            badge.id,

                        xp_awarded:
                            Number(
                                badge.xp_reward ||
                                0
                            ),

                        context:
                            context,

                        occurrence_key:
                            null
                    })
            }
        );

    if (!insertResponse.ok) {
        const errorText =
            await insertResponse.text();

        if (
            errorText.includes(
                "duplicate key"
            )
        ) {
            return false;
        }

        throw new Error(
            "Impossible d'attribuer le badge : " +
            errorText
        );
    }

    const inserted =
        await insertResponse.json();

    const profileBadgeId =
        inserted[0]?.id ||
        null;

    try {
        const reward =
            Number(
                badge.xp_reward ||
                0
            );

        if (reward > 0) {
            await addXp(
                reward,
                "badge_reward",
                badge.id
            );
        }

    } catch (error) {
        if (profileBadgeId) {
            await fetch(
                `${SUPABASE_URL}/rest/v1/profile_badges?id=eq.${profileBadgeId}`,
                {
                    method:
                        "DELETE",

                    headers:
                        supabaseHeaders({
                            Prefer:
                                "return=minimal"
                        })
                }
            );
        }

        throw error;
    }

    queueBadgeUnlocked(
        badge
    );

    return true;
}


/* =========================================================
   POPUPS BADGES
========================================================= */

function queueBadgeUnlocked(
    badge
) {
    badgePopupQueue.push(
        badge
    );

    if (!badgePopupRunning) {
        showNextBadgePopup();
    }
}


function showNextBadgePopup() {
    if (
        badgePopupQueue.length ===
        0
    ) {
        badgePopupRunning =
            false;

        return;
    }

    badgePopupRunning =
        true;

    const badge =
        badgePopupQueue.shift();

    const oldPopup =
        document.getElementById(
            "badgeUnlockedPopup"
        );

    if (oldPopup) {
        oldPopup.remove();
    }

    const popup =
        document.createElement(
            "div"
        );

    popup.id =
        "badgeUnlockedPopup";

    popup.style.position =
        "fixed";

    popup.style.right =
        "24px";

    popup.style.bottom =
        "24px";

    popup.style.zIndex =
        "99999";

    popup.style.width =
        "330px";

    popup.style.maxWidth =
        "calc(100vw - 40px)";

    popup.style.padding =
        "18px";

    popup.style.borderRadius =
        "16px";

    popup.style.background =
        "var(--bg-card, #ffffff)";

    popup.style.color =
        "var(--text-main, #151515)";

    popup.style.border =
        "1px solid var(--border, #e8e8e8)";

    popup.style.boxShadow =
        "0 12px 35px rgba(0,0,0,.20)";

    popup.style.borderLeft =
        "5px solid var(--orange, #ff5a00)";

    popup.innerHTML = `
        <div
            style="
                display:flex;
                gap:14px;
                align-items:center;
            "
        >

            <div
                style="
                    font-size:44px;
                    line-height:1;
                "
            >
                ${escapeHtml(
                    badge.icon ||
                    "🏅"
                )}
            </div>

            <div style="min-width:0;">

                <div
                    style="
                        color:var(--orange, #ff5a00);
                        font-size:12px;
                        font-weight:800;
                        text-transform:uppercase;
                        letter-spacing:.6px;
                        margin-bottom:4px;
                    "
                >
                    ✨ Badge débloqué
                </div>

                <div
                    style="
                        font-size:18px;
                        font-weight:800;
                        margin-bottom:4px;
                    "
                >
                    ${escapeHtml(
                        badge.name
                    )}
                </div>

                <div
                    style="
                        color:var(--text-secondary, #777);
                        font-size:13px;
                        margin-bottom:8px;
                    "
                >
                    ${escapeHtml(
                        badge.description
                    )}
                </div>

                <strong
                    style="
                        color:var(--orange, #ff5a00);
                    "
                >
                    +${Number(
                        badge.xp_reward ||
                        0
                    )} XP
                </strong>

            </div>

        </div>
    `;

    document.body.appendChild(
        popup
    );

    setTimeout(
        () => {
            popup.remove();

            setTimeout(
                showNextBadgePopup,
                350
            );
        },
        4500
    );
}


/* =========================================================
   VÉRIFICATIONS BADGES
========================================================= */

async function checkAndAwardBadge(
    profileId,
    code,
    condition,
    context = null
) {
    if (!condition) {
        return false;
    }

    const badge =
        await getBadgeByCode(
            code
        );

    if (!badge) {
        return false;
    }

    return await awardBadge(
        profileId,
        badge,
        context
    );
}


async function checkQuestionBadges(
    profileId
) {
    const response =
        await fetch(
            `${SUPABASE_URL}/rest/v1/answers?profile_id=eq.${profileId}&select=id`,
            {
                headers:
                    supabaseHeaders()
            }
        );

    if (!response.ok) {
        console.warn(
            "Impossible de vérifier les badges questions :",
            await response.text()
        );

        return;
    }

    const answers =
        await response.json();

    const count =
        answers.length;

    await checkAndAwardBadge(
        profileId,
        "FIRST_ANSWER",
        count >= 1,
        `${count} réponse(s)`
    );

    await checkAndAwardBadge(
        profileId,
        "CURIOUS_25",
        count >= 25,
        `${count} réponse(s)`
    );

    await checkAndAwardBadge(
        profileId,
        "ASSIDU_100",
        count >= 100,
        `${count} réponse(s)`
    );

    await checkAndAwardBadge(
        profileId,
        "QUIZ_MACHINE_500",
        count >= 500,
        `${count} réponse(s)`
    );

    await checkAndAwardBadge(
        profileId,
        "ENCYCLOPEDIA_1000",
        count >= 1000,
        `${count} réponse(s)`
    );
}


async function checkTrainingBadges(
    profileId
) {
    const response =
        await fetch(
            `${SUPABASE_URL}/rest/v1/training_sessions?profile_id=eq.${profileId}&select=*&order=completed_at.asc`,
            {
                headers:
                    supabaseHeaders()
            }
        );

    if (!response.ok) {
        console.warn(
            "Impossible de vérifier les badges entraînement :",
            await response.text()
        );

        return;
    }

    const sessions =
        await response.json();

    const totalTrainings =
        sessions.length;

    await checkAndAwardBadge(
        profileId,
        "FIRST_TRAINING",
        totalTrainings >= 1,
        `${totalTrainings} entraînement(s)`
    );

    await checkAndAwardBadge(
        profileId,
        "TRAININGS_10",
        totalTrainings >= 10,
        `${totalTrainings} entraînement(s)`
    );

    await checkAndAwardBadge(
        profileId,
        "TRAININGS_25",
        totalTrainings >= 25,
        `${totalTrainings} entraînement(s)`
    );

    await checkAndAwardBadge(
        profileId,
        "TRAININGS_100",
        totalTrainings >= 100,
        `${totalTrainings} entraînement(s)`
    );


    const perfectSessions =
        sessions.filter(
            session => {
                const total =
                    Number(
                        session.total_questions ||
                        0
                    );

                const correct =
                    Number(
                        session.correct_answers ||
                        0
                    );

                return (
                    total > 0 &&
                    correct === total
                );
            }
        );


    await checkAndAwardBadge(
        profileId,
        "PERFECT_QUIZ",
        perfectSessions.length >= 1,
        "Quiz parfait"
    );


    let currentPerfectStreak = 0;
    let bestPerfectStreak = 0;

    sessions.forEach(
        session => {
            const total =
                Number(
                    session.total_questions ||
                    0
                );

            const correct =
                Number(
                    session.correct_answers ||
                    0
                );

            if (
                total > 0 &&
                correct === total
            ) {
                currentPerfectStreak++;

                bestPerfectStreak =
                    Math.max(
                        bestPerfectStreak,
                        currentPerfectStreak
                    );

            } else {
                currentPerfectStreak = 0;
            }
        }
    );


    await checkAndAwardBadge(
        profileId,
        "PERFECT_STREAK_2",
        bestPerfectStreak >= 2,
        `${bestPerfectStreak} perfect(s) consécutif(s)`
    );

    await checkAndAwardBadge(
        profileId,
        "PERFECT_STREAK_3",
        bestPerfectStreak >= 3,
        `${bestPerfectStreak} perfect(s) consécutif(s)`
    );


    const flashSessions =
        sessions.filter(
            session =>
                session.mode ===
                "flash"
        );

    await checkAndAwardBadge(
        profileId,
        "FLASH_FIRST",
        flashSessions.length >= 1,
        "Premier Flash"
    );


    const xtremSessions =
        sessions.filter(
            session =>
                session.mode ===
                "xtrem"
        );

    await checkAndAwardBadge(
        profileId,
        "XTREM_FIRST",
        xtremSessions.length >= 1,
        "Premier Flash Xtrem"
    );


    const perfectXtrem =
        xtremSessions.some(
            session => {
                const total =
                    Number(
                        session.total_questions ||
                        0
                    );

                const correct =
                    Number(
                        session.correct_answers ||
                        0
                    );

                return (
                    total > 0 &&
                    correct === total
                );
            }
        );


    await checkAndAwardBadge(
        profileId,
        "XTREM_PERFECT",
        perfectXtrem,
        "Flash Xtrem parfait"
    );
}


async function checkAllBadges(
    profileId
) {
    if (!profileId) {
        return;
    }

    try {
        await checkQuestionBadges(
            profileId
        );

        await checkTrainingBadges(
            profileId
        );

    } catch (error) {
        console.error(
            "Erreur moteur badges :",
            error
        );
    }
}
/* =========================================================
   PAGE BADGES
========================================================= */

async function loadBadgesPage() {
    const profileId =
        localStorage.getItem(
            "profile_id"
        );

    if (!profileId) {
        window.location.href =
            "index.html";

        return;
    }

    const fullName =
        localStorage.getItem(
            "full_name"
        ) ||
        "Utilisateur";

    const topUserName =
        document.getElementById(
            "topUserName"
        );

    if (topUserName) {
        topUserName.innerText =
            fullName;
    }


    try {
        await updatePresence(
            profileId
        );

        await loadHomeOnlineCount();

        startPresenceHeartbeat();


        const [
            badgesResponse,
            earnedResponse,
            answersResponse,
            sessionsResponse
        ] =
            await Promise.all([
                fetch(
                    `${SUPABASE_URL}/rest/v1/badges?active=eq.true&select=*`,
                    {
                        headers:
                            supabaseHeaders()
                    }
                ),

                fetch(
                    `${SUPABASE_URL}/rest/v1/profile_badges?profile_id=eq.${profileId}&select=*`,
                    {
                        headers:
                            supabaseHeaders()
                    }
                ),

                fetch(
                    `${SUPABASE_URL}/rest/v1/answers?profile_id=eq.${profileId}&select=id`,
                    {
                        headers:
                            supabaseHeaders()
                    }
                ),

                fetch(
                    `${SUPABASE_URL}/rest/v1/training_sessions?profile_id=eq.${profileId}&select=*`,
                    {
                        headers:
                            supabaseHeaders()
                    }
                )
            ]);


        if (!badgesResponse.ok) {
            throw new Error(
                await badgesResponse.text()
            );
        }

        if (!earnedResponse.ok) {
            throw new Error(
                await earnedResponse.text()
            );
        }


        const badges =
            await badgesResponse.json();

        const earnedBadges =
            await earnedResponse.json();

        const answers =
            answersResponse.ok
                ? await answersResponse.json()
                : [];

        const sessions =
            sessionsResponse.ok
                ? await sessionsResponse.json()
                : [];


        const earnedByBadgeId =
            {};

        earnedBadges.forEach(
            earned => {
                if (
                    !earnedByBadgeId[
                        earned.badge_id
                    ]
                ) {
                    earnedByBadgeId[
                        earned.badge_id
                    ] = [];
                }

                earnedByBadgeId[
                    earned.badge_id
                ].push(
                    earned
                );
            }
        );


        badgesPageData =
            badges.map(
                badge => {
                    const earned =
                        earnedByBadgeId[
                            badge.id
                        ] ||
                        [];

                    const progress =
                        calculateBadgeProgress(
                            badge,
                            answers,
                            sessions
                        );

                    return {
                        ...badge,

                        obtained:
                            earned.length > 0,

                        occurrenceCount:
                            earned.length,

                        progress:
                            progress.current,

                        progressTarget:
                            progress.target
                    };
                }
            );


        const obtainedCount =
            badgesPageData.filter(
                badge =>
                    badge.obtained
            ).length;


        const obtainedElement =
            document.getElementById(
                "badgesObtainedCount"
            );

        const totalElement =
            document.getElementById(
                "badgesTotalCount"
            );


        if (obtainedElement) {
            obtainedElement.innerText =
                obtainedCount;
        }

        if (totalElement) {
            totalElement.innerText =
                badgesPageData.length;
        }


        renderBadgesPage();


    } catch (error) {
        console.error(
            "Erreur page badges :",
            error
        );

        const grid =
            document.getElementById(
                "badgesGrid"
            );

        if (grid) {
            grid.innerHTML = `
                <div class="dash-card">
                    Impossible de charger les badges.
                </div>
            `;
        }
    }
}


/* =========================================================
   PROGRESSION BADGES
========================================================= */

function calculateBadgeProgress(
    badge,
    answers,
    sessions
) {
    const target =
        Number(
            badge.target_value ||
            1
        );

    let current = 0;


    switch (
        badge.condition_type
    ) {
        case "questions_answered":
            current =
                answers.length;

            break;


        case "trainings_completed":
            current =
                sessions.length;

            break;


        case "flash_completed":
            current =
                sessions.filter(
                    session =>
                        session.mode ===
                        "flash"
                ).length;

            break;


        case "xtrem_completed":
            current =
                sessions.filter(
                    session =>
                        session.mode ===
                        "xtrem"
                ).length;

            break;


        case "perfect_quiz":
            current =
                sessions.filter(
                    session => {
                        const total =
                            Number(
                                session.total_questions ||
                                0
                            );

                        const correct =
                            Number(
                                session.correct_answers ||
                                0
                            );

                        return (
                            total > 0 &&
                            correct === total
                        );
                    }
                ).length;

            break;


        case "perfect_quiz_streak": {
            let streak = 0;
            let best = 0;

            sessions
                .slice()
                .sort(
                    (a, b) =>
                        new Date(
                            a.completed_at
                        ) -
                        new Date(
                            b.completed_at
                        )
                )
                .forEach(
                    session => {
                        const total =
                            Number(
                                session.total_questions ||
                                0
                            );

                        const correct =
                            Number(
                                session.correct_answers ||
                                0
                            );

                        if (
                            total > 0 &&
                            correct === total
                        ) {
                            streak++;

                            best =
                                Math.max(
                                    best,
                                    streak
                                );

                        } else {
                            streak = 0;
                        }
                    }
                );

            current =
                best;

            break;
        }


        case "xtrem_perfect":
            current =
                sessions.some(
                    session => {
                        const total =
                            Number(
                                session.total_questions ||
                                0
                            );

                        const correct =
                            Number(
                                session.correct_answers ||
                                0
                            );

                        return (
                            session.mode ===
                            "xtrem" &&
                            total > 0 &&
                            correct === total
                        );
                    }
                )
                    ? 1
                    : 0;

            break;


        default:
            current = 0;

            break;
    }


    return {
        current:
            Math.max(
                0,
                current
            ),

        target:
            target
    };
}


/* =========================================================
   FILTRE BADGES
========================================================= */

function setBadgeFilter(
    filter,
    button
) {
    currentBadgeFilter =
        filter;

    document
        .querySelectorAll(
            ".badge-filter"
        )
        .forEach(
            item => {
                item.classList.remove(
                    "active"
                );
            }
        );

    if (button) {
        button.classList.add(
            "active"
        );
    }

    renderBadgesPage();
}


/* =========================================================
   AFFICHAGE PAGE BADGES
========================================================= */

function renderBadgesPage() {
    const grid =
        document.getElementById(
            "badgesGrid"
        );

    if (!grid) {
        return;
    }

    const rarityOrder = {
        common: 1,
        rare: 2,
        epic: 3,
        legendary: 4
    };

    let filtered =
        [...badgesPageData];


    if (
        currentBadgeFilter ===
        "secret"
    ) {
        filtered =
            filtered.filter(
                badge =>
                    badge.secret ===
                    true
            );

    } else if (
        currentBadgeFilter !==
        "all"
    ) {
        filtered =
            filtered.filter(
                badge =>
                    badge.rarity ===
                    currentBadgeFilter &&
                    badge.secret !==
                    true
            );

    } else {
        filtered =
            filtered.filter(
                badge =>
                    badge.secret !==
                    true
            );
    }


    filtered.sort(
        (a, b) => {
            const rarityDifference =
                (
                    rarityOrder[
                        a.rarity
                    ] ||
                    99
                )
                -
                (
                    rarityOrder[
                        b.rarity
                    ] ||
                    99
                );

            if (
                rarityDifference !==
                0
            ) {
                return rarityDifference;
            }

            return (
                Number(
                    a.target_value ||
                    1
                )
                -
                Number(
                    b.target_value ||
                    1
                )
            );
        }
    );


    if (!filtered.length) {
        grid.innerHTML = `
            <div class="dash-card">
                Aucun badge dans cette catégorie.
            </div>
        `;

        return;
    }


    grid.innerHTML =
        filtered
            .map(
                badge =>
                    createBadgeCard(
                        badge
                    )
            )
            .join("");
}


/* =========================================================
   CARTE BADGE
========================================================= */

function createBadgeCard(
    badge
) {
    const rarityLabels = {
        common: "Commun",
        rare: "Rare",
        epic: "Épique",
        legendary: "Légendaire"
    };

    const rarityClass =
        `badge-rarity-${badge.rarity}`;


    if (
        badge.secret === true &&
        !badge.obtained
    ) {
        return `
            <article
                class="
                    badge-gallery-card
                    badge-locked
                    badge-secret-card
                "
            >

                <div class="badge-gallery-icon">
                    ❌
                </div>

                <div class="badge-gallery-rarity">
                    Secret
                </div>

                <h3>
                    ???
                </h3>

                <p>
                    Continue d'explorer Nickel Master
                    pour découvrir ce badge.
                </p>

                <div class="badge-gallery-status">
                    🔒 Secret
                </div>

            </article>
        `;
    }


    const progress =
        Number(
            badge.progress ||
            0
        );

    const target =
        Number(
            badge.progressTarget ||
            badge.target_value ||
            1
        );

    const percentage =
        target > 0
            ? Math.min(
                100,
                Math.round(
                    (
                        progress /
                        target
                    ) *
                    100
                )
            )
            : 0;


    let statusHtml = "";


    if (badge.obtained) {
        statusHtml = `
            <div
                class="
                    badge-gallery-status
                    badge-obtained
                "
            >
                ✅ Obtenu
            </div>
        `;

        if (
            badge.repeatable &&
            badge.occurrenceCount >
            1
        ) {
            statusHtml += `
                <div class="badge-repeat-count">
                    x${badge.occurrenceCount}
                </div>
            `;
        }

    } else {
        const progressSupported = [
            "questions_answered",
            "trainings_completed",
            "flash_completed",
            "xtrem_completed",
            "perfect_quiz",
            "perfect_quiz_streak",
            "xtrem_perfect"
        ].includes(
            badge.condition_type
        );


        if (progressSupported) {
            statusHtml = `
                <div class="badge-progress-text">
                    🔒
                    ${Math.min(
                        progress,
                        target
                    )}
                    /
                    ${target}
                </div>

                <div class="badge-progress-bar">

                    <div
                        style="
                            width:${percentage}%;
                        "
                    ></div>

                </div>
            `;

        } else {
            statusHtml = `
                <div class="badge-gallery-status">
                    🔒 Non obtenu
                </div>
            `;
        }
    }


    return `
        <article
            class="
                badge-gallery-card
                ${badge.obtained ? "" : "badge-locked"}
                ${rarityClass}
            "
        >

            <div class="badge-gallery-icon">
                ${escapeHtml(
                    badge.icon ||
                    "🏅"
                )}
            </div>

            <div
                class="
                    badge-gallery-rarity
                    ${rarityClass}
                "
            >
                ${
                    rarityLabels[
                        badge.rarity
                    ] ||
                    "Commun"
                }
            </div>

            <h3>
                ${escapeHtml(
                    badge.name
                )}
            </h3>

            <p>
                ${escapeHtml(
                    badge.description
                )}
            </p>

            ${statusHtml}

        </article>
    `;
}


/* =========================================================
   XP
========================================================= */

async function addXp(
    amount,
    source = "training",
    sourceId = null
) {
    const profileId =
        localStorage.getItem(
            "profile_id"
        );

    if (!profileId) {
        throw new Error(
            "Profil connecté introuvable."
        );
    }

    const xpAmount =
        Number(amount);

    if (!Number.isFinite(xpAmount)) {
        throw new Error(
            "Montant d'XP invalide."
        );
    }


    const profileResponse =
        await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}&select=xp`,
            {
                headers:
                    supabaseHeaders()
            }
        );

    if (!profileResponse.ok) {
        throw new Error(
            "Erreur récupération XP : " +
            await profileResponse.text()
        );
    }


    const profiles =
        await profileResponse.json();

    if (!profiles.length) {
        throw new Error(
            "Profil introuvable."
        );
    }


    const currentXp =
        Number(
            profiles[0].xp ||
            0
        );

    const newXp =
        currentXp +
        xpAmount;

    const newLevel =
        Math.floor(
            newXp /
            100
        ) +
        1;


    const updateResponse =
        await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
            {
                method:
                    "PATCH",

                headers:
                    supabaseHeaders({
                        "Content-Type":
                            "application/json",

                        Prefer:
                            "return=minimal"
                    }),

                body:
                    JSON.stringify({
                        xp:
                            newXp,

                        level:
                            newLevel
                    })
            }
        );

    if (!updateResponse.ok) {
        throw new Error(
            "Erreur mise à jour XP : " +
            await updateResponse.text()
        );
    }


    const historyResponse =
        await fetch(
            `${SUPABASE_URL}/rest/v1/xp_history`,
            {
                method:
                    "POST",

                headers:
                    supabaseHeaders({
                        "Content-Type":
                            "application/json",

                        Prefer:
                            "return=minimal"
                    }),

                body:
                    JSON.stringify({
                        profile_id:
                            profileId,

                        amount:
                            xpAmount,

                        source:
                            source,

                        source_id:
                            sourceId
                    })
            }
        );

    if (!historyResponse.ok) {
        const errorText =
            await historyResponse.text();

        await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
            {
                method:
                    "PATCH",

                headers:
                    supabaseHeaders({
                        "Content-Type":
                            "application/json",

                        Prefer:
                            "return=minimal"
                    }),

                body:
                    JSON.stringify({
                        xp:
                            currentXp,

                        level:
                            Math.floor(
                                currentXp /
                                100
                            ) +
                            1
                    })
            }
        );

        throw new Error(
            "Erreur historique XP : " +
            errorText
        );
    }


    localStorage.setItem(
        "xp",
        String(newXp)
    );

    localStorage.setItem(
        "level",
        String(newLevel)
    );

    return newXp;
}


/* =========================================================
   ADMIN USERS
========================================================= */

async function loadUsersAdmin() {
    const role =
        localStorage.getItem(
            "role"
        );

    if (role !== "admin") {
        alert(
            "Accès réservé à l'administrateur."
        );

        window.location.href =
            "home.html";

        return;
    }

    const response =
        await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?select=*&order=full_name.asc`,
            {
                headers:
                    supabaseHeaders()
            }
        );

    if (!response.ok) return;

    const users =
        await response.json();

    const container =
        document.getElementById(
            "usersList"
        );

    if (!container) return;

    container.innerHTML = "";

    users.forEach(
        user => {
            container.innerHTML += `
                <div
                    class="card compact-card"
                    onclick="openUserProfile('${user.id}')"
                >

                    <h2>
                        ${escapeHtml(
                            user.full_name ||
                            "Sans nom"
                        )}
                    </h2>

                    <p>
                        ${escapeHtml(
                            user.position ||
                            user.job_title ||
                            "Poste non renseigné"
                        )}
                    </p>

                    <p>
                        <strong>Rôle :</strong>

                        ${escapeHtml(
                            user.role ||
                            ""
                        )}
                    </p>

                </div>
            `;
        }
    );
}


function openUserProfile(
    userId
) {
    localStorage.setItem(
        "selected_user_id",
        userId
    );

    window.location.href =
        "admin-user-detail.html";
}


/* =========================================================
   MON ÉQUIPE
========================================================= */

async function loadMyTeam() {
    const profileId =
        localStorage.getItem(
            "profile_id"
        );

    if (!profileId) {
        window.location.href =
            "index.html";

        return;
    }

    const meResponse =
        await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
            {
                headers:
                    supabaseHeaders()
            }
        );

    if (!meResponse.ok) return;

    const meData =
        await meResponse.json();

    const me =
        meData[0];

    if (
        !me ||
        !me.team_id
    ) {
        const title =
            document.getElementById(
                "teamTitle"
            );

        if (title) {
            title.innerText =
                "Aucune équipe associée.";
        }

        return;
    }


    const teamResponse =
        await fetch(
            `${SUPABASE_URL}/rest/v1/teams?id=eq.${me.team_id}`,
            {
                headers:
                    supabaseHeaders()
            }
        );

    const teamData =
        teamResponse.ok
            ? await teamResponse.json()
            : [];

    const team =
        teamData[0];


    if (
        document.getElementById(
            "teamTitle"
        )
    ) {
        document.getElementById(
            "teamTitle"
        ).innerText =
            team
                ? team.name
                : "Mon équipe";
    }


    const membersResponse =
        await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?team_id=eq.${me.team_id}&order=full_name.asc`,
            {
                headers:
                    supabaseHeaders()
            }
        );

    if (!membersResponse.ok) return;

    const members =
        await membersResponse.json();

    const container =
        document.getElementById(
            "teamMembers"
        );

    if (!container) return;

    container.innerHTML = "";

    members.forEach(
        member => {
            container.innerHTML += `
                <div
                    class="team-member"
                    onclick="openTeamMember('${member.id}')"
                >

                    <strong>
                        ${escapeHtml(
                            member.full_name
                        )}
                    </strong>

                    |

                    ${escapeHtml(
                        member.position ||
                        member.job_title ||
                        ""
                    )}

                    |

                    Niveau
                    ${member.level || 1}

                </div>
            `;
        }
    );
}


function openTeamMember(
    userId
) {
    localStorage.setItem(
        "selected_user_id",
        userId
    );

    window.location.href =
        "admin-user-detail.html";
}


/* =========================================================
   CLASSEMENT SIMPLE
========================================================= */

async function loadRanking() {
    const container =
        document.getElementById(
            "rankingList"
        );

    if (!container) return;

    const response =
        await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?select=*&order=xp.desc`,
            {
                headers:
                    supabaseHeaders()
            }
        );

    if (!response.ok) {
        container.innerHTML =
            "<p>Impossible de charger le classement.</p>";

        return;
    }

    const users =
        await response.json();

    container.innerHTML = "";

    users.forEach(
        (user, index) => {
            container.innerHTML += `
                <div class="card">

                    <h2>
                        #${index + 1}
                        -
                        ${escapeHtml(
                            user.full_name ||
                            "Sans nom"
                        )}
                    </h2>

                    <p>
                        <strong>Poste :</strong>

                        ${escapeHtml(
                            user.position ||
                            user.job_title ||
                            ""
                        )}
                    </p>

                    <p>
                        <strong>Niveau :</strong>
                        ${user.level || 1}
                    </p>

                    <p>
                        <strong>XP :</strong>
                        ${user.xp || 0}
                    </p>

                </div>
            `;
        }
    );
}


/* =========================================================
   PRÉSENCE AUTOMATIQUE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {
        const profileId =
            localStorage.getItem(
                "profile_id"
            );

        if (!profileId) {
            return;
        }

        /*
         * Sur home.html et badges.html,
         * la page lance ses propres fonctions.
         *
         * Sur les autres pages,
         * on maintient simplement la présence.
         */

        if (
            !document.getElementById(
                "onlineCount"
            )
        ) {
            updatePresence(
                profileId
            );

            startPresenceHeartbeat();
        }
    }
);
/* =========================================================
   CRÉATION DE COMPTE
========================================================= */

let registerData = {
    firstName: "",
    lastName: "",
    fullName: "",
    username: "",
    service: "",
    teamId: null,
    role: ""
};

function normalizeRegisterText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
}

function generateUsername(firstName, lastName) {
    const first = normalizeRegisterText(firstName);
    const last = normalizeRegisterText(lastName);

    if (!first || !last) return "";

    return first.charAt(0) + "." + last;
}

function generateTemporaryPassword() {
    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ" +
        "abcdefghijkmnopqrstuvwxyz" +
        "23456789";

    let password = "";

    for (let i = 0; i < 10; i++) {
        password += chars.charAt(
            Math.floor(Math.random() * chars.length)
        );
    }

    return password;
}

function showRegisterStep(stepId) {
    const steps = [
        "registerStep1",
        "existingAccountMessage",
        "registerStep2",
        "registerStep3",
        "registerStep4",
        "registerSuccess",
        "registerPending",
        "registerRequestStillPending",
        "registerRequestRejected",
        "registerRequestApproved"
    ];

    steps.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = id === stepId ? "block" : "none";
        }
    });
}

function showRegisterRequestPending() {
    showRegisterStep("registerRequestStillPending");
}

function showRegisterRequestRejected() {
    showRegisterStep("registerRequestRejected");
}

function showApprovedAccountCredentials(request) {
    const usernameElement = document.getElementById("approvedUsername");
    const passwordElement = document.getElementById("approvedTemporaryPassword");

    if (usernameElement) {
        usernameElement.innerText = request.generated_username || "Indisponible";
    }

    if (passwordElement) {
        passwordElement.innerText = request.temporary_password || "Indisponible";
    }

    showRegisterStep("registerRequestApproved");
}

async function checkRegisterIdentity() {
    const firstNameElement = document.getElementById("registerFirstName");
    const lastNameElement = document.getElementById("registerLastName");

    if (!firstNameElement || !lastNameElement) return;

    const firstName = firstNameElement.value.trim();
    const lastName = lastNameElement.value.trim();

    if (!firstName || !lastName) {
        alert("Merci de renseigner ton prénom et ton nom.");
        return;
    }

    const fullName = `${firstName} ${lastName}`;
    const username = generateUsername(firstName, lastName);

    if (!username) {
        alert("Impossible de générer l'identifiant.");
        return;
    }

    try {
        const requestResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/account_requests?select=*&first_name=ilike.${encodeURIComponent(firstName)}&last_name=ilike.${encodeURIComponent(lastName)}&order=created_at.desc&limit=1`,
            { headers: supabaseHeaders() }
        );

        if (!requestResponse.ok) {
            throw new Error(await requestResponse.text());
        }

        const previousRequests = await requestResponse.json();

        if (previousRequests.length > 0) {
            const previousRequest = previousRequests[0];

            if (previousRequest.status === "pending") {
                showRegisterRequestPending();
                return;
            }

            if (previousRequest.status === "rejected") {
                showRegisterRequestRejected();
                return;
            }

            if (previousRequest.status === "approved") {
                showApprovedAccountCredentials(previousRequest);
                return;
            }
        }

        const nameResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?select=id,full_name,username&full_name=ilike.${encodeURIComponent(fullName)}`,
            { headers: supabaseHeaders() }
        );

        if (!nameResponse.ok) {
            throw new Error(await nameResponse.text());
        }

        const nameMatches = await nameResponse.json();

        const usernameResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?select=id,full_name,username&username=eq.${encodeURIComponent(username)}`,
            { headers: supabaseHeaders() }
        );

        if (!usernameResponse.ok) {
            throw new Error(await usernameResponse.text());
        }

        const usernameMatches = await usernameResponse.json();

        if (nameMatches.length > 0 || usernameMatches.length > 0) {
            showRegisterStep("existingAccountMessage");
            return;
        }

        registerData.firstName = firstName;
        registerData.lastName = lastName;
        registerData.fullName = fullName;
        registerData.username = username;
        registerData.service = "";
        registerData.teamId = null;
        registerData.role = "";

        showRegisterStep("registerStep2");

    } catch (error) {
        console.error("Erreur vérification compte :", error);
        alert("Impossible de vérifier l'existence du compte.\n\n" + error.message);
    }
}

function selectRegisterService(service, button) {
    registerData.service = service;
    registerData.teamId = null;
    registerData.role = "";

    document
        .querySelectorAll("#registerStep2 .register-choice")
        .forEach(element => element.classList.remove("selected"));

    if (button) button.classList.add("selected");
}

async function continueAfterService() {
    if (!registerData.service) {
        alert("Merci de choisir ton service.");
        return;
    }

    await loadRegisterTeams(registerData.service);
    showRegisterStep("registerStep3");
}

async function loadRegisterTeams(service) {
    const container = document.getElementById("registerTeams");
    if (!container) return;

    container.innerHTML = "Chargement...";

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/teams?select=id,name&service=eq.${encodeURIComponent(service)}&order=name.asc`,
            { headers: supabaseHeaders() }
        );

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const teams = await response.json();

        if (!teams.length) {
            container.innerHTML = `<p>Aucune équipe disponible pour ce service.</p>`;
            return;
        }

        container.innerHTML = teams
            .map(team => `
                <button
                    type="button"
                    class="register-choice"
                    onclick="selectRegisterTeam('${team.id}', this)"
                >
                    👥
                    <strong>${escapeHtml(team.name)}</strong>
                </button>
            `)
            .join("");

    } catch (error) {
        console.error("Erreur chargement équipes :", error);
        container.innerHTML = `<p>Impossible de charger les équipes.</p>`;
    }
}

function selectRegisterTeam(teamId, button) {
    registerData.teamId = teamId;

    document
        .querySelectorAll("#registerTeams .register-choice")
        .forEach(element => element.classList.remove("selected"));

    if (button) button.classList.add("selected");
}

function continueAfterTeam() {
    if (!registerData.teamId) {
        alert("Merci de choisir ton équipe.");
        return;
    }

    showRegisterStep("registerStep4");
}

function selectRegisterRole(role, button) {
    registerData.role = role;

    document
        .querySelectorAll("#registerStep4 .register-choice")
        .forEach(element => element.classList.remove("selected"));

    if (button) button.classList.add("selected");
}

async function finishAccountRegistration() {
    if (!registerData.role) {
        alert("Merci de choisir ton rôle.");
        return;
    }

    const sensitiveRoles = [
        "Chef d'équipe",
        "Manager",
        "Direction"
    ];

    if (sensitiveRoles.includes(registerData.role)) {
        await createAccountApprovalRequest();
        return;
    }

    await createImmediateAccount();
}

async function createImmediateAccount() {
    const temporaryPassword = generateTemporaryPassword();

    try {
        const duplicateResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?select=id,full_name,username&username=eq.${encodeURIComponent(registerData.username)}`,
            { headers: supabaseHeaders() }
        );

        if (!duplicateResponse.ok) {
            throw new Error(await duplicateResponse.text());
        }

        const duplicates = await duplicateResponse.json();

        if (duplicates.length > 0) {
            showRegisterStep("existingAccountMessage");
            return;
        }

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles`,
            {
                method: "POST",
                headers: supabaseHeaders({
                    "Content-Type": "application/json",
                    Prefer: "return=minimal"
                }),
                body: JSON.stringify({
                    first_name: registerData.firstName,
                    last_name: registerData.lastName,
                    full_name: registerData.fullName,
                    username: registerData.username,
                    password: temporaryPassword,
                    service: registerData.service,
                    team_id: registerData.teamId,
                    role: "user",
                    position: registerData.role,
                    account_status: "active",
                    must_change_password: true,
                    xp: 0,
                    level: 1
                })
            }
        );

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const usernameElement = document.getElementById("generatedUsername");
        const passwordElement = document.getElementById("generatedPassword");

        if (usernameElement) {
            usernameElement.innerText = registerData.username;
        }

        if (passwordElement) {
            passwordElement.innerText = temporaryPassword;
        }

        showRegisterStep("registerSuccess");

    } catch (error) {
        console.error("Erreur création compte :", error);
        alert("Impossible de créer le compte :\n\n" + error.message);
    }
}

async function createAccountApprovalRequest() {
    try {
        const existingRequestResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/account_requests?select=id,status&first_name=ilike.${encodeURIComponent(registerData.firstName)}&last_name=ilike.${encodeURIComponent(registerData.lastName)}&status=eq.pending&limit=1`,
            { headers: supabaseHeaders() }
        );

        if (!existingRequestResponse.ok) {
            throw new Error(await existingRequestResponse.text());
        }

        const existingRequests = await existingRequestResponse.json();

        if (existingRequests.length > 0) {
            showRegisterRequestPending();
            return;
        }

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/account_requests`,
            {
                method: "POST",
                headers: supabaseHeaders({
                    "Content-Type": "application/json",
                    Prefer: "return=minimal"
                }),
                body: JSON.stringify({
                    first_name: registerData.firstName,
                    last_name: registerData.lastName,
                    full_name: registerData.fullName,
                    service: registerData.service,
                    team_id: String(registerData.teamId),
                    requested_role: registerData.role,
                    status: "pending"
                })
            }
        );

        if (!response.ok) {
            throw new Error(await response.text());
        }

        showRegisterStep("registerPending");

    } catch (error) {
        console.error("Erreur demande compte :", error);
        alert("Impossible d'envoyer la demande :\n\n" + error.message);
    }
}

function resetRegisterForm() {
    registerData = {
        firstName: "",
        lastName: "",
        fullName: "",
        username: "",
        service: "",
        teamId: null,
        role: ""
    };

    const firstNameElement = document.getElementById("registerFirstName");
    const lastNameElement = document.getElementById("registerLastName");

    if (firstNameElement) firstNameElement.value = "";
    if (lastNameElement) lastNameElement.value = "";

    document
        .querySelectorAll(".register-choice")
        .forEach(element => element.classList.remove("selected"));

    showRegisterStep("registerStep1");
}

/* =========================================================
   APPROBATIONS ADMIN
========================================================= */

function requireAdmin() {
    const role = String(
        localStorage.getItem("role") || ""
    ).toLowerCase();

    if (role !== "admin") {
        alert("Cette page est réservée à l'administrateur.");
        window.location.href = "home.html";
        return false;
    }

    return true;
}

async function loadApprovalsPage() {
    if (!requireAdmin()) return;

    const name =
        localStorage.getItem("full_name") ||
        "Administrateur";

    const topName = document.getElementById("topUserName");

    if (topName) topName.innerText = name;

    await loadAccountApprovals();
}

function showApprovalSection(type) {
    const accounts = document.getElementById("accountApprovalsSection");
    const challenges = document.getElementById("challengeApprovalsSection");

    if (accounts) {
        accounts.style.display = type === "accounts" ? "block" : "none";
    }

    if (challenges) {
        challenges.style.display = type === "challenges" ? "block" : "none";
    }
}

async function loadAccountApprovals() {
    const container = document.getElementById("accountApprovalsList");
    if (!container) return;

    container.innerHTML = "Chargement...";

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/account_requests?status=eq.pending&select=*&order=created_at.asc`,
            { headers: supabaseHeaders() }
        );

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const requests = await response.json();
        const counter = document.getElementById("accountApprovalCount");

        if (counter) counter.innerText = requests.length;

        if (!requests.length) {
            container.innerHTML = `
                <div class="approval-empty">
                    ✅ Aucune demande en attente.
                </div>
            `;
            return;
        }

        const teamsResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/teams?select=id,name`,
            { headers: supabaseHeaders() }
        );

        const teams = teamsResponse.ok
            ? await teamsResponse.json()
            : [];

        const teamNames = {};

        teams.forEach(team => {
            teamNames[String(team.id)] = team.name;
        });

        container.innerHTML = requests
            .map(request => {
                const teamName =
                    teamNames[String(request.team_id)] ||
                    "Non renseignée";

                return `
                    <div class="approval-request-card">

                        <div class="approval-request-info">
                            <h3>${escapeHtml(request.full_name)}</h3>

                            <p>
                                <strong>Service :</strong>
                                ${escapeHtml(request.service)}
                            </p>

                            <p>
                                <strong>Équipe :</strong>
                                ${escapeHtml(teamName)}
                            </p>

                            <p>
                                <strong>Rôle demandé :</strong>
                                ${escapeHtml(request.requested_role)}
                            </p>
                        </div>

                        <div class="approval-request-actions">
                            <button
                                type="button"
                                class="approval-accept"
                                onclick="approveAccountRequest('${request.id}')"
                            >
                                ✓ Accepter
                            </button>

                            <button
                                type="button"
                                class="approval-reject"
                                onclick="rejectAccountRequest('${request.id}')"
                            >
                                ✕ Refuser
                            </button>
                        </div>

                    </div>
                `;
            })
            .join("");

    } catch (error) {
        console.error("Erreur chargement approbations :", error);

        container.innerHTML = `
            <div class="approval-empty">
                Impossible de charger les demandes.
            </div>
        `;
    }
}

async function approveAccountRequest(requestId) {
    if (!requireAdmin()) return;

    const confirmation = confirm(
        "Confirmer la création de ce compte ?"
    );

    if (!confirmation) return;

    try {
        const requestResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/account_requests?id=eq.${encodeURIComponent(requestId)}&status=eq.pending&select=*`,
            { headers: supabaseHeaders() }
        );

        if (!requestResponse.ok) {
            throw new Error(await requestResponse.text());
        }

        const requests = await requestResponse.json();

        if (!requests.length) {
            alert("Cette demande n'existe plus ou a déjà été traitée.");
            await loadAccountApprovals();
            return;
        }

        const request = requests[0];
        const username = generateUsername(
            request.first_name,
            request.last_name
        );

        if (!username) {
            throw new Error("Impossible de générer l'identifiant.");
        }

        const duplicateResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?select=id&username=eq.${encodeURIComponent(username)}`,
            { headers: supabaseHeaders() }
        );

        if (!duplicateResponse.ok) {
            throw new Error(await duplicateResponse.text());
        }

        const duplicates = await duplicateResponse.json();

        if (duplicates.length > 0) {
            alert(
                "Impossible de créer le compte : cet utilisateur possède déjà un compte."
            );
            return;
        }

        const temporaryPassword = generateTemporaryPassword();

        const roleMap = {
            "Chef d'équipe": "chef_equipe",
            "Manager": "manager",
            "Direction": "direction"
        };

        const technicalRole =
            roleMap[request.requested_role] ||
            "user";

        const createResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles`,
            {
                method: "POST",
                headers: supabaseHeaders({
                    "Content-Type": "application/json",
                    Prefer: "return=minimal"
                }),
                body: JSON.stringify({
                    first_name: request.first_name,
                    last_name: request.last_name,
                    full_name: request.full_name,
                    username: username,
                    password: temporaryPassword,
                    service: request.service,
                    team_id: request.team_id,
                    role: technicalRole,
                    position: request.requested_role,
                    account_status: "active",
                    must_change_password: true,
                    xp: 0,
                    level: 1
                })
            }
        );

        if (!createResponse.ok) {
            throw new Error(await createResponse.text());
        }

        const updateRequestResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/account_requests?id=eq.${encodeURIComponent(requestId)}`,
            {
                method: "PATCH",
                headers: supabaseHeaders({
                    "Content-Type": "application/json",
                    Prefer: "return=minimal"
                }),
                body: JSON.stringify({
                    status: "approved",
                    generated_username: username,
                    temporary_password: temporaryPassword,
                    credentials_retrieved: false,
                    processed_at: new Date().toISOString()
                })
            }
        );

        if (!updateRequestResponse.ok) {
            throw new Error(await updateRequestResponse.text());
        }

        alert(
            "Compte approuvé ✅\n\n" +
            "Le collaborateur pourra maintenant revenir dans « Créer mon compte » et renseigner son prénom et son nom pour récupérer ses identifiants."
        );

        await loadAccountApprovals();

    } catch (error) {
        console.error("Erreur approbation compte :", error);

        alert(
            "Impossible d'approuver cette demande.\n\n" +
            error.message
        );
    }
}

async function rejectAccountRequest(requestId) {
    if (!requireAdmin()) return;

    const confirmation = confirm(
        "Confirmer le refus de cette demande de création de compte ?"
    );

    if (!confirmation) return;

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/account_requests?id=eq.${encodeURIComponent(requestId)}`,
            {
                method: "PATCH",
                headers: supabaseHeaders({
                    "Content-Type": "application/json",
                    Prefer: "return=minimal"
                }),
                body: JSON.stringify({
                    status: "rejected",
                    processed_at: new Date().toISOString()
                })
            }
        );

        if (!response.ok) {
            throw new Error(await response.text());
        }

        alert(
            "Demande refusée ❌\n\n" +
            "Lorsque le collaborateur reviendra dans « Créer mon compte » avec son prénom et son nom, Nickel Master lui indiquera que sa demande a été refusée."
        );

        await loadAccountApprovals();

    } catch (error) {
        console.error("Erreur refus demande :", error);

        alert(
            "Impossible de refuser cette demande.\n\n" +
            error.message
        );
    }
}

function updateAdminNavigation() {
    const role = String(
        localStorage.getItem("role") || ""
    ).toLowerCase();

    const button = document.getElementById(
        "adminApprovalsButton"
    );

    if (!button) return;

    button.style.display = role === "admin" ? "" : "none";
}
/* =========================================================
   MES FORMATIONS
========================================================= */

async function loadMyTrainings() {

    const container =
        document.getElementById(
            "myTrainingsList"
        );

    if (!container) {
        return;
    }

    container.innerHTML =
        "Chargement...";


    try {

        const userId =
            localStorage.getItem(
                "profile_id"
            );

        if (!userId) {

            container.innerHTML = `
                <div class="training-empty">
                    Impossible d'identifier ton compte.
                </div>
            `;

            return;
        }


        /* =========================
           1. TOUTES LES FORMATIONS
        ========================= */

        const trainingsResponse =
            await fetch(
                `${SUPABASE_URL}/rest/v1/trainings?select=id,name&order=name.asc`,
                {
                    headers:
                        supabaseHeaders()
                }
            );


        if (!trainingsResponse.ok) {

            throw new Error(
                await trainingsResponse.text()
            );
        }


        const trainings =
            await trainingsResponse.json();


        /* =========================
           2. FORMATIONS UTILISATEUR
        ========================= */

        const userTrainingsResponse =
            await fetch(
                `${SUPABASE_URL}/rest/v1/user_trainings?select=training_id&user_id=eq.${encodeURIComponent(userId)}`,
                {
                    headers:
                        supabaseHeaders()
                }
            );


        if (!userTrainingsResponse.ok) {

            throw new Error(
                await userTrainingsResponse.text()
            );
        }


        const userTrainings =
            await userTrainingsResponse.json();


        const trainedIds =
            new Set(
                userTrainings.map(
                    item =>
                        String(
                            item.training_id
                        )
                )
            );


        /* =========================
           3. AUCUNE FORMATION
        ========================= */

        if (!trainings.length) {

            container.innerHTML = `
                <div class="training-empty">
                    Aucune formation disponible.
                </div>
            `;

            return;
        }


        /* =========================
           4. AFFICHAGE
        ========================= */

        container.innerHTML =
            trainings
                .map(
                    training => {

                        const isTrained =
                            trainedIds.has(
                                String(
                                    training.id
                                )
                            );


                        return `
                            <div
                                class="
                                    training-card
                                    ${isTrained
                                        ? "training-card-active"
                                        : "training-card-inactive"
                                    }
                                "
                            >

                                <div class="training-card-icon">

                                    ${
                                        isTrained
                                            ? "✅"
                                            : "🔒"
                                    }

                                </div>


                                <div class="training-card-content">

                                    <h3>
                                        ${escapeHtml(
                                            training.name
                                        )}
                                    </h3>

                                    <p>
                                        ${
                                            isTrained
                                                ? "Formation acquise"
                                                : "Non formé"
                                        }
                                    </p>

                                </div>

                            </div>
                        `;
                    }
                )
                .join("");


    } catch (error) {

        console.error(
            "Erreur chargement formations :",
            error
        );


        container.innerHTML = `
            <div class="training-empty">
                Impossible de charger les formations.
            </div>
        `;
    }
}
/* =========================================================
   MON ÉQUIPE - GESTION DES FORMATIONS
========================================================= */

let teamTrainingState = {
    currentProfile: null,
    teamName: "",
    trainings: [],
    members: [],
    selectedTrainingId: null,
    originalAssignedIds: new Set(),
    currentAssignedIds: new Set()
};


/* =========================================================
   CHARGEMENT PAGE
========================================================= */

async function loadTeamSettingsPage() {

    const profileId =
        localStorage.getItem(
            "profile_id"
        );

    if (!profileId) {
        alert(
            "Impossible d'identifier ton compte."
        );

        window.location.href =
            "settings.html";

        return;
    }


    try {

        /* =========================
           1. PROFIL CONNECTÉ
        ========================= */

        const profileResponse =
            await fetch(
                `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(profileId)}&select=id,full_name,role,team,job_title,status`,
                {
                    headers:
                        supabaseHeaders()
                }
            );


        if (!profileResponse.ok) {
            throw new Error(
                await profileResponse.text()
            );
        }


        const profiles =
            await profileResponse.json();


        if (!profiles.length) {
            throw new Error(
                "Profil introuvable."
            );
        }


        const currentProfile =
            profiles[0];


        teamTrainingState.currentProfile =
            currentProfile;


        const role =
            String(
                currentProfile.role || ""
            ).toLowerCase();


        const allowedRoles = [
            "team_leader",
            "manager",
            "admin"
        ];


        if (
            !allowedRoles.includes(
                role
            )
        ) {

            alert(
                "Tu n'as pas accès à cette page."
            );

            window.location.href =
                "settings.html";

            return;
        }


        /* =========================
           2. INFOS EN-TÊTE
        ========================= */

        const userName =
            document.getElementById(
                "topUserName"
            );


        if (userName) {
            userName.innerText =
                currentProfile.full_name ||
                "Utilisateur";
        }


        const userRole =
            document.getElementById(
                "teamSettingsUserRole"
            );


        if (userRole) {

            userRole.innerText =
                currentProfile.job_title ||
                currentProfile.role ||
                "";
        }


        const initials =
            document.getElementById(
                "teamSettingsUserInitials"
            );


        if (initials) {

            initials.innerText =
                getInitials(
                    currentProfile.full_name
                );
        }


        /* =========================
           3. ÉQUIPE
        ========================= */

        let teamName =
            currentProfile.team || "";


        /*
         * Pour un chef d'équipe :
         * obligation d'avoir une équipe.
         */

        if (
            role === "team_leader" &&
            !teamName
        ) {

            throw new Error(
                "Aucune équipe n'est associée à ce chef d'équipe."
            );
        }


        teamTrainingState.teamName =
            teamName;


        const teamNameElement =
            document.getElementById(
                "teamSettingsTeamName"
            );


        if (teamNameElement) {

            teamNameElement.innerText =
                teamName
                    ? teamName
                    : "Toutes les équipes";
        }


        /* =========================
           4. FORMATIONS
        ========================= */

        await loadTeamTrainings();


        /* =========================
           5. MEMBRES
        ========================= */

        await loadTeamMembers();


        /* =========================
           6. PREMIÈRE FORMATION
        ========================= */

        if (
            teamTrainingState.trainings.length
        ) {

            const select =
                document.getElementById(
                    "teamTrainingSelect"
                );


            if (select) {

                select.value =
                    String(
                        teamTrainingState
                            .trainings[0]
                            .id
                    );
            }


            await loadSelectedTeamTraining();
        }


    } catch (error) {

        console.error(
            "Erreur chargement Mon équipe :",
            error
        );


        alert(
            "Impossible de charger la gestion de l'équipe.\n\n" +
            error.message
        );
    }
}


/* =========================================================
   INITIALES
========================================================= */

function getInitials(
    fullName
) {

    const parts =
        String(
            fullName || ""
        )
        .trim()
        .split(/\s+/)
        .filter(Boolean);


    if (!parts.length) {
        return "NM";
    }


    if (parts.length === 1) {

        return parts[0]
            .slice(0, 2)
            .toUpperCase();
    }


    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();
}


/* =========================================================
   CHARGER LES FORMATIONS
========================================================= */

async function loadTeamTrainings() {

    const response =
        await fetch(
            `${SUPABASE_URL}/rest/v1/trainings?select=id,name&order=name.asc`,
            {
                headers:
                    supabaseHeaders()
            }
        );


    if (!response.ok) {
        throw new Error(
            await response.text()
        );
    }


    const trainings =
        await response.json();


    teamTrainingState.trainings =
        trainings;


    const select =
        document.getElementById(
            "teamTrainingSelect"
        );


    if (!select) {
        return;
    }


    if (!trainings.length) {

        select.innerHTML = `
            <option value="">
                Aucune formation disponible
            </option>
        `;

        return;
    }


    select.innerHTML =
        trainings
            .map(
                training => `
                    <option
                        value="${training.id}"
                    >
                        ${escapeHtml(
                            training.name
                        )}
                    </option>
                `
            )
            .join("");
}


/* =========================================================
   CHARGER LES MEMBRES DE L'ÉQUIPE
========================================================= */

async function loadTeamMembers() {

    const currentProfile =
        teamTrainingState.currentProfile;


    if (!currentProfile) {
        return;
    }


    const role =
        String(
            currentProfile.role || ""
        ).toLowerCase();


    let url =
        `${SUPABASE_URL}/rest/v1/profiles?select=id,full_name,role,team,job_title,status&status=eq.actif&order=full_name.asc`;


    /*
     * Chef d'équipe :
     * uniquement sa propre équipe.
     */

    if (
        role === "team_leader"
    ) {

        url +=
            `&team=eq.${encodeURIComponent(
                teamTrainingState.teamName
            )}`;
    }


    /*
     * Manager :
     * pour l'instant, s'il possède une équipe,
     * on limite à cette équipe.
     */

    if (
        role === "manager" &&
        teamTrainingState.teamName
    ) {

        url +=
            `&team=eq.${encodeURIComponent(
                teamTrainingState.teamName
            )}`;
    }


    /*
     * Admin :
     * aucune restriction.
     */


    const response =
        await fetch(
            url,
            {
                headers:
                    supabaseHeaders()
            }
        );


    if (!response.ok) {
        throw new Error(
            await response.text()
        );
    }


    const members =
        await response.json();


    /*
     * On ne veut pas afficher
     * certains profils techniques.
     */

    teamTrainingState.members =
    members
        .filter(
            member => {

                const memberRole =
                    String(
                        member.role || ""
                    ).toLowerCase();


                /*
                 * On retire :
                 * - le profil connecté lui-même
                 * - admin
                 * - direction
                 * - manager
                 * - autres chefs d'équipe
                 */

                return (
                    String(member.id) !==
                        String(
                            currentProfile.id
                        ) &&

                    memberRole !== "admin" &&
                    memberRole !== "direction" &&
                    memberRole !== "manager" &&
                    memberRole !== "team_leader"
                );
            }
        )
        .sort(
            (a, b) => {

                /*
                 * Ordre hiérarchique :
                 *
                 * 1 = Conseiller Senior
                 * 2 = Conseiller
                 */

                const hierarchy = {
                    senior: 1,
                    user: 2
                };


                const roleA =
                    String(
                        a.role || ""
                    ).toLowerCase();


                const roleB =
                    String(
                        b.role || ""
                    ).toLowerCase();


                const rankA =
                    hierarchy[roleA] || 99;


                const rankB =
                    hierarchy[roleB] || 99;


                /*
                 * D'abord la hiérarchie.
                 */

                if (rankA !== rankB) {
                    return rankA - rankB;
                }


                /*
                 * Puis ordre alphabétique
                 * dans chaque niveau.
                 */

                return String(
                    a.full_name || ""
                ).localeCompare(
                    String(
                        b.full_name || ""
                    ),
                    "fr",
                    {
                        sensitivity: "base"
                    }
                );
            }
        );

}


/* =========================================================
   CHARGER UNE FORMATION SÉLECTIONNÉE
========================================================= */

async function loadSelectedTeamTraining() {

    const select =
        document.getElementById(
            "teamTrainingSelect"
        );


    if (!select) {
        return;
    }


    const trainingId =
        select.value;


    if (!trainingId) {
        return;
    }


    teamTrainingState.selectedTrainingId =
        String(
            trainingId
        );


    const training =
        teamTrainingState.trainings.find(
            item =>
                String(item.id) ===
                String(trainingId)
        );


    /* =========================
       NOM FORMATION
    ========================= */

    const summaryName =
        document.getElementById(
            "teamTrainingSummaryName"
        );


    if (summaryName) {

        summaryName.innerText =
            training
                ? training.name
                : "—";
    }


    /* =========================
       DESCRIPTION
    ========================= */

    const description =
        document.getElementById(
            "teamTrainingDescription"
        );


    if (description) {

        description.innerText =
            training
                ? `Formation : ${training.name}`
                : "Sélectionne une formation.";
    }


    /* =========================
       ATTRIBUTIONS EXISTANTES
    ========================= */

    const assignmentsResponse =
        await fetch(
            `${SUPABASE_URL}/rest/v1/user_trainings?select=user_id&training_id=eq.${encodeURIComponent(trainingId)}`,
            {
                headers:
                    supabaseHeaders()
            }
        );


    if (!assignmentsResponse.ok) {

        throw new Error(
            await assignmentsResponse.text()
        );
    }


    const assignments =
        await assignmentsResponse.json();


    const assignedIds =
        new Set(
            assignments.map(
                item =>
                    String(
                        item.user_id
                    )
            )
        );


    teamTrainingState.originalAssignedIds =
        new Set(
            assignedIds
        );


    teamTrainingState.currentAssignedIds =
        new Set(
            assignedIds
        );


    renderTeamTrainingMembers();
}


/* =========================================================
   AFFICHER LES MEMBRES
========================================================= */

function renderTeamTrainingMembers() {

    const container =
        document.getElementById(
            "teamTrainingMembers"
        );


    if (!container) {
        return;
    }


    const members =
        teamTrainingState.members;


    if (!members.length) {

        container.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="team-training-loading">
                        Aucun membre disponible.
                    </div>
                </td>
            </tr>
        `;

        updateTeamTrainingSummary();

        return;
    }


    container.innerHTML =
        members
            .map(
                member => {

                    const memberId =
                        String(
                            member.id
                        );


                    const isAssigned =
                        teamTrainingState
                            .currentAssignedIds
                            .has(
                                memberId
                            );


                    return `
                        <tr>

                            <td class="team-training-check-column">

                                <input
                                    type="checkbox"
                                    class="team-training-member-checkbox"
                                    data-user-id="${memberId}"
                                    ${isAssigned
                                        ? "checked"
                                        : ""
                                    }
                                    onchange="toggleTeamTrainingMember(
                                        '${memberId}',
                                        this.checked
                                    )"
                                >

                            </td>


                            <td>

                                <div class="team-training-member">

                                    <div class="team-training-member-avatar">
                                        ${escapeHtml(
                                            getInitials(
                                                member.full_name
                                            )
                                        )}
                                    </div>

                                    <strong>
                                        ${escapeHtml(
                                            member.full_name ||
                                            "Utilisateur"
                                        )}
                                    </strong>

                                </div>

                            </td>


                            <td>

                                ${escapeHtml(
                                    member.job_title ||
                                    member.role ||
                                    ""
                                )}

                            </td>


                            <td>

                                ${
                                    isAssigned
                                        ? `
                                            <span class="team-training-status team-training-status-trained">
                                                ✓ Formé
                                            </span>
                                        `
                                        : `
                                            <span class="team-training-status team-training-status-untrained">
                                                🔒 Non formé
                                            </span>
                                        `
                                }

                            </td>

                        </tr>
                    `;
                }
            )
            .join("");


    updateTeamTrainingSummary();
}


/* =========================================================
   COCHER / DÉCOCHER UN MEMBRE
========================================================= */

function toggleTeamTrainingMember(
    userId,
    checked
) {

    const id =
        String(
            userId
        );


    if (checked) {

        teamTrainingState
            .currentAssignedIds
            .add(
                id
            );

    } else {

        teamTrainingState
            .currentAssignedIds
            .delete(
                id
            );
    }


    renderTeamTrainingMembers();
}


/* =========================================================
   TOUT COCHER / DÉCOCHER
========================================================= */

function toggleAllTeamTrainingMembers(
    checked
) {

    teamTrainingState.members.forEach(
        member => {

            const id =
                String(
                    member.id
                );


            if (checked) {

                teamTrainingState
                    .currentAssignedIds
                    .add(
                        id
                    );

            } else {

                teamTrainingState
                    .currentAssignedIds
                    .delete(
                        id
                    );
            }
        }
    );


    renderTeamTrainingMembers();
}


/* =========================================================
   RÉCAPITULATIF
========================================================= */

function updateTeamTrainingSummary() {

    const total =
        teamTrainingState.members.length;


    const trained =
        teamTrainingState.members.filter(
            member =>
                teamTrainingState
                    .currentAssignedIds
                    .has(
                        String(
                            member.id
                        )
                    )
        ).length;


    const notTrained =
        total - trained;


    const trainedElement =
        document.getElementById(
            "teamTrainingSummaryTrained"
        );


    const notTrainedElement =
        document.getElementById(
            "teamTrainingSummaryNotTrained"
        );


    const selectedElement =
        document.getElementById(
            "teamTrainingSelectedCount"
        );


    if (trainedElement) {

        trainedElement.innerText =
            `${trained} / ${total}`;
    }


    if (notTrainedElement) {

        notTrainedElement.innerText =
            `${notTrained} / ${total}`;
    }


    if (selectedElement) {

        selectedElement.innerText =
            trained <= 1
                ? `${trained} sélectionné`
                : `${trained} sélectionnés`;
    }


    const checkAll =
        document.getElementById(
            "teamTrainingCheckAll"
        );


    if (checkAll) {

        checkAll.checked =
            total > 0 &&
            trained === total;
    }
}


/* =========================================================
   ANNULER LES MODIFICATIONS
========================================================= */

function resetTeamTrainingChanges() {

    teamTrainingState.currentAssignedIds =
        new Set(
            teamTrainingState.originalAssignedIds
        );


    renderTeamTrainingMembers();
}


/* =========================================================
   ENREGISTRER
========================================================= */

async function saveTeamTrainingAssignments() {

    const trainingId =
        teamTrainingState.selectedTrainingId;


    if (!trainingId) {

        alert(
            "Merci de sélectionner une formation."
        );

        return;
    }


    const button =
        document.getElementById(
            "saveTeamTrainingButton"
        );


    if (button) {

        button.disabled =
            true;

        button.innerText =
            "Enregistrement...";
    }


    try {

        const original =
            teamTrainingState
                .originalAssignedIds;


        const current =
            teamTrainingState
                .currentAssignedIds;


        /* =========================
           À AJOUTER
        ========================= */

        const toAdd =
            [...current]
                .filter(
                    id =>
                        !original.has(
                            id
                        )
                );


        /* =========================
           À SUPPRIMER
        ========================= */

        const toRemove =
            [...original]
                .filter(
                    id =>
                        !current.has(
                            id
                        )
                );


        /* =========================
           AJOUTS
        ========================= */

        for (
            const userId
            of toAdd
        ) {

            const response =
                await fetch(
                    `${SUPABASE_URL}/rest/v1/user_trainings`,
                    {
                        method:
                            "POST",

                        headers:
                            supabaseHeaders({
                                "Content-Type":
                                    "application/json",

                                "Prefer":
                                    "return=minimal"
                            }),

                        body:
                            JSON.stringify({
                                user_id:
                                    userId,

                                training_id:
                                    Number(
                                        trainingId
                                    )
                            })
                    }
                );


            if (!response.ok) {

                throw new Error(
                    await response.text()
                );
            }
        }


        /* =========================
           SUPPRESSIONS
        ========================= */

        for (
            const userId
            of toRemove
        ) {

            const response =
                await fetch(
                    `${SUPABASE_URL}/rest/v1/user_trainings?user_id=eq.${encodeURIComponent(userId)}&training_id=eq.${encodeURIComponent(trainingId)}`,
                    {
                        method:
                            "DELETE",

                        headers:
                            supabaseHeaders({
                                "Prefer":
                                    "return=minimal"
                            })
                    }
                );


            if (!response.ok) {

                throw new Error(
                    await response.text()
                );
            }
        }


        /* =========================
           ACTUALISER ÉTAT
        ========================= */

        teamTrainingState.originalAssignedIds =
            new Set(
                current
            );


        alert(
            "Les formations ont bien été mises à jour ✅"
        );


        await loadSelectedTeamTraining();


    } catch (error) {

        console.error(
            "Erreur enregistrement formations :",
            error
        );


        alert(
            "Impossible d'enregistrer les modifications.\n\n" +
            error.message
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.innerText =
                "💾 Enregistrer les modifications";
        }
    }
}
/* =========================================================
   ADMIN - GESTION CRÉATION QUESTIONS
========================================================= */

let questionAdminState = {

    categories: [],

    bulkQuestions: [],

    currentBulkIndex: 0
};


/* =========================================================
   INITIALISATION
========================================================= */

async function initializeQuestionAdmin() {

    await loadQuestionAdminCategories();

    setupQuestionAdminEvents();

    renderQuestionAnswerFields();

    await updateQuestionAutomaticData();

    updateQuestionPreview();
}


/* =========================================================
   ÉVÉNEMENTS
========================================================= */

function setupQuestionAdminEvents() {

    const singleButton =
        document.getElementById(
            "singleQuestionModeButton"
        );

    const bulkButton =
        document.getElementById(
            "bulkQuestionModeButton"
        );


    if (singleButton) {

        singleButton.addEventListener(
            "click",
            function () {

                showQuestionAdminMode(
                    "single"
                );
            }
        );
    }


    if (bulkButton) {

        bulkButton.addEventListener(
            "click",
            function () {

                showQuestionAdminMode(
                    "bulk"
                );
            }
        );
    }


    const type =
        document.getElementById(
            "questionType"
        );


    if (type) {

        type.addEventListener(
            "change",
            async function () {

                renderQuestionAnswerFields();

                await updateQuestionAutomaticData();

                updateQuestionPreview();
            }
        );
    }


    const category =
        document.getElementById(
            "questionCategory"
        );


    if (category) {

        category.addEventListener(
            "change",
            async function () {

                await updateQuestionAutomaticData();

                updateQuestionPreview();
            }
        );
    }


    const question =
        document.getElementById(
            "questionText"
        );


    if (question) {

        question.addEventListener(
            "input",
            function () {

                updateQuestionPreview();
            }
        );
    }


    const saveButton =
        document.getElementById(
            "saveQuestionButton"
        );


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveAdminQuestion
        );
    }


    const resetButton =
        document.getElementById(
            "resetQuestionButton"
        );


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetAdminQuestionForm
        );
    }


    const createCategory =
        document.getElementById(
            "createCategoryButton"
        );


    if (createCategory) {

        createCategory.addEventListener(
            "click",
            createQuestionAdminCategory
        );
    }


    const analyseBulk =
        document.getElementById(
            "analyseBulkQuestionsButton"
        );


    if (analyseBulk) {

        analyseBulk.addEventListener(
            "click",
            analyseBulkQuestions
        );
    }


    const previous =
        document.getElementById(
            "previousBulkQuestionButton"
        );


    if (previous) {

        previous.addEventListener(
            "click",
            function () {

                changeBulkQuestion(
                    -1
                );
            }
        );
    }


    const next =
        document.getElementById(
            "nextBulkQuestionButton"
        );


    if (next) {

        next.addEventListener(
            "click",
            function () {

                changeBulkQuestion(
                    1
                );
            }
        );
    }


    const importButton =
        document.getElementById(
            "importBulkQuestionsButton"
        );


    if (importButton) {

        importButton.addEventListener(
            "click",
            importBulkQuestions
        );
    }
}


/* =========================================================
   MODE SIMPLE / BLOC
========================================================= */

function showQuestionAdminMode(
    mode
) {

    const single =
        document.getElementById(
            "singleQuestionPanel"
        );

    const bulk =
        document.getElementById(
            "bulkQuestionPanel"
        );

    const singleButton =
        document.getElementById(
            "singleQuestionModeButton"
        );

    const bulkButton =
        document.getElementById(
            "bulkQuestionModeButton"
        );


    const isSingle =
        mode === "single";


    if (single) {
        single.style.display =
            isSingle
                ? ""
                : "none";
    }


    if (bulk) {
        bulk.style.display =
            isSingle
                ? "none"
                : "";
    }


    if (singleButton) {
        singleButton.classList.toggle(
            "active",
            isSingle
        );
    }


    if (bulkButton) {
        bulkButton.classList.toggle(
            "active",
            !isSingle
        );
    }
}


/* =========================================================
   CHARGER LES CATÉGORIES
========================================================= */

async function loadQuestionAdminCategories() {

    try {

        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/questions?select=category&order=category.asc`,
                {
                    headers:
                        supabaseHeaders()
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        const rows =
            await response.json();


        const categories =
            [
                ...new Set(
                    rows
                        .map(
                            item =>
                                String(
                                    item.category || ""
                                ).trim()
                        )
                        .filter(Boolean)
                )
            ];


        questionAdminState.categories =
            categories;


        fillQuestionCategorySelects();

    } catch (error) {

        console.error(
            "Erreur catégories questions :",
            error
        );
    }
}


/* =========================================================
   REMPLIR LES SELECT
========================================================= */

function fillQuestionCategorySelects() {

    const html =
        questionAdminState
            .categories
            .map(
                category => `
                    <option
                        value="${escapeHtml(
                            category
                        )}"
                    >
                        ${escapeHtml(
                            category
                        )}
                    </option>
                `
            )
            .join("");


    const single =
        document.getElementById(
            "questionCategory"
        );


    const bulk =
        document.getElementById(
            "bulkCategory"
        );


    if (single) {
        single.innerHTML =
            html;
    }


    if (bulk) {
        bulk.innerHTML =
            html;
    }
}


/* =========================================================
   CRÉER UNE CATÉGORIE
========================================================= */

async function createQuestionAdminCategory() {

    const value =
        prompt(
            "Nom de la nouvelle catégorie :"
        );


    const category =
        String(
            value || ""
        ).trim();


    if (!category) {
        return;
    }


    const exists =
        questionAdminState
            .categories
            .some(
                item =>
                    item.toLowerCase() ===
                    category.toLowerCase()
            );


    if (exists) {

        alert(
            "Cette catégorie existe déjà."
        );

        return;
    }


    questionAdminState
        .categories
        .push(
            category
        );


    questionAdminState
        .categories
        .sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "fr",
                    {
                        sensitivity:
                            "base"
                    }
                )
        );


    fillQuestionCategorySelects();


    const select =
        document.getElementById(
            "questionCategory"
        );


    if (select) {
        select.value =
            category;
    }


    await updateQuestionAutomaticData();


    /*
     * Important :
     * la catégorie sera réellement créée
     * dans Supabase dès que la première
     * question de cette catégorie sera enregistrée.
     */

    alert(
        `Catégorie "${category}" prête ✅`
    );
}


/* =========================================================
   CHAMPS RÉPONSES
========================================================= */

function renderQuestionAnswerFields() {

    const container =
        document.getElementById(
            "questionAnswersContainer"
        );


    const type =
        document.getElementById(
            "questionType"
        )?.value;


    if (
        !container ||
        !type
    ) {
        return;
    }


    if (
        type ===
        "true_false"
    ) {

        container.innerHTML = `

            <div class="question-tf-grid">

                <label class="question-answer-option">

                    <input
                        type="radio"
                        name="singleCorrectAnswer"
                        value="A"
                        checked
                    >

                    <strong>
                        A
                    </strong>

                    <span>
                        Vrai
                    </span>

                </label>


                <label class="question-answer-option">

                    <input
                        type="radio"
                        name="singleCorrectAnswer"
                        value="B"
                    >

                    <strong>
                        B
                    </strong>

                    <span>
                        Faux
                    </span>

                </label>

            </div>
        `;

    } else {

        const inputType =
            type ===
                "multiple_choice"
                ? "checkbox"
                : "radio";


        container.innerHTML =
            ["A", "B", "C", "D"]
                .map(
                    letter => `

                        <div class="question-choice-row">

                            <input
                                type="${inputType}"
                                name="${
                                    type ===
                                    "multiple_choice"
                                        ? "multipleCorrectAnswer"
                                        : "singleCorrectAnswer"
                                }"
                                value="${letter}"
                                class="question-correct-control"
                            >

                            <strong>
                                ${letter}
                            </strong>

                            <input
                                type="text"
                                id="questionChoice${letter}"
                                placeholder="Proposition ${letter}"
                            >

                        </div>

                    `
                )
                .join("");
    }


    container
        .querySelectorAll(
            "input"
        )
        .forEach(
            input => {

                input.addEventListener(
                    "input",
                    function () {

                        updateQuestionAutomaticData();

                        updateQuestionPreview();
                    }
                );


                input.addEventListener(
                    "change",
                    function () {

                        updateQuestionAutomaticData();

                        updateQuestionPreview();
                    }
                );
            }
        );
}


/* =========================================================
   BONNES RÉPONSES
========================================================= */

function getQuestionCorrectAnswers() {

    const type =
        document.getElementById(
            "questionType"
        )?.value;


    if (
        type ===
        "multiple_choice"
    ) {

        return [
            ...document
                .querySelectorAll(
                    'input[name="multipleCorrectAnswer"]:checked'
                )
        ]
        .map(
            input =>
                input.value
        );
    }


    const selected =
        document.querySelector(
            'input[name="singleCorrectAnswer"]:checked'
        );


    return selected
        ? [selected.value]
        : [];
}


/* =========================================================
   CHOIX
========================================================= */

function getQuestionChoices() {

    const type =
        document.getElementById(
            "questionType"
        )?.value;


    if (
        type ===
        "true_false"
    ) {

        return {
            A: "Vrai",
            B: "Faux",
            C: null,
            D: null
        };
    }


    return {

        A:
            document
                .getElementById(
                    "questionChoiceA"
                )?.value
                .trim() || null,

        B:
            document
                .getElementById(
                    "questionChoiceB"
                )?.value
                .trim() || null,

        C:
            document
                .getElementById(
                    "questionChoiceC"
                )?.value
                .trim() || null,

        D:
            document
                .getElementById(
                    "questionChoiceD"
                )?.value
                .trim() || null
    };
}


/* =========================================================
   ORDRE AUTOMATIQUE
========================================================= */

async function getNextQuestionOrderNumber(
    category
) {

    const response =
        await fetch(
            `${SUPABASE_URL}/rest/v1/questions?category=eq.${encodeURIComponent(category)}&select=order_number&order=order_number.desc&limit=1`,
            {
                headers:
                    supabaseHeaders()
            }
        );


    if (!response.ok) {

        throw new Error(
            await response.text()
        );
    }


    const rows =
        await response.json();


    if (
        !rows.length ||
        rows[0].order_number ===
            null
    ) {

        return 1;
    }


    return (
        Number(
            rows[0].order_number
        ) + 1
    );
}


/* =========================================================
   DONNÉES AUTOMATIQUES
========================================================= */

async function updateQuestionAutomaticData() {

    const category =
        document.getElementById(
            "questionCategory"
        )?.value;


    const answers =
        getQuestionCorrectAnswers();


    const points =
        Math.max(
            answers.length,
            1
        );


    const pointsElement =
        document.getElementById(
            "questionPointsPreview"
        );


    const keywordsElement =
        document.getElementById(
            "questionKeywordsPreview"
        );


    if (pointsElement) {
        pointsElement.innerText =
            points;
    }


    if (keywordsElement) {

        keywordsElement.innerText =
            answers.length
                ? answers.join(", ")
                : "—";
    }


    if (!category) {
        return;
    }


    try {

        const next =
            await getNextQuestionOrderNumber(
                category
            );


        const orderElement =
            document.getElementById(
                "questionOrderPreview"
            );


        if (orderElement) {

            orderElement.innerText =
                `#${next}`;
        }

    } catch (error) {

        console.error(
            error
        );
    }
}


/* =========================================================
   APERÇU
========================================================= */

function updateQuestionPreview() {

    const preview =
        document.getElementById(
            "questionPreview"
        );


    if (!preview) {
        return;
    }


    const question =
        document.getElementById(
            "questionText"
        )?.value
        .trim();


    const type =
        document.getElementById(
            "questionType"
        )?.value;


    const choices =
        getQuestionChoices();


    const correct =
        getQuestionCorrectAnswers();


    if (!question) {

        preview.innerHTML = `
            <div class="question-preview-empty">
                Commence à rédiger ta question.
            </div>
        `;

        return;
    }


    preview.innerHTML = `

        <div class="question-preview-type">

            ${
                type === "true_false"
                    ? "Vrai / Faux"
                    : type === "simple_choice"
                        ? "Choix simple"
                        : "Choix multiple"
            }

        </div>


        <h3>
            ${escapeHtml(
                question
            )}
        </h3>


        <div class="question-preview-answers">

            ${
                ["A", "B", "C", "D"]
                    .filter(
                        letter =>
                            choices[
                                letter
                            ]
                    )
                    .map(
                        letter => `

                            <div
                                class="
                                    question-preview-answer
                                    ${
                                        correct.includes(
                                            letter
                                        )
                                            ? "correct"
                                            : ""
                                    }
                                "
                            >

                                <strong>
                                    ${letter}
                                </strong>

                                ${escapeHtml(
                                    choices[
                                        letter
                                    ]
                                )}

                            </div>

                        `
                    )
                    .join("")
            }

        </div>
    `;
}


/* =========================================================
   VALIDATION
========================================================= */

function validateAdminQuestion() {

    const category =
        document.getElementById(
            "questionCategory"
        )?.value;


    const question =
        document.getElementById(
            "questionText"
        )?.value
        .trim();


    const type =
        document.getElementById(
            "questionType"
        )?.value;


    const correct =
        getQuestionCorrectAnswers();


    const choices =
        getQuestionChoices();


    if (!category) {

        alert(
            "Merci de choisir une catégorie."
        );

        return false;
    }


    if (!question) {

        alert(
            "Merci de renseigner la question."
        );

        return false;
    }


    if (!correct.length) {

        alert(
            "Merci de sélectionner la bonne réponse."
        );

        return false;
    }


    if (
        type !== "true_false"
    ) {

        const allFilled =
            ["A", "B", "C", "D"]
                .every(
                    letter =>
                        Boolean(
                            choices[
                                letter
                            ]
                        )
                );


        if (!allFilled) {

            alert(
                "Merci de renseigner les 4 propositions."
            );

            return false;
        }
    }


    return true;
}


/* =========================================================
   ENREGISTRER UNE QUESTION
========================================================= */

async function saveAdminQuestion() {

    if (
        !validateAdminQuestion()
    ) {
        return;
    }


    const category =
        document.getElementById(
            "questionCategory"
        ).value;


    const question =
        document.getElementById(
            "questionText"
        ).value
        .trim();


    const type =
        document.getElementById(
            "questionType"
        ).value;


    const correct =
        getQuestionCorrectAnswers();


    const choices =
        getQuestionChoices();


    const button =
        document.getElementById(
            "saveQuestionButton"
        );


    try {

        if (button) {

            button.disabled =
                true;

            button.innerText =
                "Ajout en cours...";
        }


        const orderNumber =
            await getNextQuestionOrderNumber(
                category
            );


        const payload = {

            order_number:
                orderNumber,

            category:
                category,

            question:
                question,

            expected_answer:
                null,

            keywords:
                correct.join(
                    ", "
                ),

            max_points:
                type ===
                    "multiple_choice"
                    ? correct.length
                    : 1,

            question_type:
                type,

            correct_answer:
                correct.join(
                    ", "
                ),

            choice_a:
                choices.A,

            choice_b:
                choices.B,

            choice_c:
                choices.C,

            choice_d:
                choices.D,

            is_active:
                true
        };


        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/questions`,
                {
                    method:
                        "POST",

                    headers:
                        supabaseHeaders({

                            "Content-Type":
                                "application/json",

                            "Prefer":
                                "return=minimal"
                        }),

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        alert(
            `Question ajoutée ✅\n\n${category} #${orderNumber}`
        );


        await resetAdminQuestionForm(
            true
        );


    } catch (error) {

        console.error(
            "Erreur ajout question :",
            error
        );


        alert(
            "Impossible d'ajouter la question.\n\n" +
            error.message
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.innerText =
                "➕ Ajouter la question";
        }
    }
}


/* =========================================================
   RESET
========================================================= */

async function resetAdminQuestionForm(
    keepCategory = false
) {

    const currentCategory =
        document.getElementById(
            "questionCategory"
        )?.value;


    const question =
        document.getElementById(
            "questionText"
        );


    if (question) {
        question.value =
            "";
    }


    renderQuestionAnswerFields();


    if (
        keepCategory &&
        currentCategory
    ) {

        const category =
            document.getElementById(
                "questionCategory"
            );


        if (category) {

            category.value =
                currentCategory;
        }
    }


    await updateQuestionAutomaticData();

    updateQuestionPreview();
}


/* =========================================================
   ANALYSER BLOC
========================================================= */

function analyseBulkQuestions() {

    const input =
        document.getElementById(
            "bulkQuestionInput"
        );


    if (!input) {
        return;
    }


    const raw =
        String(
            input.value || ""
        );


    const questions =
        raw
            .split(/[;\n]+/)
            .map(
                item =>
                    item.trim()
            )
            .filter(Boolean);


    if (!questions.length) {

        alert(
            "Aucune question détectée."
        );

        return;
    }


    const categorySelect =
        document.getElementById(
            "bulkCategory"
        );


    const typeSelect =
        document.getElementById(
            "bulkQuestionType"
        );


    const category =
        categorySelect?.value ||
        questionAdminState.categories?.[0] ||
        "";


    const type =
        typeSelect?.value ||
        "true_false";


    questionAdminState.bulkQuestions =
        questions.map(
            question => {

                let choices = {
                    A: "",
                    B: "",
                    C: "",
                    D: ""
                };


                let correct = [];


                /* =========================
                   VRAI / FAUX
                ========================= */

                if (
                    type ===
                    "true_false"
                ) {

                    choices = {
                        A: "Vrai",
                        B: "Faux",
                        C: "",
                        D: ""
                    };


                    /*
                     * Rien de sélectionné par défaut.
                     * L'admin devra choisir Vrai ou Faux.
                     */
                    correct = [];
                }


                /* =========================
                   CHOIX SIMPLE
                ========================= */

                else if (
                    type ===
                    "simple_choice"
                ) {

                    choices = {
                        A: "",
                        B: "",
                        C: "",
                        D: ""
                    };


                    /*
                     * Une seule réponse correcte,
                     * mais aucune par défaut.
                     */
                    correct = [];
                }


                /* =========================
                   CHOIX MULTIPLE
                ========================= */

                else if (
                    type ===
                    "multiple_choice"
                ) {

                    choices = {
                        A: "",
                        B: "",
                        C: "",
                        D: ""
                    };


                    /*
                     * Plusieurs réponses possibles,
                     * aucune cochée par défaut.
                     */
                    correct = [];
                }


                return {

                    question:
                        question,

                    category:
                        category,

                    type:
                        type,

                    choices:
                        choices,

                    correct:
                        correct
                };
            }
        );


    questionAdminState.currentBulkIndex =
        0;


    const configuration =
        document.getElementById(
            "bulkQuestionConfiguration"
        );


    if (configuration) {

        configuration.style.display =
            "";
    }


    const detectedCount =
        document.getElementById(
            "bulkDetectedCount"
        );


    if (detectedCount) {

        detectedCount.textContent =
            `${questions.length} question${questions.length > 1 ? "s" : ""} détectée${questions.length > 1 ? "s" : ""}`;
    }


    renderCurrentBulkQuestion();

    updateBulkSummary();
}


/* =========================================================
   AFFICHAGE QUESTION BLOC
========================================================= */

/* =========================================================
   RENDU QUESTION COURANTE DU BLOC
========================================================= */

function renderCurrentBulkQuestion() {

    const item =
        questionAdminState
            .bulkQuestions[
                questionAdminState
                    .currentBulkIndex
            ];


    const container =
        document.getElementById(
            "bulkQuestionEditor"
        );


    if (
        !item ||
        !container
    ) {
        return;
    }


    /*
     * On s'assure que les événements
     * de configuration par défaut sont installés.
     */
    setupBulkDefaultConfigurationListeners();


    const index =
        questionAdminState
            .currentBulkIndex;


    const total =
        questionAdminState
            .bulkQuestions
            .length;


    const position =
        document.getElementById(
            "bulkQuestionPosition"
        );


    if (position) {

        position.innerText =
            `Question ${index + 1} / ${total}`;
    }



    /* =====================================================
       SÉCURITÉ STRUCTURE
    ====================================================== */

    if (!item.choices) {

        item.choices = {
            A: "",
            B: "",
            C: "",
            D: ""
        };
    }


    if (!Array.isArray(item.correct)) {

        item.correct = [];
    }



    /* =====================================================
       INITIALISATION SELON LE TYPE
    ====================================================== */

    if (
        item.type ===
        "true_false"
    ) {

        item.choices.A =
            "Vrai";

        item.choices.B =
            "Faux";

        item.choices.C =
            "";

        item.choices.D =
            "";


        /*
         * Une seule bonne réponse
         * pour un Vrai / Faux.
         */

        if (
            item.correct.length > 1
        ) {

            item.correct =
                item.correct.slice(
                    0,
                    1
                );
        }
    }


    else if (
        item.type ===
        "simple_choice"
    ) {

        /*
         * Une seule bonne réponse
         * pour un choix simple.
         */

        if (
            item.correct.length > 1
        ) {

            item.correct =
                item.correct.slice(
                    0,
                    1
                );
        }
    }



    /* =====================================================
       RADIO OU CHECKBOX
    ====================================================== */

    const inputType =
        item.type ===
        "multiple_choice"
            ? "checkbox"
            : "radio";



    /* =====================================================
       PROPOSITIONS À AFFICHER
    ====================================================== */

    const letters =
        item.type ===
        "true_false"
            ? [
                "A",
                "B"
            ]
            : [
                "A",
                "B",
                "C",
                "D"
            ];



    /* =====================================================
       RENDU
    ====================================================== */

    container.innerHTML = `

        <div class="bulk-current-question">


            <!-- QUESTION -->

            <div class="question-field">

                <label>
                    Question
                </label>

                <textarea
                    id="bulkCurrentQuestionText"
                    maxlength="500"
                >${escapeHtml(
                    item.question || ""
                )}</textarea>

            </div>



            <!-- PROPOSITIONS -->

            <div class="bulk-answer-editor">

                ${
                    letters
                        .map(
                            letter => `

                                <label
                                    class="bulk-answer-row"
                                >


                                    <!-- BONNE RÉPONSE -->

                                    <input
                                        type="${inputType}"
                                        name="bulkCorrectAnswer"
                                        value="${letter}"

                                        ${
                                            item.correct
                                                .includes(
                                                    letter
                                                )
                                                    ? "checked"
                                                    : ""
                                        }
                                    >


                                    <!-- LETTRE -->

                                    <strong>
                                        ${letter}
                                    </strong>


                                    <!-- PROPOSITION -->

                                    <input
                                        type="text"

                                        data-bulk-choice="${letter}"

                                        value="${escapeHtml(
                                            item.choices[
                                                letter
                                            ] || ""
                                        )}"

                                        placeholder="${
                                            item.type ===
                                            "true_false"
                                                ? ""
                                                : `Proposition ${letter}`
                                        }"

                                        ${
                                            item.type ===
                                            "true_false"
                                                ? "readonly"
                                                : ""
                                        }
                                    >

                                </label>

                            `
                        )
                        .join("")
                }

            </div>

        </div>
    `;



    /* =====================================================
       MODIFICATION DU TEXTE DE LA QUESTION
    ====================================================== */

    const questionInput =
        container.querySelector(
            "#bulkCurrentQuestionText"
        );


    if (questionInput) {

        questionInput.addEventListener(
            "input",
            function () {

                item.question =
                    questionInput.value;

                updateBulkSummary();
            }
        );
    }



    /* =====================================================
       MODIFICATION BONNE(S) RÉPONSE(S)
    ====================================================== */

    container
        .querySelectorAll(
            'input[name="bulkCorrectAnswer"]'
        )
        .forEach(
            input => {

                input.addEventListener(
                    "change",
                    function () {

                        saveCurrentBulkEditorState();
                    }
                );
            }
        );



    /* =====================================================
       MODIFICATION DES PROPOSITIONS
    ====================================================== */

    container
        .querySelectorAll(
            "[data-bulk-choice]"
        )
        .forEach(
            input => {

                input.addEventListener(
                    "input",
                    function () {

                        saveCurrentBulkEditorState();
                    }
                );
            }
        );
}



/* =========================================================
   CONFIGURATION PAR DÉFAUT DU BLOC
========================================================= */

function setupBulkDefaultConfigurationListeners() {

    const categorySelect =
        document.getElementById(
            "bulkCategory"
        );


    const typeSelect =
        document.getElementById(
            "bulkQuestionType"
        );


    const applyDefaults =
        document.getElementById(
            "bulkApplyDefaults"
        );


    /*
     * On évite d'installer plusieurs fois
     * les mêmes événements.
     */

    if (
        typeSelect &&
        !typeSelect.dataset.bulkListenerInstalled
    ) {

        typeSelect.dataset.bulkListenerInstalled =
            "true";


        typeSelect.addEventListener(
            "change",
            function () {

                if (
                    applyDefaults &&
                    applyDefaults.checked
                ) {

                    applyBulkDefaultsToAllQuestions();
                }
            }
        );
    }


    if (
        categorySelect &&
        !categorySelect.dataset.bulkListenerInstalled
    ) {

        categorySelect.dataset.bulkListenerInstalled =
            "true";


        categorySelect.addEventListener(
            "change",
            function () {

                if (
                    applyDefaults &&
                    applyDefaults.checked
                ) {

                    applyBulkDefaultsToAllQuestions();
                }
            }
        );
    }


    if (
        applyDefaults &&
        !applyDefaults.dataset.bulkListenerInstalled
    ) {

        applyDefaults.dataset.bulkListenerInstalled =
            "true";


        applyDefaults.addEventListener(
            "change",
            function () {

                if (
                    applyDefaults.checked
                ) {

                    applyBulkDefaultsToAllQuestions();
                }
            }
        );
    }
}



/* =========================================================
   APPLIQUER CATÉGORIE + TYPE À TOUT LE BLOC
========================================================= */

function applyBulkDefaultsToAllQuestions() {

    const category =
        document.getElementById(
            "bulkCategory"
        )?.value || "";


    const type =
        document.getElementById(
            "bulkQuestionType"
        )?.value ||
        "true_false";


    if (
        !questionAdminState.bulkQuestions ||
        !questionAdminState.bulkQuestions.length
    ) {
        return;
    }


    questionAdminState
        .bulkQuestions
        .forEach(
            item => {

                /*
                 * Catégorie
                 */

                item.category =
                    category;


                /*
                 * Si le type change,
                 * on recrée proprement
                 * les propositions.
                 */

                if (
                    item.type !==
                    type
                ) {

                    item.type =
                        type;


                    item.correct =
                        [];


                    if (
                        type ===
                        "true_false"
                    ) {

                        item.choices = {
                            A:
                                "Vrai",

                            B:
                                "Faux",

                            C:
                                "",

                            D:
                                ""
                        };
                    }


                    else {

                        item.choices = {
                            A:
                                "",

                            B:
                                "",

                            C:
                                "",

                            D:
                                ""
                        };
                    }
                }
            }
        );


    /*
     * On reconstruit immédiatement
     * la question affichée.
     */

    renderCurrentBulkQuestion();

    updateBulkSummary();
}



/* =========================================================
   SAUVER ÉTAT QUESTION COURANTE
========================================================= */

function saveCurrentBulkEditorState() {

    const item =
        questionAdminState
            .bulkQuestions[
                questionAdminState
                    .currentBulkIndex
            ];


    if (!item) {
        return;
    }


    const container =
        document.getElementById(
            "bulkQuestionEditor"
        );


    if (!container) {
        return;
    }



    /* =====================================================
       1. TEXTE DE LA QUESTION
    ====================================================== */

    const questionInput =
        container.querySelector(
            "#bulkCurrentQuestionText"
        );


    if (questionInput) {

        item.question =
            String(
                questionInput.value || ""
            ).trim();
    }



    /* =====================================================
       2. PROPOSITIONS
    ====================================================== */

    if (!item.choices) {

        item.choices = {
            A: "",
            B: "",
            C: "",
            D: ""
        };
    }


    container
        .querySelectorAll(
            "[data-bulk-choice]"
        )
        .forEach(
            input => {

                const letter =
                    input.dataset
                        .bulkChoice;


                if (!letter) {
                    return;
                }


                item.choices[
                    letter
                ] =
                    String(
                        input.value || ""
                    ).trim();
            }
        );



    /* =====================================================
       3. BONNE(S) RÉPONSE(S)
    ====================================================== */

    const checkedAnswers =
        [
            ...container
                .querySelectorAll(
                    'input[name="bulkCorrectAnswer"]:checked'
                )
        ]
        .map(
            input =>
                String(
                    input.value || ""
                )
                .trim()
                .toUpperCase()
        )
        .filter(Boolean);



    /* =====================================================
       VRAI / FAUX
    ====================================================== */

    if (
        item.type ===
        "true_false"
    ) {

        item.correct =
            checkedAnswers.length
                ? [
                    checkedAnswers[0]
                ]
                : [];


        item.choices.A =
            "Vrai";

        item.choices.B =
            "Faux";

        item.choices.C =
            "";

        item.choices.D =
            "";
    }



    /* =====================================================
       CHOIX SIMPLE
    ====================================================== */

    else if (
        item.type ===
        "simple_choice"
    ) {

        item.correct =
            checkedAnswers.length
                ? [
                    checkedAnswers[0]
                ]
                : [];
    }



    /* =====================================================
       CHOIX MULTIPLE
    ====================================================== */

    else if (
        item.type ===
        "multiple_choice"
    ) {

        item.correct =
            [
                ...new Set(
                    checkedAnswers
                )
            ];
    }



    /* =====================================================
       TYPE INCONNU
    ====================================================== */

    else {

        item.correct =
            [];
    }


    updateBulkSummary();
}



/* =========================================================
   NAVIGATION ENTRE LES QUESTIONS
========================================================= */

function changeBulkQuestion(
    direction
) {

    saveCurrentBulkEditorState();


    const newIndex =
        questionAdminState
            .currentBulkIndex +
        direction;


    if (
        newIndex < 0 ||
        newIndex >=
            questionAdminState
                .bulkQuestions
                .length
    ) {
        return;
    }


    questionAdminState.currentBulkIndex =
        newIndex;


    renderCurrentBulkQuestion();
}



/* =========================================================
   RÉCAPITULATIF DU BLOC
========================================================= */

function updateBulkSummary() {

    const total =
        questionAdminState
            .bulkQuestions
            .length;


    const ready =
        questionAdminState
            .bulkQuestions
            .filter(
                item => {

                    /*
                     * Informations obligatoires
                     */

                    if (
                        !item.question ||
                        !item.category ||
                        !item.type ||
                        !Array.isArray(
                            item.correct
                        ) ||
                        !item.correct.length
                    ) {

                        return false;
                    }



                    /* =========================
                       VRAI / FAUX
                    ========================= */

                    if (
                        item.type ===
                        "true_false"
                    ) {

                        return (
                            item.correct[0] ===
                                "A" ||
                            item.correct[0] ===
                                "B"
                        );
                    }



                    /* =========================
                       CHOIX SIMPLE / MULTIPLE

                       Les 4 propositions
                       doivent être renseignées.
                    ========================= */

                    if (
                        item.type ===
                            "simple_choice" ||
                        item.type ===
                            "multiple_choice"
                    ) {

                        return [
                            "A",
                            "B",
                            "C",
                            "D"
                        ]
                        .every(
                            letter =>
                                Boolean(
                                    String(
                                        item.choices?.[
                                            letter
                                        ] || ""
                                    )
                                    .trim()
                                )
                        );
                    }


                    return false;
                }
            )
            .length;


    const element =
        document.getElementById(
            "bulkSummaryText"
        );


    if (element) {

        element.innerText =
            `${ready} question(s) prête(s) sur ${total}.`;
    }
}
/* =========================================================
   IMPORT BLOC
========================================================= */

async function importBulkQuestions() {

    saveCurrentBulkEditorState();


    const items =
        questionAdminState
            .bulkQuestions;


    if (!items.length) {
        return;
    }


    const defaultCategory =
        document.getElementById(
            "bulkCategory"
        )?.value;


    const defaultType =
        document.getElementById(
            "bulkQuestionType"
        )?.value;


    const applyDefaults =
        document.getElementById(
            "bulkApplyDefaults"
        )?.checked;


    if (applyDefaults) {

        items.forEach(
            item => {

                item.category =
                    defaultCategory;

                item.type =
                    defaultType;
            }
        );
    }


    for (
        const item
        of items
    ) {

        if (
            !item.correct.length
        ) {

            alert(
                "Certaines questions n'ont pas encore de bonne réponse."
            );

            return;
        }
    }


    const button =
        document.getElementById(
            "importBulkQuestionsButton"
        );


    try {

        if (button) {

            button.disabled =
                true;

            button.innerText =
                "Import en cours...";
        }


        /*
         * Regroupement par catégorie
         * pour gérer les order_number.
         */

        const nextOrders = {};


        for (
            const item
            of items
        ) {

            if (
                nextOrders[
                    item.category
                ] === undefined
            ) {

                nextOrders[
                    item.category
                ] =
                    await getNextQuestionOrderNumber(
                        item.category
                    );
            }
        }


        const payload =
            items.map(
                item => {

                    const order =
                        nextOrders[
                            item.category
                        ]++;


                    return {

                        order_number:
                            order,

                        category:
                            item.category,

                        question:
                            item.question,

                        expected_answer:
                            null,

                        keywords:
                            item.correct.join(
                                ", "
                            ),

                        max_points:
                            item.type ===
                                "multiple_choice"
                                ? item.correct.length
                                : 1,

                        question_type:
                            item.type,

                        correct_answer:
                            item.correct.join(
                                ", "
                            ),

                        choice_a:
                            item.choices.A ||
                            null,

                        choice_b:
                            item.choices.B ||
                            null,

                        choice_c:
                            item.choices.C ||
                            null,

                        choice_d:
                            item.choices.D ||
                            null,

                        is_active:
                            true
                    };
                }
            );


        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/questions`,
                {
                    method:
                        "POST",

                    headers:
                        supabaseHeaders({

                            "Content-Type":
                                "application/json",

                            "Prefer":
                                "return=minimal"
                        }),

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        alert(
            `${payload.length} questions importées ✅`
        );


        questionAdminState.bulkQuestions =
            [];


        document.getElementById(
            "bulkQuestionInput"
        ).value =
            "";


        document.getElementById(
            "bulkQuestionConfiguration"
        ).style.display =
            "none";


    } catch (error) {

        console.error(
            "Erreur import questions :",
            error
        );


        alert(
            "Impossible d'importer les questions.\n\n" +
            error.message
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.innerText =
                "Importer les questions";
        }
    }
}
/* =========================================================
   ADMIN - GESTION DES QUESTIONS
========================================================= */

let questionManagementState = {

    questions: [],

    filteredQuestions: [],

    editingQuestion: null
};


/* =========================================================
   INITIALISATION
========================================================= */

async function initializeQuestionManagement() {

    setupQuestionManagementEvents();

    await loadQuestionManagementData();
}


/* =========================================================
   EVENTS
========================================================= */

function setupQuestionManagementEvents() {

    [
        "questionManagementSearch",
        "questionManagementCategory",
        "questionManagementType",
        "questionManagementStatus"
    ]
    .forEach(
        id => {

            const element =
                document.getElementById(id);

            if (!element) {
                return;
            }

            element.addEventListener(
                id === "questionManagementSearch"
                    ? "input"
                    : "change",
                applyQuestionManagementFilters
            );
        }
    );


    const close =
        document.getElementById(
            "closeQuestionEditModal"
        );

    const cancel =
        document.getElementById(
            "cancelQuestionEdit"
        );

    const save =
        document.getElementById(
            "saveQuestionEdit"
        );

    const type =
        document.getElementById(
            "editQuestionType"
        );


    if (close) {
        close.addEventListener(
            "click",
            closeQuestionEditModal
        );
    }


    if (cancel) {
        cancel.addEventListener(
            "click",
            closeQuestionEditModal
        );
    }


    if (save) {
        save.addEventListener(
            "click",
            saveQuestionManagementEdit
        );
    }


    if (type) {
        type.addEventListener(
            "change",
            renderQuestionManagementEditAnswers
        );
    }
}


/* =========================================================
   CHARGEMENT
========================================================= */

async function loadQuestionManagementData() {

    const container =
        document.getElementById(
            "questionManagementList"
        );

    if (container) {
        container.innerHTML =
            "Chargement...";
    }


    try {

        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/questions?select=*&order=category.asc,order_number.asc`,
                {
                    headers:
                        supabaseHeaders()
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        const questions =
            await response.json();


        questionManagementState.questions =
            questions;


        fillQuestionManagementCategories();

        applyQuestionManagementFilters();


    } catch (error) {

        console.error(
            "Erreur gestion questions :",
            error
        );

        if (container) {

            container.innerHTML = `
                <div class="question-management-empty">
                    Impossible de charger les questions.
                </div>
            `;
        }
    }
}


/* =========================================================
   CATÉGORIES
========================================================= */

function fillQuestionManagementCategories() {

    const select =
        document.getElementById(
            "questionManagementCategory"
        );


    if (!select) {
        return;
    }


    const categories =
        [
            ...new Set(
                questionManagementState
                    .questions
                    .map(
                        question =>
                            String(
                                question.category || ""
                            )
                            .trim()
                    )
                    .filter(Boolean)
            )
        ]
        .sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "fr",
                    {
                        sensitivity: "base"
                    }
                )
        );


    select.innerHTML = `
        <option value="">
            Toutes les catégories
        </option>

        ${
            categories
                .map(
                    category => `
                        <option value="${escapeHtml(category)}">
                            ${escapeHtml(category)}
                        </option>
                    `
                )
                .join("")
        }
    `;
}


/* =========================================================
   FILTRES
========================================================= */

function applyQuestionManagementFilters() {

    const search =
        String(
            document.getElementById(
                "questionManagementSearch"
            )?.value || ""
        )
        .trim()
        .toLowerCase();


    const category =
        document.getElementById(
            "questionManagementCategory"
        )?.value || "";


    const type =
        document.getElementById(
            "questionManagementType"
        )?.value || "";


    const status =
        document.getElementById(
            "questionManagementStatus"
        )?.value || "";


    questionManagementState.filteredQuestions =
        questionManagementState
            .questions
            .filter(
                question => {

                    const searchable =
                        `${question.question || ""} ${question.category || ""}`
                            .toLowerCase();


                    if (
                        search &&
                        !searchable.includes(
                            search
                        )
                    ) {
                        return false;
                    }


                    if (
                        category &&
                        question.category !== category
                    ) {
                        return false;
                    }


                    if (
                        type &&
                        question.question_type !== type
                    ) {
                        return false;
                    }


                    if (
                        status === "active" &&
                        question.is_active === false
                    ) {
                        return false;
                    }


                    if (
                        status === "inactive" &&
                        question.is_active !== false
                    ) {
                        return false;
                    }


                    return true;
                }
            );


    updateQuestionManagementStats();

    renderQuestionManagementList();
}


/* =========================================================
   STATS
========================================================= */

function updateQuestionManagementStats() {

    const questions =
        questionManagementState.questions;


    const total =
        questions.length;


    const active =
        questions.filter(
            question =>
                question.is_active !== false
        ).length;


    const inactive =
        total - active;


    const totalElement =
        document.getElementById(
            "questionManagementTotal"
        );

    const activeElement =
        document.getElementById(
            "questionManagementActive"
        );

    const inactiveElement =
        document.getElementById(
            "questionManagementInactive"
        );


    if (totalElement) {
        totalElement.innerText =
            total;
    }

    if (activeElement) {
        activeElement.innerText =
            active;
    }

    if (inactiveElement) {
        inactiveElement.innerText =
            inactive;
    }
}


/* =========================================================
   LISTE
========================================================= */

function renderQuestionManagementList() {

    const container =
        document.getElementById(
            "questionManagementList"
        );


    if (!container) {
        return;
    }


    const questions =
        questionManagementState
            .filteredQuestions;


    if (!questions.length) {

        container.innerHTML = `
            <div class="question-management-empty">
                Aucune question trouvée.
            </div>
        `;

        return;
    }


    container.innerHTML =
        questions
            .map(
                question => {

                    const active =
                        question.is_active !== false;


                    return `
                        <article class="question-management-card">

                            <div class="question-management-card-main">

                                <div class="question-management-meta">

                                    <span>
                                        ${escapeHtml(
                                            question.category || ""
                                        )}
                                    </span>

                                    <span>
                                        #${question.order_number ?? "—"}
                                    </span>

                                    <span>
                                        ${escapeHtml(
                                            getQuestionTypeLabel(
                                                question.question_type
                                            )
                                        )}
                                    </span>

                                    <span
                                        class="
                                            question-status-badge
                                            ${
                                                active
                                                    ? "active"
                                                    : "inactive"
                                            }
                                        "
                                    >
                                        ${
                                            active
                                                ? "Active"
                                                : "Désactivée"
                                        }
                                    </span>

                                </div>


                                <h3>
                                    ${escapeHtml(
                                        question.question || ""
                                    )}
                                </h3>


                                <div class="question-management-answer-preview">

                                    ${renderQuestionManagementChoices(
                                        question
                                    )}

                                </div>

                            </div>


                            <div class="question-management-actions">

                                <button
                                    type="button"
                                    class="btn-secondary"
                                    onclick="openQuestionManagementEdit('${question.id}')"
                                >
                                    ✏️  Modifier
                                </button>


                                <button
                                    type="button"
                                    class="btn-secondary"
                                    onclick="toggleQuestionManagementActive('${question.id}')"
                                >
                                    ${
                                        active
                                            ? "⏸️ Désactiver"
                                            : "▶️  Réactiver"
                                    }
                                </button>


                                <button
                                    type="button"
                                    class="question-delete-button"
                                    onclick="deleteQuestionManagementQuestion('${question.id}')"
                                >
                                    🗑 Supprimer
                                </button>

                            </div>

                        </article>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   TYPE LABEL
========================================================= */

function getQuestionTypeLabel(
    type
) {

    const labels = {

        true_false:
            "Vrai / Faux",

        simple_choice:
            "Choix simple",

        multiple_choice:
            "Choix multiple",

        open:
            "Question ouverte"
    };


    return labels[type] || type || "—";
}


/* =========================================================
   APERÇU RÉPONSES
========================================================= */

function renderQuestionManagementChoices(
    question
) {

    const choices = {

        A:
            question.choice_a,

        B:
            question.choice_b,

        C:
            question.choice_c,

        D:
            question.choice_d
    };


    const correct =
        String(
            question.correct_answer || ""
        )
        .split(",")
        .map(
            item =>
                item.trim()
        )
        .filter(Boolean);


    return ["A", "B", "C", "D"]
        .filter(
            letter =>
                choices[letter]
        )
        .map(
            letter => `
                <span
                    class="
                        question-management-choice
                        ${
                            correct.includes(letter)
                                ? "correct"
                                : ""
                        }
                    "
                >
                    <strong>${letter}</strong>
                    ${escapeHtml(
                        choices[letter]
                    )}
                </span>
            `
        )
        .join("");
}


/* =========================================================
   OUVRIR MODALE
========================================================= */

function openQuestionManagementEdit(
    questionId
) {

    const question =
        questionManagementState
            .questions
            .find(
                item =>
                    String(item.id) ===
                    String(questionId)
            );


    if (!question) {
        return;
    }


    questionManagementState.editingQuestion =
        question;


    document.getElementById(
        "editQuestionCategory"
    ).value =
        question.category || "";


    document.getElementById(
        "editQuestionType"
    ).value =
        question.question_type || "true_false";


    document.getElementById(
        "editQuestionText"
    ).value =
        question.question || "";


    renderQuestionManagementEditAnswers();


    const modal =
        document.getElementById(
            "questionEditModal"
        );


    if (modal) {
        modal.style.display =
            "flex";
    }
}


/* =========================================================
   CHAMPS MODIFICATION
========================================================= */

function renderQuestionManagementEditAnswers() {

    const question =
        questionManagementState
            .editingQuestion;


    const container =
        document.getElementById(
            "editQuestionAnswers"
        );


    const type =
        document.getElementById(
            "editQuestionType"
        )?.value;


    if (
        !question ||
        !container ||
        !type
    ) {
        return;
    }


    const currentCorrect =
        String(
            question.correct_answer || ""
        )
        .split(",")
        .map(
            value =>
                value.trim()
        );


    if (
        type === "true_false"
    ) {

        container.innerHTML = `

            <div class="question-field">

                <label>
                    Bonne réponse
                </label>

                <label class="question-answer-option">

                    <input
                        type="radio"
                        name="editCorrectAnswer"
                        value="A"
                        ${
                            currentCorrect.includes("A")
                                ? "checked"
                                : ""
                        }
                    >

                    <strong>A</strong>

                    <span>Vrai</span>

                </label>


                <label class="question-answer-option">

                    <input
                        type="radio"
                        name="editCorrectAnswer"
                        value="B"
                        ${
                            currentCorrect.includes("B")
                                ? "checked"
                                : ""
                        }
                    >

                    <strong>B</strong>

                    <span>Faux</span>

                </label>

            </div>
        `;

        return;
    }


    const inputType =
        type === "multiple_choice"
            ? "checkbox"
            : "radio";


    container.innerHTML =
        ["A", "B", "C", "D"]
            .map(
                letter => {

                    const value =
                        question[
                            `choice_${letter.toLowerCase()}`
                        ] || "";


                    return `
                        <div class="question-choice-row">

                            <input
                                type="${inputType}"
                                name="editCorrectAnswer"
                                value="${letter}"
                                ${
                                    currentCorrect.includes(letter)
                                        ? "checked"
                                        : ""
                                }
                            >

                            <strong>
                                ${letter}
                            </strong>

                            <input
                                id="editChoice${letter}"
                                type="text"
                                value="${escapeHtml(value)}"
                            >

                        </div>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   FERMER MODALE
========================================================= */

function closeQuestionEditModal() {

    const modal =
        document.getElementById(
            "questionEditModal"
        );


    if (modal) {
        modal.style.display =
            "none";
    }


    questionManagementState.editingQuestion =
        null;
}


/* =========================================================
   SAUVEGARDER MODIFICATION
========================================================= */

async function saveQuestionManagementEdit() {

    const question =
        questionManagementState
            .editingQuestion;


    if (!question) {
        return;
    }


    const category =
        document.getElementById(
            "editQuestionCategory"
        ).value
        .trim();


    const type =
        document.getElementById(
            "editQuestionType"
        ).value;


    const text =
        document.getElementById(
            "editQuestionText"
        ).value
        .trim();


    const correct =
        [
            ...document.querySelectorAll(
                'input[name="editCorrectAnswer"]:checked'
            )
        ]
        .map(
            input =>
                input.value
        );


    if (
        !category ||
        !text ||
        !correct.length
    ) {

        alert(
            "Merci de compléter la question et sa bonne réponse."
        );

        return;
    }


    let choices;


    if (type === "true_false") {

        choices = {

            A: "Vrai",
            B: "Faux",
            C: null,
            D: null
        };

    } else {

        choices = {

            A:
                document.getElementById(
                    "editChoiceA"
                )?.value
                .trim() || null,

            B:
                document.getElementById(
                    "editChoiceB"
                )?.value
                .trim() || null,

            C:
                document.getElementById(
                    "editChoiceC"
                )?.value
                .trim() || null,

            D:
                document.getElementById(
                    "editChoiceD"
                )?.value
                .trim() || null
        };


        if (
            !choices.A ||
            !choices.B ||
            !choices.C ||
            !choices.D
        ) {

            alert(
                "Merci de renseigner les 4 propositions."
            );

            return;
        }
    }


    const payload = {

        category:
            category,

        question:
            text,

        question_type:
            type,

        correct_answer:
            correct.join(", "),

        keywords:
            correct.join(", "),

        max_points:
            type === "multiple_choice"
                ? correct.length
                : 1,

        expected_answer:
            null,

        choice_a:
            choices.A,

        choice_b:
            choices.B,

        choice_c:
            choices.C,

        choice_d:
            choices.D,

        updated_at:
            new Date().toISOString()
    };


    try {

        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/questions?id=eq.${encodeURIComponent(question.id)}`,
                {
                    method:
                        "PATCH",

                    headers:
                        supabaseHeaders({
                            "Content-Type":
                                "application/json",

                            "Prefer":
                                "return=minimal"
                        }),

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        closeQuestionEditModal();

        await loadQuestionManagementData();


        alert(
            "Question modifiée ✅"
        );


    } catch (error) {

        console.error(
            "Erreur modification question :",
            error
        );


        alert(
            "Impossible de modifier la question.\n\n" +
            error.message
        );
    }
}


/* =========================================================
   ACTIVER / DÉSACTIVER
========================================================= */

async function toggleQuestionManagementActive(
    questionId
) {

    const question =
        questionManagementState
            .questions
            .find(
                item =>
                    String(item.id) ===
                    String(questionId)
            );


    if (!question) {
        return;
    }


    const newStatus =
        question.is_active === false;


    try {

        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/questions?id=eq.${encodeURIComponent(questionId)}`,
                {
                    method:
                        "PATCH",

                    headers:
                        supabaseHeaders({
                            "Content-Type":
                                "application/json",

                            "Prefer":
                                "return=minimal"
                        }),

                    body:
                        JSON.stringify({

                            is_active:
                                newStatus,

                            updated_at:
                                new Date().toISOString()
                        })
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        await loadQuestionManagementData();


    } catch (error) {

        console.error(
            "Erreur statut question :",
            error
        );


        alert(
            "Impossible de modifier le statut."
        );
    }
}


/* =========================================================
   SUPPRIMER
========================================================= */

async function deleteQuestionManagementQuestion(
    questionId
) {

    const confirmation =
        confirm(
            "Supprimer définitivement cette question ?"
        );


    if (!confirmation) {
        return;
    }


    try {

        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/questions?id=eq.${encodeURIComponent(questionId)}`,
                {
                    method:
                        "DELETE",

                    headers:
                        supabaseHeaders({
                            "Prefer":
                                "return=minimal"
                        })
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        await loadQuestionManagementData();


        alert(
            "Question supprimée."
        );


    } catch (error) {

        console.error(
            "Erreur suppression question :",
            error
        );


        alert(
            "Impossible de supprimer la question.\n\n" +
            error.message
        );
    }
}
/* =========================================================
   ADMIN - GESTION DES CATÉGORIES
========================================================= */

let categoryManagementState = {

    categories: [],

    editingCategory: null
};


/* =========================================================
   INITIALISATION
========================================================= */

async function initializeCategoryManagement() {

    setupCategoryManagementEvents();

    await loadCategoryManagementData();
}


/* =========================================================
   EVENTS
========================================================= */

function setupCategoryManagementEvents() {

    const createButton =
        document.getElementById(
            "createCategoryManagementButton"
        );


    const searchInput =
        document.getElementById(
            "categorySearchInput"
        );


    const closeButton =
        document.getElementById(
            "closeCategoryEditModal"
        );


    const cancelButton =
        document.getElementById(
            "cancelCategoryEdit"
        );


    const saveButton =
        document.getElementById(
            "saveCategoryEdit"
        );


    if (createButton) {

        createButton.addEventListener(
            "click",
            createManagedCategory
        );
    }


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            renderCategoryManagementList
        );
    }


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeCategoryEditModal
        );
    }


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeCategoryEditModal
        );
    }


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveCategoryRename
        );
    }
}


/* =========================================================
   CHARGEMENT
========================================================= */

async function loadCategoryManagementData() {

    const container =
        document.getElementById(
            "categoryManagementList"
        );


    if (container) {

        container.innerHTML = `
            <div class="question-management-empty">
                Chargement des catégories...
            </div>
        `;
    }


    try {

        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/questions?select=category`,
                {
                    headers:
                        supabaseHeaders()
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        const rows =
            await response.json();


        const counts = {};


        rows.forEach(
            row => {

                const category =
                    String(
                        row.category || ""
                    ).trim();


                if (!category) {
                    return;
                }


                if (!counts[category]) {

                    counts[category] =
                        0;
                }


                counts[category]++;
            }
        );


        categoryManagementState.categories =
            Object.keys(counts)
                .map(
                    name => ({
                        name,
                        questionCount:
                            counts[name]
                    })
                )
                .sort(
                    (a, b) =>
                        a.name.localeCompare(
                            b.name,
                            "fr",
                            {
                                sensitivity:
                                    "base"
                            }
                        )
                );


        updateCategoryManagementStats();

        renderCategoryManagementList();


    } catch (error) {

        console.error(
            "Erreur chargement catégories :",
            error
        );


        if (container) {

            container.innerHTML = `
                <div class="question-management-empty">
                    Impossible de charger les catégories.
                </div>
            `;
        }
    }
}


/* =========================================================
   STATS
========================================================= */

function updateCategoryManagementStats() {

    const categories =
        categoryManagementState
            .categories;


    const totalQuestions =
        categories.reduce(
            (sum, item) =>
                sum +
                item.questionCount,
            0
        );


    const emptyCategories =
        categories.filter(
            item =>
                item.questionCount === 0
        ).length;


    const totalElement =
        document.getElementById(
            "categoryTotalCount"
        );


    const questionElement =
        document.getElementById(
            "categoryQuestionCount"
        );


    const emptyElement =
        document.getElementById(
            "categoryEmptyCount"
        );


    if (totalElement) {

        totalElement.innerText =
            categories.length;
    }


    if (questionElement) {

        questionElement.innerText =
            totalQuestions;
    }


    if (emptyElement) {

        emptyElement.innerText =
            emptyCategories;
    }
}


/* =========================================================
   LISTE
========================================================= */

function renderCategoryManagementList() {

    const container =
        document.getElementById(
            "categoryManagementList"
        );


    if (!container) {
        return;
    }


    const search =
        String(
            document.getElementById(
                "categorySearchInput"
            )?.value || ""
        )
        .trim()
        .toLowerCase();


    const categories =
        categoryManagementState
            .categories
            .filter(
                item =>
                    item.name
                        .toLowerCase()
                        .includes(
                            search
                        )
            );


    if (!categories.length) {

        container.innerHTML = `
            <div class="question-management-empty">
                Aucune catégorie trouvée.
            </div>
        `;

        return;
    }


    container.innerHTML =
        categories
            .map(
                item => `

                    <article class="category-management-card">

                        <div class="category-management-main">

                            <div class="category-icon">
                                🗂️
                            </div>


                            <div>

                                <h3>
                                    ${escapeHtml(
                                        item.name
                                    )}
                                </h3>

                                <p>
                                    ${item.questionCount}
                                    question(s)
                                </p>

                            </div>

                        </div>


                        <div class="category-management-actions">

                            <button
                                type="button"
                                class="btn-secondary"
                                onclick="openCategoryEditModal('${encodeURIComponent(item.name)}')"
                            >
                                ✏️  Renommer
                            </button>


                            <button
                                type="button"
                                class="question-delete-button"
                                onclick="deleteManagedCategory('${encodeURIComponent(item.name)}')"
                            >
                                🗑 Supprimer
                            </button>

                        </div>

                    </article>

                `
            )
            .join("");
}


/* =========================================================
   CRÉATION
========================================================= */

async function createManagedCategory() {

    const input =
        document.getElementById(
            "newCategoryName"
        );


    if (!input) {
        return;
    }


    const name =
        input.value
            .trim();


    if (!name) {

        alert(
            "Merci de renseigner un nom."
        );

        return;
    }


    const exists =
        categoryManagementState
            .categories
            .some(
                item =>
                    item.name
                        .toLowerCase() ===
                    name.toLowerCase()
            );


    if (exists) {

        alert(
            "Cette catégorie existe déjà."
        );

        return;
    }


    /*
     * Avec la structure actuelle,
     * une catégorie est matérialisée
     * lorsqu'une question utilise ce nom.
     */

    alert(
        `Catégorie "${name}" prête ✅\n\nElle apparaîtra dès qu'une première question sera ajoutée dans cette catégorie.`
    );


    input.value =
        "";
}


/* =========================================================
   OUVRIR MODALE
========================================================= */

function openCategoryEditModal(
    encodedName
) {

    const name =
        decodeURIComponent(
            encodedName
        );


    const category =
        categoryManagementState
            .categories
            .find(
                item =>
                    item.name === name
            );


    if (!category) {
        return;
    }


    categoryManagementState.editingCategory =
        category;


    const input =
        document.getElementById(
            "editCategoryName"
        );


    if (input) {

        input.value =
            category.name;
    }


    const modal =
        document.getElementById(
            "categoryEditModal"
        );


    if (modal) {

        modal.style.display =
            "flex";
    }
}


/* =========================================================
   FERMER MODALE
========================================================= */

function closeCategoryEditModal() {

    const modal =
        document.getElementById(
            "categoryEditModal"
        );


    if (modal) {

        modal.style.display =
            "none";
    }


    categoryManagementState.editingCategory =
        null;
}


/* =========================================================
   RENOMMER
========================================================= */

async function saveCategoryRename() {

    const current =
        categoryManagementState
            .editingCategory;


    if (!current) {
        return;
    }


    const newName =
        document.getElementById(
            "editCategoryName"
        )?.value
        .trim();


    if (!newName) {

        alert(
            "Merci de renseigner un nom."
        );

        return;
    }


    if (
        newName ===
        current.name
    ) {

        closeCategoryEditModal();

        return;
    }


    const duplicate =
        categoryManagementState
            .categories
            .some(
                item =>
                    item.name
                        .toLowerCase() ===
                    newName.toLowerCase()
            );


    if (duplicate) {

        alert(
            "Une catégorie porte déjà ce nom."
        );

        return;
    }


    const confirmation =
        confirm(
            `Renommer "${current.name}" en "${newName}" ?\n\nToutes les questions de cette catégorie seront mises à jour.`
        );


    if (!confirmation) {
        return;
    }


    try {

        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/questions?category=eq.${encodeURIComponent(current.name)}`,
                {
                    method:
                        "PATCH",

                    headers:
                        supabaseHeaders({

                            "Content-Type":
                                "application/json",

                            "Prefer":
                                "return=minimal"
                        }),

                    body:
                        JSON.stringify({

                            category:
                                newName,

                            updated_at:
                                new Date()
                                    .toISOString()
                        })
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        closeCategoryEditModal();

        await loadCategoryManagementData();


        alert(
            "Catégorie renommée ✅"
        );


    } catch (error) {

        console.error(
            "Erreur renommage catégorie :",
            error
        );


        alert(
            "Impossible de renommer la catégorie.\n\n" +
            error.message
        );
    }
}


/* =========================================================
   SUPPRIMER
========================================================= */

async function deleteManagedCategory(
    encodedName
) {

    const name =
        decodeURIComponent(
            encodedName
        );


    const category =
        categoryManagementState
            .categories
            .find(
                item =>
                    item.name === name
            );


    if (!category) {
        return;
    }


    if (
        category.questionCount > 0
    ) {

        alert(
            `Impossible de supprimer "${name}".\n\nCette catégorie contient encore ${category.questionCount} question(s).\n\nDéplace ou supprime d'abord les questions concernées.`
        );

        return;
    }


    alert(
        "Cette catégorie ne contient aucune question."
    );
}
/* =========================================================
   NICKEL MASTER
   FORMATIONS -> CATÉGORIES AUTORISÉES
========================================================= */

/* =========================================================
   FORMATIONS -> CATÉGORIES AUTORISÉES
========================================================= */


/* =========================================================
   NORMALISATION DES NOMS
========================================================= */

function normalizeTrainingName(value) {

    return String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        );
}



/* =========================================================
   NORMALISATION DES NOMS
========================================================= */

function normalizeTrainingName(value) {

    return String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        );
}



/* =========================================================
   CATÉGORIES AUTORISÉES POUR LE COLLABORATEUR
   1 formation acquise = 1 catégorie du même nom
========================================================= */

async function getTrainingEligibleCategories() {

    const profileId =
        localStorage.getItem(
            "profile_id"
        );


    if (!profileId) {

        console.error(
            "❌ profile_id introuvable dans le localStorage"
        );

        return [];
    }


    try {

        /* =================================================
           1. RÉCUPÉRATION DES FORMATIONS ATTRIBUÉES
        ================================================= */

        const userTrainingsResponse =
            await fetch(
                `${SUPABASE_URL}/rest/v1/user_trainings?user_id=eq.${encodeURIComponent(profileId)}&select=training_id`,
                {
                    headers:
                        supabaseHeaders()
                }
            );


        if (!userTrainingsResponse.ok) {

            throw new Error(
                await userTrainingsResponse.text()
            );
        }


        const userTrainings =
            await userTrainingsResponse.json();


        console.log(
            "🎓 user_trainings :",
            userTrainings
        );


        const trainingIds =
            [
                ...new Set(
                    userTrainings
                        .map(
                            item =>
                                item.training_id
                        )
                        .filter(
                            value =>
                                value !== null &&
                                value !== undefined
                        )
                )
            ];


        console.log(
            "🎓 IDs formations attribuées :",
            trainingIds
        );


        if (!trainingIds.length) {

            console.log(
                "⚠️  Aucune formation attribuée."
            );

            return [];
        }



        /* =================================================
           2. RÉCUPÉRATION DES NOMS DES FORMATIONS
        ================================================= */

        const trainingsResponse =
            await fetch(
                `${SUPABASE_URL}/rest/v1/trainings?select=id,name`,
                {
                    headers:
                        supabaseHeaders()
                }
            );


        if (!trainingsResponse.ok) {

            throw new Error(
                await trainingsResponse.text()
            );
        }


        const trainings =
            await trainingsResponse.json();


        const allowedTrainingIds =
            new Set(
                trainingIds.map(
                    id =>
                        String(id)
                )
            );


        const eligibleCategories =
            trainings
                .filter(
                    training =>
                        allowedTrainingIds.has(
                            String(
                                training.id
                            )
                        )
                )
                .map(
                    training => ({
                        id:
                            training.id,

                        name:
                            training.name
                    })
                )
                .sort(
                    (a, b) =>
                        String(a.name || "")
                            .localeCompare(
                                String(b.name || ""),
                                "fr",
                                {
                                    sensitivity:
                                        "base"
                                }
                            )
                );


        console.log(
            "✅ Catégories autorisées selon les formations :",
            eligibleCategories
        );


        return eligibleCategories;


    } catch (error) {

        console.error(
            "❌ Erreur récupération formations autorisées :",
            error
        );

        return [];
    }
}



/* =========================================================
   QUESTIONS AUTORISÉES POUR LE COLLABORATEUR
========================================================= */

async function getTrainingEligibleQuestions() {

    try {

        /* =================================================
           1. FORMATIONS / CATÉGORIES AUTORISÉES
        ================================================= */

        const categories =
            await getTrainingEligibleCategories();


        const allowedCategories =
            new Set(
                categories.map(
                    category =>
                        normalizeTrainingName(
                            category.name
                        )
                )
            );


        console.log(
            "📚 Catégories utilisées pour filtrer les questions :",
            [
                ...allowedCategories
            ]
        );


        if (!allowedCategories.size) {

            console.log(
                "⚠️  Aucune catégorie autorisée."
            );

            return [];
        }



        /* =================================================
           2. RÉCUPÉRATION DES QUESTIONS
        ================================================= */

        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/questions?select=*`,
                {
                    headers:
                        supabaseHeaders()
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        const questions =
            await response.json();


        console.log(
            "❌ Questions récupérées :",
            questions.length
        );



        /* =================================================
           3. FILTRAGE DES QUESTIONS
        ================================================= */

        const eligibleQuestions =
            questions.filter(
                question => {

                    const questionCategory =
                        normalizeTrainingName(
                            question.category
                        );


                    const categoryAllowed =
                        allowedCategories.has(
                            questionCategory
                        );


                    /*
                     * Seuls les types utilisés dans
                     * les entraînements sont autorisés.
                     *
                     * Les questions OPEN restent réservées
                     * au futur bilan de compétences.
                     */

                    const allowedType =
                        [
                            "true_false",
                            "simple_choice",
                            "multiple_choice"
                        ]
                        .includes(
                            String(
                                question.question_type || ""
                            )
                            .trim()
                            .toLowerCase()
                        );


                    /*
                     * Si is_active n'existe pas ou vaut true :
                     * question utilisable.
                     *
                     * Si is_active = false :
                     * question exclue.
                     */

                    const active =
                        question.is_active !== false;


                    return (
                        categoryAllowed &&
                        allowedType &&
                        active
                    );
                }
            );


        console.log(
            "✅ Questions autorisées pour ce collaborateur :",
            eligibleQuestions.length
        );


        return eligibleQuestions;


    } catch (error) {

        console.error(
            "❌ Erreur récupération questions autorisées :",
            error
        );

        return [];
    }
}



/* =========================================================
   MÉLANGE DES QUESTIONS
========================================================= */

function shuffleTrainingQuestions(array) {

    const copy =
        [...array];


    for (
        let i = copy.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );


        [
            copy[i],
            copy[j]
        ] =
        [
            copy[j],
            copy[i]
        ];
    }


    return copy;
}



/* =========================================================
   INITIALISATION ENTRAÎNEMENT CIBLÉ
========================================================= */

async function initializeTargetedTrainingPage() {

    const container =
        document.getElementById(
            "targetedCategoryGrid"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `
        <div class="training-loading">
            Chargement de tes catégories...
        </div>
    `;


    try {

        const categories =
            await getTrainingEligibleCategories();


        const questions =
            await getTrainingEligibleQuestions();


        if (!categories.length) {

            container.innerHTML = `
                <div class="training-empty-state">
                    Aucune catégorie disponible pour le moment.
                </div>
            `;

            return;
        }



        /* =================================================
           ON GARDE UNIQUEMENT LES FORMATIONS
           QUI POSSÈDENT AU MOINS UNE QUESTION
        ================================================= */

        const categoriesWithQuestions =
            categories
                .map(
                    category => {

                        const normalizedCategory =
                            normalizeTrainingName(
                                category.name
                            );


                        const categoryQuestions =
                            questions.filter(
                                question =>
                                    normalizeTrainingName(
                                        question.category
                                    ) ===
                                    normalizedCategory
                            );


                        return {
                            ...category,

                            questionCount:
                                categoryQuestions.length
                        };
                    }
                )
                .filter(
                    category =>
                        category.questionCount > 0
                );


        console.log(
            "🎯 Catégories affichées en ciblé :",
            categoriesWithQuestions
        );


        if (!categoriesWithQuestions.length) {

            container.innerHTML = `
                <div class="training-empty-state">
                    Tes formations sont bien reconnues,
                    mais aucune question d'entraînement
                    n'est encore disponible dans ces catégories.
                </div>
            `;

            return;
        }



        /* =================================================
           AFFICHAGE
        ================================================= */

        container.innerHTML =
            categoriesWithQuestions
                .map(
                    category => `

                        <article class="training-category-card">

                            <div class="training-category-icon">
                                ${getTrainingCategoryIcon(
                                    category.name
                                )}
                            </div>


                            <h3>
                                ${escapeHtml(
                                    category.name
                                )}
                            </h3>


                            <p>
                                Questions disponibles
                            </p>


                            <strong>
                                ${category.questionCount}
                            </strong>


                            <button
                                type="button"
                                onclick="startTargetedTraining('${encodeURIComponent(category.name)}')"
                            >
                                Choisir
                            </button>

                        </article>

                    `
                )
                .join("");


    } catch (error) {

        console.error(
            "❌ Erreur affichage entraînement ciblé :",
            error
        );


        container.innerHTML = `
            <div class="training-empty-state">
                Impossible de charger les catégories.
            </div>
        `;
    }
}
/* =========================================================
   DÉMARRER CIBLÉ
========================================================= */

async function startTargetedTraining(
    encodedCategory
) {

    const category =
        decodeURIComponent(
            encodedCategory
        );


    /*
     * IMPORTANT :
     * on revérifie les droits,
     * même si la catégorie était affichée.
     */

    const allowedCategories =
        await getTrainingEligibleCategories();


    const authorized =
        allowedCategories.some(
            item =>
                String(item.name)
                    .trim()
                    .toLowerCase() ===
                category
                    .trim()
                    .toLowerCase()
        );


    if (!authorized) {

        alert(
            "Cette catégorie n'est pas disponible pour ton profil."
        );

        return;
    }


    const questions =
        await getTrainingEligibleQuestions();


    const categoryQuestions =
        questions.filter(
            question =>
                String(
                    question.category
                )
                .trim()
                .toLowerCase() ===
                category
                    .trim()
                    .toLowerCase()
        );


    const selected =
        shuffleTrainingQuestions(
            categoryQuestions
        )
        .slice(
            0,
            10
        );


    if (!selected.length) {

        alert(
            "Aucune question disponible dans cette catégorie."
        );

        return;
    }


    saveTrainingLaunch(
        "targeted",
        selected,
        category
    );
}



/* =========================================================
   FLASH
========================================================= */

async function initializeFlashTrainingPage() {

    const container =
        document.getElementById(
            "flashCategoryGrid"
        );


    const button =
        document.getElementById(
            "launchFlashButton"
        );


    if (!container || !button) {
        return;
    }


    try {

        const categories =
            await getTrainingEligibleCategories();


        if (!categories.length) {

            container.innerHTML = `
                <div class="training-empty-state">
                    Aucune catégorie disponible.
                </div>
            `;

            button.disabled =
                true;

            return;
        }


        container.innerHTML =
            categories
                .map(
                    category => `
                        <div class="flash-category-item">

                            <span>
                                ${getTrainingCategoryIcon(category.name)}
                            </span>

                            <strong>
                                ${escapeHtml(category.name)}
                            </strong>

                            <b>
                                ✓
                            </b>

                        </div>
                    `
                )
                .join("");


        button.onclick =
            startFlashTraining;


    } catch (error) {

        console.error(
            error
        );
    }
}



/* =========================================================
   LANCER FLASH
========================================================= */

async function startFlashTraining() {

    const questions =
        await getTrainingEligibleQuestions();


    const categories =
        [
            ...new Set(
                questions.map(
                    question =>
                        question.category
                )
            )
        ];


    if (!categories.length) {

        alert(
            "Aucune catégorie disponible."
        );

        return;
    }


    const randomCategory =
        categories[
            Math.floor(
                Math.random() *
                categories.length
            )
        ];


    const categoryQuestions =
        questions.filter(
            question =>
                question.category ===
                randomCategory
        );


    const selected =
        shuffleTrainingQuestions(
            categoryQuestions
        )
        .slice(
            0,
            10
        );


    saveTrainingLaunch(
        "flash",
        selected,
        randomCategory
    );
}



/* =========================================================
   XTREM
========================================================= */

async function initializeXtremTrainingPage() {

    const button =
        document.getElementById(
            "launchXtremButton"
        );


    if (!button) {
        return;
    }


    button.onclick =
        startXtremTraining;
}



/* =========================================================
   LANCER XTREM
========================================================= */

async function startXtremTraining() {

    const questions =
        await getTrainingEligibleQuestions();


    if (!questions.length) {

        alert(
            "Aucune question disponible pour tes formations."
        );

        return;
    }


    const selected =
        shuffleTrainingQuestions(
            questions
        )
        .slice(
            0,
            10
        );


    saveTrainingLaunch(
        "xtrem",
        selected,
        null
    );
}



/* =========================================================
   ENVOI VERS LE QUIZ
========================================================= */

function saveTrainingLaunch(
    mode,
    questions,
    category
) {

    localStorage.setItem(
        "training_mode",
        mode
    );


    localStorage.setItem(
        "training_questions",
        JSON.stringify(
            questions
        )
    );


    if (category) {

        localStorage.setItem(
            "training_category",
            category
        );

    } else {

        localStorage.removeItem(
            "training_category"
        );
    }


    window.location.href =
        "training-quiz.html";
}



/* =========================================================
   ICÔNES CATÉGORIES
========================================================= */

function getTrainingCategoryIcon(
    category
) {

    const value =
        String(
            category || ""
        )
        .toLowerCase();


    if (value.includes("wero")) {
        return "W";
    }


    if (
        value.includes("pro")
    ) {
        return "👤";
    }


    if (
        value.includes("auth")
    ) {
        return "🔒";
    }


    if (
        value.includes("carte")
    ) {
        return "💳";
    }


    if (
        value.includes("sécur") ||
        value.includes("secur")
    ) {
        return "🛡️";
    }


    if (
        value.includes("acquisition")
    ) {
        return "👥";
    }


    return "📚";
}
/* =========================================================
   SIDEBAR ADMIN GLOBALE
========================================================= */

function ensureAdministrationMenu() {

    const role =
        String(
            localStorage.getItem("role") || ""
        )
        .trim()
        .toLowerCase();


    const sideMenu =
        document.querySelector(
            ".side-menu"
        );


    if (!sideMenu) {
        return;
    }


    /* =====================================================
       COMPTE NON ADMIN
    ====================================================== */

    if (role !== "admin") {

        const adminButton =
            document.getElementById(
                "administrationMenuButton"
            );


        if (adminButton) {
            adminButton.remove();
        }


        return;
    }



    /* =====================================================
       ADMIN :
       ON RETIRE LES ENTRÉES QUI DOIVENT ÊTRE
       UNIQUEMENT DANS ADMINISTRATION
    ====================================================== */

    const buttons =
        [
            ...sideMenu.querySelectorAll(
                "button"
            )
        ];


    buttons.forEach(
        button => {

            const text =
                String(
                    button.textContent || ""
                )
                .trim()
                .toLowerCase();


            if (
                text.includes(
                    "approbation"
                ) ||
                text.includes(
                    "boîte à idées"
                ) ||
                text.includes(
                    "boite à idées"
                ) ||
                text.includes(
                    "signalement"
                )
            ) {

                button.remove();
            }
        }
    );



    /* =====================================================
       SUPPRESSION D'ÉVENTUELS DOUBLONS ADMINISTRATION
    ====================================================== */

    const existingAdminButtons =
        [
            ...sideMenu.querySelectorAll(
                "button"
            )
        ]
        .filter(
            button =>
                String(
                    button.textContent || ""
                )
                .trim()
                .toLowerCase()
                .includes(
                    "administration"
                )
        );


    /*
     * On supprime tout pour repartir proprement.
     */

    existingAdminButtons.forEach(
        button =>
            button.remove()
    );



    /* =====================================================
       CRÉATION DU BOUTON ADMINISTRATION
    ====================================================== */

    const administrationButton =
        document.createElement(
            "button"
        );


    administrationButton.id =
        "administrationMenuButton";


    administrationButton.type =
        "button";


    administrationButton.innerHTML =
        "🛡️ Administration";


    administrationButton.onclick =
        function () {

            window.location.href =
                "administration.html";
        };



    /* =====================================================
       ÉTAT ACTIF
    ====================================================== */

    const currentPage =
        String(
            window.location.pathname
                .split("/")
                .pop() ||
            ""
        )
        .toLowerCase();


    const adminPages = [
    "administration.html",
    "admin-quizzes.html",
    "admin-questions.html",
    "admin-question-management.html",
    "admin-categories.html",
    "admin-users.html",
    "admin-user-detail.html",
    "approvals.html"
];



    if (
        adminPages.includes(
            currentPage
        )
    ) {

        administrationButton.classList.add(
            "active"
        );
    }



    /* =====================================================
       AJOUT EN FIN DU MENU PRINCIPAL
    ====================================================== */

    sideMenu.appendChild(
        administrationButton
    );
}



/* =========================================================
   INITIALISATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        ensureAdministrationMenu();

    }
);
/* =========================================================
   =========================================================
   GESTION DES UTILISATEURS - ADMINISTRATION
   =========================================================
========================================================= */


/* =========================================================
   ÉTAT GLOBAL
========================================================= */

const adminUsersState = {

    users: [],

    roles: [],

    teams: [],

    filteredUsers: [],

    currentUser: null,

    currentPage: 1,

    perPage: 6,

    search: "",

    roleFilter: "",

    teamFilter: "",

    statusFilter: ""
};



/* =========================================================
   INITIALISATION PAGE
========================================================= */

async function initializeAdminUsersPage() {

    console.log(
        "👥 Initialisation gestion utilisateurs"
    );


    try {

        await Promise.all([
            loadAdminUsersRoles(),
            loadAdminUsersTeams(),
            loadAdminUsersProfiles()
        ]);


        populateAdminUsersRoleOptions();

        populateAdminUsersTeamOptions();

        populateAdminUsersServiceOptions();

        populateAdminUsersManagerOptions();


        bindAdminUsersEvents();


        applyAdminUsersFilters();


        console.log(
            "✅ Gestion utilisateurs initialisée"
        );


    } catch (error) {

        console.error(
            "❌ Erreur initialisation gestion utilisateurs :",
            error
        );


        const tbody =
            document.getElementById(
                "adminUsersTableBody"
            );


        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="admin-users-loading"
                    >
                        Impossible de charger les utilisateurs.
                    </td>
                </tr>
            `;
        }
    }
}



/* =========================================================
   CHARGEMENT DES RÔLES
========================================================= */

async function loadAdminUsersRoles() {

    const response =
        await fetch(
            `${SUPABASE_URL}/rest/v1/roles?select=id,code,name,hierarchy_level&order=hierarchy_level.asc`,
            {
                headers:
                    supabaseHeaders()
            }
        );


    if (!response.ok) {

        throw new Error(
            await response.text()
        );
    }


    adminUsersState.roles =
        await response.json();


    console.log(
        "🛡️ Rôles :",
        adminUsersState.roles
    );
}



/* =========================================================
   CHARGEMENT DES ÉQUIPES
========================================================= */

async function loadAdminUsersTeams() {

    const response =
        await fetch(
            `${SUPABASE_URL}/rest/v1/teams?select=id,name,manager_id,service,created_at&order=name.asc`,
            {
                headers:
                    supabaseHeaders()
            }
        );


    if (!response.ok) {

        throw new Error(
            await response.text()
        );
    }


    adminUsersState.teams =
        await response.json();


    console.log(
        "👥 Équipes :",
        adminUsersState.teams
    );
}



/* =========================================================
   CHARGEMENT DES PROFILS
========================================================= */

async function loadAdminUsersProfiles() {

    const fields = [
        "id",
        "full_name",
        "username",
        "role",
        "team",
        "job_title",
        "status",
        "level",
        "xp",
        "created_at",
        "must_change_password",
        "team_id",
        "position",
        "hire_date",
        "last_seen_at",
        "avatar_key",
        "first_name",
        "last_name",
        "service",
        "account_status",
        "departure_date",
        "notes",
        "manager_id"
    ]
    .join(",");


    const response =
        await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?select=${fields}&order=full_name.asc`,
            {
                headers:
                    supabaseHeaders()
            }
        );


    if (!response.ok) {

        throw new Error(
            await response.text()
        );
    }


    adminUsersState.users =
        await response.json();


    console.log(
        "👤 Profils :",
        adminUsersState.users
    );
}



/* =========================================================
   ÉVÉNEMENTS
========================================================= */

function bindAdminUsersEvents() {

    const search =
        document.getElementById(
            "adminUsersSearch"
        );


    const role =
        document.getElementById(
            "adminUsersRoleFilter"
        );


    const team =
        document.getElementById(
            "adminUsersTeamFilter"
        );


    const status =
        document.getElementById(
            "adminUsersStatusFilter"
        );


    const perPage =
        document.getElementById(
            "adminUsersPerPage"
        );


    if (search) {

        search.addEventListener(
            "input",
            function () {

                adminUsersState.search =
                    String(
                        search.value || ""
                    )
                    .trim()
                    .toLowerCase();


                adminUsersState.currentPage =
                    1;


                applyAdminUsersFilters();
            }
        );
    }


    if (role) {

        role.addEventListener(
            "change",
            function () {

                adminUsersState.roleFilter =
                    role.value;


                adminUsersState.currentPage =
                    1;


                applyAdminUsersFilters();
            }
        );
    }


    if (team) {

        team.addEventListener(
            "change",
            function () {

                adminUsersState.teamFilter =
                    team.value;


                adminUsersState.currentPage =
                    1;


                applyAdminUsersFilters();
            }
        );
    }


    if (status) {

        status.addEventListener(
            "change",
            function () {

                adminUsersState.statusFilter =
                    status.value;


                adminUsersState.currentPage =
                    1;


                applyAdminUsersFilters();
            }
        );
    }


    if (perPage) {

        perPage.addEventListener(
            "change",
            function () {

                adminUsersState.perPage =
                    Number(
                        perPage.value
                    ) || 6;


                adminUsersState.currentPage =
                    1;


                renderAdminUsersTable();
            }
        );
    }



    /* =====================================================
       PAGINATION
    ====================================================== */

    document
        .getElementById(
            "adminUsersPreviousPage"
        )
        ?.addEventListener(
            "click",
            function () {

                if (
                    adminUsersState.currentPage >
                    1
                ) {

                    adminUsersState.currentPage--;

                    renderAdminUsersTable();
                }
            }
        );


    document
        .getElementById(
            "adminUsersNextPage"
        )
        ?.addEventListener(
            "click",
            function () {

                const totalPages =
                    getAdminUsersTotalPages();


                if (
                    adminUsersState.currentPage <
                    totalPages
                ) {

                    adminUsersState.currentPage++;

                    renderAdminUsersTable();
                }
            }
        );



    /* =====================================================
       MODALE
    ====================================================== */

    document
        .getElementById(
            "adminUserEditClose"
        )
        ?.addEventListener(
            "click",
            closeAdminUserEditModal
        );


    document
        .getElementById(
            "adminUserEditCancel"
        )
        ?.addEventListener(
            "click",
            closeAdminUserEditModal
        );


    document
        .getElementById(
            "adminUserSaveButton"
        )
        ?.addEventListener(
            "click",
            saveAdminUserChanges
        );


    document
        .getElementById(
            "adminUserDeactivateButton"
        )
        ?.addEventListener(
            "click",
            toggleAdminUserAccountStatus
        );



    /* =====================================================
       CHANGEMENT DE FONCTION / RÔLE
    ====================================================== */

    document
        .getElementById(
            "adminUserEditJobTitle"
        )
        ?.addEventListener(
            "change",
            syncAdminUserRolePreview
        );



    /* =====================================================
       CHANGEMENT D'ÉQUIPE
    ====================================================== */

    document
        .getElementById(
            "adminUserEditTeam"
        )
        ?.addEventListener(
            "change",
            handleAdminUserTeamChange
        );



    /* =====================================================
       CLIC HORS DE LA MODALE
    ====================================================== */

    const modal =
        document.getElementById(
            "adminUserEditModal"
        );


    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === modal
                ) {

                    closeAdminUserEditModal();
                }
            }
        );
    }



    /* =====================================================
       AJOUT UTILISATEUR
       POUR LE MOMENT ON GARDE LE BOUTON MAIS SANS CRÉATION
    ====================================================== */

    document
        .getElementById(
            "adminAddUserButton"
        )
        ?.addEventListener(
            "click",
            function () {

                alert(
                    "La création d'utilisateur sera reliée à l'étape suivante."
                );
            }
        );
}



/* =========================================================
   OPTIONS RÔLES
========================================================= */

function populateAdminUsersRoleOptions() {

    const filter =
        document.getElementById(
            "adminUsersRoleFilter"
        );


    const jobTitle =
        document.getElementById(
            "adminUserEditJobTitle"
        );


    if (filter) {

        filter.innerHTML =
            `
                <option value="">
                    Tous les rôles
                </option>
            ` +
            adminUsersState.roles
                .map(
                    role => `
                        <option value="${escapeHtml(role.code)}">
                            ${escapeHtml(role.name)}
                        </option>
                    `
                )
                .join("");
    }


    if (jobTitle) {

        jobTitle.innerHTML =
            adminUsersState.roles
                .map(
                    role => `
                        <option value="${escapeHtml(role.code)}">
                            ${escapeHtml(role.name)}
                        </option>
                    `
                )
                .join("");
    }
}



/* =========================================================
   OPTIONS ÉQUIPES
========================================================= */

function populateAdminUsersTeamOptions() {

    const filter =
        document.getElementById(
            "adminUsersTeamFilter"
        );


    const edit =
        document.getElementById(
            "adminUserEditTeam"
        );


    const options =
        adminUsersState.teams
            .map(
                team => `
                    <option value="${escapeHtml(team.id)}">
                        ${escapeHtml(team.name)}
                    </option>
                `
            )
            .join("");


    if (filter) {

        filter.innerHTML =
            `
                <option value="">
                    Toutes les équipes
                </option>
            ` +
            options;
    }


    if (edit) {

        edit.innerHTML =
            `
                <option value="">
                    Aucune équipe
                </option>
            ` +
            options;
    }
}



/* =========================================================
   OPTIONS SERVICES
========================================================= */

function populateAdminUsersServiceOptions() {

    const select =
        document.getElementById(
            "adminUserEditService"
        );


    if (!select) {
        return;
    }


    const services =
        [
            ...new Set(
                [
                    ...adminUsersState.teams.map(
                        team =>
                            String(
                                team.service || ""
                            )
                            .trim()
                    ),

                    ...adminUsersState.users.map(
                        user =>
                            String(
                                user.service || ""
                            )
                            .trim()
                    )
                ]
                .filter(Boolean)
            )
        ]
        .sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "fr",
                    {
                        sensitivity:
                            "base"
                    }
                )
        );


    select.innerHTML =
        `
            <option value="">
                Aucun service
            </option>
        ` +
        services
            .map(
                service => `
                    <option value="${escapeHtml(service)}">
                        ${escapeHtml(service)}
                    </option>
                `
            )
            .join("");
}



/* =========================================================
   OPTIONS MANAGERS
========================================================= */

function populateAdminUsersManagerOptions() {

    const select =
        document.getElementById(
            "adminUserEditManager"
        );


    if (!select) {
        return;
    }


    const managerRoles =
        new Set([
            "team_leader",
            "manager",
            "responsable",
            "direction",
            "admin"
        ]);


    const possibleManagers =
        adminUsersState.users
            .filter(
                user =>
                    managerRoles.has(
                        String(
                            user.role || ""
                        )
                        .trim()
                        .toLowerCase()
                    )
            )
            .sort(
                (a, b) =>
                    getAdminUserDisplayName(a)
                        .localeCompare(
                            getAdminUserDisplayName(b),
                            "fr"
                        )
            );


    select.innerHTML =
        `
            <option value="">
                Aucun manager
            </option>
        ` +
        possibleManagers
            .map(
                user => `
                    <option value="${escapeHtml(user.id)}">
                        ${escapeHtml(
                            getAdminUserDisplayName(
                                user
                            )
                        )}
                    </option>
                `
            )
            .join("");
}



/* =========================================================
   FILTRES
========================================================= */

function applyAdminUsersFilters() {

    adminUsersState.filteredUsers =
        adminUsersState.users
            .filter(
                user => {

                    const searchText =
                        [
                            user.full_name,
                            user.first_name,
                            user.last_name,
                            user.username,
                            user.job_title,
                            user.position,
                            user.team,
                            user.service
                        ]
                        .map(
                            value =>
                                String(
                                    value || ""
                                )
                                .toLowerCase()
                        )
                        .join(" ");


                    if (
                        adminUsersState.search &&
                        !searchText.includes(
                            adminUsersState.search
                        )
                    ) {

                        return false;
                    }


                    if (
                        adminUsersState.roleFilter &&
                        String(
                            user.role || ""
                        ) !==
                        adminUsersState.roleFilter
                    ) {

                        return false;
                    }


                    if (
                        adminUsersState.teamFilter &&
                        String(
                            user.team_id || ""
                        ) !==
                        adminUsersState.teamFilter
                    ) {

                        return false;
                    }


                    if (
                        adminUsersState.statusFilter &&
                        normalizeAdminAccountStatus(
                            user
                        ) !==
                        adminUsersState.statusFilter
                    ) {

                        return false;
                    }


                    return true;
                }
            );


    updateAdminUsersStats();

    renderAdminUsersTable();
}



/* =========================================================
   STATISTIQUES
========================================================= */

function updateAdminUsersStats() {

    const users =
        adminUsersState.users;


    setAdminUsersText(
        "adminUsersTotal",
        users.length
    );


    setAdminUsersText(
        "adminUsersAdmins",
        users.filter(
            user =>
                String(
                    user.role || ""
                ) ===
                "admin"
        ).length
    );


    const managementRoles =
        new Set([
            "senior",
            "team_leader",
            "manager",
            "responsable",
            "direction"
        ]);


    setAdminUsersText(
        "adminUsersLeaders",
        users.filter(
            user =>
                managementRoles.has(
                    String(
                        user.role || ""
                    )
                )
        ).length
    );


    setAdminUsersText(
        "adminUsersActive",
        users.filter(
            user =>
                normalizeAdminAccountStatus(
                    user
                ) ===
                "active"
        ).length
    );
}



/* =========================================================
   TABLEAU
========================================================= */

function renderAdminUsersTable() {

    const tbody =
        document.getElementById(
            "adminUsersTableBody"
        );


    if (!tbody) {
        return;
    }


    const total =
        adminUsersState.filteredUsers.length;


    const totalPages =
        getAdminUsersTotalPages();


    if (
        adminUsersState.currentPage >
        totalPages
    ) {

        adminUsersState.currentPage =
            totalPages;
    }


    const start =
        (
            adminUsersState.currentPage -
            1
        ) *
        adminUsersState.perPage;


    const end =
        start +
        adminUsersState.perPage;


    const users =
        adminUsersState.filteredUsers
            .slice(
                start,
                end
            );


    if (!users.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="admin-users-loading"
                >
                    Aucun utilisateur trouvé.
                </td>
            </tr>
        `;


        renderAdminUsersPagination();

        return;
    }


    tbody.innerHTML =
        users
            .map(
                user => {

                    const team =
                        getAdminTeamById(
                            user.team_id
                        );


                    const status =
                        normalizeAdminAccountStatus(
                            user
                        );


                    return `
                        <tr>

                            <td>
                                ${renderAdminUserIdentity(user)}
                            </td>


                            <td>
                                <span
                                    class="admin-user-role-badge ${escapeHtml(
                                        String(
                                            user.role || "user"
                                        )
                                    )}"
                                >
                                    ${escapeHtml(
                                        getAdminRoleLabel(
                                            user.role,
                                            user.job_title
                                        )
                                    )}
                                </span>
                            </td>


                            <td>
                                ${
                                    escapeHtml(
                                        team?.name ||
                                        user.team ||
                                        "—"
                                    )
                                }
                            </td>


                            <td>
                                ${
                                    escapeHtml(
                                        user.service ||
                                        team?.service ||
                                        "—"
                                    )
                                }
                            </td>


                            <td>
                                <span
                                    class="admin-user-status-badge ${status}"
                                >
                                    ${getAdminStatusLabel(status)}
                                </span>
                            </td>


                            <td>
                                ${
                                    formatAdminUserLastSeen(
                                        user.last_seen_at
                                    )
                                }
                            </td>


                            <td>

                                <div class="admin-user-actions">

                                    <button
                                        type="button"
                                        class="admin-user-action-button"
                                        onclick="openAdminUserEditModal('${escapeHtml(user.id)}')"
                                        title="Modifier"
                                    >
                                        ✏️
                                    </button>

                                </div>

                            </td>

                        </tr>
                    `;
                }
            )
            .join("");


    renderAdminUsersPagination();
}



/* =========================================================
   IDENTITÉ
========================================================= */

function renderAdminUserIdentity(
    user
) {

    const name =
        getAdminUserDisplayName(
            user
        );


    const initials =
        getAdminUserInitials(
            user
        );


    return `
        <div class="admin-user-cell">

            <div class="admin-user-avatar">
                ${escapeHtml(initials)}
            </div>

            <div class="admin-user-cell-info">

                <strong>
                    ${escapeHtml(name)}
                </strong>

                <span>
                    @${escapeHtml(
                        user.username ||
                        "sans-identifiant"
                    )}
                </span>

            </div>

        </div>
    `;
}



/* =========================================================
   PAGINATION
========================================================= */

function getAdminUsersTotalPages() {

    return Math.max(
        1,
        Math.ceil(
            adminUsersState
                .filteredUsers
                .length /
            adminUsersState.perPage
        )
    );
}



function renderAdminUsersPagination() {

    const total =
        adminUsersState.filteredUsers.length;


    const totalPages =
        getAdminUsersTotalPages();


    const start =
        total
            ? (
                (
                    adminUsersState.currentPage -
                    1
                ) *
                adminUsersState.perPage
            ) + 1
            : 0;


    const end =
        Math.min(
            adminUsersState.currentPage *
            adminUsersState.perPage,
            total
        );


    const info =
        document.getElementById(
            "adminUsersPaginationInfo"
        );


    if (info) {

        info.innerText =
            `Affichage ${start} à ${end} sur ${total} utilisateur(s)`;
    }


    const numbers =
        document.getElementById(
            "adminUsersPageNumbers"
        );


    if (numbers) {

        numbers.innerHTML =
            buildAdminUsersPageButtons(
                totalPages
            );
    }


    const previous =
        document.getElementById(
            "adminUsersPreviousPage"
        );


    const next =
        document.getElementById(
            "adminUsersNextPage"
        );


    if (previous) {

        previous.disabled =
            adminUsersState.currentPage <=
            1;
    }


    if (next) {

        next.disabled =
            adminUsersState.currentPage >=
            totalPages;
    }
}



function buildAdminUsersPageButtons(
    totalPages
) {

    let pages = [];


    if (
        totalPages <=
        7
    ) {

        for (
            let i = 1;
            i <= totalPages;
            i++
        ) {

            pages.push(i);
        }

    } else {

        pages = [
            1,
            2,
            3,
            "...",
            totalPages
        ];


        if (
            adminUsersState.currentPage >
            3 &&
            adminUsersState.currentPage <
            totalPages
        ) {

            pages = [
                1,
                "...",
                adminUsersState.currentPage,
                "...",
                totalPages
            ];
        }
    }


    return pages
        .map(
            page => {

                if (
                    page ===
                    "..."
                ) {

                    return `
                        <span
                            style="
                                display:inline-flex;
                                align-items:center;
                                padding:0 5px;
                            "
                        >
                            …
                        </span>
                    `;
                }


                return `
                    <button
                        type="button"
                        class="${
                            page ===
                            adminUsersState.currentPage
                                ? "active"
                                : ""
                        }"
                        onclick="goToAdminUsersPage(${page})"
                    >
                        ${page}
                    </button>
                `;
            }
        )
        .join("");
}



function goToAdminUsersPage(
    page
) {

    adminUsersState.currentPage =
        page;


    renderAdminUsersTable();
}



/* =========================================================
   OUVERTURE MODALE
========================================================= */

function openAdminUserEditModal(
    userId
) {

    const user =
        adminUsersState.users
            .find(
                item =>
                    String(
                        item.id
                    ) ===
                    String(
                        userId
                    )
            );


    if (!user) {

        console.error(
            "Utilisateur introuvable :",
            userId
        );

        return;
    }


    adminUsersState.currentUser =
        user;


    const modal =
        document.getElementById(
            "adminUserEditModal"
        );


    if (!modal) {
        return;
    }



    /* =====================================================
       IDENTITÉ
    ====================================================== */

    setAdminUsersText(
        "adminUserEditDisplayName",
        getAdminUserDisplayName(
            user
        )
    );


    setAdminUsersText(
        "adminUserEditUsername",
        user.username
            ? `@${user.username}`
            : "—"
    );


    setAdminUsersText(
        "adminUserEditId",
        user.id || "—"
    );


    setAdminUsersText(
        "adminUserEditCreatedAt",
        formatAdminDate(
            user.created_at
        )
    );


    setAdminUsersText(
        "adminUserEditLastSeen",
        formatAdminUserLastSeen(
            user.last_seen_at
        )
    );


    setAdminUsersText(
        "adminUserEditAvatar",
        getAdminUserInitials(
            user
        )
    );



    /* =====================================================
       FORMULAIRE
    ====================================================== */

    setAdminUsersInputValue(
        "adminUserEditFirstName",
        user.first_name ||
        deriveAdminFirstName(
            user.full_name
        )
    );


    setAdminUsersInputValue(
        "adminUserEditLastName",
        user.last_name ||
        deriveAdminLastName(
            user.full_name
        )
    );


    setAdminUsersInputValue(
        "adminUserEditJobTitle",
        user.role ||
        "user"
    );


    setAdminUsersInputValue(
        "adminUserEditRole",
        user.role ||
        "user"
    );


    setAdminUsersInputValue(
        "adminUserEditTeam",
        user.team_id ||
        ""
    );


    const team =
        getAdminTeamById(
            user.team_id
        );


    setAdminUsersSelectValueAllowMissing(
        "adminUserEditService",
        user.service ||
        team?.service ||
        ""
    );


    setAdminUsersInputValue(
        "adminUserEditManager",
        user.manager_id ||
        team?.manager_id ||
        ""
    );


    setAdminUsersInputValue(
        "adminUserEditStatus",
        normalizeAdminAccountStatus(
            user
        )
    );


    setAdminUsersInputValue(
        "adminUserEditHireDate",
        normalizeAdminDateInput(
            user.hire_date
        )
    );


    setAdminUsersInputValue(
        "adminUserEditDepartureDate",
        normalizeAdminDateInput(
            user.departure_date
        )
    );


    setAdminUsersInputValue(
        "adminUserEditNotes",
        user.notes ||
        ""
    );


    updateAdminDeactivateButton(
        user
    );


    modal.style.display =
        "flex";


    document.body.style.overflow =
        "hidden";
}



/* =========================================================
   FERMETURE MODALE
========================================================= */

function closeAdminUserEditModal() {

    const modal =
        document.getElementById(
            "adminUserEditModal"
        );


    if (modal) {

        modal.style.display =
            "none";
    }


    adminUsersState.currentUser =
        null;


    document.body.style.overflow =
        "";
}



/* =========================================================
   APERÇU RÔLE
========================================================= */

function syncAdminUserRolePreview() {

    const jobTitle =
        document.getElementById(
            "adminUserEditJobTitle"
        );


    const role =
        document.getElementById(
            "adminUserEditRole"
        );


    if (
        !jobTitle ||
        !role
    ) {
        return;
    }


    role.value =
        jobTitle.value;
}



/* =========================================================
   ÉQUIPE → SERVICE + MANAGER
========================================================= */

function handleAdminUserTeamChange() {

    const select =
        document.getElementById(
            "adminUserEditTeam"
        );


    if (!select) {
        return;
    }


    const team =
        getAdminTeamById(
            select.value
        );


    if (!team) {
        return;
    }


    if (team.service) {

        setAdminUsersSelectValueAllowMissing(
            "adminUserEditService",
            team.service
        );
    }


    if (team.manager_id) {

        setAdminUsersInputValue(
            "adminUserEditManager",
            team.manager_id
        );
    }
}



/* =========================================================
   SAUVEGARDE
========================================================= */

async function saveAdminUserChanges() {

    const user =
        adminUsersState.currentUser;


    if (!user) {
        return;
    }


    const firstName =
        getAdminUsersInputValue(
            "adminUserEditFirstName"
        )
        .trim();


    const lastName =
        getAdminUsersInputValue(
            "adminUserEditLastName"
        )
        .trim();


    const roleCode =
        getAdminUsersInputValue(
            "adminUserEditJobTitle"
        );


    const role =
        adminUsersState.roles
            .find(
                item =>
                    item.code ===
                    roleCode
            );


    if (!role) {

        alert(
            "Le rôle sélectionné est invalide."
        );

        return;
    }


    const teamId =
        getAdminUsersInputValue(
            "adminUserEditTeam"
        ) ||
        null;


    const team =
        getAdminTeamById(
            teamId
        );


    const service =
        getAdminUsersInputValue(
            "adminUserEditService"
        ) ||
        null;


    const managerId =
        getAdminUsersInputValue(
            "adminUserEditManager"
        ) ||
        null;


    const accountStatus =
        getAdminUsersInputValue(
            "adminUserEditStatus"
        ) ||
        "active";


    const hireDate =
        getAdminUsersInputValue(
            "adminUserEditHireDate"
        ) ||
        null;


    const departureDate =
        getAdminUsersInputValue(
            "adminUserEditDepartureDate"
        ) ||
        null;


    const notes =
        getAdminUsersInputValue(
            "adminUserEditNotes"
        )
        .trim() ||
        null;


    const fullName =
        [
            firstName,
            lastName
        ]
        .filter(Boolean)
        .join(" ")
        .trim();


    if (!fullName) {

        alert(
            "Le nom du collaborateur est obligatoire."
        );

        return;
    }



    /* =====================================================
       SYNCHRONISATION NOUVELLE + ANCIENNE STRUCTURE
    ====================================================== */

    const payload = {

        first_name:
            firstName ||
            null,

        last_name:
            lastName ||
            null,

        full_name:
            fullName,

        role:
            role.code,

        job_title:
            role.name,

        position:
            role.name,

        team_id:
            teamId,

        team:
            team?.name ||
            null,

        service:
            service,

        manager_id:
            managerId,

        account_status:
            accountStatus,

        status:
            convertAdminStatusToLegacy(
                accountStatus
            ),

        hire_date:
            hireDate,

        departure_date:
            departureDate,

        notes:
            notes
    };


    console.log(
        "💾 Modification utilisateur :",
        payload
    );


    const button =
        document.getElementById(
            "adminUserSaveButton"
        );


    const oldText =
        button?.innerHTML;


    if (button) {

        button.disabled = true;

        button.innerHTML =
            "Enregistrement...";
    }


    try {

        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`,
                {
                    method:
                        "PATCH",

                    headers: {
                        ...supabaseHeaders(),

                        "Content-Type":
                            "application/json",

                        Prefer:
                            "return=representation"
                    },

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        const updated =
            await response.json();


        if (
            updated &&
            updated.length
        ) {

            Object.assign(
                user,
                updated[0]
            );
        } else {

            Object.assign(
                user,
                payload
            );
        }


        /*
         * Si on modifie son propre profil,
         * on met également le localStorage à jour.
         */

        const loggedProfileId =
            localStorage.getItem(
                "profile_id"
            );


        if (
            String(
                loggedProfileId
            ) ===
            String(
                user.id
            )
        ) {

            localStorage.setItem(
                "full_name",
                fullName
            );


            localStorage.setItem(
                "role",
                role.code
            );
        }


        populateAdminUsersManagerOptions();

        populateAdminUsersServiceOptions();

        applyAdminUsersFilters();


        closeAdminUserEditModal();


        alert(
            "✅ Les modifications ont été enregistrées."
        );


    } catch (error) {

        console.error(
            "❌ Erreur modification utilisateur :",
            error
        );


        alert(
            "Impossible d'enregistrer les modifications."
        );


    } finally {

        if (button) {

            button.disabled =
                false;


            button.innerHTML =
                oldText ||
                "💾 Enregistrer les modifications";
        }
    }
}



/* =========================================================
   DÉSACTIVER / RÉACTIVER
========================================================= */

async function toggleAdminUserAccountStatus() {

    const user =
        adminUsersState.currentUser;


    if (!user) {
        return;
    }


    const currentStatus =
        normalizeAdminAccountStatus(
            user
        );


    const activating =
        currentStatus !==
        "active";


    const newStatus =
        activating
            ? "active"
            : "inactive";


    const confirmation =
        activating
            ? "Réactiver ce compte ?"
            : "Désactiver ce compte ? Le profil et son historique seront conservés.";


    if (
        !confirm(
            confirmation
        )
    ) {

        return;
    }


    const payload = {

        account_status:
            newStatus,

        status:
            convertAdminStatusToLegacy(
                newStatus
            )
    };


    /*
     * Si on désactive sans date de départ,
     * on peut automatiquement utiliser aujourd'hui.
     */

    if (
        newStatus ===
        "inactive" &&
        !user.departure_date
    ) {

        payload.departure_date =
            new Date()
                .toISOString()
                .slice(
                    0,
                    10
                );
    }


    if (
        newStatus ===
        "active"
    ) {

        payload.departure_date =
            null;
    }


    try {

        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`,
                {
                    method:
                        "PATCH",

                    headers: {
                        ...supabaseHeaders(),

                        "Content-Type":
                            "application/json",

                        Prefer:
                            "return=representation"
                    },

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        Object.assign(
            user,
            payload
        );


        applyAdminUsersFilters();


        closeAdminUserEditModal();


        alert(
            newStatus ===
            "active"
                ? "✅ Le compte a été réactivé."
                : "✅ Le compte a été désactivé."
        );


    } catch (error) {

        console.error(
            "❌ Erreur changement statut :",
            error
        );


        alert(
            "Impossible de modifier le statut du compte."
        );
    }
}



/* =========================================================
   BOUTON DÉSACTIVATION
========================================================= */

function updateAdminDeactivateButton(
    user
) {

    const button =
        document.getElementById(
            "adminUserDeactivateButton"
        );


    if (!button) {
        return;
    }


    const status =
        normalizeAdminAccountStatus(
            user
        );


    if (
        status ===
        "active"
    ) {

        button.innerText =
            "Désactiver le compte";

        button.classList.add(
            "admin-user-danger-button"
        );

    } else {

        button.innerText =
            "Réactiver le compte";
    }
}



/* =========================================================
   OUTILS
========================================================= */

function getAdminTeamById(
    teamId
) {

    if (!teamId) {
        return null;
    }


    return (
        adminUsersState.teams
            .find(
                team =>
                    String(
                        team.id
                    ) ===
                    String(
                        teamId
                    )
            ) ||
        null
    );
}



function getAdminRoleLabel(
    roleCode,
    fallback
) {

    const role =
        adminUsersState.roles
            .find(
                item =>
                    item.code ===
                    roleCode
            );


    return (
        role?.name ||
        fallback ||
        roleCode ||
        "Utilisateur"
    );
}



function normalizeAdminAccountStatus(
    user
) {

    let status =
        String(
            user?.account_status ||
            user?.status ||
            "active"
        )
        .trim()
        .toLowerCase();


    if (
        status ===
        "actif"
    ) {

        status =
            "active";
    }


    if (
        status ===
        "inactif"
    ) {

        status =
            "inactive";
    }


    if (
        status ===
        "suspendu"
    ) {

        status =
            "suspended";
    }


    if (
        ![
            "active",
            "inactive",
            "suspended"
        ]
        .includes(
            status
        )
    ) {

        status =
            "active";
    }


    return status;
}



function convertAdminStatusToLegacy(
    status
) {

    if (
        status ===
        "inactive"
    ) {

        return "inactif";
    }


    if (
        status ===
        "suspended"
    ) {

        return "suspendu";
    }


    return "actif";
}



function getAdminStatusLabel(
    status
) {

    switch (
        status
    ) {

        case "inactive":
            return "Inactif";

        case "suspended":
            return "Suspendu";

        default:
            return "Actif";
    }
}



function getAdminUserDisplayName(
    user
) {

    const constructed =
        [
            user?.first_name,
            user?.last_name
        ]
        .filter(Boolean)
        .join(" ")
        .trim();


    return (
        constructed ||
        user?.full_name ||
        user?.username ||
        "Utilisateur"
    );
}



function getAdminUserInitials(
    user
) {

    const name =
        getAdminUserDisplayName(
            user
        );


    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(
            0,
            2
        )
        .map(
            word =>
                word.charAt(0)
                    .toUpperCase()
        )
        .join("");
}



function deriveAdminFirstName(
    fullName
) {

    const parts =
        String(
            fullName || ""
        )
        .trim()
        .split(/\s+/)
        .filter(Boolean);


    return (
        parts[0] ||
        ""
    );
}



function deriveAdminLastName(
    fullName
) {

    const parts =
        String(
            fullName || ""
        )
        .trim()
        .split(/\s+/)
        .filter(Boolean);


    if (
        parts.length <=
        1
    ) {

        return "";
    }


    return parts
        .slice(1)
        .join(" ");
}



function formatAdminDate(
    value
) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        );
    }


    return date
        .toLocaleDateString(
            "fr-FR"
        );
}



function normalizeAdminDateInput(
    value
) {

    if (!value) {
        return "";
    }


    return String(
        value
    )
    .slice(
        0,
        10
    );
}



function formatAdminUserLastSeen(
    value
) {

    if (!value) {
        return "Jamais";
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";
    }


    const now =
        new Date();


    const difference =
        now.getTime() -
        date.getTime();


    const minutes =
        Math.floor(
            difference /
            60000
        );


    if (
        minutes <
        1
    ) {

        return "À l'instant";
    }


    if (
        minutes <
        60
    ) {

        return `Il y a ${minutes} min`;
    }


    const hours =
        Math.floor(
            minutes /
            60
        );


    if (
        hours <
        24
    ) {

        return `Il y a ${hours} h`;
    }


    const days =
        Math.floor(
            hours /
            24
        );


    if (
        days ===
        1
    ) {

        return "Hier";
    }


    if (
        days <
        30
    ) {

        return `Il y a ${days} jours`;
    }


    return date
        .toLocaleDateString(
            "fr-FR"
        );
}



function setAdminUsersText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value ?? "";
    }
}



function setAdminUsersInputValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.value =
            value ?? "";
    }
}



function getAdminUsersInputValue(
    id
) {

    const element =
        document.getElementById(
            id
        );


    return (
        element?.value ??
        ""
    );
}



function setAdminUsersSelectValueAllowMissing(
    id,
    value
) {

    const select =
        document.getElementById(
            id
        );


    if (!select) {
        return;
    }


    const normalized =
        String(
            value || ""
        );


    const exists =
        [
            ...select.options
        ]
        .some(
            option =>
                option.value ===
                normalized
        );


    if (
        normalized &&
        !exists
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            normalized;


        option.textContent =
            normalized;


        select.appendChild(
            option
        );
    }


    select.value =
        normalized;
}


/* =========================================================
   AFFICHAGE DE LA PAGE UNE FOIS PRÊTE
========================================================= */

function revealNickelMasterPage() {

    const body =
        document.body;


    if (!body) {
        return;
    }


    body.classList.add(
        "page-ready"
    );
}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            requestAnimationFrame(
                revealNickelMasterPage
            );

        },
        {
            once: true
        }
    );

} else {

    requestAnimationFrame(
        revealNickelMasterPage
    );
}

/* =========================================================
   ÉTAT ADMIN ORGANISATION
========================================================= */

const organizationAdminState = {

    services: [],
    teams: [],
    positions: [],
    roles: [],
    profiles: [],
    permissions: [],
    categories: [],
    rolePermissions: [],
    roleCategoryAccess: [],

    currentTab: "services",

    selectedRoleId: null,

    editingServiceId: null,
    editingTeamId: null,
    editingPositionId: null,
    editingRoleId: null
};



/* =========================================================
   RÔLES SYSTÈME PROTÉGÉS
========================================================= */

const ORGANIZATION_SYSTEM_ROLES =
    new Set([
        "user",
        "senior",
        "team_leader",
        "manager",
        "responsable",
        "direction",
        "admin"
    ]);



/* =========================================================
   INITIALISATION
========================================================= */

async function initializeOrganizationAdminPage() {

    try {

        await loadOrganizationAdminData();

        bindOrganizationAdminTabs();
        bindOrganizationFilters();
        bindOrganizationAutoCodes();
        bindOrganizationModalEvents();

        renderOrganizationServices();
        renderOrganizationTeams();
        renderOrganizationPositions();
        renderOrganizationRoles();

        populateOrganizationSelects();

    } catch (error) {

        console.error(
            "❌ Erreur initialisation organisation :",
            error
        );
    }
}



/* =========================================================
   CHARGEMENT DES DONNÉES
========================================================= */

async function loadOrganizationAdminData() {

    const [
        servicesResponse,
        teamsResponse,
        positionsResponse,
        rolesResponse,
        profilesResponse,
        permissionsResponse,
        categoriesResponse,
        rolePermissionsResponse,
        roleCategoryAccessResponse
    ] = await Promise.all([

        fetch(
            `${SUPABASE_URL}/rest/v1/services?select=*&order=name.asc`,
            {
                headers:
                    supabaseHeaders()
            }
        ),

        fetch(
            `${SUPABASE_URL}/rest/v1/teams?select=*&order=name.asc`,
            {
                headers:
                    supabaseHeaders()
            }
        ),

        fetch(
            `${SUPABASE_URL}/rest/v1/positions?select=*&order=name.asc`,
            {
                headers:
                    supabaseHeaders()
            }
        ),

        fetch(
            `${SUPABASE_URL}/rest/v1/roles?select=*&order=hierarchy_level.asc`,
            {
                headers:
                    supabaseHeaders()
            }
        ),

        fetch(
            `${SUPABASE_URL}/rest/v1/profiles?select=id,full_name,username,role,team_id,service_id,position_id,account_status&order=full_name.asc`,
            {
                headers:
                    supabaseHeaders()
            }
        ),

        fetch(
            `${SUPABASE_URL}/rest/v1/permissions?select=*&order=category.asc,name.asc`,
            {
                headers:
                    supabaseHeaders()
            }
        ),

        fetch(
            `${SUPABASE_URL}/rest/v1/categories?select=id,name&order=name.asc`,
            {
                headers:
                    supabaseHeaders()
            }
        ),

        fetch(
            `${SUPABASE_URL}/rest/v1/role_permissions?select=*`,
            {
                headers:
                    supabaseHeaders()
            }
        ),

        fetch(
            `${SUPABASE_URL}/rest/v1/role_category_access?select=*`,
            {
                headers:
                    supabaseHeaders()
            }
        )

    ]);


    const responses = [
        servicesResponse,
        teamsResponse,
        positionsResponse,
        rolesResponse,
        profilesResponse,
        permissionsResponse,
        categoriesResponse,
        rolePermissionsResponse,
        roleCategoryAccessResponse
    ];


    for (const response of responses) {

        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }
    }


    organizationAdminState.services =
        await servicesResponse.json();

    organizationAdminState.teams =
        await teamsResponse.json();

    organizationAdminState.positions =
        await positionsResponse.json();

    organizationAdminState.roles =
        await rolesResponse.json();

    organizationAdminState.profiles =
        await profilesResponse.json();

    organizationAdminState.permissions =
        await permissionsResponse.json();

    organizationAdminState.categories =
        await categoriesResponse.json();

    organizationAdminState.rolePermissions =
        await rolePermissionsResponse.json();

    organizationAdminState.roleCategoryAccess =
        await roleCategoryAccessResponse.json();


    console.log(
        "🏢 Organisation chargée :",
        organizationAdminState
    );
}



/* =========================================================
   RAFRAÎCHISSEMENT COMPLET
========================================================= */

async function refreshOrganizationAdminInterface() {

    await loadOrganizationAdminData();

    renderOrganizationServices();
    renderOrganizationTeams();
    renderOrganizationPositions();
    renderOrganizationRoles();

    populateOrganizationSelects();


    if (
        organizationAdminState.selectedRoleId
    ) {

        const exists =
            organizationAdminState
                .roles
                .some(
                    role =>
                        String(role.id) ===
                        String(
                            organizationAdminState
                                .selectedRoleId
                        )
                );


        if (exists) {

            renderOrganizationRoleConfiguration(
                organizationAdminState
                    .selectedRoleId
            );

        } else {

            organizationAdminState
                .selectedRoleId =
                null;
        }
    }
}



/* =========================================================
   ONGLETS
========================================================= */

function bindOrganizationAdminTabs() {

    document
        .querySelectorAll(
            "[data-organization-tab]"
        )
        .forEach(
            button => {

                if (
                    button.dataset.bound ===
                    "true"
                ) {
                    return;
                }

                button.dataset.bound =
                    "true";


                button.addEventListener(
                    "click",
                    function () {

                        showOrganizationTab(
                            button.dataset
                                .organizationTab
                        );
                    }
                );
            }
        );
}



function showOrganizationTab(tab) {

    organizationAdminState.currentTab =
        tab;


    document
        .querySelectorAll(
            "[data-organization-tab]"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset
                        .organizationTab === tab
                );
            }
        );


    const panels = {

        services:
            "organizationServicesPanel",

        teams:
            "organizationTeamsPanel",

        positions:
            "organizationPositionsPanel",

        permissions:
            "organizationPermissionsPanel"
    };


    Object
        .entries(panels)
        .forEach(
            ([key, id]) => {

                const element =
                    document.getElementById(
                        id
                    );

                if (!element) {
                    return;
                }

                element.style.display =
                    key === tab
                        ? ""
                        : "none";
            }
        );


    if (
        tab ===
        "permissions"
    ) {

        renderOrganizationRoles();
    }
}



/* =========================================================
   GÉNÉRATION DES CODES
========================================================= */

function generateOrganizationCode(value) {

    return String(
        value || ""
    )
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
        /[\u0300-\u036f]/g,
        ""
    )
    .replace(
        /[^a-z0-9]+/g,
        "_"
    )
    .replace(
        /^_+|_+$/g,
        ""
    );
}



/* =========================================================
   FILTRES
========================================================= */

function bindOrganizationFilters() {

    const bindings = [

        [
            "organizationServiceSearch",
            "input",
            renderOrganizationServices
        ],

        [
            "organizationServiceStatusFilter",
            "change",
            renderOrganizationServices
        ],

        [
            "organizationTeamSearch",
            "input",
            renderOrganizationTeams
        ],

        [
            "organizationTeamServiceFilter",
            "change",
            renderOrganizationTeams
        ],

        [
            "organizationTeamStatusFilter",
            "change",
            renderOrganizationTeams
        ],

        [
            "organizationPositionSearch",
            "input",
            renderOrganizationPositions
        ],

        [
            "organizationPositionServiceFilter",
            "change",
            renderOrganizationPositions
        ],

        [
            "organizationPositionStatusFilter",
            "change",
            renderOrganizationPositions
        ],

        [
            "organizationRoleSearch",
            "input",
            renderOrganizationRoles
        ]
    ];


    bindings.forEach(
        ([id, eventName, callback]) => {

            const element =
                document.getElementById(id);

            if (
                !element ||
                element.dataset.bound ===
                "true"
            ) {
                return;
            }

            element.dataset.bound =
                "true";

            element.addEventListener(
                eventName,
                callback
            );
        }
    );
}



/* =========================================================
   CODE AUTO
========================================================= */

function bindOrganizationAutoCodes() {

    bindOrganizationAutoCodePair(
        "organizationServiceName",
        "organizationServiceCode"
    );

    bindOrganizationAutoCodePair(
        "organizationPositionName",
        "organizationPositionCode"
    );

    bindOrganizationAutoCodePair(
        "organizationRoleName",
        "organizationRoleCode"
    );
}



function bindOrganizationAutoCodePair(
    nameId,
    codeId
) {

    const nameInput =
        document.getElementById(nameId);

    const codeInput =
        document.getElementById(codeId);


    if (
        !nameInput ||
        !codeInput ||
        nameInput.dataset
            .organizationCodeBound ===
        "true"
    ) {
        return;
    }


    nameInput.dataset
        .organizationCodeBound =
        "true";


    nameInput.addEventListener(
        "input",
        function () {

            if (
                codeInput.dataset
                    .manualEdit ===
                "true"
            ) {
                return;
            }


            codeInput.value =
                generateOrganizationCode(
                    nameInput.value
                );
        }
    );


    codeInput.addEventListener(
        "input",
        function () {

            codeInput.dataset.manualEdit =
                codeInput.value.trim()
                    ? "true"
                    : "false";
        }
    );
}



/* =========================================================
   MODALES
========================================================= */

function bindOrganizationModalEvents() {

    if (
        document.body.dataset
            .organizationModalsBound ===
        "true"
    ) {
        return;
    }


    document.body.dataset
        .organizationModalsBound =
        "true";


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


            closeOrganizationServiceModal();
            closeOrganizationTeamModal();
            closeOrganizationPositionModal();
            closeOrganizationRoleModal();
        }
    );


    [
        [
            "organizationServiceModal",
            closeOrganizationServiceModal
        ],

        [
            "organizationTeamModal",
            closeOrganizationTeamModal
        ],

        [
            "organizationPositionModal",
            closeOrganizationPositionModal
        ],

        [
            "organizationRoleModal",
            closeOrganizationRoleModal
        ]
    ]
    .forEach(
        ([id, closeFunction]) => {

            const modal =
                document.getElementById(
                    id
                );

            if (!modal) {
                return;
            }


            modal.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target ===
                        modal
                    ) {

                        closeFunction();
                    }
                }
            );
        }
    );
}



/* =========================================================
   SELECTS
========================================================= */

function populateOrganizationSelects() {

    populateOrganizationServiceSelects();

    populateOrganizationRoleSelect();

    populateOrganizationManagerSelect();
}



function populateOrganizationServiceSelects() {

    const services =
        organizationAdminState
            .services
            .filter(
                service =>
                    service.is_active !==
                    false
            );


    const configs = [

        {
            id:
                "organizationTeamService",

            first:
                "Aucun service"
        },

        {
            id:
                "organizationPositionService",

            first:
                "Tous les services / Aucun"
        },

        {
            id:
                "organizationTeamServiceFilter",

            first:
                "Tous les services"
        },

        {
            id:
                "organizationPositionServiceFilter",

            first:
                "Tous les services"
        }
    ];


    configs.forEach(
        config => {

            const select =
                document.getElementById(
                    config.id
                );

            if (!select) {
                return;
            }


            const oldValue =
                select.value;


            select.innerHTML = `

                <option value="">
                    ${config.first}
                </option>

                ${
                    services
                        .map(
                            service => `

                                <option value="${service.id}">
                                    ${escapeHtml(service.name)}
                                </option>

                            `
                        )
                        .join("")
                }
            `;


            if (
                [
                    ...select.options
                ]
                .some(
                    option =>
                        option.value ===
                        oldValue
                )
            ) {

                select.value =
                    oldValue;
            }
        }
    );
}



function populateOrganizationRoleSelect() {

    const select =
        document.getElementById(
            "organizationPositionRole"
        );


    if (!select) {
        return;
    }


    const oldValue =
        select.value;


    select.innerHTML = `

        <option value="">
            Aucun rôle
        </option>

        ${
            organizationAdminState
                .roles
                .map(
                    role => `

                        <option value="${role.id}">
                            ${escapeHtml(role.name)}
                        </option>

                    `
                )
                .join("")
        }
    `;


    if (
        [
            ...select.options
        ]
        .some(
            option =>
                option.value ===
                oldValue
        )
    ) {

        select.value =
            oldValue;
    }
}



function populateOrganizationManagerSelect() {

    const select =
        document.getElementById(
            "organizationTeamManager"
        );


    if (!select) {
        return;
    }


    const roles =
        new Set([
            "team_leader",
            "manager",
            "responsable",
            "direction",
            "admin"
        ]);


    const profiles =
        organizationAdminState
            .profiles
            .filter(
                profile =>
                    roles.has(
                        String(
                            profile.role || ""
                        )
                        .trim()
                        .toLowerCase()
                    )
                    &&
                    String(
                        profile.account_status ||
                        "active"
                    )
                    .toLowerCase() !==
                    "inactive"
            );


    select.innerHTML = `

        <option value="">
            Aucun manager
        </option>

        ${
            profiles
                .map(
                    profile => `

                        <option value="${profile.id}">
                            ${escapeHtml(
                                profile.full_name ||
                                profile.username ||
                                "Utilisateur"
                            )}
                        </option>

                    `
                )
                .join("")
        }
    `;
}



/* =========================================================
   =========================================================
   SERVICES
   =========================================================
========================================================= */

function renderOrganizationServices() {

    const container =
        document.getElementById(
            "organizationServicesList"
        );


    if (!container) {
        return;
    }


    let services =
        [
            ...organizationAdminState.services
        ];


    const search =
        String(
            document.getElementById(
                "organizationServiceSearch"
            )?.value || ""
        )
        .trim()
        .toLowerCase();


    const status =
        String(
            document.getElementById(
                "organizationServiceStatusFilter"
            )?.value || ""
        );


    if (search) {

        services =
            services.filter(
                service =>
                    String(service.name || "")
                        .toLowerCase()
                        .includes(search)
                    ||
                    String(service.code || "")
                        .toLowerCase()
                        .includes(search)
                    ||
                    String(service.description || "")
                        .toLowerCase()
                        .includes(search)
            );
    }


    if (
        status ===
        "active"
    ) {

        services =
            services.filter(
                service =>
                    service.is_active !==
                    false
            );
    }


    if (
        status ===
        "inactive"
    ) {

        services =
            services.filter(
                service =>
                    service.is_active ===
                    false
            );
    }


    if (!services.length) {

        container.innerHTML = `
            <div class="question-management-empty">
                Aucun service.
            </div>
        `;

        return;
    }


    container.innerHTML = `

        <div class="organization-table-header organization-services-header">

            <div>
                Nom du service
            </div>

            <div>
                Code
            </div>

            <div>
                Description
            </div>

            <div>
                Statut
            </div>

            <div>
                Actions
            </div>

        </div>


        ${
            services
                .map(
                    service => `

                        <div class="organization-list-row organization-service-row">

                            <div class="organization-list-main">

                                <strong>
                                    ${escapeHtml(service.name)}
                                </strong>

                            </div>


                            <div class="organization-list-code">

                                ${escapeHtml(
                                    service.code || "—"
                                )}

                            </div>


                            <div class="organization-description-cell">

                                ${escapeHtml(
                                    service.description || "—"
                                )}

                            </div>


                            <div>

                                <span class="${
                                    service.is_active !== false
                                        ? "organization-status-active"
                                        : "organization-status-inactive"
                                }">

                                    ${
                                        service.is_active !== false
                                            ? "Actif"
                                            : "Désactivé"
                                    }

                                </span>

                            </div>


                            <div class="organization-row-actions">

                                <button
                                    type="button"
                                    class="organization-action-button organization-action-edit"
                                    onclick="openOrganizationServiceModal('${service.id}')"
                                    title="Modifier"
                                >
                                    ✏️
                                </button>


                                <button
                                    type="button"
                                    class="organization-action-button"
                                    onclick="toggleOrganizationServiceStatus('${service.id}')"
                                    title="${
                                        service.is_active !== false
                                            ? "Désactiver"
                                            : "Réactiver"
                                    }"
                                >
                                    ${
                                        service.is_active !== false
                                            ? "⏸️"
                                            : "▶"
                                    }
                                </button>


                                <button
                                    type="button"
                                    class="organization-action-button organization-action-delete"
                                    onclick="deleteOrganizationService('${service.id}')"
                                    title="Supprimer"
                                >
                                    🗑
                                </button>

                            </div>

                        </div>

                    `
                )
                .join("")
        }


        <div class="organization-table-footer">

            Total :
            <strong>
                ${services.length}
            </strong>

            service${
                services.length > 1
                    ? "s"
                    : ""
            }

        </div>
    `;
}


function openOrganizationServiceModal(
    serviceId = null
) {

    const modal =
        document.getElementById(
            "organizationServiceModal"
        );


    if (!modal) {
        return;
    }


    organizationAdminState
        .editingServiceId =
        serviceId;


    const title =
        document.getElementById(
            "organizationServiceModalTitle"
        );


    const nameInput =
        document.getElementById(
            "organizationServiceName"
        );


    const codeInput =
        document.getElementById(
            "organizationServiceCode"
        );


    const descriptionInput =
        document.getElementById(
            "organizationServiceDescription"
        );


    const service =
        serviceId
            ? organizationAdminState
                .services
                .find(
                    item =>
                        String(item.id) ===
                        String(serviceId)
                )
            : null;


    if (service) {

        if (title) {

            title.textContent =
                "Modifier le service";
        }


        if (nameInput) {

            nameInput.value =
                service.name || "";
        }


        if (codeInput) {

            codeInput.value =
                service.code || "";

            codeInput.dataset.manualEdit =
                "true";
        }


        if (descriptionInput) {

            descriptionInput.value =
                service.description ||
                "";
        }

    } else {

        if (title) {

            title.textContent =
                "Ajouter un service";
        }


        if (nameInput) {

            nameInput.value = "";
        }


        if (codeInput) {

            codeInput.value = "";

            codeInput.dataset.manualEdit =
                "false";
        }


        if (descriptionInput) {

            descriptionInput.value = "";
        }
    }


    modal.style.display =
        "flex";


    setTimeout(
        () =>
            nameInput?.focus(),
        100
    );
}



function closeOrganizationServiceModal() {

    const modal =
        document.getElementById(
            "organizationServiceModal"
        );


    if (modal) {

        modal.style.display =
            "none";
    }


    organizationAdminState
        .editingServiceId =
        null;
}



async function saveOrganizationService() {

    const editingId =
        organizationAdminState
            .editingServiceId;


    const name =
        String(
            document.getElementById(
                "organizationServiceName"
            )?.value || ""
        )
        .trim();


    let code =
        String(
            document.getElementById(
                "organizationServiceCode"
            )?.value || ""
        )
        .trim();


    const description =
        String(
            document.getElementById(
                "organizationServiceDescription"
            )?.value || ""
        )
        .trim();


    const button =
        document.getElementById(
            "organizationSaveService"
        );


    if (!name) {

        alert(
            "Renseigne le nom du service."
        );

        return;
    }


    if (!code) {

        code =
            generateOrganizationCode(
                name
            );
    }


    const duplicate =
        organizationAdminState
            .services
            .some(
                service =>
                    String(service.id) !==
                    String(editingId || "")
                    &&
                    (
                        String(
                            service.name || ""
                        )
                        .trim()
                        .toLowerCase() ===
                        name.toLowerCase()
                        ||
                        String(
                            service.code || ""
                        )
                        .trim()
                        .toLowerCase() ===
                        code.toLowerCase()
                    )
            );


    if (duplicate) {

        alert(
            "Un service avec ce nom ou ce code existe déjà."
        );

        return;
    }


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Enregistrement...";
    }


    try {

        const url =
            editingId
                ? `${SUPABASE_URL}/rest/v1/services?id=eq.${encodeURIComponent(editingId)}`
                : `${SUPABASE_URL}/rest/v1/services`;


        const response =
            await fetch(
                url,
                {
                    method:
                        editingId
                            ? "PATCH"
                            : "POST",

                    headers: {

                        ...supabaseHeaders(),

                        "Content-Type":
                            "application/json",

                        Prefer:
                            "return=representation"
                    },

                    body:
                        JSON.stringify(
                            {
                                name,
                                code,

                                description:
                                    description ||
                                    null,

                                ...(
                                    editingId
                                        ? {}
                                        : {
                                            is_active:
                                                true
                                        }
                                )
                            }
                        )
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        closeOrganizationServiceModal();

        await refreshOrganizationAdminInterface();


        alert(
            editingId
                ? `Le service "${name}" a bien été modifié.`
                : `Le service "${name}" a bien été créé.`
        );


    } catch (error) {

        console.error(
            "❌ Erreur service :",
            error
        );


        alert(
            "Impossible d'enregistrer le service."
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "💾 Enregistrer";
        }
    }
}



async function toggleOrganizationServiceStatus(
    serviceId
) {

    const service =
        organizationAdminState
            .services
            .find(
                item =>
                    String(item.id) ===
                    String(serviceId)
            );


    if (!service) {
        return;
    }


    const newStatus =
        service.is_active ===
        false;


    if (
        !confirm(
            `${
                newStatus
                    ? "Réactiver"
                    : "Désactiver"
            } le service "${service.name}" ?`
        )
    ) {
        return;
    }


    await updateOrganizationSimpleField(
        "services",
        serviceId,
        {
            is_active:
                newStatus
        }
    );


    await refreshOrganizationAdminInterface();
}



async function deleteOrganizationService(
    serviceId
) {

    const service =
        organizationAdminState
            .services
            .find(
                item =>
                    String(item.id) ===
                    String(serviceId)
            );


    if (!service) {
        return;
    }


    const teamsCount =
        organizationAdminState
            .teams
            .filter(
                team =>
                    String(
                        team.service_id ||
                        ""
                    ) ===
                    String(serviceId)
            )
            .length;


    const positionsCount =
        organizationAdminState
            .positions
            .filter(
                position =>
                    String(
                        position.service_id ||
                        ""
                    ) ===
                    String(serviceId)
            )
            .length;


    const profilesCount =
        organizationAdminState
            .profiles
            .filter(
                profile =>
                    String(
                        profile.service_id ||
                        ""
                    ) ===
                    String(serviceId)
            )
            .length;


    if (
        teamsCount ||
        positionsCount ||
        profilesCount
    ) {

        alert(
            `Impossible de supprimer "${service.name}".\n\n` +
            `Équipes liées : ${teamsCount}\n` +
            `Fonctions liées : ${positionsCount}\n` +
            `Utilisateurs liés : ${profilesCount}\n\n` +
            `Tu peux le désactiver à la place.`
        );

        return;
    }


    if (
        !confirm(
            `Supprimer définitivement le service "${service.name}" ?`
        )
    ) {
        return;
    }


    await deleteOrganizationRecord(
        "services",
        serviceId
    );


    await refreshOrganizationAdminInterface();
}



/* =========================================================
   =========================================================
   ÉQUIPES
   =========================================================
========================================================= */

function renderOrganizationTeams() {

    const container =
        document.getElementById(
            "organizationTeamsList"
        );


    if (!container) {
        return;
    }


    const serviceMap =
        new Map(
            organizationAdminState
                .services
                .map(
                    service => [
                        String(service.id),
                        service
                    ]
                )
        );


    const profileMap =
        new Map(
            organizationAdminState
                .profiles
                .map(
                    profile => [
                        String(profile.id),
                        profile
                    ]
                )
        );


    let teams =
        [
            ...organizationAdminState.teams
        ];


    const search =
        String(
            document.getElementById(
                "organizationTeamSearch"
            )?.value || ""
        )
        .trim()
        .toLowerCase();


    const serviceFilter =
        String(
            document.getElementById(
                "organizationTeamServiceFilter"
            )?.value || ""
        );


    const status =
        String(
            document.getElementById(
                "organizationTeamStatusFilter"
            )?.value || ""
        );


    if (search) {

        teams =
            teams.filter(
                team =>
                    String(team.name || "")
                        .toLowerCase()
                        .includes(search)
            );
    }


    if (serviceFilter) {

        teams =
            teams.filter(
                team =>
                    String(
                        team.service_id || ""
                    ) ===
                    serviceFilter
            );
    }


    if (
        status ===
        "active"
    ) {

        teams =
            teams.filter(
                team =>
                    team.is_active !==
                    false
            );
    }


    if (
        status ===
        "inactive"
    ) {

        teams =
            teams.filter(
                team =>
                    team.is_active ===
                    false
            );
    }


    if (!teams.length) {

        container.innerHTML = `
            <div class="question-management-empty">
                Aucune équipe.
            </div>
        `;

        return;
    }


    container.innerHTML = `

        <div class="organization-table-header organization-teams-header">

            <div>
                Nom de l'équipe
            </div>

            <div>
                Service
            </div>

            <div>
                Manager
            </div>

            <div>
                Statut
            </div>

            <div>
                Actions
            </div>

        </div>


        ${
            teams
                .map(
                    team => {

                        const service =
                            serviceMap.get(
                                String(
                                    team.service_id || ""
                                )
                            );


                        const manager =
                            profileMap.get(
                                String(
                                    team.manager_id || ""
                                )
                            );


                        return `

                            <div class="organization-list-row organization-team-row">

                                <div class="organization-list-main">

                                    <strong>
                                        ${escapeHtml(team.name)}
                                    </strong>

                                </div>


                                <div>

                                    ${
                                        service
                                            ? escapeHtml(service.name)
                                            : "—"
                                    }

                                </div>


                                <div class="organization-manager-cell">

                                    ${
                                        manager
                                            ? `
                                                <div class="organization-mini-avatar">

                                                    ${escapeHtml(
                                                        String(
                                                            manager.full_name ||
                                                            "?"
                                                        )
                                                        .charAt(0)
                                                        .toUpperCase()
                                                    )}

                                                </div>

                                                <span>
                                                    ${escapeHtml(
                                                        manager.full_name
                                                    )}
                                                </span>
                                            `
                                            : "—"
                                    }

                                </div>


                                <div>

                                    <span class="${
                                        team.is_active !== false
                                            ? "organization-status-active"
                                            : "organization-status-inactive"
                                    }">

                                        ${
                                            team.is_active !== false
                                                ? "Actif"
                                                : "Désactivé"
                                        }

                                    </span>

                                </div>


                                <div class="organization-row-actions">

                                    <button
                                        type="button"
                                        class="organization-action-button organization-action-edit"
                                        onclick="openOrganizationTeamModal('${team.id}')"
                                        title="Modifier"
                                    >
                                        ✏️
                                    </button>


                                    <button
                                        type="button"
                                        class="organization-action-button"
                                        onclick="toggleOrganizationTeamStatus('${team.id}')"
                                        title="${
                                            team.is_active !== false
                                                ? "Désactiver"
                                                : "Réactiver"
                                        }"
                                    >
                                        ${
                                            team.is_active !== false
                                                ? "⏸️"
                                                : "▶"
                                        }
                                    </button>


                                    <button
                                        type="button"
                                        class="organization-action-button organization-action-delete"
                                        onclick="deleteOrganizationTeam('${team.id}')"
                                        title="Supprimer"
                                    >
                                        🗑
                                    </button>

                                </div>

                            </div>
                        `;
                    }
                )
                .join("")
        }


        <div class="organization-table-footer">

            Total :
            <strong>
                ${teams.length}
            </strong>

            équipe${
                teams.length > 1
                    ? "s"
                    : ""
            }

        </div>
    `;
}


function openOrganizationTeamModal(
    teamId = null
) {

    const modal =
        document.getElementById(
            "organizationTeamModal"
        );


    if (!modal) {
        return;
    }


    organizationAdminState
        .editingTeamId =
        teamId;


    const team =
        teamId
            ? organizationAdminState
                .teams
                .find(
                    item =>
                        String(item.id) ===
                        String(teamId)
                )
            : null;


    const title =
        document.getElementById(
            "organizationTeamModalTitle"
        );


    const name =
        document.getElementById(
            "organizationTeamName"
        );


    const service =
        document.getElementById(
            "organizationTeamService"
        );


    const manager =
        document.getElementById(
            "organizationTeamManager"
        );


    if (team) {

        if (title) {

            title.textContent =
                "Modifier l'équipe";
        }


        if (name) {

            name.value =
                team.name || "";
        }


        if (service) {

            service.value =
                team.service_id ||
                "";
        }


        if (manager) {

            manager.value =
                team.manager_id ||
                "";
        }

    } else {

        if (title) {

            title.textContent =
                "Ajouter une équipe";
        }


        if (name) {

            name.value = "";
        }


        if (service) {

            service.value = "";
        }


        if (manager) {

            manager.value = "";
        }
    }


    modal.style.display =
        "flex";
}



function closeOrganizationTeamModal() {

    const modal =
        document.getElementById(
            "organizationTeamModal"
        );


    if (modal) {

        modal.style.display =
            "none";
    }


    organizationAdminState
        .editingTeamId =
        null;
}



async function saveOrganizationTeam() {

    const editingId =
        organizationAdminState
            .editingTeamId;


    const name =
        String(
            document.getElementById(
                "organizationTeamName"
            )?.value || ""
        )
        .trim();


    const serviceId =
        String(
            document.getElementById(
                "organizationTeamService"
            )?.value || ""
        )
        .trim();


    const managerId =
        String(
            document.getElementById(
                "organizationTeamManager"
            )?.value || ""
        )
        .trim();


    const button =
        document.getElementById(
            "organizationSaveTeam"
        );


    if (!name) {

        alert(
            "Renseigne le nom de l'équipe."
        );

        return;
    }


    const duplicate =
        organizationAdminState
            .teams
            .some(
                team =>
                    String(team.id) !==
                    String(editingId || "")
                    &&
                    String(
                        team.name || ""
                    )
                    .trim()
                    .toLowerCase() ===
                    name.toLowerCase()
            );


    if (duplicate) {

        alert(
            "Une équipe avec ce nom existe déjà."
        );

        return;
    }


    const selectedService =
        organizationAdminState
            .services
            .find(
                service =>
                    String(service.id) ===
                    serviceId
            );


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Enregistrement...";
    }


    try {

        const response =
            await fetch(
                editingId
                    ? `${SUPABASE_URL}/rest/v1/teams?id=eq.${encodeURIComponent(editingId)}`
                    : `${SUPABASE_URL}/rest/v1/teams`,
                {
                    method:
                        editingId
                            ? "PATCH"
                            : "POST",

                    headers: {

                        ...supabaseHeaders(),

                        "Content-Type":
                            "application/json",

                        Prefer:
                            "return=representation"
                    },

                    body:
                        JSON.stringify(
                            {
                                name,

                                service_id:
                                    serviceId ||
                                    null,

                                service:
                                    selectedService
                                        ?.name ||
                                    null,

                                manager_id:
                                    managerId ||
                                    null,

                                ...(
                                    editingId
                                        ? {}
                                        : {
                                            is_active:
                                                true
                                        }
                                )
                            }
                        )
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        closeOrganizationTeamModal();

        await refreshOrganizationAdminInterface();


        alert(
            editingId
                ? `L'équipe "${name}" a été modifiée.`
                : `L'équipe "${name}" a été créée.`
        );


    } catch (error) {

        console.error(
            "❌ Erreur équipe :",
            error
        );


        alert(
            "Impossible d'enregistrer l'équipe."
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "💾 Enregistrer";
        }
    }
}



async function toggleOrganizationTeamStatus(
    teamId
) {

    const team =
        organizationAdminState
            .teams
            .find(
                item =>
                    String(item.id) ===
                    String(teamId)
            );


    if (!team) {
        return;
    }


    const newStatus =
        team.is_active ===
        false;


    if (
        !confirm(
            `${
                newStatus
                    ? "Réactiver"
                    : "Désactiver"
            } l'équipe "${team.name}" ?`
        )
    ) {
        return;
    }


    await updateOrganizationSimpleField(
        "teams",
        teamId,
        {
            is_active:
                newStatus
        }
    );


    await refreshOrganizationAdminInterface();
}



async function deleteOrganizationTeam(
    teamId
) {

    const team =
        organizationAdminState
            .teams
            .find(
                item =>
                    String(item.id) ===
                    String(teamId)
            );


    if (!team) {
        return;
    }


    const users =
        organizationAdminState
            .profiles
            .filter(
                profile =>
                    String(
                        profile.team_id ||
                        ""
                    ) ===
                    String(teamId)
            )
            .length;


    if (users) {

        alert(
            `Impossible de supprimer "${team.name}".\n\n` +
            `${users} utilisateur(s) sont encore rattachés à cette équipe.\n\n` +
            `Déplace-les d'abord ou désactive l'équipe.`
        );

        return;
    }


    if (
        !confirm(
            `Supprimer définitivement l'équipe "${team.name}" ?`
        )
    ) {
        return;
    }


    await deleteOrganizationRecord(
        "teams",
        teamId
    );


    await refreshOrganizationAdminInterface();
}



/* =========================================================
   =========================================================
   FONCTIONS
   =========================================================
========================================================= */

function renderOrganizationPositions() {

    const container =
        document.getElementById(
            "organizationPositionsList"
        );


    if (!container) {
        return;
    }


    const roleMap =
        new Map(
            organizationAdminState
                .roles
                .map(
                    role => [
                        String(role.id),
                        role
                    ]
                )
        );


    const serviceMap =
        new Map(
            organizationAdminState
                .services
                .map(
                    service => [
                        String(service.id),
                        service
                    ]
                )
        );


    let positions =
        [
            ...organizationAdminState.positions
        ];


    const search =
        String(
            document.getElementById(
                "organizationPositionSearch"
            )?.value || ""
        )
        .trim()
        .toLowerCase();


    const serviceFilter =
        String(
            document.getElementById(
                "organizationPositionServiceFilter"
            )?.value || ""
        );


    const status =
        String(
            document.getElementById(
                "organizationPositionStatusFilter"
            )?.value || ""
        );


    if (search) {

        positions =
            positions.filter(
                position =>
                    String(position.name || "")
                        .toLowerCase()
                        .includes(search)
                    ||
                    String(position.code || "")
                        .toLowerCase()
                        .includes(search)
            );
    }


    if (serviceFilter) {

        positions =
            positions.filter(
                position =>
                    String(
                        position.service_id || ""
                    ) ===
                    serviceFilter
            );
    }


    if (
        status ===
        "active"
    ) {

        positions =
            positions.filter(
                position =>
                    position.is_active !==
                    false
            );
    }


    if (
        status ===
        "inactive"
    ) {

        positions =
            positions.filter(
                position =>
                    position.is_active ===
                    false
            );
    }


    if (!positions.length) {

        container.innerHTML = `
            <div class="question-management-empty">
                Aucune fonction.
            </div>
        `;

        return;
    }


    container.innerHTML = `

        <div class="organization-table-header organization-positions-header">

            <div>
                Nom de la fonction
            </div>

            <div>
                Code
            </div>

            <div>
                Rôle associé
            </div>

            <div>
                Service
            </div>

            <div>
                Statut
            </div>

            <div>
                Actions
            </div>

        </div>


        ${
            positions
                .map(
                    position => {

                        const role =
                            roleMap.get(
                                String(
                                    position.role_id || ""
                                )
                            );


                        const service =
                            serviceMap.get(
                                String(
                                    position.service_id || ""
                                )
                            );


                        return `

                            <div class="organization-list-row organization-position-row">

                                <div class="organization-list-main">

                                    <strong>
                                        ${escapeHtml(position.name)}
                                    </strong>

                                </div>


                                <div class="organization-list-code">

                                    ${escapeHtml(
                                        position.code || "—"
                                    )}

                                </div>


                                <div>

                                    ${
                                        role
                                            ? escapeHtml(role.name)
                                            : "Aucun rôle"
                                    }

                                </div>


                                <div>

                                    ${
                                        service
                                            ? escapeHtml(service.name)
                                            : "Tous les services"
                                    }

                                </div>


                                <div>

                                    <span class="${
                                        position.is_active !== false
                                            ? "organization-status-active"
                                            : "organization-status-inactive"
                                    }">

                                        ${
                                            position.is_active !== false
                                                ? "Actif"
                                                : "Désactivé"
                                        }

                                    </span>

                                </div>


                                <div class="organization-row-actions">

                                    <button
                                        type="button"
                                        class="organization-action-button organization-action-edit"
                                        onclick="openOrganizationPositionModal('${position.id}')"
                                        title="Modifier"
                                    >
                                        ✏️
                                    </button>


                                    <button
                                        type="button"
                                        class="organization-action-button"
                                        onclick="toggleOrganizationPositionStatus('${position.id}')"
                                        title="${
                                            position.is_active !== false
                                                ? "Désactiver"
                                                : "Réactiver"
                                        }"
                                    >
                                        ${
                                            position.is_active !== false
                                                ? "⏸️"
                                                : "▶"
                                        }
                                    </button>


                                    <button
                                        type="button"
                                        class="organization-action-button organization-action-delete"
                                        onclick="deleteOrganizationPosition('${position.id}')"
                                        title="Supprimer"
                                    >
                                        🗑
                                    </button>

                                </div>

                            </div>
                        `;
                    }
                )
                .join("")
        }


        <div class="organization-table-footer">

            Total :
            <strong>
                ${positions.length}
            </strong>

            fonction${
                positions.length > 1
                    ? "s"
                    : ""
            }

        </div>
    `;
}




function openOrganizationPositionModal(
    positionId = null
) {

    organizationAdminState
        .editingPositionId =
        positionId;


    const modal =
        document.getElementById(
            "organizationPositionModal"
        );


    if (!modal) {
        return;
    }


    const position =
        positionId
            ? organizationAdminState
                .positions
                .find(
                    item =>
                        String(item.id) ===
                        String(positionId)
                )
            : null;


    const title =
        document.getElementById(
            "organizationPositionModalTitle"
        );


    const name =
        document.getElementById(
            "organizationPositionName"
        );


    const code =
        document.getElementById(
            "organizationPositionCode"
        );


    const role =
        document.getElementById(
            "organizationPositionRole"
        );


    const service =
        document.getElementById(
            "organizationPositionService"
        );


    const description =
        document.getElementById(
            "organizationPositionDescription"
        );


    if (position) {

        if (title) {

            title.textContent =
                "Modifier la fonction";
        }


        name.value =
            position.name || "";

        code.value =
            position.code || "";

        code.dataset.manualEdit =
            "true";

        role.value =
            position.role_id || "";

        service.value =
            position.service_id || "";

        description.value =
            position.description || "";

    } else {

        if (title) {

            title.textContent =
                "Ajouter une fonction";
        }


        name.value = "";
        code.value = "";

        code.dataset.manualEdit =
            "false";

        role.value = "";
        service.value = "";
        description.value = "";
    }


    modal.style.display =
        "flex";
}



function closeOrganizationPositionModal() {

    const modal =
        document.getElementById(
            "organizationPositionModal"
        );


    if (modal) {

        modal.style.display =
            "none";
    }


    organizationAdminState
        .editingPositionId =
        null;
}



async function saveOrganizationPosition() {

    const editingId =
        organizationAdminState
            .editingPositionId;


    const name =
        String(
            document.getElementById(
                "organizationPositionName"
            )?.value || ""
        )
        .trim();


    let code =
        String(
            document.getElementById(
                "organizationPositionCode"
            )?.value || ""
        )
        .trim();


    const roleId =
        String(
            document.getElementById(
                "organizationPositionRole"
            )?.value || ""
        )
        .trim();


    const serviceId =
        String(
            document.getElementById(
                "organizationPositionService"
            )?.value || ""
        )
        .trim();


    const description =
        String(
            document.getElementById(
                "organizationPositionDescription"
            )?.value || ""
        )
        .trim();


    const button =
        document.getElementById(
            "organizationSavePosition"
        );


    if (!name) {

        alert(
            "Renseigne le nom de la fonction."
        );

        return;
    }


    if (!code) {

        code =
            generateOrganizationCode(
                name
            );
    }


    if (!roleId) {

        alert(
            "Choisis un rôle associé."
        );

        return;
    }


    const duplicate =
        organizationAdminState
            .positions
            .some(
                position =>
                    String(position.id) !==
                    String(editingId || "")
                    &&
                    (
                        String(
                            position.name || ""
                        )
                        .trim()
                        .toLowerCase() ===
                        name.toLowerCase()
                        ||
                        String(
                            position.code || ""
                        )
                        .trim()
                        .toLowerCase() ===
                        code.toLowerCase()
                    )
            );


    if (duplicate) {

        alert(
            "Une fonction avec ce nom ou ce code existe déjà."
        );

        return;
    }


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Enregistrement...";
    }


    try {

        const response =
            await fetch(
                editingId
                    ? `${SUPABASE_URL}/rest/v1/positions?id=eq.${encodeURIComponent(editingId)}`
                    : `${SUPABASE_URL}/rest/v1/positions`,
                {
                    method:
                        editingId
                            ? "PATCH"
                            : "POST",

                    headers: {

                        ...supabaseHeaders(),

                        "Content-Type":
                            "application/json",

                        Prefer:
                            "return=representation"
                    },

                    body:
                        JSON.stringify(
                            {
                                name,
                                code,

                                role_id:
                                    roleId,

                                service_id:
                                    serviceId ||
                                    null,

                                description:
                                    description ||
                                    null,

                                ...(
                                    editingId
                                        ? {}
                                        : {
                                            is_active:
                                                true
                                        }
                                )
                            }
                        )
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        closeOrganizationPositionModal();

        await refreshOrganizationAdminInterface();


        alert(
            editingId
                ? `La fonction "${name}" a été modifiée.`
                : `La fonction "${name}" a été créée.`
        );


    } catch (error) {

        console.error(
            "❌ Erreur fonction :",
            error
        );


        alert(
            "Impossible d'enregistrer la fonction."
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "💾 Enregistrer";
        }
    }
}



async function toggleOrganizationPositionStatus(
    positionId
) {

    const position =
        organizationAdminState
            .positions
            .find(
                item =>
                    String(item.id) ===
                    String(positionId)
            );


    if (!position) {
        return;
    }


    const newStatus =
        position.is_active ===
        false;


    if (
        !confirm(
            `${
                newStatus
                    ? "Réactiver"
                    : "Désactiver"
            } la fonction "${position.name}" ?`
        )
    ) {
        return;
    }


    await updateOrganizationSimpleField(
        "positions",
        positionId,
        {
            is_active:
                newStatus
        }
    );


    await refreshOrganizationAdminInterface();
}



async function deleteOrganizationPosition(
    positionId
) {

    const position =
        organizationAdminState
            .positions
            .find(
                item =>
                    String(item.id) ===
                    String(positionId)
            );


    if (!position) {
        return;
    }


    const users =
        organizationAdminState
            .profiles
            .filter(
                profile =>
                    String(
                        profile.position_id ||
                        ""
                    ) ===
                    String(positionId)
            )
            .length;


    if (users) {

        alert(
            `Impossible de supprimer "${position.name}".\n\n` +
            `${users} utilisateur(s) utilisent encore cette fonction.\n\n` +
            `Désactive-la ou modifie les profils concernés.`
        );

        return;
    }


    if (
        !confirm(
            `Supprimer définitivement la fonction "${position.name}" ?`
        )
    ) {
        return;
    }


    await deleteOrganizationRecord(
        "positions",
        positionId
    );


    await refreshOrganizationAdminInterface();
}



/* =========================================================
   =========================================================
   RÔLES & ACCÈS
   =========================================================
========================================================= */

function renderOrganizationRoles() {

    const container =
        document.getElementById(
            "organizationRoleList"
        );


    if (!container) {
        return;
    }


    const search =
        String(
            document.getElementById(
                "organizationRoleSearch"
            )?.value || ""
        )
        .trim()
        .toLowerCase();


    let roles =
        [
            ...organizationAdminState
                .roles
        ];


    if (search) {

        roles =
            roles.filter(
                role =>
                    String(
                        role.name || ""
                    )
                    .toLowerCase()
                    .includes(search)
                    ||
                    String(
                        role.code || ""
                    )
                    .toLowerCase()
                    .includes(search)
            );
    }


    container.innerHTML =
        roles
            .map(
                role => {

                    const selected =
                        String(
                            organizationAdminState
                                .selectedRoleId ||
                            ""
                        ) ===
                        String(role.id);


                    const systemRole =
                        ORGANIZATION_SYSTEM_ROLES
                            .has(
                                String(
                                    role.code ||
                                    ""
                                )
                                .toLowerCase()
                            );


                    return `

                        <div class="organization-role-item-wrapper">

                            <button
                                type="button"
                                class="organization-role-item ${
                                    selected
                                        ? "active"
                                        : ""
                                }"
                                onclick="selectOrganizationRole('${role.id}')"
                            >

                                <div>

                                    <strong>
                                        ${escapeHtml(role.name)}
                                    </strong>

                                    <small>
                                        ${escapeHtml(role.code)}
                                    </small>

                                </div>

                                <span>
                                    Niveau ${
                                        role.hierarchy_level ??
                                        "—"
                                    }
                                </span>

                            </button>


                            ${
                                !systemRole
                                    ? `

                                        <div class="organization-role-actions">

                                            <button
                                                type="button"
                                                onclick="openOrganizationRoleModal('${role.id}')"
                                                title="Modifier"
                                            >
                                                ✏️
                                            </button>

                                            <button
                                                type="button"
                                                onclick="deleteOrganizationRole('${role.id}')"
                                                title="Supprimer"
                                            >
                                                🗑️
                                            </button>

                                        </div>

                                    `
                                    : ""
                            }

                        </div>
                    `;
                }
            )
            .join("");
}



function openOrganizationRoleModal(
    roleId = null
) {

    organizationAdminState
        .editingRoleId =
        roleId;


    const modal =
        document.getElementById(
            "organizationRoleModal"
        );


    if (!modal) {
        return;
    }


    const role =
        roleId
            ? organizationAdminState
                .roles
                .find(
                    item =>
                        String(item.id) ===
                        String(roleId)
                )
            : null;


    const title =
        modal.querySelector(
            ".question-edit-modal-header h2"
        );


    const name =
        document.getElementById(
            "organizationRoleName"
        );


    const code =
        document.getElementById(
            "organizationRoleCode"
        );


    const hierarchy =
        document.getElementById(
            "organizationRoleHierarchy"
        );


    if (role) {

        title.textContent =
            "Modifier le rôle";

        name.value =
            role.name || "";

        code.value =
            role.code || "";

        code.dataset.manualEdit =
            "true";

        hierarchy.value =
            role.hierarchy_level ??
            1;

    } else {

        title.textContent =
            "Ajouter un rôle";

        name.value = "";
        code.value = "";

        code.dataset.manualEdit =
            "false";

        hierarchy.value =
            1;
    }


    modal.style.display =
        "flex";
}



function closeOrganizationRoleModal() {

    const modal =
        document.getElementById(
            "organizationRoleModal"
        );


    if (modal) {

        modal.style.display =
            "none";
    }


    organizationAdminState
        .editingRoleId =
        null;
}



async function saveOrganizationRole() {

    const editingId =
        organizationAdminState
            .editingRoleId;


    const name =
        String(
            document.getElementById(
                "organizationRoleName"
            )?.value || ""
        )
        .trim();


    let code =
        String(
            document.getElementById(
                "organizationRoleCode"
            )?.value || ""
        )
        .trim();


    const hierarchyLevel =
        Math.max(
            1,
            Number(
                document.getElementById(
                    "organizationRoleHierarchy"
                )?.value || 1
            )
        );


    const button =
        document.getElementById(
            "organizationSaveRoleButton"
        );


    if (!name) {

        alert(
            "Renseigne le nom du rôle."
        );

        return;
    }


    if (!code) {

        code =
            generateOrganizationCode(
                name
            );
    }


    const duplicate =
        organizationAdminState
            .roles
            .some(
                role =>
                    String(role.id) !==
                    String(editingId || "")
                    &&
                    (
                        String(
                            role.name || ""
                        )
                        .trim()
                        .toLowerCase() ===
                        name.toLowerCase()
                        ||
                        String(
                            role.code || ""
                        )
                        .trim()
                        .toLowerCase() ===
                        code.toLowerCase()
                    )
            );


    if (duplicate) {

        alert(
            "Un rôle avec ce nom ou ce code existe déjà."
        );

        return;
    }


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Enregistrement...";
    }


    try {

        const response =
            await fetch(
                editingId
                    ? `${SUPABASE_URL}/rest/v1/roles?id=eq.${encodeURIComponent(editingId)}`
                    : `${SUPABASE_URL}/rest/v1/roles`,
                {
                    method:
                        editingId
                            ? "PATCH"
                            : "POST",

                    headers: {

                        ...supabaseHeaders(),

                        "Content-Type":
                            "application/json",

                        Prefer:
                            "return=representation"
                    },

                    body:
                        JSON.stringify(
                            {
                                name,
                                code,

                                hierarchy_level:
                                    hierarchyLevel
                            }
                        )
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        closeOrganizationRoleModal();

        await refreshOrganizationAdminInterface();


        alert(
            editingId
                ? `Le rôle "${name}" a été modifié.`
                : `Le rôle "${name}" a été créé.`
        );


    } catch (error) {

        console.error(
            "❌ Erreur rôle :",
            error
        );


        alert(
            "Impossible d'enregistrer le rôle."
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "💾 Créer le rôle";
        }
    }
}



async function deleteOrganizationRole(
    roleId
) {

    const role =
        organizationAdminState
            .roles
            .find(
                item =>
                    String(item.id) ===
                    String(roleId)
            );


    if (!role) {
        return;
    }


    if (
        ORGANIZATION_SYSTEM_ROLES.has(
            String(
                role.code ||
                ""
            )
            .toLowerCase()
        )
    ) {

        alert(
            "Ce rôle système est protégé et ne peut pas être supprimé."
        );

        return;
    }


    const positions =
        organizationAdminState
            .positions
            .filter(
                position =>
                    String(
                        position.role_id ||
                        ""
                    ) ===
                    String(roleId)
            )
            .length;


    const profiles =
        organizationAdminState
            .profiles
            .filter(
                profile =>
                    String(
                        profile.role ||
                        ""
                    )
                    .toLowerCase() ===
                    String(
                        role.code ||
                        ""
                    )
                    .toLowerCase()
            )
            .length;


    if (
        positions ||
        profiles
    ) {

        alert(
            `Impossible de supprimer "${role.name}".\n\n` +
            `Fonctions liées : ${positions}\n` +
            `Utilisateurs liés : ${profiles}`
        );

        return;
    }


    if (
        !confirm(
            `Supprimer définitivement le rôle "${role.name}" ?`
        )
    ) {
        return;
    }


    await deleteOrganizationRecord(
        "role_permissions",
        roleId,
        "role_id"
    );


    await deleteOrganizationRecord(
        "role_category_access",
        roleId,
        "role_id"
    );


    await deleteOrganizationRecord(
        "roles",
        roleId
    );


    await refreshOrganizationAdminInterface();
}



function selectOrganizationRole(
    roleId
) {

    organizationAdminState
        .selectedRoleId =
        roleId;


    renderOrganizationRoles();


    renderOrganizationRoleConfiguration(
        roleId
    );
}



function renderOrganizationRoleConfiguration(
    roleId
) {

    const role =
        organizationAdminState
            .roles
            .find(
                item =>
                    String(item.id) ===
                    String(roleId)
            );


    if (!role) {
        return;
    }


    const title =
        document.getElementById(
            "organizationPermissionTitle"
        );


    const subtitle =
        document.getElementById(
            "organizationPermissionSubtitle"
        );


    const saveBar =
        document.getElementById(
            "organizationRoleSaveBar"
        );


    const categorySection =
        document.getElementById(
            "organizationRoleCategoriesSection"
        );


    const emptyCategoryMessage =
        document.getElementById(
            "organizationCategoryEmptyMessage"
        );


    if (title) {

        title.textContent =
            role.name;
    }


    if (subtitle) {

        subtitle.textContent =
            `Code : ${role.code} • Niveau hiérarchique : ${role.hierarchy_level ?? "—"}`;
    }


    if (saveBar) {

        saveBar.style.display =
            "flex";
    }


    if (categorySection) {

        categorySection.style.display =
            "";
    }


    if (emptyCategoryMessage) {

        emptyCategoryMessage.style.display =
            "none";
    }


    renderOrganizationPermissionCheckboxes(
        roleId
    );


    renderOrganizationCategoryCheckboxes(
        roleId
    );
}



function renderOrganizationPermissionCheckboxes(
    roleId
) {

    const container =
        document.getElementById(
            "organizationPermissionContent"
        );


    if (!container) {
        return;
    }


    const allowed =
        new Set(
            organizationAdminState
                .rolePermissions
                .filter(
                    item =>
                        String(item.role_id) ===
                        String(roleId)
                        &&
                        item.is_allowed !==
                        false
                )
                .map(
                    item =>
                        String(
                            item.permission_id
                        )
                )
        );


    const groups = {};


    organizationAdminState
        .permissions
        .filter(
            permission =>
                permission.is_active !==
                false
        )
        .forEach(
            permission => {

                const category =
                    String(
                        permission.category ||
                        "autres"
                    );


                if (!groups[category]) {

                    groups[category] = [];
                }


                groups[category].push(
                    permission
                );
            }
        );


    if (
        !Object.keys(groups).length
    ) {

        container.innerHTML = `
            <div class="question-management-empty">
                Aucune permission disponible.
            </div>
        `;

        return;
    }


    container.innerHTML =
        Object
            .entries(groups)
            .map(
                ([category, permissions]) => `

                    <div class="organization-permission-group">

                        <h4>
                            ${escapeHtml(
                                getOrganizationPermissionCategoryLabel(
                                    category
                                )
                            )}
                        </h4>


                        <div class="organization-permission-options">

                            ${
                                permissions
                                    .map(
                                        permission => `

                                            <label class="organization-permission-option">

                                                <div class="organization-permission-option-text">

                                                    <strong>
                                                        ${escapeHtml(
                                                            permission.name
                                                        )}
                                                    </strong>

                                                    <small>
                                                        ${escapeHtml(
                                                            permission.description ||
                                                            permission.code
                                                        )}
                                                    </small>

                                                </div>


                                                <input
                                                    type="checkbox"
                                                    data-role-permission="${permission.id}"
                                                    ${
                                                        allowed.has(
                                                            String(
                                                                permission.id
                                                            )
                                                        )
                                                            ? "checked"
                                                            : ""
                                                    }
                                                >

                                            </label>

                                        `
                                    )
                                    .join("")
                            }

                        </div>

                    </div>

                `
            )
            .join("");
}


function renderOrganizationCategoryCheckboxes(
    roleId
) {

    const container =
        document.getElementById(
            "organizationRoleCategories"
        );


    if (!container) {
        return;
    }


    const allowed =
        new Set(
            organizationAdminState
                .roleCategoryAccess
                .filter(
                    item =>
                        String(item.role_id) ===
                        String(roleId)
                        &&
                        item.is_allowed !==
                        false
                )
                .map(
                    item =>
                        String(
                            item.category_id
                        )
                )
        );


    if (
        !organizationAdminState
            .categories
            .length
    ) {

        container.innerHTML = `
            <div class="question-management-empty">
                Aucune catégorie disponible.
            </div>
        `;

        return;
    }


    container.innerHTML =
        organizationAdminState
            .categories
            .map(
                category => `

                    <label class="organization-category-access-option">

                        <input
                            type="checkbox"
                            data-role-category="${category.id}"
                            ${
                                allowed.has(
                                    String(
                                        category.id
                                    )
                                )
                                    ? "checked"
                                    : ""
                            }
                        >

                        <span>
                            ${escapeHtml(category.name)}
                        </span>

                    </label>

                `
            )
            .join("");
}

async function saveOrganizationRolePermissions() {

    const roleId =
        organizationAdminState
            .selectedRoleId;


    if (!roleId) {

        alert(
            "Sélectionne d'abord un rôle."
        );

        return;
    }


    const button =
        document.getElementById(
            "organizationSaveRolePermissionsButton"
        );


    const permissionIds =
        [
            ...document.querySelectorAll(
                "[data-role-permission]:checked"
            )
        ]
        .map(
            input =>
                input.dataset
                    .rolePermission
        );


    const categoryIds =
        [
            ...document.querySelectorAll(
                "[data-role-category]:checked"
            )
        ]
        .map(
            input =>
                input.dataset
                    .roleCategory
        );


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Enregistrement...";
    }


    try {

        let response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/role_permissions?role_id=eq.${encodeURIComponent(roleId)}`,
                {
                    method:
                        "DELETE",

                    headers:
                        supabaseHeaders()
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        if (
            permissionIds.length
        ) {

            response =
                await fetch(
                    `${SUPABASE_URL}/rest/v1/role_permissions`,
                    {
                        method:
                            "POST",

                        headers: {

                            ...supabaseHeaders(),

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                permissionIds
                                    .map(
                                        permissionId => ({
                                            role_id:
                                                roleId,

                                            permission_id:
                                                permissionId,

                                            is_allowed:
                                                true
                                        })
                                    )
                            )
                    }
                );


            if (!response.ok) {

                throw new Error(
                    await response.text()
                );
            }
        }


        response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/role_category_access?role_id=eq.${encodeURIComponent(roleId)}`,
                {
                    method:
                        "DELETE",

                    headers:
                        supabaseHeaders()
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        if (
            categoryIds.length
        ) {

            response =
                await fetch(
                    `${SUPABASE_URL}/rest/v1/role_category_access`,
                    {
                        method:
                            "POST",

                        headers: {

                            ...supabaseHeaders(),

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                categoryIds
                                    .map(
                                        categoryId => ({
                                            role_id:
                                                roleId,

                                            category_id:
                                                categoryId,

                                            is_allowed:
                                                true
                                        })
                                    )
                            )
                    }
                );


            if (!response.ok) {

                throw new Error(
                    await response.text()
                );
            }
        }


        await loadOrganizationAdminData();


        renderOrganizationRoles();


        renderOrganizationRoleConfiguration(
            roleId
        );


        alert(
            "✅ Les accès du rôle ont été enregistrés."
        );


    } catch (error) {

        console.error(
            "❌ Sauvegarde accès rôle :",
            error
        );


        alert(
            "Impossible d'enregistrer les accès."
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "💾 Enregistrer les accès";
        }
    }
}



/* =========================================================
   OUTILS UPDATE / DELETE
========================================================= */

async function updateOrganizationSimpleField(
    table,
    id,
    data
) {

    try {

        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,
                {
                    method:
                        "PATCH",

                    headers: {

                        ...supabaseHeaders(),

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(data)
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


    } catch (error) {

        console.error(
            `❌ Modification ${table} :`,
            error
        );


        alert(
            "Impossible d'effectuer la modification."
        );


        throw error;
    }
}



async function deleteOrganizationRecord(
    table,
    value,
    column = "id"
) {

    try {

        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`,
                {
                    method:
                        "DELETE",

                    headers:
                        supabaseHeaders()
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


    } catch (error) {

        console.error(
            `❌ Suppression ${table} :`,
            error
        );


        alert(
            "Impossible de supprimer cet élément."
        );


        throw error;
    }
}



/* =========================================================
   LIBELLÉS PERMISSIONS
========================================================= */

function getOrganizationPermissionCategoryLabel(
    category
) {

    const labels = {

        training:
            "🎯 Entraînements",

        questions:
            "❌ Questions & Quiz",

        formations:
            "🎓 Formations",

        users:
            "👥 Utilisateurs",

        organization:
            "🏢 Organisation",

        stats:
            "📊 Statistiques",

        approvals:
            "✅ Approbations",

        reports:
            "🚩 Signalements",

        ideas:
            "💡 Boîte à idées",

        administration:
            "🛡️ Administration"
    };


    return (
        labels[category] ||
        category
    );
}


/* =========================================================
   NICKEL MASTER - GÉNÉRATEUR DE QUESTIONS PAR IA

   Ce bloc prépare le front-end du générateur IA.
   Il n'expose aucune clé OpenAI dans le navigateur.

   La génération passe obligatoirement par :
       POST /api/generate-questions

   La route serveur sera créée séparément côté Vercel.
========================================================= */

let aiQuestionGeneratorState = {

    generatedQuestions: [],

    images: [],

    categories: [],

    isGenerating: false
};


/* =========================================================
   INITIALISATION PAGE IA
========================================================= */

async function initializeAIQuestionGeneratorPage() {

    const root =
        document.getElementById(
            "aiQuestionGeneratorRoot"
        );


    if (!root) {
        return;
    }


    const role =
        String(
            localStorage.getItem("role") || ""
        )
        .trim()
        .toLowerCase();


    if (role !== "admin") {

        alert(
            "Cette page est réservée à l'administrateur."
        );

        window.location.href =
            "home.html";

        return;
    }


    await loadAIQuestionCategories();

    setupAIQuestionGeneratorEvents();

    renderAIQuestionImagePreview();

    renderAIGeneratedQuestions();

    updateAIQuestionGenerateButtonState();
}


/* =========================================================
   CATÉGORIES
========================================================= */

async function loadAIQuestionCategories() {

    const select =
        document.getElementById(
            "aiQuestionCategory"
        );


    try {

        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/questions?select=category&order=category.asc`,
                {
                    headers:
                        supabaseHeaders()
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        const rows =
            await response.json();


        const categories =
            [
                ...new Set(
                    rows
                        .map(
                            item =>
                                String(
                                    item.category || ""
                                ).trim()
                        )
                        .filter(Boolean)
                )
            ]
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        "fr"
                    )
            );


        aiQuestionGeneratorState.categories =
            categories;


        if (!select) {
            return;
        }


        select.innerHTML = `
            <option value="">
                Choisir une catégorie
            </option>
            ${
                categories
                    .map(
                        category => `
                            <option value="${escapeHtml(category)}">
                                ${escapeHtml(category)}
                            </option>
                        `
                    )
                    .join("")
            }
        `;


    } catch (error) {

        console.error(
            "Erreur chargement catégories IA :",
            error
        );


        if (select) {

            select.innerHTML = `
                <option value="">
                    Catégories indisponibles
                </option>
            `;
        }
    }
}


/* =========================================================
   ÉVÉNEMENTS
========================================================= */

function setupAIQuestionGeneratorEvents() {

    const text =
        document.getElementById(
            "aiQuestionSourceText"
        );

    const imageInput =
        document.getElementById(
            "aiQuestionImageInput"
        );

    const generateButton =
        document.getElementById(
            "aiGenerateQuestionsButton"
        );

    const saveButton =
        document.getElementById(
            "aiSaveSelectedQuestionsButton"
        );

    const selectAll =
        document.getElementById(
            "aiSelectAllQuestions"
        );


    if (text) {

        text.addEventListener(
            "input",
            updateAIQuestionGenerateButtonState
        );
    }


    if (imageInput) {

        imageInput.addEventListener(
            "change",
            handleAIQuestionImageSelection
        );
    }


    if (generateButton) {

        generateButton.addEventListener(
            "click",
            generateQuestionsWithAI
        );
    }


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveSelectedAIGeneratedQuestions
        );
    }


    if (selectAll) {

        selectAll.addEventListener(
            "change",
            function () {

                const checked =
                    selectAll.checked;


                aiQuestionGeneratorState
                    .generatedQuestions
                    .forEach(
                        item => {
                            item.selected =
                                checked;
                        }
                    );


                renderAIGeneratedQuestions();
            }
        );
    }
}


/* =========================================================
   IMAGES
========================================================= */

async function handleAIQuestionImageSelection(
    event
) {

    const files =
        Array.from(
            event.target?.files || []
        );


    if (!files.length) {
        return;
    }


    const remainingSlots =
        Math.max(
            0,
            8 -
            aiQuestionGeneratorState.images.length
        );


    if (!remainingSlots) {

        alert(
            "Tu peux importer au maximum 8 images par génération."
        );

        event.target.value = "";

        return;
    }


    const acceptedFiles =
        files.slice(
            0,
            remainingSlots
        );


    const allowedTypes =
        new Set([
            "image/jpeg",
            "image/png",
            "image/webp"
        ]);


    for (
        const file
        of acceptedFiles
    ) {

        if (
            !allowedTypes.has(
                file.type
            )
        ) {

            alert(
                `Le fichier "${file.name}" n'est pas au format JPG, PNG ou WebP.`
            );

            continue;
        }


        if (
            file.size >
            8 * 1024 * 1024
        ) {

            alert(
                `L'image "${file.name}" dépasse 8 Mo.`
            );

            continue;
        }


        const dataUrl =
            await readAIQuestionFileAsDataUrl(
                file
            );


        aiQuestionGeneratorState
            .images
            .push({

                id:
                    `${Date.now()}_${Math.random().toString(36).slice(2)}`,

                name:
                    file.name,

                type:
                    file.type,

                size:
                    file.size,

                dataUrl:
                    dataUrl
            });
    }


    event.target.value = "";

    renderAIQuestionImagePreview();

    updateAIQuestionGenerateButtonState();
}


function readAIQuestionFileAsDataUrl(
    file
) {

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();


            reader.onload =
                () => resolve(
                    reader.result
                );


            reader.onerror =
                () => reject(
                    new Error(
                        `Impossible de lire ${file.name}.`
                    )
                );


            reader.readAsDataURL(
                file
            );
        }
    );
}


function removeAIQuestionImage(
    imageId
) {

    aiQuestionGeneratorState.images =
        aiQuestionGeneratorState
            .images
            .filter(
                image =>
                    String(image.id) !==
                    String(imageId)
            );


    renderAIQuestionImagePreview();

    updateAIQuestionGenerateButtonState();
}


function renderAIQuestionImagePreview() {

    const container =
        document.getElementById(
            "aiQuestionImagePreview"
        );


    if (!container) {
        return;
    }


    const images =
        aiQuestionGeneratorState.images;


    if (!images.length) {

        container.innerHTML = `
            <div class="ai-question-image-empty">
                Aucune image ajoutée.
            </div>
        `;

        return;
    }


    container.innerHTML =
        images
            .map(
                image => `

                    <div class="ai-question-image-item">

                        <img
                            src="${image.dataUrl}"
                            alt="${escapeHtml(image.name)}"
                        >

                        <div class="ai-question-image-meta">

                            <strong>
                                ${escapeHtml(image.name)}
                            </strong>

                            <small>
                                ${formatAIQuestionFileSize(image.size)}
                            </small>

                        </div>

                        <button
                            type="button"
                            class="ai-question-image-remove"
                            onclick="removeAIQuestionImage('${image.id}')"
                            title="Retirer cette image"
                        >
                            ✕
                        </button>

                    </div>
                `
            )
            .join("");
}


function formatAIQuestionFileSize(
    bytes
) {

    const value =
        Number(bytes || 0);


    if (
        value < 1024
    ) {

        return `${value} o`;
    }


    if (
        value <
        1024 * 1024
    ) {

        return `${(
            value / 1024
        ).toFixed(1)} Ko`;
    }


    return `${(
        value /
        1024 /
        1024
    ).toFixed(1)} Mo`;
}


/* =========================================================
   OPTIONS DE GÉNÉRATION
========================================================= */

function getSelectedAIQuestionTypes() {

    const definitions = [

        [
            "aiQuestionTypeTrueFalse",
            "true_false"
        ],

        [
            "aiQuestionTypeSimpleChoice",
            "simple_choice"
        ],

        [
            "aiQuestionTypeMultipleChoice",
            "multiple_choice"
        ],

        [
            "aiQuestionTypeOpen",
            "open"
        ]
    ];


    return definitions
        .filter(
            ([id]) =>
                document.getElementById(id)
                    ?.checked
        )
        .map(
            ([, type]) =>
                type
        );
}


function collectAIQuestionGeneratorOptions() {

    const text =
        String(
            document.getElementById(
                "aiQuestionSourceText"
            )?.value || ""
        )
        .trim();


    const category =
        String(
            document.getElementById(
                "aiQuestionCategory"
            )?.value || ""
        )
        .trim();


    const difficulty =
        String(
            document.getElementById(
                "aiQuestionDifficulty"
            )?.value ||
            "mixed"
        )
        .trim();


    const requestedCount =
        Number(
            document.getElementById(
                "aiQuestionCount"
            )?.value ||
            10
        );


    const questionCount =
        Math.min(
            30,
            Math.max(
                1,
                Number.isFinite(
                    requestedCount
                )
                    ? Math.round(
                        requestedCount
                    )
                    : 10
            )
        );


    const types =
        getSelectedAIQuestionTypes();


    return {

        text:
            text,

        category:
            category,

        difficulty:
            difficulty,

        questionCount:
            questionCount,

        types:
            types,

        images:
            aiQuestionGeneratorState
                .images
                .map(
                    image => ({

                        name:
                            image.name,

                        type:
                            image.type,

                        dataUrl:
                            image.dataUrl
                    })
                )
    };
}


function validateAIQuestionGeneratorOptions(
    options
) {

    if (
        !options.text &&
        !options.images.length
    ) {

        alert(
            "Colle un texte ou ajoute au moins une image."
        );

        return false;
    }


    if (!options.category) {

        alert(
            "Choisis la catégorie dans laquelle les questions seront ajoutées."
        );

        return false;
    }


    if (!options.types.length) {

        alert(
            "Choisis au moins un type de question."
        );

        return false;
    }


    return true;
}


function updateAIQuestionGenerateButtonState() {

    const button =
        document.getElementById(
            "aiGenerateQuestionsButton"
        );


    if (!button) {
        return;
    }


    const text =
        String(
            document.getElementById(
                "aiQuestionSourceText"
            )?.value || ""
        )
        .trim();


    const hasSource =
        Boolean(text) ||
        aiQuestionGeneratorState
            .images
            .length > 0;


    button.disabled =
        aiQuestionGeneratorState.isGenerating ||
        !hasSource;
}


/* =========================================================
   APPEL DE L'API IA
========================================================= */

async function generateQuestionsWithAI() {

    if (
        aiQuestionGeneratorState.isGenerating
    ) {
        return;
    }


    const options =
        collectAIQuestionGeneratorOptions();


    if (
        !validateAIQuestionGeneratorOptions(
            options
        )
    ) {
        return;
    }


    const button =
        document.getElementById(
            "aiGenerateQuestionsButton"
        );

    const status =
        document.getElementById(
            "aiGenerationStatus"
        );


    aiQuestionGeneratorState.isGenerating =
        true;

    updateAIQuestionGenerateButtonState();


    if (button) {

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            "✨ Génération en cours...";
    }


    if (status) {

        status.style.display =
            "";

        status.textContent =
            options.images.length
                ? "Analyse du texte et des images, puis création des questions..."
                : "Analyse du texte et création des questions...";
    }


    try {

        const response =
            await fetch(
                "/api/generate-questions",
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            sourceType:
                                options.text &&
                                options.images.length
                                    ? "mixed"
                                    : options.images.length
                                        ? "images"
                                        : "text",

                            text:
                                options.text,

                            images:
                                options.images,

                            questionCount:
                                options.questionCount,

                            types:
                                options.types,

                            difficulty:
                                options.difficulty,

                            categoryName:
                                options.category,

                            includeExplanation:
                                true
                        })
                }
            );


        const responseText =
            await response.text();


        let data = null;


        try {

            data =
                responseText
                    ? JSON.parse(
                        responseText
                    )
                    : null;

        } catch (parseError) {

            console.warn(
                "Réponse IA non JSON :",
                responseText,
                parseError
            );
        }


        if (!response.ok) {

            const message =
                data?.error ||
                data?.message ||
                responseText ||
                `Erreur HTTP ${response.status}`;


            throw new Error(
                message
            );
        }


        const rawQuestions =
            Array.isArray(data)
                ? data
                : Array.isArray(
                    data?.questions
                )
                    ? data.questions
                    : [];


        if (!rawQuestions.length) {

            throw new Error(
                "L'IA n'a retourné aucune question exploitable."
            );
        }


        aiQuestionGeneratorState.generatedQuestions =
            rawQuestions
                .map(
                    (question, index) =>
                        normalizeAIGeneratedQuestion(
                            question,
                            index,
                            options.category
                        )
                )
                .filter(Boolean);


        if (
            !aiQuestionGeneratorState
                .generatedQuestions
                .length
        ) {

            throw new Error(
                "Les questions retournées par l'IA sont invalides."
            );
        }


        renderAIGeneratedQuestions();


        if (status) {

            status.textContent =
                `${aiQuestionGeneratorState.generatedQuestions.length} question(s) générée(s). Relis-les avant de les enregistrer.`;
        }


        const resultSection =
            document.getElementById(
                "aiGeneratedQuestionsSection"
            );


        if (resultSection) {

            resultSection.style.display =
                "";

            resultSection.scrollIntoView({
                behavior:
                    "smooth",
                block:
                    "start"
            });
        }


    } catch (error) {

        console.error(
            "Erreur génération IA :",
            error
        );


        if (status) {

            status.textContent =
                "La génération a échoué.";
        }


        alert(
            "Impossible de générer les questions.\n\n" +
            error.message
        );


    } finally {

        aiQuestionGeneratorState.isGenerating =
            false;


        if (button) {

            button.textContent =
                button.dataset.originalText ||
                "✨ Générer les questions";
        }


        updateAIQuestionGenerateButtonState();
    }
}


/* =========================================================
   NORMALISATION DES QUESTIONS IA
========================================================= */

function normalizeAIQuestionType(
    value
) {

    const normalized =
        String(value || "")
        .trim()
        .toLowerCase();


    const aliases = {

        truefalse:
            "true_false",

        "true-false":
            "true_false",

        vrai_faux:
            "true_false",

        vrai_faux_question:
            "true_false",

        single_choice:
            "simple_choice",

        simplechoice:
            "simple_choice",

        "simple-choice":
            "simple_choice",

        qcm_simple:
            "simple_choice",

        multiplechoice:
            "multiple_choice",

        "multiple-choice":
            "multiple_choice",

        qcm_multiple:
            "multiple_choice",

        open_question:
            "open",

        ouverte:
            "open"
    };


    return (
        aliases[normalized] ||
        normalized
    );
}


function normalizeAIGeneratedQuestion(
    rawQuestion,
    index,
    defaultCategory
) {

    if (
        !rawQuestion ||
        typeof rawQuestion !==
        "object"
    ) {
        return null;
    }


    const type =
        normalizeAIQuestionType(
            rawQuestion.type ||
            rawQuestion.question_type
        );


    if (
        ![
            "true_false",
            "simple_choice",
            "multiple_choice",
            "open"
        ].includes(type)
    ) {
        return null;
    }


    const questionText =
        String(
            rawQuestion.question ||
            rawQuestion.text ||
            ""
        )
        .trim();


    if (!questionText) {
        return null;
    }


    const answers =
        Array.isArray(
            rawQuestion.answers
        )
            ? rawQuestion.answers
            : [];


    const choices = {
        A: "",
        B: "",
        C: "",
        D: ""
    };


    const correct = [];


    if (
        type ===
        "true_false"
    ) {

        choices.A =
            "Vrai";

        choices.B =
            "Faux";


        let trueFalseCorrect =
            rawQuestion.correct_answer ??
            rawQuestion.correctAnswer ??
            null;


        if (
            trueFalseCorrect === null &&
            answers.length
        ) {

            const answerIndex =
                answers.findIndex(
                    answer =>
                        answer?.correct ===
                        true
                );


            if (
                answerIndex === 0
            ) {
                trueFalseCorrect =
                    "A";
            }


            if (
                answerIndex === 1
            ) {
                trueFalseCorrect =
                    "B";
            }
        }


        const normalizedCorrect =
            String(
                trueFalseCorrect ?? ""
            )
            .trim()
            .toLowerCase();


        if (
            [
                "a",
                "vrai",
                "true"
            ].includes(
                normalizedCorrect
            )
        ) {

            correct.push("A");
        }


        if (
            [
                "b",
                "faux",
                "false"
            ].includes(
                normalizedCorrect
            )
        ) {

            correct.push("B");
        }


    } else if (
        type !==
        "open"
    ) {

        const letters =
            [
                "A",
                "B",
                "C",
                "D"
            ];


        if (answers.length) {

            answers
                .slice(0, 4)
                .forEach(
                    (answer, answerIndex) => {

                        const letter =
                            letters[
                                answerIndex
                            ];


                        choices[letter] =
                            String(
                                answer?.text ||
                                answer?.answer ||
                                ""
                            )
                            .trim();


                        if (
                            answer?.correct ===
                            true
                        ) {

                            correct.push(
                                letter
                            );
                        }
                    }
                );

        } else {

            choices.A =
                String(
                    rawQuestion.choice_a ||
                    rawQuestion.choices?.A ||
                    ""
                ).trim();

            choices.B =
                String(
                    rawQuestion.choice_b ||
                    rawQuestion.choices?.B ||
                    ""
                ).trim();

            choices.C =
                String(
                    rawQuestion.choice_c ||
                    rawQuestion.choices?.C ||
                    ""
                ).trim();

            choices.D =
                String(
                    rawQuestion.choice_d ||
                    rawQuestion.choices?.D ||
                    ""
                ).trim();


            const rawCorrect =
                rawQuestion.correct ||
                rawQuestion.correct_answer ||
                rawQuestion.correctAnswer ||
                [];


            const correctValues =
                Array.isArray(
                    rawCorrect
                )
                    ? rawCorrect
                    : String(
                        rawCorrect || ""
                    )
                    .split(/[,;]+/);


            correctValues
                .map(
                    value =>
                        String(value)
                        .trim()
                        .toUpperCase()
                )
                .filter(
                    value =>
                        letters.includes(
                            value
                        )
                )
                .forEach(
                    value => {

                        if (
                            !correct.includes(
                                value
                            )
                        ) {

                            correct.push(
                                value
                            );
                        }
                    }
                );
        }
    }


    return {

        id:
            `ai_${Date.now()}_${index}_${Math.random().toString(36).slice(2)}`,

        selected:
            true,

        category:
            String(
                rawQuestion.category ||
                defaultCategory ||
                ""
            ).trim(),

        type:
            type,

        question:
            questionText,

        choices:
            choices,

        correct:
            correct,

        expectedAnswer:
            String(
                rawQuestion.expectedAnswer ||
                rawQuestion.expected_answer ||
                rawQuestion.answer_expected ||
                ""
            ).trim(),

        explanation:
            String(
                rawQuestion.explanation ||
                ""
            ).trim(),

        sourceNote:
            String(
                rawQuestion.sourceNote ||
                rawQuestion.source_note ||
                ""
            ).trim()
    };
}


/* =========================================================
   RENDU DES QUESTIONS GÉNÉRÉES
========================================================= */

function renderAIGeneratedQuestions() {

    const container =
        document.getElementById(
            "aiGeneratedQuestionsList"
        );

    const saveButton =
        document.getElementById(
            "aiSaveSelectedQuestionsButton"
        );

    const selectAll =
        document.getElementById(
            "aiSelectAllQuestions"
        );


    if (!container) {
        return;
    }


    const questions =
        aiQuestionGeneratorState
            .generatedQuestions;


    if (!questions.length) {

        container.innerHTML = `
            <div class="question-management-empty">
                Aucune question générée pour le moment.
            </div>
        `;


        if (saveButton) {
            saveButton.disabled =
                true;
        }


        if (selectAll) {
            selectAll.checked =
                false;
        }


        return;
    }


    container.innerHTML =
        questions
            .map(
                (item, index) =>
                    renderAIGeneratedQuestionCard(
                        item,
                        index
                    )
            )
            .join("");


    bindAIGeneratedQuestionCardEvents();


    const selectedCount =
        questions.filter(
            question =>
                question.selected
        ).length;


    if (saveButton) {

        saveButton.disabled =
            selectedCount === 0;

        saveButton.textContent =
            `💾 Enregistrer ${selectedCount} question${selectedCount > 1 ? "s" : ""}`;
    }


    if (selectAll) {

        selectAll.checked =
            selectedCount ===
            questions.length;

        selectAll.indeterminate =
            selectedCount > 0 &&
            selectedCount <
            questions.length;
    }
}


function renderAIGeneratedQuestionCard(
    item,
    index
) {

    const typeLabels = {

        true_false:
            "Vrai / Faux",

        simple_choice:
            "Choix simple",

        multiple_choice:
            "Choix multiples",

        open:
            "Question ouverte"
    };


    const choicesHtml =
        item.type === "open"
            ? `
                <div class="question-field">
                    <label>
                        Réponse attendue
                    </label>

                    <textarea
                        data-ai-field="expectedAnswer"
                        rows="3"
                    >${escapeHtml(item.expectedAnswer)}</textarea>
                </div>
            `
            : [
                "A",
                "B",
                "C",
                "D"
            ]
            .filter(
                letter =>
                    item.type !== "true_false" ||
                    [
                        "A",
                        "B"
                    ].includes(letter)
            )
            .map(
                letter => {

                    const inputType =
                        item.type ===
                        "multiple_choice"
                            ? "checkbox"
                            : "radio";


                    return `
                        <div class="ai-generated-answer-row">

                            <input
                                type="${inputType}"
                                name="aiCorrect_${escapeHtml(item.id)}"
                                value="${letter}"
                                data-ai-correct="${letter}"
                                ${
                                    item.correct.includes(letter)
                                        ? "checked"
                                        : ""
                                }
                            >

                            <strong>
                                ${letter}
                            </strong>

                            <input
                                type="text"
                                data-ai-choice="${letter}"
                                value="${escapeHtml(item.choices[letter] || "")}"
                                ${
                                    item.type === "true_false"
                                        ? "readonly"
                                        : ""
                                }
                            >

                        </div>
                    `;
                }
            )
            .join("");


    return `

        <article
            class="ai-generated-question-card"
            data-ai-question-id="${escapeHtml(item.id)}"
        >

            <div class="ai-generated-question-head">

                <label class="ai-generated-question-select">

                    <input
                        type="checkbox"
                        data-ai-field="selected"
                        ${
                            item.selected
                                ? "checked"
                                : ""
                        }
                    >

                    <span>
                        Question ${index + 1}
                    </span>

                </label>


                <button
                    type="button"
                    class="organization-action-button organization-action-delete"
                    data-ai-remove="true"
                    title="Supprimer cette proposition"
                >
                    🗑
                </button>

            </div>


            <div class="ai-generated-question-grid">

                <div class="question-field">

                    <label>
                        Type
                    </label>

                    <select data-ai-field="type">

                        ${
                            Object.entries(
                                typeLabels
                            )
                            .map(
                                ([value, label]) => `
                                    <option
                                        value="${value}"
                                        ${
                                            item.type === value
                                                ? "selected"
                                                : ""
                                        }
                                    >
                                        ${label}
                                    </option>
                                `
                            )
                            .join("")
                        }

                    </select>

                </div>


                <div class="question-field ai-generated-question-category">

                    <label>
                        Catégorie
                    </label>

                    <select data-ai-field="category">

                        ${
                            aiQuestionGeneratorState
                                .categories
                                .map(
                                    category => `
                                        <option
                                            value="${escapeHtml(category)}"
                                            ${
                                                item.category === category
                                                    ? "selected"
                                                    : ""
                                            }
                                        >
                                            ${escapeHtml(category)}
                                        </option>
                                    `
                                )
                                .join("")
                        }

                    </select>

                </div>

            </div>


            <div class="question-field">

                <label>
                    Question
                </label>

                <textarea
                    data-ai-field="question"
                    rows="3"
                >${escapeHtml(item.question)}</textarea>

            </div>


            <div class="ai-generated-answers">

                ${choicesHtml}

            </div>


            <div class="question-field">

                <label>
                    Explication / justification IA
                </label>

                <textarea
                    data-ai-field="explanation"
                    rows="2"
                >${escapeHtml(item.explanation)}</textarea>

            </div>


            ${
                item.sourceNote
                    ? `
                        <div class="ai-generated-source-note">
                            <strong>Source :</strong>
                            ${escapeHtml(item.sourceNote)}
                        </div>
                    `
                    : ""
            }

        </article>
    `;
}


function bindAIGeneratedQuestionCardEvents() {

    document
        .querySelectorAll(
            "[data-ai-question-id]"
        )
        .forEach(
            card => {

                const questionId =
                    card.dataset
                        .aiQuestionId;


                const item =
                    aiQuestionGeneratorState
                        .generatedQuestions
                        .find(
                            question =>
                                String(question.id) ===
                                String(questionId)
                        );


                if (!item) {
                    return;
                }


                card
                    .querySelectorAll(
                        "[data-ai-field]"
                    )
                    .forEach(
                        element => {

                            const field =
                                element.dataset
                                    .aiField;


                            const eventName =
                                element.type ===
                                    "checkbox" ||
                                element.tagName ===
                                    "SELECT"
                                    ? "change"
                                    : "input";


                            element.addEventListener(
                                eventName,
                                function () {

                                    if (
                                        field ===
                                        "selected"
                                    ) {

                                        item.selected =
                                            element.checked;

                                        updateAIGeneratedQuestionsSelectionSummary();

                                        return;
                                    }


                                    if (
                                        field ===
                                        "type"
                                    ) {

                                        item.type =
                                            normalizeAIQuestionType(
                                                element.value
                                            );

                                        resetAIQuestionAnswersForType(
                                            item
                                        );

                                        renderAIGeneratedQuestions();

                                        return;
                                    }


                                    item[field] =
                                        element.value;
                                }
                            );
                        }
                    );


                card
                    .querySelectorAll(
                        "[data-ai-choice]"
                    )
                    .forEach(
                        element => {

                            element.addEventListener(
                                "input",
                                function () {

                                    const letter =
                                        element.dataset
                                            .aiChoice;

                                    item.choices[letter] =
                                        element.value;
                                }
                            );
                        }
                    );


                card
                    .querySelectorAll(
                        "[data-ai-correct]"
                    )
                    .forEach(
                        element => {

                            element.addEventListener(
                                "change",
                                function () {

                                    const letter =
                                        element.dataset
                                            .aiCorrect;


                                    if (
                                        item.type ===
                                        "multiple_choice"
                                    ) {

                                        if (
                                            element.checked &&
                                            !item.correct.includes(
                                                letter
                                            )
                                        ) {

                                            item.correct.push(
                                                letter
                                            );
                                        }


                                        if (
                                            !element.checked
                                        ) {

                                            item.correct =
                                                item.correct
                                                    .filter(
                                                        value =>
                                                            value !==
                                                            letter
                                                    );
                                        }

                                    } else {

                                        item.correct =
                                            element.checked
                                                ? [letter]
                                                : [];
                                    }
                                }
                            );
                        }
                    );


                const removeButton =
                    card.querySelector(
                        "[data-ai-remove]"
                    );


                if (removeButton) {

                    removeButton.addEventListener(
                        "click",
                        function () {

                            removeAIGeneratedQuestion(
                                questionId
                            );
                        }
                    );
                }
            }
        );
}


function resetAIQuestionAnswersForType(
    item
) {

    item.correct = [];


    if (
        item.type ===
        "true_false"
    ) {

        item.choices = {
            A: "Vrai",
            B: "Faux",
            C: "",
            D: ""
        };

        item.expectedAnswer =
            "";

        return;
    }


    if (
        item.type ===
        "open"
    ) {

        item.choices = {
            A: "",
            B: "",
            C: "",
            D: ""
        };

        return;
    }


    item.choices = {
        A: "",
        B: "",
        C: "",
        D: ""
    };

    item.expectedAnswer =
        "";
}


function updateAIGeneratedQuestionsSelectionSummary() {

    const questions =
        aiQuestionGeneratorState
            .generatedQuestions;

    const selectedCount =
        questions.filter(
            question =>
                question.selected
        ).length;

    const saveButton =
        document.getElementById(
            "aiSaveSelectedQuestionsButton"
        );

    const selectAll =
        document.getElementById(
            "aiSelectAllQuestions"
        );


    if (saveButton) {

        saveButton.disabled =
            selectedCount === 0;

        saveButton.textContent =
            `💾 Enregistrer ${selectedCount} question${selectedCount > 1 ? "s" : ""}`;
    }


    if (selectAll) {

        selectAll.checked =
            selectedCount ===
            questions.length &&
            questions.length > 0;

        selectAll.indeterminate =
            selectedCount > 0 &&
            selectedCount <
            questions.length;
    }
}


function removeAIGeneratedQuestion(
    questionId
) {

    aiQuestionGeneratorState.generatedQuestions =
        aiQuestionGeneratorState
            .generatedQuestions
            .filter(
                question =>
                    String(question.id) !==
                    String(questionId)
            );


    renderAIGeneratedQuestions();
}


/* =========================================================
   VALIDATION AVANT INSERTION
========================================================= */

function validateAIGeneratedQuestion(
    item,
    index = 0
) {

    const prefix =
        `Question ${index + 1}`;


    if (!item.category) {

        return `${prefix} : catégorie manquante.`;
    }


    if (!item.question?.trim()) {

        return `${prefix} : texte de question manquant.`;
    }


    if (
        item.type ===
        "open"
    ) {

        if (
            !item.expectedAnswer?.trim()
        ) {

            return `${prefix} : réponse attendue manquante.`;
        }


        return null;
    }


    const requiredLetters =
        item.type ===
        "true_false"
            ? [
                "A",
                "B"
            ]
            : [
                "A",
                "B",
                "C",
                "D"
            ];


    for (
        const letter
        of requiredLetters
    ) {

        if (
            !String(
                item.choices?.[letter] ||
                ""
            ).trim()
        ) {

            return `${prefix} : proposition ${letter} manquante.`;
        }
    }


    if (
        item.type ===
        "multiple_choice"
    ) {

        if (
            item.correct.length < 2
        ) {

            return `${prefix} : sélectionne au moins deux bonnes réponses pour un choix multiple.`;
        }


    } else if (
        item.correct.length !== 1
    ) {

        return `${prefix} : sélectionne exactement une bonne réponse.`;
    }


    return null;
}


/* =========================================================
   TRANSFORMATION VERS LE SCHÉMA QUESTIONS EXISTANT
========================================================= */

function buildAIGeneratedQuestionPayload(
    item,
    orderNumber
) {

    const type =
        normalizeAIQuestionType(
            item.type
        );


    const isOpen =
        type ===
        "open";


    const correct =
        isOpen
            ? []
            : [
                ...item.correct
            ]
            .sort();


    return {

        order_number:
            orderNumber,

        category:
            item.category,

        question:
            item.question.trim(),

        expected_answer:
            isOpen
                ? item.expectedAnswer.trim()
                : null,

        keywords:
            isOpen
                ? item.expectedAnswer.trim()
                : correct.join(
                    ", "
                ),

        max_points:
            type ===
            "multiple_choice"
                ? Math.max(
                    1,
                    correct.length
                )
                : 1,

        question_type:
            type,

        correct_answer:
            isOpen
                ? null
                : correct.join(
                    ", "
                ),

        choice_a:
            isOpen
                ? null
                : item.choices.A ||
                null,

        choice_b:
            isOpen
                ? null
                : item.choices.B ||
                null,

        choice_c:
            type ===
                "true_false" ||
            isOpen
                ? null
                : item.choices.C ||
                null,

        choice_d:
            type ===
                "true_false" ||
            isOpen
                ? null
                : item.choices.D ||
                null,

        is_active:
            true
    };
}


/* =========================================================
   ENREGISTREMENT DES QUESTIONS IA DANS SUPABASE
========================================================= */

async function saveSelectedAIGeneratedQuestions() {

    const selectedQuestions =
        aiQuestionGeneratorState
            .generatedQuestions
            .filter(
                question =>
                    question.selected
            );


    if (!selectedQuestions.length) {

        alert(
            "Sélectionne au moins une question à enregistrer."
        );

        return;
    }


    for (
        let index = 0;
        index < selectedQuestions.length;
        index++
    ) {

        const validationError =
            validateAIGeneratedQuestion(
                selectedQuestions[index],
                index
            );


        if (validationError) {

            alert(
                validationError
            );

            return;
        }
    }


    const confirmation =
        confirm(
            `Enregistrer ${selectedQuestions.length} question(s) dans Nickel Master ?`
        );


    if (!confirmation) {
        return;
    }


    const button =
        document.getElementById(
            "aiSaveSelectedQuestionsButton"
        );


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Enregistrement...";
    }


    try {

        const nextOrders = {};


        for (
            const item
            of selectedQuestions
        ) {

            if (
                nextOrders[
                    item.category
                ] === undefined
            ) {

                nextOrders[
                    item.category
                ] =
                    await getNextQuestionOrderNumber(
                        item.category
                    );
            }
        }


        const payload =
            selectedQuestions
                .map(
                    item => {

                        const orderNumber =
                            nextOrders[
                                item.category
                            ]++;


                        return buildAIGeneratedQuestionPayload(
                            item,
                            orderNumber
                        );
                    }
                );


        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/questions`,
                {
                    method:
                        "POST",

                    headers:
                        supabaseHeaders({
                            "Content-Type":
                                "application/json",
                            "Prefer":
                                "return=minimal"
                        }),

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );
        }


        const savedIds =
            new Set(
                selectedQuestions
                    .map(
                        question =>
                            String(
                                question.id
                            )
                    )
            );


        aiQuestionGeneratorState.generatedQuestions =
            aiQuestionGeneratorState
                .generatedQuestions
                .filter(
                    question =>
                        !savedIds.has(
                            String(
                                question.id
                            )
                        )
                );


        renderAIGeneratedQuestions();


        alert(
            `${payload.length} question(s) ajoutée(s) à Nickel Master ✅`
        );


    } catch (error) {

        console.error(
            "Erreur enregistrement questions IA :",
            error
        );


        alert(
            "Impossible d'enregistrer les questions générées.\n\n" +
            error.message
        );


    } finally {

        updateAIGeneratedQuestionsSelectionSummary();
    }
}


/* =========================================================
   INITIALISATION AUTOMATIQUE SI LA PAGE IA EST OUVERTE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        if (
            document.getElementById(
                "aiQuestionGeneratorRoot"
            )
        ) {

            initializeAIQuestionGeneratorPage()
                .catch(
                    error => {

                        console.error(
                            "Erreur initialisation générateur IA :",
                            error
                        );
                    }
                );
        }
    }
);
