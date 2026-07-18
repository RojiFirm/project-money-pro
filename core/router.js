const pages = {

    dashboard: "pages/dashboard/dashboard.html",
    transactions: "pages/transactions/transactions.html",
    transfer: "pages/transfer/transfer.html",
    accounts: "pages/accounts/accounts.html",
    liabilities: "pages/liabilities/liabilities.html",
    assets: "pages/assets/assets.html",
    settings: "pages/settings/settings.html"

};

async function loadPage(page){

    const response = await fetch(pages[page]);

    const html = await response.text();

    document.getElementById("content").innerHTML = html;

    document.getElementById("page-title").textContent =
        page.charAt(0).toUpperCase() + page.slice(1);

}