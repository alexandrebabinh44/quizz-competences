const SUPABASE_URL = "https://ytcochuaiprkzbptgkvn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0Y29jaHVhaXBya3picHRna3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTc1NzYsImV4cCI6MjA5NjMzMzU3Nn0.IvVCdv4pHXiy0X4SNVtP8KWtAmMBxQx4c-NwS2hEA7o";

let currentQuestionIndex = 0;
let questions = [];

let trainingQuestions = [];
let trainingIndex = 0;
let trainingCorrectAnswers = 0;
let trainingStartedAt = null;


/* =========================
   OUTILS
========================= */

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
        const j = Math.floor(Math.random() * (i + 1));

        [result[i], result[j]] = [result[j], result[i]];
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
    const difference = day === 0 ? -6 : 1 - day;

    start.setDate(start.getDate() + difference);

    return start.toISOString();
}

function categoryIcon(category) {
    const name = String(category || "").toLowerCase();

    if (name.includes("auth")) return "🔒";
    if (name.includes("sécur") || name.includes("secur")) return "🛡️";
    if (name.includes("carte")) return "💳";
    if (name.includes("produit")) return "📦";
    if (name.includes("réclam") || name.includes("reclam")) return "💬";
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


/* =========================
   CONNEXION
========================= */

async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        alert("Merci de remplir l'identifiant et le mot de passe.");
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
            alert("Erreur Supabase : " + await response.text());
            return;
        }

        const users = await response.json();

        if (users.length !== 1) {
            alert("Identifiant ou mot de passe incorrect.");
            return;
        }

        const user = users[0];

        localStorage.setItem("profile_id", user.id);
        localStorage.setItem("full_name", user.full_name || "");
        localStorage.setItem("role", user.role || "user");
        localStorage.setItem("xp", String(user.xp || 0));
        localStorage.setItem("level", String(user.level || 1));

        if (user.must_change_password === true) {
            window.location.href = "change-password.html";
        } else {
            window.location.href = "home.html";
        }

    } catch (error) {
        console.error(error);
        alert("Erreur de connexion à Supabase.");
    }
}


/* =========================
   DÉCONNEXION
========================= */

function logout() {
    const savedTheme = localStorage.getItem("nickel_master_theme");

    localStorage.clear();

    if (savedTheme) {
        localStorage.setItem("nickel_master_theme", savedTheme);
    }

    window.location.href = "index.html";
}


/* =========================
   CHANGEMENT MOT DE PASSE
========================= */

async function changePassword() {
    const profileId = localStorage.getItem("profile_id");
    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    if (!profileId) {
        window.location.href = "index.html";
        return;
    }

    if (!newPassword || !confirmPassword) {
        alert("Merci de remplir les deux champs.");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("Les mots de passe ne correspondent pas.");
        return;
    }

    if (newPassword.length < 6) {
        alert("Le mot de passe doit contenir au moins 6 caractères.");
        return;
    }

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
        {
            method: "PATCH",
            headers: supabaseHeaders({
                "Content-Type": "application/json",
                Prefer: "return=minimal"
            }),
            body: JSON.stringify({
                password: newPassword,
                must_change_password: false
            })
        }
    );

    if (response.ok) {
        alert("Mot de passe mis à jour.");
        window.location.href = "home.html";
    } else {
        alert("Erreur : " + await response.text());
    }
}
/* =========================
   PROFIL
========================= */

async function loadProfile() {
    const profileId = localStorage.getItem("profile_id");

    if (!profileId) {
        window.location.href = "index.html";
        return;
    }

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
        {
            headers: supabaseHeaders()
        }
    );

    if (!response.ok) {
        alert("Erreur lors du chargement du profil.");
        return;
    }

    const data = await response.json();

    if (!data.length) {
        alert("Profil introuvable.");
        return;
    }

    const user = data[0];

    if (document.getElementById("fullName")) {
        document.getElementById("fullName").innerText = user.full_name || "";
    }

    if (document.getElementById("role")) {
        document.getElementById("role").innerText = user.role || "";
    }

    if (document.getElementById("position")) {
        document.getElementById("position").innerText =
            user.position || user.job_title || "";
    }

    if (document.getElementById("level")) {
        document.getElementById("level").innerText = user.level || 1;
    }

    if (document.getElementById("xp")) {
        document.getElementById("xp").innerText = user.xp || 0;
    }
}


