const SUPABASE_URL = "https://ytcochuaiprkzbptgkvn.supabase.co/rest/v1/";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0Y29jaHVhaXBya3picHRna3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTc1NzYsImV4cCI6MjA5NjMzMzU3Nn0.IvVCdv4pHXiy0X4SNVtP8KWtAmMBxQx4c-NwS2hEA7o";

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
