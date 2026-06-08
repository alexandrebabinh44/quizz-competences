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

            window.location.href = "home.html";
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
