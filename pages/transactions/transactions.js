/* ==========================================================
    PROJECT MONEY PRO
    Transactions Module (Google Sheets backend)
==========================================================*/

/* ==========================================================
    DOM REFERENCES
==========================================================*/

const modal = document.getElementById("transactionModal");
const form = document.getElementById("transactionForm");

const btnNewTransaction = document.getElementById("btnNewTransaction");
const btnCloseModal = document.getElementById("btnCloseModal");
const btnCancel = document.getElementById("btnCancel");

const transactionBody = document.getElementById("transactionBody");

const dateInput = document.getElementById("date");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const accountInput = document.getElementById("account");
const amountInput = document.getElementById("amount");
const taxTypeInput = document.getElementById("taxType");
const additionalTaxInput = document.getElementById("additionalTax");
const descriptionInput = document.getElementById("description");

const taxAmountLabel = document.getElementById("taxAmount");
const additionalTaxAmountLabel = document.getElementById("additionalTaxAmount");
const netAmountLabel = document.getElementById("netAmount");

const totalIncome = document.getElementById("totalIncome");
const totalExpense = document.getElementById("totalExpense");
const totalTax = document.getElementById("totalTax");
const transactionCount = document.getElementById("transactionCount");

const searchInput = document.getElementById("searchTransaction");
const filterType = document.getElementById("filterType");
const filterCategory = document.getElementById("filterCategory");
const filterAccount = document.getElementById("filterAccount");


/* ==========================================================
    GOOGLE SHEETS API CONFIG
    Paste your Apps Script Web App URL below.
    This ideally belongs in core/config.js, but it's here
    for clarity — move it if you prefer.
==========================================================*/

const API_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";

let transactions = [];


/* ==========================================================
    TRANSACTION CLASS
==========================================================*/

class Transaction {

    constructor(data){

        this.id = data.id;
        this.date = data.date;
        this.type = data.type;
        this.category = data.category;
        this.account = data.account;
        this.amount = Number(data.amount);
        this.taxType = data.taxType;
        this.additionalTax = data.additionalTax;
        this.additionalAmount = Number(data.additionalAmount) || 0;
        this.taxAmount = Number(data.taxAmount) || 0;
        this.timestamp = data.timestamp;
        this.description = data.description;

        // Net amount isn't stored in the sheet — derive it instead
        this.netAmount =
            data.netAmount !== undefined
                ? Number(data.netAmount)
                : this.amount - this.taxAmount - this.additionalAmount;

    }

}


/* ==========================================================
    REMOTE STORAGE (Google Sheets via Apps Script)
==========================================================*/

async function loadFromSheet(){

    const response = await fetch(API_URL);
    const data = await response.json();

    transactions = data.map(row => new Transaction(row));

}

async function addToSheet(transaction){

    await fetch(API_URL, {
        method: "POST",
        // Apps Script doPost reads e.postData.contents regardless
        // of content-type, so text/plain avoids CORS preflight issues.
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
            action: "add",
            transaction: transaction
        })
    });

}

async function updateInSheet(transaction){

    await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
            action: "update",
            transaction: transaction
        })
    });

}

async function deleteFromSheet(id){

    await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
            action: "delete",
            id: id
        })
    });

}


/* ==========================================================
    ID GENERATOR
==========================================================*/

function generateTransactionID(){

    const number =
        transactions.length + 1;

    return `TRX-${String(number).padStart(6,"0")}`;

}


/* ==========================================================
    TIMESTAMP
==========================================================*/

function getTimestamp(){

    return new Date().toLocaleString();

}


/* ==========================================================
    FORMAT CURRENCY
==========================================================*/

function formatCurrency(value){

    return "₱" + Number(value).toLocaleString(
        undefined,
        {
            minimumFractionDigits:2,
            maximumFractionDigits:2
        }
    );

}


/* ==========================================================
    TAX CALCULATION
==========================================================*/

function calculateTax(
    amount,
    taxRate,
    additionalRate
){

    const taxAmount =
        amount * taxRate;

    const additionalAmount =
        amount * additionalRate;

    const netAmount =
        amount -
        taxAmount -
        additionalAmount;

    return{
        taxAmount,
        additionalAmount,
        netAmount
    };

}


/* ==========================================================
    PREVIEW CALCULATION
==========================================================*/

