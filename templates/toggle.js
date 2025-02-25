function toggleMode() {
    document.body.classList.toggle("dark-mode");
    let toggleIcon = document.getElementById("toggle");
    toggleIcon.innerHTML = document.body.classList.contains("dark-mode") ? "🌞" : "🌙";
}