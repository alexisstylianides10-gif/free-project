/* ==========================================================================
   Ledgerly — client-side invoicing & billing app
   All state lives in localStorage. No backend, no external requests.
   ========================================================================== */

(function () {
  "use strict";

  /* ---------------- constants ---------------- */
  const PLAN_LIMITS = {
    free: { clients: 3, invoicesPerMonth: 5, branding: false, recurring: false, multiCurrency: false },
    pro: { clients: Infinity, invoicesPerMonth: Infinity, branding: true, recurring: true, multiCurrency: true },
    agency: { clients: Infinity, invoicesPerMonth: Infinity, branding: true, recurring: true, multiCurrency: true },
  };
  const PRICES = {
    pro: { monthly: 15, annual: 144 },
    agency: { monthly: 39, annual: 374 },
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------------- storage helpers ---------------- */
  function loadAccount() {
    try { return JSON.parse(localStorage.getItem("ledgerly_account") || "null"); }
    catch (e) { return null; }
  }
  function saveAccount(acc) { localStorage.setItem("ledgerly_account", JSON.stringify(acc)); }

  function dataKey(email) { return "ledgerly_data_" + email.toLowerCase(); }
  function loadData(email) {
    try { return JSON.parse(localStorage.getItem(dataKey(email)) || "null"); }
    catch (e) { return null; }
  }
  function saveData() { localStorage.setItem(dataKey(state.account.email), JSON.stringify(state.data)); }
  function saveAll() { saveAccount(state.account); saveData(); }

  /* ---------------- app state ---------------- */
  const state = {
    account: null, // {business,email,password,currency,taxRate,brandColor,plan,billingCycle,renewDate,cancelAtPeriodEnd}
    data: null,    // {clients:[], invoices:[], nextInvoiceSeq:1}
    view: "dashboard",
    invoiceFilter: { status: "all", search: "" },
    pendingUpgradePlan: null,
    editingInvoiceId: null,
    viewingInvoiceId: null,
  };

  /* ---------------- utils ---------------- */
  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
  function money(n) {
    const cur = (state.account && state.account.currency) || "USD";
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(n || 0);
    } catch (e) { return "$" + (n || 0).toFixed(2); }
  }
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }
  function invoiceTotals(inv) {
    const subtotal = inv.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
    const tax = subtotal * ((Number(inv.taxRate) || 0) / 100);
    return { subtotal, tax, total: subtotal + tax };
  }
  function effectiveStatus(inv) {
    if (inv.status === "sent" && inv.dueDate < todayISO()) return "overdue";
    return inv.status;
  }
  function clientById(id) { return state.data.clients.find((c) => c.id === id); }
  function invoicesThisMonthCount() {
    const now = new Date();
    return state.data.invoices.filter((i) => {
      const d = new Date(i.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }
  function planLimits() { return PLAN_LIMITS[state.account.plan] || PLAN_LIMITS.free; }

  /* ---------------- seed demo data ---------------- */
  function seedDemoData() {
    const now = new Date();
    const iso = (daysOffset) => {
      const d = new Date(now); d.setDate(d.getDate() + daysOffset);
      return d.toISOString().slice(0, 10);
    };
    const clients = [
      { id: uid(), name: "Northwind Studio", email: "hello@northwindstudio.com", address: "12 Harbor Rd, Seattle, WA", createdAt: Date.now() },
      { id: uid(), name: "Bright Path Coaching", email: "billing@brightpath.io", address: "44 Elm St, Austin, TX", createdAt: Date.now() },
      { id: uid(), name: "Vertex Robotics", email: "ap@vertexrobotics.com", address: "900 Innovation Way, Boston, MA", createdAt: Date.now() },
    ];
    const invoices = [
      { id: uid(), number: "INV-1001", clientId: clients[0].id, issueDate: iso(-58), dueDate: iso(-28), items: [{ desc: "Brand identity design", qty: 1, rate: 2400 }], taxRate: 0, notes: "Thanks for the opportunity!", recurring: "none", status: "paid", paidAt: iso(-30), createdAt: Date.now() - 90 * 86400000 },
      { id: uid(), number: "INV-1002", clientId: clients[1].id, issueDate: iso(-40), dueDate: iso(-10), items: [{ desc: "Website copywriting (5 pages)", qty: 5, rate: 180 }], taxRate: 5, notes: "", recurring: "none", status: "paid", paidAt: iso(-12), createdAt: Date.now() - 60 * 86400000 },
      { id: uid(), number: "INV-1003", clientId: clients[2].id, issueDate: iso(-20), dueDate: iso(-5), items: [{ desc: "Q3 UX audit", qty: 1, rate: 1800 }, { desc: "Follow-up workshop", qty: 2, rate: 300 }], taxRate: 8, notes: "Net 15 terms.", recurring: "none", status: "sent", createdAt: Date.now() - 30 * 86400000 },
      { id: uid(), number: "INV-1004", clientId: clients[0].id, issueDate: iso(-5), dueDate: iso(25), items: [{ desc: "Monthly retainer — design support", qty: 1, rate: 950 }], taxRate: 0, notes: "", recurring: "monthly", status: "sent", createdAt: Date.now() - 5 * 86400000 },
      { id: uid(), number: "INV-1005", clientId: clients[1].id, issueDate: todayISO(), dueDate: iso(14), items: [{ desc: "Landing page redesign", qty: 1, rate: 1200 }], taxRate: 5, notes: "", recurring: "none", status: "draft", createdAt: Date.now() },
    ];
    return { clients, invoices, nextInvoiceSeq: 1006 };
  }

  /* ================= AUTH ================= */
  function initAuth() {
    $$(".auth-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        $$(".auth-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const isSignup = tab.dataset.tab === "signup";
        $("#authSubmit").textContent = isSignup ? "Start free — no card required" : "Sign in";
        $("#authBusiness").required = isSignup;
        $("#authBusinessField").classList.toggle("hidden", !isSignup);
      });
    });

    $("#authForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const mode = $(".auth-tab.active").dataset.tab;
      const business = $("#authBusiness").value.trim();
      const email = $("#authEmail").value.trim().toLowerCase();
      const password = $("#authPassword").value;
      const existing = loadAccount();

      if (mode === "signup") {
        if (existing && existing.email === email) {
          toast("An account with that email already exists — sign in instead.");
          return;
        }
        const account = {
          business, email, password, currency: "USD", taxRate: 0,
          brandColor: "#4f46e5", plan: "free", billingCycle: "monthly",
          renewDate: null, cancelAtPeriodEnd: false,
        };
        saveAccount(account);
        const seeded = seedDemoData();
        localStorage.setItem(dataKey(email), JSON.stringify(seeded));
        localStorage.setItem("ledgerly_session", email);
        toast("Welcome to Ledgerly! We loaded a few sample invoices to get you started.");
        bootApp();
        return;
      }

      // sign in
      if (!existing || existing.email !== email) {
        toast("No account found with that email — try creating one.");
        return;
      }
      if (existing.password !== password) {
        toast("Incorrect password.");
        return;
      }
      localStorage.setItem("ledgerly_session", email);
      bootApp();
    });

    $("#signOutBtn").addEventListener("click", () => {
      localStorage.removeItem("ledgerly_session");
      location.reload();
    });
  }

  /* ================= BOOT ================= */
  function bootApp() {
    const sessionEmail = localStorage.getItem("ledgerly_session");
    const account = loadAccount();
    if (!sessionEmail || !account || account.email !== sessionEmail) return;

    state.account = account;
    state.data = loadData(account.email) || seedDemoData();

    // handle subscription period end
    if (account.cancelAtPeriodEnd && account.renewDate && account.renewDate < todayISO()) {
      account.plan = "free";
      account.cancelAtPeriodEnd = false;
      account.renewDate = null;
    }

    $("#authScreen").classList.add("hidden");
    $("#app").classList.remove("hidden");

    initNav();
    initClientModal();
    initInvoiceModal();
    initViewInvoiceModal();
    initBillingView();
    initSettingsView();
    initUpgradeModal();
    initInvoiceFilters();

    renderAll();
  }

  function renderAll() {
    renderSidebarPlan();
    renderDashboard();
    renderInvoicesTable();
    renderClients();
    renderBilling();
    renderSettingsForm();
    applyPlanGatingUI();
    saveAll();
  }

  /* ================= NAV ================= */
  function initNav() {
    $$(".nav-item[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });
    $$("[data-view-link]").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.viewLink));
    });
    $$("[data-action='new-invoice']").forEach((b) => b.addEventListener("click", () => openInvoiceModal()));
    $$("[data-action='new-client']").forEach((b) => b.addEventListener("click", () => openClientModal()));
    $("#sidebarUpgradeBtn").addEventListener("click", () => openUpgradeModal("pro", "You're getting close to your Free plan limits."));
  }
  function switchView(view) {
    state.view = view;
    $$(".view").forEach((v) => v.classList.add("hidden"));
    $("#view-" + view).classList.remove("hidden");
    $$(".nav-item[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    if (view === "dashboard") renderDashboard();
    if (view === "invoices") renderInvoicesTable();
    if (view === "clients") renderClients();
    if (view === "billing") renderBilling();
    if (view === "settings") renderSettingsForm();
  }

  /* ================= SIDEBAR / PLAN ================= */
  function renderSidebarPlan() {
    const plan = state.account.plan;
    const badge = $("#planBadge");
    badge.textContent = plan === "free" ? "Free" : plan === "pro" ? "Pro" : "Agency";
    badge.classList.toggle("pro", plan !== "free");

    const limits = planLimits();
    const used = invoicesThisMonthCount();
    const usageEl = $("#planUsage");
    const meter = $("#planMeter");
    const upgradeBtn = $("#sidebarUpgradeBtn");

    if (limits.invoicesPerMonth === Infinity) {
      usageEl.textContent = used + " invoices this month · Unlimited plan";
      meter.style.width = "8%";
      meter.classList.remove("danger");
      upgradeBtn.classList.add("hidden");
    } else {
      const pct = Math.min(100, (used / limits.invoicesPerMonth) * 100);
      usageEl.textContent = used + " / " + limits.invoicesPerMonth + " invoices this month";
      meter.style.width = pct + "%";
      meter.classList.toggle("danger", pct >= 80);
      upgradeBtn.classList.remove("hidden");
    }
    $("#dashName").textContent = ", " + (state.account.business || "there");
    $("#todayStr").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  /* ================= DASHBOARD ================= */
  function renderDashboard() {
    const invs = state.data.invoices;
    const paid = invs.filter((i) => i.status === "paid");
    const totalRevenue = paid.reduce((s, i) => s + invoiceTotals(i).total, 0);
    const outstanding = invs.filter((i) => effectiveStatus(i) === "sent" || effectiveStatus(i) === "overdue")
      .reduce((s, i) => s + invoiceTotals(i).total, 0);
    const overdueInvs = invs.filter((i) => effectiveStatus(i) === "overdue");
    const overdueTotal = overdueInvs.reduce((s, i) => s + invoiceTotals(i).total, 0);

    const mrr = invs.filter((i) => i.status !== "draft").reduce((s, i) => {
      if (i.recurring === "monthly") return s + invoiceTotals(i).total;
      if (i.recurring === "yearly") return s + invoiceTotals(i).total / 12;
      return s;
    }, 0);

    $("#kpiRevenue").textContent = money(totalRevenue);
    $("#kpiOutstanding").textContent = money(outstanding);
    $("#kpiOutstandingSub").textContent = invs.filter((i) => effectiveStatus(i) === "sent").length + " invoices awaiting payment";
    $("#kpiOverdue").textContent = money(overdueTotal);
    $("#kpiOverdueSub").textContent = overdueInvs.length + " invoice" + (overdueInvs.length === 1 ? "" : "s");
    $("#kpiMrr").textContent = money(mrr);

    // revenue chart, last 6 months
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleDateString(undefined, { month: "short" }), y: d.getFullYear(), m: d.getMonth() });
    }
    const totals = months.map((mo) => {
      return paid.filter((i) => {
        const d = new Date(i.paidAt || i.issueDate);
        return d.getFullYear() === mo.y && d.getMonth() === mo.m;
      }).reduce((s, i) => s + invoiceTotals(i).total, 0);
    });
    const max = Math.max(1, ...totals);
    $("#revenueChart").innerHTML = months.map((mo, idx) => `
      <div class="bar-col">
        <div class="bar" style="height:${Math.max(3, (totals[idx] / max) * 100)}%" title="${money(totals[idx])}"></div>
        <span class="bar-label">${mo.label}</span>
      </div>`).join("");

    // needs attention
    const attn = [];
    overdueInvs.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).forEach((i) => {
      const c = clientById(i.clientId);
      const days = Math.round((new Date(todayISO()) - new Date(i.dueDate)) / 86400000);
      attn.push(`<li class="attn-item"><span>${i.number} · ${c ? c.name : "Unknown"} <span class="muted">(${days}d overdue)</span></span><span class="amt">${money(invoiceTotals(i).total)}</span></li>`);
    });
    const draftCount = invs.filter((i) => i.status === "draft").length;
    if (draftCount) attn.push(`<li class="attn-item"><span>${draftCount} invoice${draftCount === 1 ? "" : "s"} still in Draft</span><span class="link-btn" data-view-link="invoices">Review →</span></li>`);
    $("#attnList").innerHTML = attn.length ? attn.join("") : `<li class="attn-empty">You're all caught up 🎉</li>`;
    $$("#attnList [data-view-link]").forEach((b) => b.addEventListener("click", () => switchView("invoices")));

    // recent invoices
    const recent = [...invs].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    $("#recentInvoicesTable tbody").innerHTML = recent.map(rowHtml).join("") || `<tr><td colspan="6" class="muted" style="padding:20px;">No invoices yet.</td></tr>`;
    bindRowClicks("#recentInvoicesTable");
  }

  function statusPill(inv) {
    const s = effectiveStatus(inv);
    return `<span class="status-pill status-${s}">${s}</span>`;
  }
  function rowHtml(i) {
    const c = clientById(i.clientId);
    return `<tr class="clickable" data-id="${i.id}">
      <td><strong>${i.number}</strong></td>
      <td>${c ? c.name : "—"}</td>
      <td>${fmtDate(i.issueDate)}</td>
      <td>${fmtDate(i.dueDate)}</td>
      <td>${money(invoiceTotals(i).total)}</td>
      <td>${statusPill(i)}</td>
    </tr>`;
  }
  function bindRowClicks(tableSel) {
    $$(tableSel + " tbody tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", () => openViewInvoiceModal(tr.dataset.id));
    });
  }

  /* ================= INVOICES LIST ================= */
  function initInvoiceFilters() {
    $("#invoiceSearch").addEventListener("input", (e) => {
      state.invoiceFilter.search = e.target.value.toLowerCase();
      renderInvoicesTable();
    });
    $$("#statusFilters .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        $$("#statusFilters .chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        state.invoiceFilter.status = chip.dataset.status;
        renderInvoicesTable();
      });
    });
  }
  function renderInvoicesTable() {
    let list = [...state.data.invoices].sort((a, b) => b.createdAt - a.createdAt);
    const { status, search } = state.invoiceFilter;
    if (status !== "all") list = list.filter((i) => effectiveStatus(i) === status);
    if (search) {
      list = list.filter((i) => {
        const c = clientById(i.clientId);
        return i.number.toLowerCase().includes(search) || (c && c.name.toLowerCase().includes(search));
      });
    }
    $("#invoicesEmpty").classList.toggle("hidden", state.data.invoices.length !== 0);
    $("#invoicesTable").parentElement.classList.toggle("hidden", state.data.invoices.length === 0);

    $("#invoicesTable tbody").innerHTML = list.map((i) => {
      const c = clientById(i.clientId);
      return `<tr>
        <td><strong>${i.number}</strong></td>
        <td>${c ? c.name : "—"}</td>
        <td>${fmtDate(i.issueDate)}</td>
        <td>${fmtDate(i.dueDate)}</td>
        <td>${money(invoiceTotals(i).total)}</td>
        <td>${statusPill(i)}</td>
        <td><button class="link-btn" data-id="${i.id}">Open →</button></td>
      </tr>`;
    }).join("") || `<tr><td colspan="7" class="muted" style="padding:20px;">No invoices match your filters.</td></tr>`;

    $$("#invoicesTable tbody [data-id]").forEach((b) => b.addEventListener("click", () => openViewInvoiceModal(b.dataset.id)));
  }

  /* ================= CLIENTS ================= */
  function renderClients() {
    const clients = state.data.clients;
    $("#clientsEmpty").classList.toggle("hidden", clients.length !== 0);
    $("#clientGrid").classList.toggle("hidden", clients.length === 0);

    $("#clientGrid").innerHTML = clients.map((c) => {
      const invs = state.data.invoices.filter((i) => i.clientId === c.id);
      const billed = invs.filter((i) => i.status === "paid").reduce((s, i) => s + invoiceTotals(i).total, 0);
      const outstanding = invs.filter((i) => effectiveStatus(i) !== "paid" && effectiveStatus(i) !== "draft").reduce((s, i) => s + invoiceTotals(i).total, 0);
      const initials = c.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
      return `<div class="client-card" data-id="${c.id}">
        <div class="client-avatar">${initials}</div>
        <h3>${c.name}</h3>
        <p>${c.email || "No email on file"}</p>
        <div class="client-stats">
          <div><b>${money(billed)}</b>Billed</div>
          <div><b>${money(outstanding)}</b>Outstanding</div>
          <div><b>${invs.length}</b>Invoices</div>
        </div>
      </div>`;
    }).join("");

    $$("#clientGrid .client-card").forEach((card) => {
      card.addEventListener("click", () => openClientModal(card.dataset.id));
    });
  }

  function initClientModal() {
    $("#clientForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = $("#clientId").value;
      const name = $("#clientName").value.trim();
      const email = $("#clientEmail").value.trim();
      const address = $("#clientAddress").value.trim();
      if (id) {
        const c = clientById(id);
        Object.assign(c, { name, email, address });
      } else {
        if (state.data.clients.length >= planLimits().clients) {
          closeModal("#clientModalOverlay");
          openUpgradeModal("pro", `Free plan is limited to ${PLAN_LIMITS.free.clients} clients. Upgrade to Pro for unlimited clients.`);
          return;
        }
        state.data.clients.push({ id: uid(), name, email, address, createdAt: Date.now() });
      }
      saveAll();
      renderClients();
      renderDashboard();
      closeModal("#clientModalOverlay");
      toast("Client saved.");
    });
    bindModalClose("#clientModalOverlay");
  }
  function openClientModal(id) {
    $("#clientForm").reset();
    $("#clientId").value = id || "";
    $("#clientModalTitle").textContent = id ? "Edit Client" : "Add Client";
    if (id) {
      const c = clientById(id);
      $("#clientName").value = c.name;
      $("#clientEmail").value = c.email || "";
      $("#clientAddress").value = c.address || "";
    }
    openModal("#clientModalOverlay");
  }

  /* ================= INVOICE MODAL (create/edit) ================= */
  function initInvoiceModal() {
    $("#addLineItemBtn").addEventListener("click", () => addLineItemRow());
    $("#invoiceTaxRate").addEventListener("input", recalcTotals);
    bindModalClose("#invoiceModalOverlay");

    $("#invoiceRecurring").addEventListener("change", (e) => {
      if (state.account.plan === "free" && e.target.value !== "none") {
        e.target.value = "none";
        openUpgradeModal("pro", "Recurring invoices are a Pro feature.");
      }
    });

    $("#invoiceForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = $("#invoiceId").value;
      const items = $$(".line-item-row").map((row) => ({
        desc: $(".li-desc", row).value.trim(),
        qty: Number($(".li-qty", row).value) || 0,
        rate: Number($(".li-rate", row).value) || 0,
      })).filter((it) => it.desc);

      if (!items.length) { toast("Add at least one line item."); return; }

      const payload = {
        number: $("#invoiceNumber").value.trim(),
        clientId: $("#invoiceClient").value,
        issueDate: $("#invoiceIssueDate").value,
        dueDate: $("#invoiceDueDate").value,
        items,
        taxRate: Number($("#invoiceTaxRate").value) || 0,
        notes: $("#invoiceNotes").value.trim(),
        recurring: $("#invoiceRecurring").value,
      };

      if (id) {
        Object.assign(state.data.invoices.find((i) => i.id === id), payload);
        toast("Invoice updated.");
      } else {
        if (invoicesThisMonthCount() >= planLimits().invoicesPerMonth) {
          closeModal("#invoiceModalOverlay");
          openUpgradeModal("pro", `Free plan is limited to ${PLAN_LIMITS.free.invoicesPerMonth} invoices/month. Upgrade to Pro for unlimited invoices.`);
          return;
        }
        state.data.invoices.push(Object.assign({ id: uid(), status: "draft", createdAt: Date.now() }, payload));
        toast("Invoice created.");
      }
      saveAll();
      renderAll();
      closeModal("#invoiceModalOverlay");
    });
  }

  function addLineItemRow(item) {
    const row = document.createElement("div");
    row.className = "line-item-row";
    row.innerHTML = `
      <input type="text" class="li-desc" placeholder="Description" value="${item ? item.desc : ""}" required>
      <input type="number" class="li-qty" placeholder="Qty" min="0" step="1" value="${item ? item.qty : 1}">
      <input type="number" class="li-rate" placeholder="Rate" min="0" step="0.01" value="${item ? item.rate : ""}">
      <button type="button" class="line-item-remove" title="Remove">&times;</button>`;
    $("#lineItems").appendChild(row);
    row.querySelector(".line-item-remove").addEventListener("click", () => { row.remove(); recalcTotals(); });
    row.querySelectorAll("input").forEach((inp) => inp.addEventListener("input", recalcTotals));
    recalcTotals();
  }
  function recalcTotals() {
    const items = $$(".line-item-row").map((row) => ({
      qty: Number($(".li-qty", row).value) || 0,
      rate: Number($(".li-rate", row).value) || 0,
    }));
    const subtotal = items.reduce((s, it) => s + it.qty * it.rate, 0);
    const taxRate = Number($("#invoiceTaxRate").value) || 0;
    const tax = subtotal * (taxRate / 100);
    $("#totalSubtotal").textContent = money(subtotal);
    $("#totalTax").textContent = money(tax);
    $("#totalGrand").textContent = money(subtotal + tax);
  }

  function openInvoiceModal(id) {
    $("#invoiceForm").reset();
    $("#lineItems").innerHTML = "";
    $("#invoiceId").value = id || "";
    $("#invoiceModalTitle").textContent = id ? "Edit Invoice" : "New Invoice";

    $("#invoiceClient").innerHTML = state.data.clients.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    if (!state.data.clients.length) {
      toast("Add a client before creating an invoice.");
      openClientModal();
      return;
    }

    if (id) {
      const inv = state.data.invoices.find((i) => i.id === id);
      $("#invoiceClient").value = inv.clientId;
      $("#invoiceNumber").value = inv.number;
      $("#invoiceIssueDate").value = inv.issueDate;
      $("#invoiceDueDate").value = inv.dueDate;
      $("#invoiceTaxRate").value = inv.taxRate;
      $("#invoiceNotes").value = inv.notes || "";
      $("#invoiceRecurring").value = inv.recurring || "none";
      inv.items.forEach((it) => addLineItemRow(it));
    } else {
      $("#invoiceNumber").value = "INV-" + state.data.nextInvoiceSeq++;
      $("#invoiceIssueDate").value = todayISO();
      const due = new Date(); due.setDate(due.getDate() + 14);
      $("#invoiceDueDate").value = due.toISOString().slice(0, 10);
      $("#invoiceTaxRate").value = state.account.taxRate || 0;
      addLineItemRow();
    }
    recalcTotals();
    openModal("#invoiceModalOverlay");
  }

  /* ================= VIEW INVOICE MODAL ================= */
  function initViewInvoiceModal() {
    bindModalClose("#viewInvoiceOverlay");
    $("#editInvoiceBtn").addEventListener("click", () => {
      closeModal("#viewInvoiceOverlay");
      openInvoiceModal(state.viewingInvoiceId);
    });
    $("#deleteInvoiceBtn").addEventListener("click", () => {
      if (!confirm("Delete this invoice? This can't be undone.")) return;
      state.data.invoices = state.data.invoices.filter((i) => i.id !== state.viewingInvoiceId);
      saveAll();
      renderAll();
      closeModal("#viewInvoiceOverlay");
      toast("Invoice deleted.");
    });
    $("#printInvoiceBtn").addEventListener("click", () => {
      const printArea = document.createElement("div");
      printArea.id = "printArea";
      printArea.innerHTML = $("#invoicePreview").innerHTML;
      document.body.appendChild(printArea);
      window.print();
      setTimeout(() => printArea.remove(), 500);
    });
  }

  function openViewInvoiceModal(id) {
    state.viewingInvoiceId = id;
    const inv = state.data.invoices.find((i) => i.id === id);
    const c = clientById(inv.clientId);
    const t = invoiceTotals(inv);
    const acc = state.account;
    const showWatermark = acc.plan === "free";

    $("#invoicePreview").innerHTML = `
      <div class="ip-head">
        <div class="ip-brand"><span class="swatch" style="background:${acc.brandColor}"></span>${acc.business}</div>
        <div class="ip-meta"><b>${inv.number}</b>Issued ${fmtDate(inv.issueDate)}<br>Due ${fmtDate(inv.dueDate)}</div>
      </div>
      <div class="ip-parties">
        <div><h4>From</h4>${acc.business}<br>${acc.email}</div>
        <div style="text-align:right;"><h4>Bill to</h4>${c ? c.name : "—"}<br>${c && c.email ? c.email : ""}<br>${c && c.address ? c.address.replace(/\n/g, "<br>") : ""}</div>
      </div>
      <table class="ip-table">
        <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th style="text-align:right;">Amount</th></tr></thead>
        <tbody>${inv.items.map((it) => `<tr><td>${it.desc}</td><td>${it.qty}</td><td>${money(it.rate)}</td><td style="text-align:right;">${money(it.qty * it.rate)}</td></tr>`).join("")}</tbody>
      </table>
      <div class="ip-totals"><table>
        <tr><td>Subtotal</td><td style="text-align:right;">${money(t.subtotal)}</td></tr>
        <tr><td>Tax (${inv.taxRate}%)</td><td style="text-align:right;">${money(t.tax)}</td></tr>
        <tr class="grand"><td>Total</td><td style="text-align:right;">${money(t.total)}</td></tr>
      </table></div>
      ${inv.notes ? `<div class="ip-notes">${inv.notes}</div>` : ""}
      ${showWatermark ? `<div class="ip-watermark">Sent with Ledgerly Free — upgrade to remove this watermark</div>` : ""}
    `;

    const actions = $("#statusActions");
    actions.innerHTML = "";
    if (inv.status === "draft") actions.innerHTML += `<button class="btn btn-primary" id="markSent">Mark as Sent</button>`;
    if (inv.status === "sent") actions.innerHTML += `<button class="btn btn-primary" id="markPaid">Mark as Paid</button>`;
    if (inv.status === "paid") actions.innerHTML += `<span class="status-pill status-paid">Paid ${inv.paidAt ? "on " + fmtDate(inv.paidAt) : ""}</span>`;
    if (actions.querySelector("#markSent")) actions.querySelector("#markSent").addEventListener("click", () => setInvoiceStatus(id, "sent"));
    if (actions.querySelector("#markPaid")) actions.querySelector("#markPaid").addEventListener("click", () => setInvoiceStatus(id, "paid"));

    openModal("#viewInvoiceOverlay");
  }
  function setInvoiceStatus(id, status) {
    const inv = state.data.invoices.find((i) => i.id === id);
    inv.status = status;
    if (status === "paid") inv.paidAt = todayISO();
    saveAll();
    renderAll();
    openViewInvoiceModal(id);
    toast(status === "paid" ? "Invoice marked as paid." : "Invoice marked as sent.");
  }

  /* ================= BILLING / PAYWALL ================= */
  function initBillingView() {
    $("#billingCycleToggle").addEventListener("change", (e) => {
      renderBilling(e.target.checked ? "annual" : "monthly");
    });
    $("#proPlanBtn").addEventListener("click", () => openUpgradeModal("pro"));
    $("#agencyPlanBtn").addEventListener("click", () => openUpgradeModal("agency"));
    $("#cancelPlanBtn").addEventListener("click", () => {
      if (!confirm("Cancel your subscription? You'll keep Pro features until the end of your current billing period.")) return;
      state.account.cancelAtPeriodEnd = true;
      saveAll();
      toast("Subscription set to cancel at period end.");
      renderBilling();
    });
  }
  function renderBilling(cycleOverride) {
    const acc = state.account;
    const cycle = cycleOverride || acc.billingCycle || "monthly";
    $("#billingCycleToggle").checked = cycle === "annual";
    $("#proPrice").textContent = cycle === "annual" ? "$" + PRICES.pro.annual : "$" + PRICES.pro.monthly;
    $("#proPriceUnit").textContent = cycle === "annual" ? "/yr" : "/mo";
    $("#agencyPrice").textContent = cycle === "annual" ? "$" + PRICES.agency.annual : "$" + PRICES.agency.monthly;
    $("#agencyPriceUnit").textContent = cycle === "annual" ? "/yr" : "/mo";

    $("#billingCurrentPlan").textContent = acc.plan === "free" ? "Free" : acc.plan === "pro" ? "Pro" : "Agency";
    $("#freePlanBtn").textContent = acc.plan === "free" ? "Current plan" : "Downgrade";
    $("#freePlanBtn").disabled = acc.plan === "free";

    $("#proPlanBtn").textContent = acc.plan === "pro" ? "Current plan" : "Upgrade to Pro";
    $("#proPlanBtn").disabled = acc.plan === "pro";
    $("#agencyPlanBtn").textContent = acc.plan === "agency" ? "Current plan" : "Upgrade to Agency";
    $("#agencyPlanBtn").disabled = acc.plan === "agency";

    const cancelPanel = $("#cancelPanel");
    if (acc.plan !== "free") {
      cancelPanel.style.display = "";
      $("#renewDate").textContent = acc.cancelAtPeriodEnd
        ? "— cancels on " + fmtDate(acc.renewDate)
        : fmtDate(acc.renewDate);
      $("#cancelPlanBtn").textContent = acc.cancelAtPeriodEnd ? "Cancellation scheduled" : "Cancel subscription";
      $("#cancelPlanBtn").disabled = !!acc.cancelAtPeriodEnd;
    } else {
      cancelPanel.style.display = "none";
    }
  }

  function initUpgradeModal() {
    bindModalClose("#upgradeModalOverlay");
    $("#ccNumber").addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
    });
    $("#ccExpiry").addEventListener("input", (e) => {
      let v = e.target.value.replace(/\D/g, "").slice(0, 4);
      if (v.length > 2) v = v.slice(0, 2) + " / " + v.slice(2);
      e.target.value = v;
    });
    $("#ccCvc").addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4); });

    $("#checkoutForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = $("#checkoutSubmitBtn");
      btn.disabled = true;
      btn.textContent = "Processing payment…";
      setTimeout(() => {
        const plan = state.pendingUpgradePlan;
        const cycle = $("#billingCycleToggle").checked ? "annual" : "monthly";
        const renew = new Date();
        if (cycle === "annual") renew.setFullYear(renew.getFullYear() + 1); else renew.setMonth(renew.getMonth() + 1);
        state.account.plan = plan;
        state.account.billingCycle = cycle;
        state.account.renewDate = renew.toISOString().slice(0, 10);
        state.account.cancelAtPeriodEnd = false;
        saveAll();
        btn.disabled = false;
        btn.textContent = "Subscribe";
        closeModal("#upgradeModalOverlay");
        $("#checkoutForm").reset();
        toast(`You're now on the ${plan === "pro" ? "Pro" : "Agency"} plan 🎉`);
        renderAll();
      }, 1100);
    });
  }
  function openUpgradeModal(plan, reason) {
    state.pendingUpgradePlan = plan;
    $("#upgradeModalTitle").textContent = "Upgrade to " + (plan === "pro" ? "Pro" : "Agency");
    $("#upgradeReason").textContent = reason || (plan === "pro" ? "Unlock unlimited clients, unlimited invoices, and custom branding." : "Unlock team seats and a client payment portal.");
    const cycle = state.account.billingCycle === "annual" ? "annual" : "monthly";
    const price = PRICES[plan][cycle];
    $("#checkoutSummary").innerHTML = `<span>${plan === "pro" ? "Pro" : "Agency"} plan — ${cycle}</span><span>$${price}${cycle === "annual" ? "/yr" : "/mo"}</span>`;
    openModal("#upgradeModalOverlay");
  }

  /* ================= SETTINGS ================= */
  function initSettingsView() {
    $("#saveSettingsBtn").addEventListener("click", () => {
      const acc = state.account;
      acc.business = $("#setBusinessName").value.trim() || acc.business;
      acc.email = acc.email; // email is immutable in this demo
      acc.currency = $("#setCurrency").value;
      acc.taxRate = Number($("#setTaxRate").value) || 0;
      saveAll();
      renderAll();
      const c = $("#saveConfirm");
      c.classList.remove("hidden");
      setTimeout(() => c.classList.add("hidden"), 1800);
    });
    $("#setBrandColor").addEventListener("input", (e) => {
      if (state.account.plan === "free") {
        e.target.value = state.account.brandColor;
        openUpgradeModal("pro", "Custom brand color is a Pro feature.");
        return;
      }
      state.account.brandColor = e.target.value;
      saveAll();
    });
  }
  function renderSettingsForm() {
    const acc = state.account;
    $("#setBusinessName").value = acc.business || "";
    $("#setBusinessEmail").value = acc.email || "";
    $("#setCurrency").value = acc.currency || "USD";
    $("#setTaxRate").value = acc.taxRate || 0;
    $("#setBrandColor").value = acc.brandColor || "#4f46e5";
  }

  /* ================= PLAN-GATED UI ================= */
  function applyPlanGatingUI() {
    const isFree = state.account.plan === "free";
    $$(".pro-field").forEach((f) => f.classList.toggle("locked", isFree));
  }

  /* ================= MODAL HELPERS ================= */
  function openModal(sel) { $(sel).classList.remove("hidden"); }
  function closeModal(sel) { $(sel).classList.add("hidden"); }
  function bindModalClose(sel) {
    const overlay = $(sel);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(sel); });
    $$("[data-close]", overlay).forEach((b) => b.addEventListener("click", () => closeModal(sel)));
  }

  /* ================= INIT ================= */
  document.addEventListener("DOMContentLoaded", () => {
    initAuth();
    const session = localStorage.getItem("ledgerly_session");
    if (session) bootApp();
  });
})();
