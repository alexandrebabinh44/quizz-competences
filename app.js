const SUPABASE_URL = "https://ytcochuaiprkzbptgkvn.supabase.co/rest/v1/";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0Y29jaHVhaXBya3picHRna3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTc1NzYsImV4cCI6MjA5NjMzMzU3Nn0.IvVCdv4pHXiy0X4SNVtP8KWtAmMBxQx4c-NwS2hEA7o";

let currentQuestionIndex = 0;
let questions = [];

async function loadQuestion() {
  const profileId = localStorage.getItem("profile_id");
  const fullName = localStorage.getItem("full_name");

  if (!profileId) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("welcome").innerText = "Bienvenue " + fullName;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/questions?select=*&order=order_number.asc`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });

  questions = await response.json();

  showQuestion();
}

function showQuestion() {
  if (currentQuestionIndex >= questions.length) {
    document.querySelector(".container").innerHTML = `
      <h2>Quiz terminé ✅</h2>
      <p>Merci, tes réponses ont bien été enregistrées.</p>
    `;
    return;
  }

  const q = questions[currentQuestionIndex];

  document.getElementById("progress").innerText =
    `Question ${currentQuestionIndex + 1} / ${questions.length}`;

  document.getElementById("category").innerText =
    `Catégorie : ${q.category} — Barème : ${q.max_points} points`;

  document.getElementById("questionText").innerText = q.question;
  document.getElementById("answerText").value = "";
}

async function submitAnswer() {
  const answer = document.getElementById("answerText").value.trim();

  if (!answer) {
    alert("Merci d'écrire une réponse avant de continuer.");
    return;
  }

  const profileId = localStorage.getItem("profile_id");
  const q = questions[currentQuestionIndex];

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
}
