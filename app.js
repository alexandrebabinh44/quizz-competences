const SUPABASE_URL = "https://ytcochuaiprkzbptgkvn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0Y29jaHVhaXBya3picHRna3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTc1NzYsImV4cCI6MjA5NjMzMzU3Nn0.IvVCdv4pHXiy0X4SNVtP8KWtAmMBxQx4c-NwS2hEA7o";

let currentQuestionIndex = 0;
let questions = [];

let trainingQuestions = [];
let trainingIndex = 0;

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
            `${SUPABASE_URL}/rest/v1/profiles?select=*&username=eq.${username}&password=eq.${password}`,
            {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            alert("Erreur Supabase : " + errorText);
            return;
        }

        const users = await response.json();

        if (users.length === 1) {
            localStorage.setItem("profile_id", users[0].id);
            localStorage.setItem("full_name", users[0].full_name);
            localStorage.setItem("role", users[0].role || "user");
            localStorage.setItem("xp", users[0].xp || 0);
            localStorage.setItem("level", users[0].level || 1);

            if (users[0].must_change_password === true) {
                window.location.href = "change-password.html";
            } else {
                window.location.href = "home.html";
            }
        } else {
            alert("Identifiant ou mot de passe incorrect.");
        }
    } catch (error) {
        console.error(error);
        alert("Erreur de connexion à Supabase.");
    }
}

function logout() {
    localStorage.clear();
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

    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`, {
        method: "PATCH",
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
        },
        body: JSON.stringify({
            password: newPassword,
            must_change_password: false
        })
    });

    if (response.ok) {
        alert("Mot de passe mis à jour.");
        window.location.href = "home.html";
    } else {
        alert("Erreur lors de la mise à jour du mot de passe.");
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
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        }
    );

    const data = await response.json();

    if (data.length === 0) {
        alert("Profil introuvable");
        return;
    }

    const user = data[0];

    document.getElementById("fullName").innerText = user.full_name || "";
    document.getElementById("role").innerText = user.role || "";
    document.getElementById("position").innerText = user.position || "";
    document.getElementById("level").innerText = user.level || 1;
    document.getElementById("xp").innerText = user.xp || 0;
}

/* =========================
   ADMIN USERS
========================= */

async function loadUsersAdmin() {
    const role = localStorage.getItem("role");

    if (role !== "admin") {
        alert("Accès réservé à l'administrateur.");
        window.location.href = "home.html";
        return;
    }

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=*&order=full_name.asc`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        }
    );

    const users = await response.json();
    const container = document.getElementById("usersList");

    container.innerHTML = "";

    users.forEach(user => {
        container.innerHTML += `
            <div class="card compact-card" onclick="openUserProfile('${user.id}')">
                <h2>${user.full_name || "Sans nom"}</h2>
                <p>${user.position || user.job_title || "Poste non renseigné"}</p>
                <p><strong>Rôle :</strong> ${user.role || ""}</p>
            </div>
        `;
    });
}

function openUserProfile(userId) {
    localStorage.setItem("selected_user_id", userId);
    window.location.href = "admin-user-detail.html";
}

async function loadUserDetailAdmin() {
    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("selected_user_id");

    if (role !== "admin") {
        alert("Accès réservé à l'administrateur.");
        window.location.href = "home.html";
        return;
    }

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        }
    );

    const data = await response.json();
    const user = data[0];

    document.getElementById("userDetail").innerHTML = `
        <h2>${user.full_name}</h2>
        <p><strong>Identifiant :</strong> ${user.username}</p>
        <p><strong>Rôle :</strong> ${user.role}</p>
        <p><strong>Poste :</strong> ${user.position || user.job_title || ""}</p>
        <p><strong>Statut :</strong> ${user.status || ""}</p>
        <p><strong>Niveau :</strong> ${user.level || 1}</p>
        <p><strong>XP :</strong> ${user.xp || 0}</p>
    `;
}

/* =========================
   MON ÉQUIPE
========================= */

async function loadMyTeam() {
    const profileId = localStorage.getItem("profile_id");

    if (!profileId) {
        window.location.href = "index.html";
        return;
    }

    const meResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        }
    );

    const meData = await meResponse.json();
    const me = meData[0];

    if (!me || !me.team_id) {
        document.getElementById("teamTitle").innerText = "Aucune équipe associée.";
        return;
    }

    const teamResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/teams?id=eq.${me.team_id}`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        }
    );

    const teamData = await teamResponse.json();
    const team = teamData[0];

    document.getElementById("teamTitle").innerText = team ? team.name : "Mon équipe";

    const membersResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?team_id=eq.${me.team_id}&order=full_name.asc`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        }
    );

    const members = await membersResponse.json();
    const container = document.getElementById("teamMembers");

    container.innerHTML = "";

    members.forEach(member => {
        container.innerHTML += `
            <div class="team-member" onclick="openTeamMember('${member.id}')">
                <strong>${member.full_name}</strong>
                | ${member.position || member.job_title || ""}
                | Niveau ${member.level || 1}
            </div>
        `;
    });
}