function updatePreview(){

    const amount =
        Number(amountInput.value) || 0;

    // Temporary rates
    const taxRate = 0.10;
    const additionalRate = 0.05;

    const calc =
        calculateTax(
            amount,
            taxRate,
            additionalRate
        );

    taxAmountLabel.textContent =
        formatCurrency(calc.taxAmount);

    additionalTaxAmountLabel.textContent =
        formatCurrency(calc.additionalAmount);

    netAmountLabel.textContent =
        formatCurrency(calc.netAmount);

}


/* ==========================================================
    MODAL
==========================================================*/

function openModal(){

    modal.classList.remove("hidden");

    dateInput.value =
        new Date().toISOString().split("T")[0];

}

function closeModal(){

    modal.classList.add("hidden");

    form.reset();

    updatePreview();

}

/* ==========================================================
    SAVE TRANSACTION
==========================================================*/

async function saveTransaction() {

    const amount = Number(amountInput.value);

    // Temporary tax rates
    // Later these will come from Settings
    const taxRate = 0.10;
    const additionalRate = 0.05;

    const calculation = calculateTax(
        amount,
        taxRate,
        additionalRate
    );

    const transaction = new Transaction({

        id: generateTransactionID(),
        date: dateInput.value,
        type: typeInput.value,
        category: categoryInput.value,
        account: accountInput.value,
        amount: amount,
        taxType: taxTypeInput.value,
        taxRate: taxRate,
        taxAmount: calculation.taxAmount,
        additionalTax: additionalTaxInput.value,
        additionalRate: additionalRate,
        additionalAmount: calculation.additionalAmount,
        netAmount: calculation.netAmount,
        description: descriptionInput.value,
        timestamp: getTimestamp()

    });

    transactions.push(transaction);

    await addToSheet(transaction);

    renderTransactions();
    updateSummaryCards();
    closeModal();

}


/* ==========================================================
    RENDER TABLE
==========================================================*/

function renderTransactions(list = transactions){

    transactionBody.innerHTML = "";

    if(list.length === 0){

        transactionBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center;">
                    No transactions found.
                </td>
            </tr>
        `;

        return;

    }

    list.forEach((transaction,index)=>{

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${transaction.id}</td>
            <td>${transaction.date}</td>
            <td>${transaction.type}</td>
            <td>${transaction.category}</td>
            <td>${transaction.account}</td>
            <td>${formatCurrency(transaction.amount)}</td>
            <td>${formatCurrency(transaction.taxAmount)}</td>
            <td>${formatCurrency(transaction.netAmount)}</td>
            <td>${transaction.description}</td>
            <td>
                <button class="edit-btn" onclick="editTransaction(${index})">Edit</button>
                <button class="delete-btn" onclick="deleteTransaction(${index})">Delete</button>
            </td>
        `;

        transactionBody.appendChild(row);

    });

}


/* ==========================================================
    SUMMARY CARDS
==========================================================*/

function updateSummaryCards(){

    let income = 0;
    let expense = 0;
    let tax = 0;

    transactions.forEach(transaction=>{

        tax += transaction.taxAmount;

        if(transaction.type==="Income"){
            income += transaction.netAmount;
        } else {
            expense += transaction.amount;
        }

    });

    totalIncome.textContent = formatCurrency(income);
    totalExpense.textContent = formatCurrency(expense);
    totalTax.textContent = formatCurrency(tax);
    transactionCount.textContent = transactions.length;

}


/* ==========================================================
    DELETE
==========================================================*/

async function deleteTransaction(index){

    if(!confirm("Delete this transaction?")) return;

    const id = transactions[index].id;

    transactions.splice(index,1);

    await deleteFromSheet(id);

    renderTransactions();
    updateSummaryCards();

}


/* ==========================================================
    EDIT
==========================================================*/

let editingIndex = -1;

function editTransaction(index){

    editingIndex = index;

    const transaction =
        transactions[index];

    openModal();

    dateInput.value = transaction.date;
    typeInput.value = transaction.type;
    categoryInput.value = transaction.category;
    accountInput.value = transaction.account;
    amountInput.value = transaction.amount;
    taxTypeInput.value = transaction.taxType;
    additionalTaxInput.value = transaction.additionalTax;
    descriptionInput.value = transaction.description;

    updatePreview();

}


/* ==========================================================
    UPDATE TRANSACTION
==========================================================*/

