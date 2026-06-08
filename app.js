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
            `${SUPABASE_URL}/rest/v1/profiles?username=eq.${username}&password=eq.${password}`,
            {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`
                }
            }
        );

        const users = await response.json();

        if (users.length === 1) {
            localStorage.setItem("profile_id", users[0].id);
            localStorage.setItem("full_name", users[0].full_name);
            localStorage.setItem("role", user[0].role);

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