/* =========================
   DASHBOARD
========================= */

async function loadHomeDashboard() {
    const profileId = localStorage.getItem("profile_id");

    if (!profileId) {
        window.location.href = "index.html";
        return;
    }

    try {
        await updatePresence(profileId);

        await Promise.all([
            loadHomeProfile(profileId),
            loadHomeStats(profileId),
            loadHomeCategories(),
            loadHomeWeeklyRanking(),
            loadDailyMissions(profileId),
            loadHomeRecentActivity()
        ]);

        await loadHomeOnlineCount();

        startPresenceHeartbeat();

    } catch (error) {
        console.error("Erreur dashboard :", error);
    }
}


async function loadHomeProfile(profileId) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}&select=id,full_name,role,xp,level`,
        {
            headers: supabaseHeaders()
        }
    );

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const data = await response.json();

    if (!data.length) {
        throw new Error("Profil introuvable.");
    }

    const user = data[0];

    const xp = Number(user.xp || 0);
    const level = Number(user.level || 1);

    const xpInLevel = xp % 100;

    localStorage.setItem("full_name", user.full_name || "Utilisateur");
    localStorage.setItem("role", user.role || "user");
    localStorage.setItem("xp", String(xp));
    localStorage.setItem("level", String(level));

    if (document.getElementById("welcome")) {
        document.getElementById("welcome").innerText =
            `Bonjour ${user.full_name || "Utilisateur"} ! 👋`;
    }

    if (document.getElementById("topUserName")) {
        document.getElementById("topUserName").innerText =
            user.full_name || "Utilisateur";
    }

    if (document.getElementById("userLevel")) {
        document.getElementById("userLevel").innerText =
            `Niveau ${level}`;
    }

    if (document.getElementById("userXp")) {
        document.getElementById("userXp").innerText =
            `${xpInLevel} / 100 XP`;
    }

    if (document.getElementById("statXp")) {
        document.getElementById("statXp").innerText = xp;
    }

    if (document.getElementById("levelProgress")) {
        document.getElementById("levelProgress").style.width =
            `${Math.min(100, xpInLevel)}%`;
    }

    if (document.getElementById("levelLabel")) {
        document.getElementById("levelLabel").innerText =
            getLevelLabel(level);
    }
}


async function loadHomeStats(profileId) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/training_sessions?profile_id=eq.${profileId}&select=id,total_questions,correct_answers`,
        {
            headers: supabaseHeaders()
        }
    );

    if (!response.ok) {
        console.warn("Statistiques indisponibles :", await response.text());
        return;
    }

    const sessions = await response.json();

    const totalQuiz = sessions.length;

    const totalQuestions = sessions.reduce(
        (total, session) =>
            total + Number(session.total_questions || 0),
        0
    );

    const totalCorrect = sessions.reduce(
        (total, session) =>
            total + Number(session.correct_answers || 0),
        0
    );

    const rate =
        totalQuestions > 0
            ? Math.round((totalCorrect / totalQuestions) * 100)
            : 0;

    if (document.getElementById("statQuizCompleted")) {
        document.getElementById("statQuizCompleted").innerText =
            totalQuiz;
    }

    if (document.getElementById("statCorrectRate")) {
        document.getElementById("statCorrectRate").innerText =
            `${rate}%`;
    }
}