async function updateTransaction(){

    const amount = Number(amountInput.value);
    const taxRate = 0.10;
    const additionalRate = 0.05;

    const calculation =
        calculateTax(
            amount,
            taxRate,
            additionalRate
        );

    const updated = new Transaction({

        id: transactions[editingIndex].id,
        date: dateInput.value,
        type: typeInput.value,
        category: categoryInput.value,
        account: accountInput.value,
        amount: amount,
        taxType: taxTypeInput.value,
        taxRate: taxRate,
        taxAmount: calculation.taxAmount,
        additionalTax: additionalTaxInput.value,
        additionalRate: additionalRate,
        additionalAmount: calculation.additionalAmount,
        netAmount: calculation.netAmount,
        description: descriptionInput.value,
        timestamp: transactions[editingIndex].timestamp

    });

    transactions[editingIndex] = updated;

    await updateInSheet(updated);

    editingIndex = -1;

    renderTransactions();
    updateSummaryCards();
    closeModal();

}

/* ==========================================================
    SEARCH
==========================================================*/

function searchTransactions() {

    const keyword =
        searchInput.value.toLowerCase();

    const filtered = transactions.filter(transaction => {

        return (
            transaction.id.toLowerCase().includes(keyword) ||
            transaction.category.toLowerCase().includes(keyword) ||
            transaction.account.toLowerCase().includes(keyword) ||
            transaction.description.toLowerCase().includes(keyword)
        );

    });

    renderTransactions(filtered);

}


/* ==========================================================
    FILTERS
==========================================================*/

function filterTransactions() {

    const type = filterType.value;
    const category = filterCategory.value;
    const account = filterAccount.value;

    const filtered = transactions.filter(transaction => {

        const matchType = !type || transaction.type === type;
        const matchCategory = !category || transaction.category === category;
        const matchAccount = !account || transaction.account === account;

        return (matchType && matchCategory && matchAccount);

    });

    renderTransactions(filtered);

}


/* ==========================================================
    FORM VALIDATION
==========================================================*/

function validateForm() {

    if (!dateInput.value) { alert("Date is required."); return false; }
    if (!typeInput.value) { alert("Type is required."); return false; }
    if (!categoryInput.value) { alert("Category is required."); return false; }
    if (!accountInput.value) { alert("Account is required."); return false; }
    if (amountInput.value === "" || Number(amountInput.value) <= 0) {
        alert("Enter a valid amount.");
        return false;
    }

    return true;

}


/* ==========================================================
    FORM SUBMIT
==========================================================*/

form.addEventListener("submit", async function (e) {

    e.preventDefault();

    if (!validateForm()) return;

    if (editingIndex === -1) {
        await saveTransaction();
    } else {
        await updateTransaction();
    }

});


/* ==========================================================
    MODAL EVENTS
==========================================================*/

btnNewTransaction.addEventListener("click", openModal);
btnCloseModal.addEventListener("click", closeModal);
btnCancel.addEventListener("click", closeModal);

modal.addEventListener("click", function (e) {
    if (e.target === modal) closeModal();
});


/* ==========================================================
    LIVE CALCULATION
==========================================================*/

amountInput.addEventListener("input", updatePreview);


/* ==========================================================
    SEARCH / FILTERS
==========================================================*/

searchInput.addEventListener("keyup", searchTransactions);
filterType.addEventListener("change", filterTransactions);
filterCategory.addEventListener("change", filterTransactions);
filterAccount.addEventListener("change", filterTransactions);


/* ==========================================================
    LOAD DROPDOWN LISTS (from Settings sheet)
==========================================================*/

async function loadDropdownLists() {

    const response = await fetch(`${API_URL}?resource=settings`);
    const settings = await response.json();

    const byType = (type) =>
        settings.filter(s => s.type === type).map(s => s.value);

    byType("category").forEach(item => {
        categoryInput.innerHTML += `<option>${item}</option>`;
        filterCategory.innerHTML += `<option>${item}</option>`;
    });

    byType("account").forEach(item => {
        accountInput.innerHTML += `<option>${item}</option>`;
        filterAccount.innerHTML += `<option>${item}</option>`;
    });

    byType("taxType").forEach(item => {
        taxTypeInput.innerHTML += `<option>${item}</option>`;
    });

    byType("additionalTax").forEach(item => {
        additionalTaxInput.innerHTML += `<option>${item}</option>`;
    });

}


/* ==========================================================
    INITIALIZE
==========================================================*/

async function initializeTransactions() {

    await loadDropdownLists();
    await loadFromSheet();

    renderTransactions();
    updateSummaryCards();
    updatePreview();

    dateInput.value =
        new Date().toISOString().split("T")[0];

}

initializeTransactions();