function openTeamMember(userId) {
    localStorage.setItem("selected_user_id", userId);
    window.location.href = "admin-user-detail.html";
}

/* =========================
   QUIZ BILAN CLASSIQUE
========================= */

async function loadQuestion() {
    const profileId = localStorage.getItem("profile_id");
    const fullName = localStorage.getItem("full_name");

    if (!profileId) {
        window.location.href = "index.html";
        return;
    }

    document.getElementById("welcome").innerText = "Bienvenue " + fullName;

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/questions?select=*&question_type=eq.open&order=order_number.asc`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        }
    );

    questions = await response.json();
    showQuestion();
}

function showQuestion() {
    if (currentQuestionIndex >= questions.length) {
        document.querySelector(".container").innerHTML = `
            <h2>Quiz terminé ✅</h2>
            <p>Merci, tes réponses ont été enregistrées.</p>
        `;
        return;
    }

    const q = questions[currentQuestionIndex];

    document.getElementById("progress").innerText =
        `Question ${currentQuestionIndex + 1} / ${questions.length}`;

    document.getElementById("category").innerText =
        `Catégorie : ${q.category}`;

    document.getElementById("questionText").innerText = q.question;
    document.getElementById("answerText").value = "";
}

async function submitAnswer() {
    const answer = document.getElementById("answerText").value.trim();

    if (!answer) {
        alert("Merci de saisir une réponse.");
        return;
    }

    const profileId = localStorage.getItem("profile_id");
    const q = questions[currentQuestionIndex];

    const response = await fetch(`${SUPABASE_URL}/rest/v1/answers`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
        },
        body: JSON.stringify({
            profile_id: profileId,
            question_id: q.id,
            answer_text: answer,
            corrected: false
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        alert("Erreur enregistrement : " + errorText);
        return;
    }

    currentQuestionIndex++;
    showQuestion();
}

/* =========================
   ENTRAÎNEMENT
========================= */

async function loadTrainingCategories() {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/questions?select=category`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        }
    );

    const data = await response.json();
    const uniqueCategories = [...new Set(data.map(x => x.category))];
    const container = document.getElementById("categories");

    container.innerHTML = "";

    uniqueCategories.forEach(category => {
        container.innerHTML += `
            <div class="card" onclick="startTraining('${category}')">
                <h2>${category}</h2>
                <p>Lancer l'entraînement</p>
            </div>
        `;
    });
}

function startTraining(category) {
    localStorage.setItem("training_category", category);
    window.location.href = "training-quiz.html";
}

async function loadTrainingQuiz() {
    const category = localStorage.getItem("training_category");

    if (!category) {
        window.location.href = "training.html";
        return;
    }

    document.getElementById("trainingTitle").innerText =
        "Entraînement - " + category;

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/questions?category=eq.${category}&order=order_number.asc`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        }
    );

    trainingQuestions = await response.json();
    showTrainingQuestion();
}

function showTrainingQuestion() {
    if (trainingIndex >= trainingQuestions.length) {
        addXp(5);

        document.querySelector(".container").innerHTML = `
            <h2>Entraînement terminé ✅</h2>
            <p>Tu as terminé cette catégorie.</p>
            <p><strong>+5 XP de participation gagnés</strong></p>

            <button onclick="window.location.href='training.html'">
                Choisir une autre catégorie
            </button>

            <button onclick="window.location.href='home.html'">
                Retour accueil
            </button>
        `;
        return;
    }

    const q = trainingQuestions[trainingIndex];

    document.getElementById("trainingProgress").innerText =
        `Question ${trainingIndex + 1} / ${trainingQuestions.length}`;

    document.getElementById("trainingQuestion").innerText = q.question;

    const answerZone = document.getElementById("answerZone");
    answerZone.innerHTML = "";

    if (q.question_type === "open") {
        answerZone.innerHTML = `
            <textarea id="trainingAnswer" rows="6" placeholder="Écris ta réponse ici..."></textarea>
        `;
    } else if (q.question_type === "true_false") {
        answerZone.innerHTML = `
            <label><input type="radio" name="answerChoice" value="A"> ${q.choice_a}</label><br>
            <label><input type="radio" name="answerChoice" value="B"> ${q.choice_b}</label>
        `;
    } else if (q.question_type === "single_choice") {
        answerZone.innerHTML = `
            <label><input type="radio" name="answerChoice" value="A"> ${q.choice_a}</label><br>
            <label><input type="radio" name="answerChoice" value="B"> ${q.choice_b}</label><br>
            <label><input type="radio" name="answerChoice" value="C"> ${q.choice_c}</label><br>
            <label><input type="radio" name="answerChoice" value="D"> ${q.choice_d}</label>
        `;
    } else if (q.question_type === "multiple_choice") {
        answerZone.innerHTML = `
            <label><input type="checkbox" name="answerChoice" value="A"> ${q.choice_a}</label><br>
            <label><input type="checkbox" name="answerChoice" value="B"> ${q.choice_b}</label><br>
            <label><input type="checkbox" name="answerChoice" value="C"> ${q.choice_c}</label><br>
            <label><input type="checkbox" name="answerChoice" value="D"> ${q.choice_d}</label>
        `;
    }
}

async function submitTrainingAnswer() {
    const profileId = localStorage.getItem("profile_id");
    const q = trainingQuestions[trainingIndex];

    let answer = "";

    if (q.question_type === "open") {
        const input = document.getElementById("trainingAnswer");
        answer = input ? input.value.trim() : "";
    } else if (q.question_type === "multiple_choice") {
        answer = Array.from(document.querySelectorAll('input[name="answerChoice"]:checked'))
            .map(input => input.value)
            .sort()
            .join(",");
    } else {
        const selected = document.querySelector('input[name="answerChoice"]:checked');
        answer = selected ? selected.value : "";
    }

    if (!answer) {
        alert("Merci de saisir une réponse.");
        return;
    }

    let autoScore = null;
    let finalScore = null;
    let corrected = false;

    if (q.question_type === "true_false" || q.question_type === "single_choice") {
        autoScore = answer === q.correct_answer ? q.max_points : 0;
        finalScore = autoScore;
        corrected = true;
    }

    if (q.question_type === "multiple_choice") {
        const correctChoices = q.correct_answer
            .split(",")
            .map(x => x.trim())
            .sort()
            .join(",");

        autoScore = answer === correctChoices ? q.max_points : 0;
        finalScore = autoScore;
        corrected = true;
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/answers`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
        },
        body: JSON.stringify({
            profile_id: profileId,
            question_id: q.id,
            answer_text: answer,
            auto_score: autoScore,
            final_score: finalScore,
            corrected: corrected
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        alert("Erreur enregistrement : " + errorText);
        return;
    }

    trainingIndex++;
    showTrainingQuestion();
}