async function loadHomeCategories() {
    const container = document.getElementById("categoryList");

    if (!container) return;

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/questions?select=category`,
        {
            headers: supabaseHeaders()
        }
    );

    if (!response.ok) {
        container.innerHTML = "<div>Impossible de charger les catégories.</div>";
        return;
    }

    const rows = await response.json();

    const counts = {};

    rows.forEach(row => {
        const category = String(row.category || "").trim();

        if (!category) return;

        counts[category] = (counts[category] || 0) + 1;
    });

    const categories = Object.entries(counts)
        .sort((a, b) => a[0].localeCompare(b[0], "fr"));

    if (!categories.length) {
        container.innerHTML = "<div>Aucune catégorie disponible.</div>";
        return;
    }

    container.innerHTML = categories
        .slice(0, 5)
        .map(([category, count]) => `
            <div>
                ${categoryIcon(category)}
                <strong>${escapeHtml(category)}</strong>
                <small>${count} question${count > 1 ? "s" : ""}</small>
            </div>
        `)
        .join("");
}


async function loadHomeWeeklyRanking() {
    const container = document.getElementById("weeklyRanking");

    if (!container) return;

    const start = encodeURIComponent(getWeekStartIso());

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/xp_history?select=profile_id,amount&created_at=gte.${start}`,
        {
            headers: supabaseHeaders()
        }
    );

    if (!response.ok) {
        container.innerHTML = "<p>Classement indisponible.</p>";
        return;
    }

    const history = await response.json();

    const totals = {};

    history.forEach(entry => {
        if (!entry.profile_id) return;

        totals[entry.profile_id] =
            (totals[entry.profile_id] || 0) +
            Number(entry.amount || 0);
    });

    const topThree = Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    if (!topThree.length) {
        container.innerHTML =
            "<p>Aucun XP gagné cette semaine.</p>";
        return;
    }

    const profilesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=id,full_name`,
        {
            headers: supabaseHeaders()
        }
    );

    const profiles = profilesResponse.ok
        ? await profilesResponse.json()
        : [];

    const names = {};

    profiles.forEach(profile => {
        names[profile.id] =
            profile.full_name || "Utilisateur";
    });

    const medals = ["🥇", "🥈", "🥉"];

    container.innerHTML = topThree
        .map(([profileId, xp], index) => `
            <p>
                ${medals[index]}
                ${escapeHtml(names[profileId] || "Utilisateur")}
                <strong>${xp} XP</strong>
            </p>
        `)
        .join("");
}
/* =========================
   MISSIONS DU JOUR
========================= */

async function loadDailyMissions(profileId) {
    const today = encodeURIComponent(
        getLocalDayStartIso()
    );


    const answersResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/answers?profile_id=eq.${profileId}&submitted_at=gte.${today}&select=id`,
        {
            headers: supabaseHeaders()
        }
    );

    if (answersResponse.ok) {
        const answers =
            await answersResponse.json();

        if (document.getElementById("missionQuestions")) {
            document.getElementById("missionQuestions").innerText =
                `${Math.min(answers.length, 3)}/3`;
        }
    }


    const sessionsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/training_sessions?profile_id=eq.${profileId}&completed_at=gte.${today}&select=id`,
        {
            headers: supabaseHeaders()
        }
    );

    if (sessionsResponse.ok) {
        const sessions =
            await sessionsResponse.json();

        if (document.getElementById("missionQuiz")) {
            document.getElementById("missionQuiz").innerText =
                `${Math.min(sessions.length, 1)}/1`;
        }
    }


    const role = String(
        localStorage.getItem("role") || ""
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
        document.getElementById("missionCorrectionLine");

    if (
        correctionLine &&
        allowedRoles.includes(role)
    ) {
        correctionLine.style.display = "";
    }
}


/* =========================
   PRÉSENCE
========================= */

async function updatePresence(profileId) {
    if (!profileId) return;

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
        {
            method: "PATCH",
            headers: supabaseHeaders({
                "Content-Type": "application/json",
                Prefer: "return=minimal"
            }),
            body: JSON.stringify({
                last_seen_at:
                    new Date().toISOString()
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
        document.getElementById("onlineCount");

    if (!element) return;

    const threshold =
        new Date(
            Date.now() -
            2 * 60 * 1000
        ).toISOString();

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=id&last_seen_at=gte.${encodeURIComponent(threshold)}`,
        {
            headers: supabaseHeaders()
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
        localStorage.getItem("profile_id");

    if (!profileId) return;

    if (window.__nickelPresenceInterval) {
        clearInterval(
            window.__nickelPresenceInterval
        );
    }

    window.__nickelPresenceInterval =
        setInterval(async () => {

            await updatePresence(profileId);

            if (
                document.getElementById(
                    "onlineCount"
                )
            ) {
                await loadHomeOnlineCount();
            }

        }, 60000);
}


