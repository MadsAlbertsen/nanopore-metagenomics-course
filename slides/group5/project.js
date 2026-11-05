const N = DATA.numbers;
document.querySelectorAll("[data-n]").forEach((e) => { e.textContent = N[e.dataset.n] ?? "?"; });