/* =========================
   XP
========================= */

async function addXp(amount) {
    const profileId = localStorage.getItem("profile_id");

    if (!profileId) return;

    const currentXp = parseInt(localStorage.getItem("xp") || "0");
    const newXp = currentXp + amount;
    const newLevel = Math.floor(newXp / 100) + 1;

    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`, {
        method: "PATCH",
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
        },
        body: JSON.stringify({
            xp: newXp,
            level: newLevel
        })
    });

    if (response.ok) {
        localStorage.setItem("xp", newXp);
        localStorage.setItem("level", newLevel);
    }
}

/* =========================
   CORRECTIONS
========================= */

async function loadCorrections() {
    const container = document.getElementById("correctionList");

    if (!container) return;

    container.innerHTML = "";

    const answersResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/answers?select=*&order=submitted_at.desc`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        }
    );

    const answers = await answersResponse.json();

    for (const answer of answers) {
        const userResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${answer.profile_id}`,
            {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`
                }
            }
        );

        const userData = await userResponse.json();
        const user = userData[0];

        const questionResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/questions?id=eq.${answer.question_id}`,
            {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`
                }
            }
        );

        const questionData = await questionResponse.json();
        const question = questionData[0];

        container.innerHTML += `
            <div class="card">
                <h2>${user?.full_name || "Utilisateur inconnu"}</h2>
                <p><strong>Catégorie :</strong> ${question?.category || ""}</p>
                <p><strong>Question :</strong><br>${question?.question || ""}</p>
                <p><strong>Réponse attendue :</strong><br>${question?.expected_answer || "Non renseignée"}</p>
                <p><strong>Réponse donnée :</strong><br>${answer.answer_text || ""}</p>
                <p><strong>Barème :</strong> ${question?.max_points || 0} points</p>
                <p><strong>Corrigé :</strong> ${answer.corrected ? "Oui" : "Non"}</p>
            </div>
        `;
    }

    if (container.innerHTML === "") {
        container.innerHTML = "<p>Aucune réponse à corriger pour le moment.</p>";
    }
   async function loadRanking() {

    const container = document.getElementById("rankingList");

    if (!container) {
        return;
    }

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=*&order=xp.desc`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        }
    );

    const users = await response.json();

    container.innerHTML = "";

    users.forEach((user, index) => {

        container.innerHTML += `
            <div class="card">
                <h2>#${index + 1} - ${user.full_name}</h2>

                <p>
                    <strong>Niveau :</strong>
                    ${user.level || 1}
                </p>

                <p>
                    <strong>XP :</strong>
                    ${user.xp || 0}
                </p>

                <p>
                    <strong>Poste :</strong>
                    ${user.position || ""}
                </p>
            </div>
        `;
    });
}
}
