/* ==========================================
   Project Money PRO
   Transaction Log
========================================== */

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

let editIndex = -1;

/* ==========================================
   Elements
========================================== */

const modal = document.getElementById("transactionModal");
const form = document.getElementById("transactionForm");

const addBtn = document.getElementById("addTransactionBtn");
const closeBtn = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelBtn");

const tbody = document.getElementById("transactionBody");

const searchInput = document.getElementById("searchInput");
const filterType = document.getElementById("filterType");

/* ==========================================
   Modal
========================================== */

addBtn.onclick = () => {

    editIndex = -1;

    form.reset();

    document.getElementById("modalTitle").textContent =
        "Add Transaction";

    modal.classList.remove("hidden");

};

closeBtn.onclick = () => modal.classList.add("hidden");

cancelBtn.onclick = () => modal.classList.add("hidden");

window.onclick = (e)=>{

    if(e.target===modal){

        modal.classList.add("hidden");

    }

}

/* ==========================================
   Helpers
========================================== */

function generateID(){

    return "TRX-" +
        String(Date.now()).slice(-6);

}

function timestamp(){

    return new Date().toLocaleString();

}

function saveStorage(){

    localStorage.setItem(
        "transactions",
        JSON.stringify(transactions)
    );

}

/* ==========================================
   Render Table
========================================== */

function renderTable(){

    tbody.innerHTML="";

    let keyword = searchInput.value.toLowerCase();

    let typeFilter = filterType.value;

    transactions.forEach((item,index)=>{

        if(typeFilter!="All" &&
            item.type!==typeFilter){

            return;

        }

        let text = JSON.stringify(item).toLowerCase();

        if(!text.includes(keyword)){

            return;

        }

        tbody.innerHTML += `
        <tr>

            <td>${item.id}</td>

            <td>${item.date}</td>

            <td>${item.type}</td>

            <td>${item.category}</td>

            <td>${item.account}</td>

            <td>₱ ${Number(item.amount).toLocaleString()}</td>

            <td>${item.taxType}</td>

            <td>${item.description}</td>

            <td>

                <button
                    class="action-btn edit-btn"
                    onclick="editTransaction(${index})">

                    Edit

                </button>

                <button
                    class="action-btn delete-btn"
                    onclick="deleteTransaction(${index})">

                    Delete

                </button>

            </td>

        </tr>
        `;

    });

}

/* ==========================================
   Save
========================================== */

form.addEventListener("submit",(e)=>{

    e.preventDefault();

    let data={

        id:
            editIndex==-1
            ?generateID()
            :transactions[editIndex].id,

        date:
            document.getElementById("date").value,

        type:
            document.getElementById("type").value,

        category:
            document.getElementById("category").value,

        account:
            document.getElementById("account").value,

        amount:
            document.getElementById("amount").value,

        taxType:
            document.getElementById("taxType").value,

        additionalTax:
            document.getElementById("additionalTax").value,

        additionalTaxAmount:
            document.getElementById("additionalTaxAmount").value,

        description:
            document.getElementById("description").value,

        timestamp:
            timestamp()

    };

    if(editIndex==-1){

        transactions.push(data);

    }

    else{

        transactions[editIndex]=data;

    }

    saveStorage();

    renderTable();

    modal.classList.add("hidden");

    form.reset();

});

/* ==========================================
   Edit
========================================== */

function editTransaction(index){

    editIndex=index;

    let item=transactions[index];

    document.getElementById("modalTitle")
        .textContent="Edit Transaction";

    document.getElementById("date").value=item.date;

    document.getElementById("type").value=item.type;

    document.getElementById("category").value=item.category;

    document.getElementById("account").value=item.account;

    document.getElementById("amount").value=item.amount;

    document.getElementById("taxType").value=item.taxType;

    document.getElementById("additionalTax").value=item.additionalTax;

    document.getElementById("additionalTaxAmount").value=item.additionalTaxAmount;

    document.getElementById("description").value=item.description;

    modal.classList.remove("hidden");

}

/* ==========================================
   Delete
========================================== */

function deleteTransaction(index){

    if(confirm("Delete this transaction?")){

        transactions.splice(index,1);

        saveStorage();

        renderTable();

    }

}

/* ==========================================
   Search
========================================== */

searchInput.addEventListener("keyup",renderTable);

filterType.addEventListener("change",renderTable);

/* ==========================================
   Start
========================================== */

renderTable();