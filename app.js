const SUPABASE_URL = "https://ytcochuaiprkzbptgkvn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0Y29jaHVhaXBya3picHRna3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTc1NzYsImV4cCI6MjA5NjMzMzU3Nn0.IvVCdv4pHXiy0X4SNVtP8KWtAmMBxQx4c-NwS2hEA7o";

let currentQuestionIndex = 0;
let questions = [];

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
            console.error("Erreur Supabase :", errorText);
            alert("Erreur Supabase : " + errorText);
            return;
        }

        const users = await response.json();

        if (users.length === 1) {
            localStorage.setItem("profile_id", users[0].id);
            localStorage.setItem("full_name", users[0].full_name);
            localStorage.setItem("role", users[0].role || "user");

            if (users[0].must_change_password === true) {
                window.location.href = "change-password.html";
            } else {
                window.location.href = "home.html";
            }
        } else {
            alert("Identifiant ou mot de passe incorrect.");
        }
    } catch (error) {
        console.error("Erreur JS :", error);
        alert("Erreur de connexion à Supabase : " + error.message);
    }
}


async function loadQuestion() {
    const profileId = localStorage.getItem("profile_id");
    const fullName = localStorage.getItem("full_name");

    if (!profileId) {
        window.location.href = "index.html";
        return;
    }

    document.getElementById("welcome").innerText =
        "Bienvenue " + fullName;

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/questions?select=*&order=order_number.asc`,
            {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`
                }
            }
        );

        questions = await response.json();

        showQuestion();
    } catch (error) {
        console.error(error);
        alert("Impossible de charger les questions.");
    }
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

    document.getElementById("questionText").innerText =
        q.question;

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

    try {
        await fetch(`${SUPABASE_URL}/rest/v1/answers`, {
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
                answer_text: answer
            })
        });

        currentQuestionIndex++;
        showQuestion();
    } catch (error) {
        console.error(error);
        alert("Erreur lors de l'enregistrement.");
    }
}
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
            <div class="card">
                <h2>${user.full_name || "Sans nom"}</h2>
                <p><strong>Identifiant :</strong> ${user.username || ""}</p>
                <p><strong>Rôle :</strong> ${user.role || ""}</p>
                <p><strong>Poste :</strong> ${user.position || user.job_title || ""}</p>
                <p><strong>Statut :</strong> ${user.status || ""}</p>
                <p><strong>Niveau :</strong> ${user.level || 1}</p>
                <p><strong>XP :</strong> ${user.xp || 0}</p>
            </div>
        `;
    });
}
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
        <p><strong>Statut :</strong> ${user.status}</p>
        <p><strong>Niveau :</strong> ${user.level}</p>
        <p><strong>XP :</strong> ${user.xp}</p>
    `;
}
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

    document.getElementById("teamTitle").innerText =
        team ? team.name : "Mon équipe";

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