/* =========================
   ACTIVITÉ RÉCENTE
========================= */

async function loadHomeRecentActivity() {
    const container =
        document.getElementById("recentActivity");

    if (!container) return;

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/training_sessions?select=profile_id,category,mode,completed_at&order=completed_at.desc&limit=3`,
        {
            headers: supabaseHeaders()
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

    const profilesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=id,full_name`,
        {
            headers: supabaseHeaders()
        }
    );

    const profiles = profilesResponse.ok
        ? await profilesResponse.json()
        : [];

    const names = {};

    profiles.forEach(profile => {
        names[profile.id] =
            profile.full_name || "Utilisateur";
    });

    container.innerHTML = sessions
        .map(session => {

            let trainingName =
                session.category;

            if (
                !trainingName &&
                session.mode === "xtrem"
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
                ).toLocaleTimeString(
                    "fr-FR",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );

            return `
                <p>
                    ${escapeHtml(
                        names[session.profile_id] ||
                        "Utilisateur"
                    )}
                    a terminé
                    ${escapeHtml(trainingName)}
                    <small>${time}</small>
                </p>
            `;
        })
        .join("");
}
/* =========================
   ENTRAÎNEMENT
========================= */

function afficherChoixThemes() {
    const mode =
        document.getElementById("choix-mode");

    const themes =
        document.getElementById("choix-themes");

    if (mode) mode.style.display = "none";
    if (themes) themes.style.display = "block";
}


function retourChoixMode() {
    const mode =
        document.getElementById("choix-mode");

    const themes =
        document.getElementById("choix-themes");

    if (themes) themes.style.display = "none";
    if (mode) mode.style.display = "block";
}


