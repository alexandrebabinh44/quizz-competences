const SUPABASE_URL = "COLLE_ICI_TON_PROJECT_URL";
const SUPABASE_KEY = "COLLE_ICI_TON_ANON_PUBLIC_KEY";

async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    alert("Merci de remplir l'identifiant et le mot de passe.");
    return;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?username=eq.${username}&password=eq.${password}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });

  const users = await response.json();

  if (users.length === 1) {
    localStorage.setItem("profile_id", users[0].id);
    localStorage.setItem("full_name", users[0].full_name);
    window.location.href = "quiz.html";
  } else {
    alert("Identifiant ou mot de passe incorrect.");
  }
}
