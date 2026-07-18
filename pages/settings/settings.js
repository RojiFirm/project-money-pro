/* ==========================================================
    PROJECT MONEY PRO
    Settings Module (dropdown list manager)
==========================================================*/

/* Same Web App URL used in transactions.js — move both to
   core/config.js once you're ready to share it across pages. */
const API_URL = "https://script.google.com/macros/s/AKfycbyplFP6eG8LTocJyIHMLqXbXnmfVIiC6Jycu6hiRZQMbYSkrSpgxGxY3THuvoh027WydA/exec";

let settings = []; // [{ type: "category", value: "Salary" }, ...]

const cards = document.querySelectorAll(".settings-card");


/* ==========================================================
    LOAD SETTINGS FROM SHEET
==========================================================*/

async function loadSettings() {

    const response = await fetch(`${API_URL}?resource=settings`);
    settings = await response.json();

    renderAllLists();

}


/* ==========================================================
    RENDER
==========================================================*/

function renderAllLists() {

    cards.forEach(card => {

        const type = card.dataset.type;
        const list = card.querySelector(".settings-list");

        const items = settings.filter(s => s.type === type);

        list.innerHTML = "";

        if (items.length === 0) {
            list.innerHTML = `<li class="empty">No items yet.</li>`;
            return;
        }

        items.forEach(item => {

            const li = document.createElement("li");

            li.innerHTML = `
                <span>${item.value}</span>
                <button class="remove-btn">Remove</button>
            `;

            li.querySelector(".remove-btn")
                .addEventListener("click", () => removeItem(type, item.value));

            list.appendChild(li);

        });

    });

}


/* ==========================================================
    ADD ITEM
==========================================================*/

async function addItem(type, value) {

    // Optimistic update so the UI feels instant
    settings.push({ type, value });
    renderAllLists();

    await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
            resource: "settings",
            action: "add",
            type: type,
            value: value
        })
    });

}


/* ==========================================================
    REMOVE ITEM
==========================================================*/

async function removeItem(type, value) {

    if (!confirm(`Remove "${value}"?`)) return;

    settings = settings.filter(s => !(s.type === type && s.value === value));
    renderAllLists();

    await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
            resource: "settings",
            action: "delete",
            type: type,
            value: value
        })
    });

}


/* ==========================================================
    FORM EVENTS
==========================================================*/

cards.forEach(card => {

    const type = card.dataset.type;
    const form = card.querySelector(".add-form");
    const input = card.querySelector(".add-input");

    form.addEventListener("submit", async function (e) {

        e.preventDefault();

        const value = input.value.trim();
        if (!value) return;

        const alreadyExists = settings.some(
            s => s.type === type && s.value.toLowerCase() === value.toLowerCase()
        );

        if (alreadyExists) {
            alert("That item already exists.");
            return;
        }

        await addItem(type, value);
        input.value = "";

    });

});


/* ==========================================================
    INITIALIZE
==========================================================*/

loadSettings();