function lancerEntrainementCible(category) {
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


async function loadTrainingQuiz() {
    trainingIndex = 0;
    trainingCorrectAnswers = 0;

    trainingStartedAt =
        new Date().toISOString();

    const mode =
        localStorage.getItem(
            "training_mode"
        ) || "cible";

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
                headers: supabaseHeaders()
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
            ).slice(0, 10);

        title =
            `Entraînement - ${category}`;
    }


    else if (mode === "flash") {

        const categoriesResponse =
            await fetch(
                `${SUPABASE_URL}/rest/v1/questions?select=category`,
                {
                    headers: supabaseHeaders()
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
                    .map(row => row.category)
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

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/questions?select=*&category=eq.${encodeURIComponent(category)}`,
            {
                headers: supabaseHeaders()
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
            ).slice(0, 10);

        title =
            `Flash - ${category}`;
    }


    else if (mode === "xtrem") {

        localStorage.removeItem(
            "training_category"
        );

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/questions?select=*`,
            {
                headers: supabaseHeaders()
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
            ).slice(0, 10);

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


    if (
        document.getElementById(
            "trainingTitle"
        )
    ) {
        document.getElementById(
            "trainingTitle"
        ).innerText = title;
    }

    await showTrainingQuestion();
}


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

    if (
        document.getElementById(
            "trainingProgress"
        )
    ) {
        document.getElementById(
            "trainingProgress"
        ).innerText =
            `Question ${trainingIndex + 1} / ${trainingQuestions.length}`;
    }

    if (
        document.getElementById(
            "trainingQuestion"
        )
    ) {
        document.getElementById(
            "trainingQuestion"
        ).innerText = q.question;
    }

    const answerZone =
        document.getElementById(
            "answerZone"
        );

    if (!answerZone) return;

    answerZone.innerHTML = "";


    if (q.question_type === "open") {

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
                <input type="radio" name="answerChoice" value="A">
                ${escapeHtml(q.choice_a)}
            </label>
            <br>
            <label>
                <input type="radio" name="answerChoice" value="B">
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


async function submitTrainingAnswer() {
    const profileId =
        localStorage.getItem(
            "profile_id"
        );

    const q =
        trainingQuestions[
            trainingIndex
        ];

    if (!profileId || !q) return;

    let answer = "";


    if (q.question_type === "open") {

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

        answer = Array.from(
            document.querySelectorAll(
                'input[name="answerChoice"]:checked'
            )
        )
            .map(input => input.value)
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
        q.question_type === "true_false" ||
        q.question_type === "single_choice"
    ) {

        isCorrect =
            answer === q.correct_answer;

        autoScore =
            isCorrect
                ? Number(q.max_points || 1)
                : 0;

        finalScore = autoScore;
        corrected = true;
    }


    if (
        q.question_type ===
        "multiple_choice"
    ) {

        const correctChoices =
            String(
                q.correct_answer || ""
            )
                .split(",")
                .map(value => value.trim())
                .filter(Boolean)
                .sort()
                .join(",");

        isCorrect =
            answer === correctChoices;

        autoScore =
            isCorrect
                ? Number(q.max_points || 1)
                : 0;

        finalScore = autoScore;
        corrected = true;
    }


    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/answers`,
        {
            method: "POST",
            headers: supabaseHeaders({
                "Content-Type": "application/json",
                Prefer: "return=minimal"
            }),
            body: JSON.stringify({
                profile_id: profileId,
                question_id: q.id,
                answer_text: answer,
                auto_score: autoScore,
                final_score: finalScore,
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

    trainingIndex++;

    await showTrainingQuestion();
}


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

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/training_sessions`,
        {
            method: "POST",
            headers: supabaseHeaders({
                "Content-Type": "application/json",
                Prefer: "return=representation"
            }),
            body: JSON.stringify({
                profile_id: profileId,
                mode:
                    localStorage.getItem(
                        "training_mode"
                    ) || "cible",
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
                xp_earned: 5,
                started_at:
                    trainingStartedAt,
                completed_at:
                    new Date().toISOString()
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

    return data[0]?.id || null;
}


async function finishTraining() {
    try {

        const sessionId =
            await saveTrainingSession();

        await addXp(
            5,
            "training_participation",
            sessionId
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
        total - correct;

    const percentage =
        total > 0
            ? Math.round(
                (correct / total) * 100
            )
            : 0;


    const container =
        document.querySelector(
            ".container"
        );

    if (!container) return;


    container.innerHTML = `
        <h2>Entraînement terminé ✅</h2>

        <p>
            Score :
            <strong>${correct}/${total}</strong>
        </p>

        <p>
            Pourcentage :
            <strong>${percentage}%</strong>
        </p>

        <p>
            Bonnes réponses :
            <strong>${correct}</strong>
        </p>

        <p>
            Mauvaises réponses :
            <strong>${incorrect}</strong>
        </p>

        <p>
            <strong>+5 XP gagnés</strong>
        </p>

        <button onclick="restartCurrentTraining()">
            Recommencer
        </button>

        <button onclick="window.location.href='training.html'">
            Retour aux entraînements
        </button>

        <button onclick="window.location.href='home.html'">
            Retour au menu
        </button>
    `;
}


function restartCurrentTraining() {
    window.location.reload();
}
/* =========================================================
   BADGES
========================================================= */

async function getBadgeByCode(code) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/badges?code=eq.${encodeURIComponent(code)}&active=eq.true&select=*`,
        {
            headers: supabaseHeaders()
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

    const data = await response.json();

    return data[0] || null;
}


async function hasUserBadge(profileId, badgeId) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profile_badges?profile_id=eq.${profileId}&badge_id=eq.${badgeId}&occurrence_key=is.null&select=id`,
        {
            headers: supabaseHeaders()
        }
    );

    if (!response.ok) {
        throw new Error(
            "Impossible de vérifier les badges obtenus : " +
            await response.text()
        );
    }

    const data = await response.json();

    return data.length > 0;
}


async function awardBadge(profileId, badge, context = null) {
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

    const insertResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profile_badges`,
        {
            method: "POST",
            headers: supabaseHeaders({
                "Content-Type": "application/json",
                Prefer: "return=representation"
            }),
            body: JSON.stringify({
                profile_id: profileId,
                badge_id: badge.id,
                xp_awarded: badge.xp_reward || 0,
                context: context,
                occurrence_key: null
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

    if (
        Number(
            badge.xp_reward || 0
        ) > 0
    ) {
        await addXp(
            Number(
                badge.xp_reward
            ),
            "badge_reward",
            badge.id
        );
    }

    showBadgeUnlocked(
        badge
    );

    return true;
}


function showBadgeUnlocked(badge) {
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
        "320px";

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
        "0 12px 35px rgba(0,0,0,.18)";

    popup.style.borderLeft =
        "5px solid var(--orange, #ff5a00)";

    popup.innerHTML = `
        <div style="
            display:flex;
            gap:14px;
            align-items:center;
        ">

            <div style="
                font-size:42px;
                line-height:1;
            ">
                ${escapeHtml(
                    badge.icon || "🏅"
                )}
            </div>

            <div style="
                min-width:0;
            ">

                <div style="
                    color:var(--orange, #ff5a00);
                    font-size:12px;
                    font-weight:800;
                    text-transform:uppercase;
                    letter-spacing:.6px;
                    margin-bottom:4px;
                ">
                    ✨ Badge débloqué
                </div>

                <div style="
                    font-size:18px;
                    font-weight:800;
                    margin-bottom:4px;
                ">
                    ${escapeHtml(
                        badge.name
                    )}
                </div>

                <div style="
                    color:var(--text-secondary, #777);
                    font-size:13px;
                    margin-bottom:8px;
                ">
                    ${escapeHtml(
                        badge.description
                    )}
                </div>

                <strong style="
                    color:var(--orange, #ff5a00);
                ">
                    +${Number(
                        badge.xp_reward || 0
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
        },
        6000
    );
}


async function checkAndAwardBadge(
    profileId,
    code,
    condition,
    context = null
) {
    if (!condition) {
        return;
    }

    const badge =
        await getBadgeByCode(
            code
        );

    if (!badge) {
        return;
    }

    await awardBadge(
        profileId,
        badge,
        context
    );
}


async function checkQuestionBadges(
    profileId
) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/answers?profile_id=eq.${profileId}&select=id`,
        {
            headers: supabaseHeaders()
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
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/training_sessions?profile_id=eq.${profileId}&select=*&order=completed_at.asc`,
        {
            headers: supabaseHeaders()
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
            session =>
                Number(
                    session.total_questions || 0
                ) > 0 &&
                Number(
                    session.correct_answers || 0
                ) ===
                Number(
                    session.total_questions || 0
                )
        );

    await checkAndAwardBadge(
        profileId,
        "PERFECT_QUIZ",
        perfectSessions.length >= 1,
        "Quiz parfait"
    );


    let currentPerfectStreak =
        0;

    let bestPerfectStreak =
        0;

    sessions.forEach(
        session => {

            const total =
                Number(
                    session.total_questions || 0
                );

            const correct =
                Number(
                    session.correct_answers || 0
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

                currentPerfectStreak =
                    0;
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
            session =>
                Number(
                    session.total_questions || 0
                ) > 0 &&
                Number(
                    session.correct_answers || 0
                ) ===
                Number(
                    session.total_questions || 0
                )
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
/* =========================
   XP
========================= */

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


    const profileResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}&select=xp`,
        {
            headers: supabaseHeaders()
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
            profiles[0].xp || 0
        );

    const newXp =
        currentXp + xpAmount;

    const newLevel =
        Math.floor(newXp / 100) + 1;


    const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
        {
            method: "PATCH",
            headers: supabaseHeaders({
                "Content-Type": "application/json",
                Prefer: "return=minimal"
            }),
            body: JSON.stringify({
                xp: newXp,
                level: newLevel
            })
        }
    );


    if (!updateResponse.ok) {
        throw new Error(
            "Erreur mise à jour XP : " +
            await updateResponse.text()
        );
    }


    const historyResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/xp_history`,
        {
            method: "POST",
            headers: supabaseHeaders({
                "Content-Type": "application/json",
                Prefer: "return=minimal"
            }),
            body: JSON.stringify({
                profile_id: profileId,
                amount: xpAmount,
                source,
                source_id: sourceId
            })
        }
    );


    if (!historyResponse.ok) {

        const errorText =
            await historyResponse.text();

        await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
            {
                method: "PATCH",
                headers: supabaseHeaders({
                    "Content-Type": "application/json",
                    Prefer: "return=minimal"
                }),
                body: JSON.stringify({
                    xp: currentXp,
                    level:
                        Math.floor(
                            currentXp / 100
                        ) + 1
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


/* =========================
   ADMIN USERS
========================= */

async function loadUsersAdmin() {
    const role =
        localStorage.getItem("role");

    if (role !== "admin") {
        alert(
            "Accès réservé à l'administrateur."
        );

        window.location.href =
            "home.html";

        return;
    }

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=*&order=full_name.asc`,
        {
            headers: supabaseHeaders()
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

    users.forEach(user => {
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
                        user.role || ""
                    )}
                </p>
            </div>
        `;
    });
}


function openUserProfile(userId) {
    localStorage.setItem(
        "selected_user_id",
        userId
    );

    window.location.href =
        "admin-user-detail.html";
}


/* =========================
   MON ÉQUIPE
========================= */

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

    const meResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
        {
            headers: supabaseHeaders()
        }
    );

    if (!meResponse.ok) return;

    const meData =
        await meResponse.json();

    const me =
        meData[0];

    if (!me || !me.team_id) {

        if (
            document.getElementById(
                "teamTitle"
            )
        ) {
            document.getElementById(
                "teamTitle"
            ).innerText =
                "Aucune équipe associée.";
        }

        return;
    }


    const teamResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/teams?id=eq.${me.team_id}`,
        {
            headers: supabaseHeaders()
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


    const membersResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?team_id=eq.${me.team_id}&order=full_name.asc`,
        {
            headers: supabaseHeaders()
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

    members.forEach(member => {
        container.innerHTML += `
            <div
                class="team-member"
                onclick="openTeamMember('${member.id}')"
            >
                <strong>
                    ${escapeHtml(member.full_name)}
                </strong>
                |
                ${escapeHtml(
                    member.position ||
                    member.job_title ||
                    ""
                )}
                |
                Niveau ${member.level || 1}
            </div>
        `;
    });
}


function openTeamMember(userId) {
    localStorage.setItem(
        "selected_user_id",
        userId
    );

    window.location.href =
        "admin-user-detail.html";
}


/* =========================
   CLASSEMENT SIMPLE
========================= */

async function loadRanking() {
    const container =
        document.getElementById(
            "rankingList"
        );

    if (!container) return;

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=*&order=xp.desc`,
        {
            headers: supabaseHeaders()
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


/* =========================
   PRÉSENCE AUTOMATIQUE
========================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const profileId =
            localStorage.getItem(
                "profile_id"
            );

        if (!profileId) return;

        /*
         * Sur home.html, loadHomeDashboard()
         * gère déjà la présence.
         *
         * Sur les autres pages on la maintient ici.
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
