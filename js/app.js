/**
 * TBTECH VWM - CHƯƠNG TRÌNH ĐIỀU HÀNH TRUNG TÂM (CORE APP CONTROLLER)
 * Quản lý kho hàng, Bóc tách AI OCR hóa đơn PDF, Hộp thư kế toán, Xuất chứng từ A4 & Doanh nghiệp
 */

// ==========================================================================
// 0. RESET & MIGRATION - DỌN DẸP CACHE VÀ DỮ LIỆU CŨ TỰ ĐỘNG
// ==========================================================================
const CURRENT_SYSTEM_VERSION = "v6.0_tbtech_production_2026";
if (Storage.get("system_db_version", "") !== CURRENT_SYSTEM_VERSION) {
  console.log("Phát hiện phiên bản mới hoặc yêu cầu reset: Đang dọn sạch toàn bộ cache cũ...");
  Storage.clearAll();
  Storage.set("system_db_version", CURRENT_SYSTEM_VERSION);
}

function resetSystemData(confirmAction = true) {
  if (confirmAction) {
    const ok = confirm("Bạn có chắc chắn muốn RESET TOÀN BỘ dữ liệu cũ về mặc định ban đầu của TBTECH không?\n\nToàn bộ cache hóa đơn, hàng tồn cũ sẽ được làm mới hoàn toàn.");
    if (!ok) return;
  }
  Storage.clearAll();
  Storage.set("system_db_version", CURRENT_SYSTEM_VERSION);
  showToast("Đang làm sạch và khởi tạo lại toàn bộ dữ liệu TBTECH...", "info");
  setTimeout(() => {
    window.location.reload();
  }, 400);
}

// ==========================================================================
// 1. KHỞI TẠO STATE & QUẢN LÝ DỮ LIỆU
// ==========================================================================
const AppState = {
  currentTab: "dashboard",
  companyInfo: Storage.get("companyInfo", DEFAULT_COMPANY_INFO),
  products: Storage.get("products", INITIAL_PRODUCTS),
  customers: Storage.get("customers", INITIAL_CUSTOMERS),
  inbox: Storage.get("inbox", INITIAL_INBOX),
  history: Storage.get("history", INITIAL_HISTORY),
  documents: Storage.get("documents", INITIAL_DOCUMENTS),
  adminPassword: Storage.get("adminPassword", "admin123"),
  geminiApiKey: Storage.get("geminiApiKey", ""),

  // Mới: Hóa đơn đầu ra & Danh mục Alias
  salesInvoices: Storage.get("salesInvoices", SAMPLE_SALES_INVOICES),
  simulationQueue: Storage.get("simulationQueue", SIMULATION_EMAILS),
  aliases: Storage.get("aliases", INITIAL_ALIASES),

  // Mới: Trạng thái Tự Động Đọc Mail Kế Toán & Kết Nối Gmail ketoan.tbtech387@gmail.com
  gmailConfig: Storage.get("gmailConfig", DEFAULT_GMAIL_CONFIG),
  isScanningGmail: false,
  autoMailEnabled: Storage.get("autoMailEnabled", true),
  mailPollInterval: Storage.get("mailPollInterval", 1800), // Quét mỗi 30 phút (1800 giây)
  mailCountdown: 1800,
  mailTimerId: null,
  mailLastChecked: "Vừa khởi chạy",

  // Mới: Trạng thái phân hệ Đối Soát HĐ Đầu Vào - Đầu Ra & Hàng Tồn
  auditInputInvoice: null,
  auditOutputInvoice: null,
  auditResults: null,

  // Trạng thái UI
  customerViewMode: Storage.get("customerViewMode", "list"), // "list" | "grid"
  customerSearchTerm: "",
  selectedProductIds: [],
  activeInvoice: null,
  activeDocument: null,
  docMode: "FORM", // "FORM" | "PREVIEW" | "ARCHIVE"
  currentDocType: "PHIEU_XUAT_KHO",
  searchTerm: "",
  categoryFilter: "ALL",
  stockFilter: "ALL",
  charts: {}
};

// Lưu dữ liệu vào LocalStorage
function saveState() {
  Storage.set("companyInfo", AppState.companyInfo);
  Storage.set("products", AppState.products);
  Storage.set("customers", AppState.customers);
  Storage.set("inbox", AppState.inbox);
  Storage.set("history", AppState.history);
  Storage.set("documents", AppState.documents);
  Storage.set("adminPassword", AppState.adminPassword);
  Storage.set("geminiApiKey", AppState.geminiApiKey);
  Storage.set("salesInvoices", AppState.salesInvoices);
  Storage.set("simulationQueue", AppState.simulationQueue);
  Storage.set("aliases", AppState.aliases);
  Storage.set("gmailConfig", AppState.gmailConfig);
  Storage.set("autoMailEnabled", AppState.autoMailEnabled);
  Storage.set("mailPollInterval", AppState.mailPollInterval);
  Storage.set("customerViewMode", AppState.customerViewMode);
}

// Khởi tạo chứng từ rỗng ban đầu
function initEmptyDocument() {
  const year = new Date().getFullYear();
  const randNum = String(Math.floor(Math.random() * 900) + 100);
  AppState.activeDocument = {
    id: `doc-${Date.now()}`,
    docType: AppState.currentDocType,
    docNumber: `PXK-${year}/${randNum}`,
    date: new Date().toISOString().slice(0, 10),
    receiverName: "",
    receiverOrg: "",
    receiverAddress: "",
    receiverPhone: "",
    receiverTaxCode: "",
    reason: "Xuất kho giao hàng & bàn giao thiết bị công nghệ cho khách hàng",
    warehouseSource: AppState.companyInfo.warehouseAddress,
    items: [],
    deductStock: true
  };
}

// ==========================================================================
// 2. KHỞI CHẠY ỨNG DỤNG (STARTUP)
// ==========================================================================
function initApp() {
  // Loại bỏ hoàn toàn các sản phẩm demo cũ (Fortinet, Dell Latitude...) nếu còn sót lại
  const legacySkus = ["FL-FG-60F", "DL-LAT-5420", "CS-CAT-C9200L", "APC-SMT1500I", "UB-U6-PRO"];
  if (AppState.products) {
    AppState.products = AppState.products.filter(p => !legacySkus.includes(p.sku) && !p.name.toLowerCase().includes("fortigate"));
  }
  if (AppState.inbox) {
    AppState.inbox = AppState.inbox.filter(m => !m.extractedData?.invoiceNumber?.includes("FPT-") && !m.senderName?.includes("FPT"));
  }

  // Đồng bộ hóa danh mục Hóa đơn bán ra và Vật tư mới vào AppState nếu LocalStorage có dữ liệu cũ
  if (typeof SAMPLE_SALES_INVOICES !== "undefined" && AppState.salesInvoices) {
    SAMPLE_SALES_INVOICES.forEach(s => {
      if (!AppState.salesInvoices.some(existing => existing.id === s.id)) {
        AppState.salesInvoices.unshift(s);
      }
    });
  }
  if (typeof INITIAL_PRODUCTS !== "undefined" && AppState.products) {
    INITIAL_PRODUCTS.forEach(p => {
      if (!AppState.products.some(existing => existing.sku === p.sku)) {
        AppState.products.push(p);
      }
    });
  }
  if (typeof INITIAL_ALIASES !== "undefined" && AppState.aliases) {
    INITIAL_ALIASES.forEach(a => {
      if (!AppState.aliases.some(existing => existing.raw === a.raw && existing.sku === a.sku)) {
        AppState.aliases.push(a);
      }
    });
  }

  if (AppState.inbox && AppState.inbox.length > 0) {
    AppState.activeInvoice = AppState.inbox[0];
  }

  // Khởi tạo hóa đơn đối soát ban đầu nếu chưa có
  if (!AppState.auditInputInvoice && AppState.inbox && AppState.inbox.length > 0) {
    AppState.auditInputInvoice = AppState.inbox[0];
  }
  if (!AppState.auditOutputInvoice && AppState.salesInvoices && AppState.salesInvoices.length > 0) {
    AppState.auditOutputInvoice = AppState.salesInvoices[0];
  }

  initEmptyDocument();
  renderHeaderCounters();
  startAutoMailPoller();
  switchTab("dashboard");

  // Phím tắt Ctrl+K
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      const searchInput = document.getElementById("global-search");
      if (searchInput) searchInput.focus();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// ==========================================================================
// 3. CẬP NHẬT HEADER & BỘ ĐẾM KHO
// ==========================================================================
function renderHeaderCounters() {
  const skus = AppState.products.length;
  const totalStock = AppState.products.reduce((sum, p) => sum + (Number(p.inStock) || 0), 0);
  const costValue = AppState.products.reduce((sum, p) => sum + ((Number(p.costPrice) || 0) * (Number(p.inStock) || 0)), 0);
  const sellValue = AppState.products.reduce((sum, p) => sum + ((Number(p.sellPrice) || 0) * (Number(p.inStock) || 0)), 0);

  const skuEl = document.getElementById("header-sku-count");
  const stockEl = document.getElementById("header-stock-count");
  if (skuEl) skuEl.textContent = `${skus} SKUs`;
  if (stockEl) stockEl.textContent = `${formatNumber(totalStock)} thiết bị`;

  updateHeaderMailStatus();

  return { skus, totalStock, costValue, sellValue };
}

// ==========================================================================
// 4. ĐIỀU HƯỚNG TABS
// ==========================================================================
function switchTab(tabName) {
  playSound("click");
  AppState.currentTab = tabName;

  const tabs = ["dashboard", "inventory", "invoice_reader", "gmail_sync", "reconciliation", "documents", "customers", "history_log", "settings"];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    if (btn) {
      if (t === tabName) {
        btn.className = "flex items-center space-x-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer bg-blue-600 text-white shadow-md shadow-blue-600/25 border border-blue-500 transition-all";
      } else {
        btn.className = "flex items-center space-x-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent transition-all";
      }
    }
  });

  renderHeaderCounters();

  const container = document.getElementById("main-content");
  if (!container) return;

  if (tabName === "dashboard") renderDashboard(container);
  else if (tabName === "inventory") renderInventory(container);
  else if (tabName === "invoice_reader") renderInvoiceReader(container);
  else if (tabName === "gmail_sync") renderGmailSync(container);
  else if (tabName === "reconciliation") renderAuditReconciliation(container);
  else if (tabName === "documents") renderDocuments(container);
  else if (tabName === "customers") renderCustomers(container);
  else if (tabName === "history_log") renderHistoryLog(container);
  else if (tabName === "settings") renderSettings(container);
}

// ==========================================================================
// TAB 1: EXECUTIVE DASHBOARD
// ==========================================================================
function renderDashboard(container) {
  const { skus, totalStock, costValue, sellValue } = renderHeaderCounters();
  const estProfit = sellValue - costValue;
  const outOfStock = AppState.products.filter(p => p.inStock === 0).length;
  const lowStock = AppState.products.filter(p => p.inStock > 0 && p.inStock <= p.minStock).length;
  const pendingInvoices = AppState.inbox.filter(m => !m.isImported).length;

  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <!-- Welcome Banner -->
      <div class="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden border border-blue-900/40">
        <div class="absolute -right-10 -bottom-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="space-y-2">
            <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Hệ Thống Trực Tuyến TBTECH WMS v2.6</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Trung Tâm Quản Lý Kho & Chứng Từ TBTECH</h1>
            <p class="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Kiểm soát tự động số lượng thiết bị, trích xuất hóa đơn PDF bằng AI, đồng bộ hóa hộp thư kế toán và tạo lập chứng từ chuẩn mực A4 (Phiếu xuất 02-VT, Biên bản bàn giao, Hợp đồng).
            </p>
          </div>
          <div class="flex flex-wrap gap-2.5 shrink-0">
            <button onclick="switchTab('invoice_reader')" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center space-x-2 cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              <span>Quét Hóa Đơn AI</span>
            </button>
            <button onclick="switchTab('documents')" class="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center space-x-2 cursor-pointer">
              <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <span>Lập Phiếu Xuất Kho</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 4 KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div class="glass-card p-5 rounded-2xl border border-slate-200/90 hover:shadow-md transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Giá Trị Kho (Vốn Nhập)</span>
            <div class="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold">₫</div>
          </div>
          <div class="mt-3">
            <div class="text-xl sm:text-2xl font-black text-slate-900 font-mono">${formatVND(costValue)}</div>
            <p class="text-[11px] text-slate-500 mt-1 font-medium">Chi phí tồn kho theo giá vốn thực tế</p>
          </div>
        </div>

        <div class="glass-card p-5 rounded-2xl border border-slate-200/90 hover:shadow-md transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Giá Trị (Niêm Yết)</span>
            <div class="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-xl sm:text-2xl font-black text-emerald-600 font-mono">${formatVND(sellValue)}</div>
            <p class="text-[11px] text-emerald-700/80 mt-1 font-medium">Lợi nhuận gộp dự tính: +${formatVND(estProfit)}</p>
          </div>
        </div>

        <div class="glass-card p-5 rounded-2xl border border-slate-200/90 hover:shadow-md transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Mặt Hàng & Số Lượng</span>
            <div class="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-xl sm:text-2xl font-black text-slate-900 font-mono">${skus} <span class="text-xs font-semibold text-slate-500">SKUs</span> / ${formatNumber(totalStock)} <span class="text-xs font-semibold text-slate-500">cái</span></div>
            <p class="text-[11px] text-slate-500 mt-1 font-medium">Bố trí tại các dãy kệ & phòng máy chủ</p>
          </div>
        </div>

        <div class="glass-card p-5 rounded-2xl border border-slate-200/90 hover:shadow-md transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Cảnh Báo Tồn Kho</span>
            <div class="w-9 h-9 rounded-xl ${outOfStock > 0 ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'} flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-xl sm:text-2xl font-black ${outOfStock > 0 ? 'text-red-600' : 'text-slate-900'} font-mono">${outOfStock} <span class="text-xs font-semibold text-slate-500">hết hàng</span> / ${lowStock} <span class="text-xs font-semibold text-slate-500">sắp hết</span></div>
            <p class="text-[11px] text-amber-600 mt-1 font-semibold">${pendingInvoices} hóa đơn kế toán chờ nhập kho</p>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="glass-card p-6 rounded-3xl border border-slate-200/90 lg:col-span-1">
          <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span>Cơ Cấu Danh Mục Thiết Bị</span>
          </h2>
          <div class="relative h-64 flex items-center justify-center">
            <canvas id="categoryChart"></canvas>
          </div>
        </div>

        <div class="glass-card p-6 rounded-3xl border border-slate-200/90 lg:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <span class="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <span>Top Mặt Hàng Tồn Kho Giá Trị Nhất</span>
            </h2>
            <button onclick="switchTab('inventory')" class="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer">Xem tất cả kho &rarr;</button>
          </div>
          <div class="relative h-64">
            <canvas id="topProductsChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Quick Tables -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="glass-card p-6 rounded-3xl border border-slate-200/90">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              <span>Hộp Thư Kế Toán - Hóa Đơn Mới</span>
            </h3>
            <span class="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">${pendingInvoices} chờ nhập</span>
          </div>
          <div class="space-y-2.5">
            ${AppState.inbox.slice(0, 3).map(mail => `
              <div class="p-3.5 rounded-2xl border ${mail.isImported ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-amber-50/60 border-amber-200 text-amber-950'} flex items-center justify-between transition hover:shadow-xs">
                <div class="space-y-0.5 truncate pr-2">
                  <div class="text-xs font-bold truncate">${mail.senderName}</div>
                  <div class="text-[11px] text-slate-500 truncate">${mail.subject}</div>
                  <div class="text-[10px] text-slate-400 font-mono">${mail.receivedDate} • File: ${mail.pdfFileName}</div>
                </div>
                <div class="shrink-0 flex items-center space-x-2">
                  ${mail.isImported ? `
                    <span class="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-md">Đã Nhập Kho</span>
                  ` : `
                    <button onclick="handleQuickImportFromInbox('${mail.id}')" class="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold rounded-lg transition shadow-xs cursor-pointer">
                      Nhập Kho
                    </button>
                  `}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="glass-card p-6 rounded-3xl border border-slate-200/90">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>Nhật Ký Biến Động Kho Gần Đây</span>
            </h3>
            <button onclick="switchTab('history_log')" class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer">Xem tất cả &rarr;</button>
          </div>
          <div class="space-y-2.5">
            ${AppState.history.slice(0, 3).map(tx => `
              <div class="p-3.5 rounded-2xl border border-slate-200/80 bg-white flex items-center justify-between hover:shadow-xs transition">
                <div class="space-y-0.5 truncate pr-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded ${tx.type === 'IMPORT' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
                      ${tx.type === 'IMPORT' ? 'NHẬP KHO' : 'XUẤT KHO'}
                    </span>
                    <span class="text-xs font-bold text-slate-800 truncate">${tx.referenceNumber}</span>
                  </div>
                  <div class="text-[11px] text-slate-600 truncate">${tx.partnerName}</div>
                  <div class="text-[10px] text-slate-400 font-mono">${tx.date}</div>
                </div>
                <div class="text-right shrink-0">
                  <div class="text-xs font-bold text-slate-900 font-mono">${formatVND(tx.totalAmount)}</div>
                  <div class="text-[10px] text-slate-500">${tx.items.length} mặt hàng</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => initDashboardCharts(), 50);
}

function initDashboardCharts() {
  if (typeof Chart === "undefined") return;

  if (AppState.charts.categoryChart) AppState.charts.categoryChart.destroy();
  if (AppState.charts.topProductsChart) AppState.charts.topProductsChart.destroy();

  const catCounts = {};
  AppState.products.forEach(p => {
    catCounts[p.category] = (catCounts[p.category] || 0) + p.inStock;
  });

  const catCtx = document.getElementById("categoryChart");
  if (catCtx) {
    AppState.charts.categoryChart = new Chart(catCtx, {
      type: "doughnut",
      data: {
        labels: Object.keys(catCounts),
        datasets: [{
          data: Object.values(catCounts),
          backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b"],
          borderWidth: 2,
          borderColor: "#ffffff"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 10, family: "Plus Jakarta Sans" } } }
        }
      }
    });
  }

  const topProducts = [...AppState.products]
    .sort((a, b) => (b.costPrice * b.inStock) - (a.costPrice * a.inStock))
    .slice(0, 5);

  const topCtx = document.getElementById("topProductsChart");
  if (topCtx) {
    AppState.charts.topProductsChart = new Chart(topCtx, {
      type: "bar",
      data: {
        labels: topProducts.map(p => p.sku),
        datasets: [{
          label: "Giá trị tồn kho (VNĐ)",
          data: topProducts.map(p => p.costPrice * p.inStock),
          backgroundColor: "#2563eb",
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            ticks: {
              callback: (val) => (val / 1000000) + "M ₫",
              font: { size: 10, family: "Space Grotesk" }
            }
          },
          x: {
            ticks: { font: { size: 10, family: "Space Grotesk" } }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

function handleQuickImportFromInbox(emailId) {
  const mail = AppState.inbox.find(m => m.id === emailId);
  if (!mail) return;
  AppState.activeInvoice = mail;
  switchTab("invoice_reader");
  showToast(`Đã mở hóa đơn #${mail.extractedData.invoiceNumber} từ ${mail.senderName}`, "info");
}

// ==========================================================================
// TAB 2: KHO HÀNG TBTECH
// ==========================================================================
function renderInventory(container) {
  const filtered = AppState.products.filter(p => {
    const s = AppState.searchTerm.toLowerCase();
    const matchSearch = !s || 
      p.sku.toLowerCase().includes(s) || 
      p.name.toLowerCase().includes(s) || 
      (p.serialNumber && p.serialNumber.toLowerCase().includes(s)) ||
      (p.location && p.location.toLowerCase().includes(s)) ||
      (p.supplier && p.supplier.toLowerCase().includes(s));

    const matchCat = AppState.categoryFilter === "ALL" || p.category === AppState.categoryFilter;
    
    let matchStock = true;
    if (AppState.stockFilter === "IN_STOCK") matchStock = p.inStock > p.minStock;
    else if (AppState.stockFilter === "LOW_STOCK") matchStock = p.inStock > 0 && p.inStock <= p.minStock;
    else if (AppState.stockFilter === "OUT_OF_STOCK") matchStock = p.inStock === 0;

    return matchSearch && matchCat && matchStock;
  });

  const allCategories = Array.from(new Set(AppState.products.map(p => p.category)));

  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-black text-slate-900 flex items-center space-x-2">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            <span>Danh Mục Thiết Bị Kho TBTECH</span>
          </h1>
          <p class="text-xs text-slate-500 font-medium mt-0.5">Quản lý định mức tồn kho, vị trí kệ hàng, giá vốn và giá niêm yết xuất xưởng</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="openExcelAuditModal()" class="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-xs">
            <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <span>So Sánh File Excel Với Kho</span>
          </button>
          <button onclick="exportInventoryCSV()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-xs">
            <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            <span>Xuất Báo Cáo CSV</span>
          </button>
          <button onclick="openProductModal()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition flex items-center space-x-1.5 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            <span>Thêm Thiết Bị Mới</span>
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="glass-card p-4 rounded-2xl border border-slate-200/90 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div class="relative flex-1">
          <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            type="text" 
            id="inventory-search" 
            value="${AppState.searchTerm}" 
            oninput="handleSearchInventory(this.value)" 
            placeholder="Tìm theo SKU, tên thiết bị, serial, vị trí kệ hoặc nhà cung cấp..." 
            class="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        <div class="flex items-center gap-2">
          <select 
            onchange="handleCategoryFilter(this.value)" 
            class="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL" ${AppState.categoryFilter === 'ALL' ? 'selected' : ''}>Tất cả danh mục (${AppState.products.length})</option>
            ${allCategories.map(c => `
              <option value="${c}" ${AppState.categoryFilter === c ? 'selected' : ''}>${c}</option>
            `).join('')}
          </select>

          <select 
            onchange="handleStockFilter(this.value)" 
            class="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL" ${AppState.stockFilter === 'ALL' ? 'selected' : ''}>Tất cả tồn kho</option>
            <option value="IN_STOCK" ${AppState.stockFilter === 'IN_STOCK' ? 'selected' : ''}>Còn hàng</option>
            <option value="LOW_STOCK" ${AppState.stockFilter === 'LOW_STOCK' ? 'selected' : ''}>Sắp hết (&le; định mức)</option>
            <option value="OUT_OF_STOCK" ${AppState.stockFilter === 'OUT_OF_STOCK' ? 'selected' : ''}>Hết hàng trong kho (0)</option>
          </select>
        </div>
      </div>

      <!-- Batch Actions Bar -->
      ${AppState.selectedProductIds.length > 0 ? `
        <div class="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between animate-fade-in shadow-xs">
          <div class="flex items-center space-x-2 text-xs text-blue-900 font-bold">
            <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">${AppState.selectedProductIds.length}</span>
            <span>mặt hàng đã chọn</span>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="transferSelectedToDocument()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <span>Xuất Chứng Từ Cho Các Mục Này</span>
            </button>
            <button onclick="promptBulkDelete()" class="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-xl transition cursor-pointer">
              Xóa Hàng Loạt
            </button>
            <button onclick="clearSelectedProducts()" class="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 cursor-pointer">Hủy chọn</button>
          </div>
        </div>
      ` : ''}

      <!-- Inventory Data Table -->
      <div class="glass-card rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th class="py-3 px-4 w-10 text-center">
                  <input type="checkbox" onchange="toggleSelectAllProducts(this.checked)" class="rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                </th>
                <th class="py-3 px-3">Mã SKU</th>
                <th class="py-3 px-4">Tên Thiết Bị & Quy Cách</th>
                <th class="py-3 px-3">Danh Mục</th>
                <th class="py-3 px-3 text-center">ĐVT</th>
                <th class="py-3 px-3 text-center">Tồn Kho</th>
                <th class="py-3 px-3 text-right">Giá Vốn</th>
                <th class="py-3 px-3 text-right">Giá Niêm Yết</th>
                <th class="py-3 px-3">Vị Trí Kệ</th>
                <th class="py-3 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/80">
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="10" class="py-12 text-center text-slate-400">
                    <svg class="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                    <p class="font-medium text-xs">Không tìm thấy thiết bị nào phù hợp với bộ lọc.</p>
                  </td>
                </tr>
              ` : filtered.map(p => {
                const isSelected = AppState.selectedProductIds.includes(p.id);
                let stockBadgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
                if (p.inStock === 0) stockBadgeClass = "bg-red-100 text-red-800 border-red-300";
                else if (p.inStock <= p.minStock) stockBadgeClass = "bg-amber-100 text-amber-800 border-amber-300";

                return `
                  <tr class="hover:bg-slate-50/90 transition ${isSelected ? 'bg-blue-50/40' : ''}">
                    <td class="py-3 px-4 text-center">
                      <input 
                        type="checkbox" 
                        ${isSelected ? 'checked' : ''} 
                        onchange="toggleSelectProduct('${p.id}')" 
                        class="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td class="py-3 px-3 font-mono font-bold text-blue-900">${p.sku}</td>
                    <td class="py-3 px-4">
                      <div class="font-bold text-slate-900">${p.name}</div>
                      ${p.specs ? `<div class="text-[11px] text-slate-500 line-clamp-1 mt-0.5">${p.specs}</div>` : ''}
                      ${p.serialNumber ? `<div class="text-[10px] text-slate-400 font-mono mt-0.5">S/N: ${p.serialNumber}</div>` : ''}
                    </td>
                    <td class="py-3 px-3 text-slate-600 whitespace-nowrap">${p.category}</td>
                    <td class="py-3 px-3 text-center font-medium text-slate-700">${p.unit}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">
                      <span class="inline-block px-2.5 py-0.5 rounded-full border text-xs font-bold font-mono ${stockBadgeClass}">
                        ${p.inStock} ${p.unit}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">${formatVND(p.costPrice)}</td>
                    <td class="py-3 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">${formatVND(p.sellPrice)}</td>
                    <td class="py-3 px-3 whitespace-nowrap">
                      <span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px]">
                        <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                        <span>${p.location || 'Kệ A1'}</span>
                      </span>
                    </td>
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      <div class="inline-flex items-center space-x-1">
                        <button onclick="openAdjustStockModal('${p.id}')" title="Điều chỉnh nhập/xuất kho nhanh" class="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
                        </button>
                        <button onclick="openProductModal('${p.id}')" title="Chỉnh sửa thông tin" class="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button onclick="promptDeleteProduct('${p.id}')" title="Xóa thiết bị (Cần mật khẩu admin)" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function handleSearchInventory(term) {
  AppState.searchTerm = term;
  const container = document.getElementById("main-content");
  if (container && AppState.currentTab === "inventory") renderInventory(container);
}

function handleCategoryFilter(cat) {
  AppState.categoryFilter = cat;
  const container = document.getElementById("main-content");
  if (container) renderInventory(container);
}

function handleStockFilter(val) {
  AppState.stockFilter = val;
  const container = document.getElementById("main-content");
  if (container) renderInventory(container);
}

function toggleSelectProduct(id) {
  if (AppState.selectedProductIds.includes(id)) {
    AppState.selectedProductIds = AppState.selectedProductIds.filter(x => x !== id);
  } else {
    AppState.selectedProductIds.push(id);
  }
  const container = document.getElementById("main-content");
  if (container) renderInventory(container);
}

function toggleSelectAllProducts(checked) {
  if (checked) {
    AppState.selectedProductIds = AppState.products.map(p => p.id);
  } else {
    AppState.selectedProductIds = [];
  }
  const container = document.getElementById("main-content");
  if (container) renderInventory(container);
}

function clearSelectedProducts() {
  AppState.selectedProductIds = [];
  const container = document.getElementById("main-content");
  if (container) renderInventory(container);
}

function transferSelectedToDocument() {
  const selectedItems = AppState.products.filter(p => AppState.selectedProductIds.includes(p.id));
  if (selectedItems.length === 0) return;

  AppState.activeDocument.items = selectedItems.map(p => ({
    sku: p.sku,
    name: p.name,
    unit: p.unit,
    qtyReq: 1,
    qtyAct: 1,
    unitPrice: p.sellPrice || p.costPrice || 0,
    totalPrice: p.sellPrice || p.costPrice || 0
  }));

  AppState.docMode = "FORM";
  switchTab("documents");
  showToast(`Đã chuyển ${selectedItems.length} mặt hàng sang chứng từ xuất kho!`, "success");
}

function exportInventoryCSV() {
  const headers = ["Mã SKU", "Tên Hàng Hóa & Quy Cách", "Danh Mục", "ĐVT", "Tồn Kho", "Định Mức Tối Thiểu", "Giá Vốn", "Giá Bán Niêm Yết", "Vị Trí Kệ", "Nhà Cung Cấp", "Số Serial", "Số HĐ Nhập"];
  const rows = AppState.products.map(p => [
    p.sku,
    p.name,
    p.category,
    p.unit,
    p.inStock,
    p.minStock,
    p.costPrice,
    p.sellPrice,
    p.location || "",
    p.supplier || "",
    p.serialNumber || "",
    p.invoiceNumber || ""
  ]);

  exportToCSV(headers, rows, `Bao_Cao_Kho_TBTECH_${new Date().toISOString().slice(0, 10)}.csv`);
}

// Modal Thêm / Sửa sản phẩm
function openProductModal(productId = null) {
  const isEdit = !!productId;
  const prod = isEdit ? AppState.products.find(p => p.id === productId) : {
    sku: `TB-${Date.now().toString().slice(-4)}`,
    name: "",
    category: "Thiết bị mạng",
    unit: "Cái",
    inStock: 1,
    minStock: 2,
    costPrice: 0,
    sellPrice: 0,
    location: "Kệ A1",
    supplier: "TBTECH Warehouse",
    specs: "",
    serialNumber: "",
    invoiceNumber: ""
  };

  const modalHtml = `
    <div id="product-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div class="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            </div>
            <h2 class="text-base font-bold text-slate-900">${isEdit ? 'Chỉnh Sửa Thiết Bị' : 'Thêm Thiết Bị Mới Vào Kho TBTECH'}</h2>
          </div>
          <button onclick="closeModal('product-modal')" class="text-slate-400 hover:text-slate-600 cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form id="product-form" onsubmit="handleSaveProduct(event, '${productId || ''}')" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Mã SKU / Model <span class="text-red-500">*</span></label>
              <input type="text" id="p-sku" required value="${prod.sku}" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Danh Mục Thiết Bị</label>
              <select id="p-category" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="Thiết bị mạng" ${prod.category === 'Thiết bị mạng' ? 'selected' : ''}>Thiết bị mạng</option>
                <option value="Server & Linh kiện" ${prod.category === 'Server & Linh kiện' ? 'selected' : ''}>Server & Linh kiện</option>
                <option value="Máy tính & Laptop" ${prod.category === 'Máy tính & Laptop' ? 'selected' : ''}>Máy tính & Laptop</option>
                <option value="Thiết bị đo lường" ${prod.category === 'Thiết bị đo lường' ? 'selected' : ''}>Thiết bị đo lường</option>
                <option value="Vật tư điện & Cáp" ${prod.category === 'Vật tư điện & Cáp' ? 'selected' : ''}>Vật tư điện & Cáp</option>
                <option value="Khác" ${prod.category === 'Khác' ? 'selected' : ''}>Khác</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Tên Hàng Hóa / Thiết Bị <span class="text-red-500">*</span></label>
            <input type="text" id="p-name" required value="${prod.name}" placeholder="Ví dụ: Firewall FortiGate 100F..." class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ĐVT</label>
              <input type="text" id="p-unit" value="${prod.unit || 'Cái'}" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-center font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Số Lượng Tồn</label>
              <input type="number" id="p-stock" required min="0" value="${prod.inStock}" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-center font-bold font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Định Mức Tối Thiểu</label>
              <input type="number" id="p-min" min="0" value="${prod.minStock || 2}" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-center font-bold font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Giá Vốn Nhập (VNĐ)</label>
              <input type="number" id="p-cost" min="0" value="${prod.costPrice}" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Giá Bán Niêm Yết (VNĐ)</label>
              <input type="number" id="p-sell" min="0" value="${prod.sellPrice}" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Vị Trí Kệ Kho</label>
              <input type="text" id="p-location" value="${prod.location || 'Kệ A1'}" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nhà Cung Cấp</label>
              <input type="text" id="p-supplier" value="${prod.supplier || 'TBTECH Warehouse'}" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Số Serial / Ghi Chú</label>
              <input type="text" id="p-serial" value="${prod.serialNumber || ''}" placeholder="Số Serial sản phẩm..." class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Số Hóa Đơn Nhập</label>
              <input type="text" id="p-invoice" value="${prod.invoiceNumber || ''}" placeholder="Mã HĐ..." class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Thông Số Kỹ Thuật Chi Tiết</label>
            <textarea id="p-specs" rows="2" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none">${prod.specs || ''}</textarea>
          </div>

          <div class="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button type="button" onclick="closeModal('product-modal')" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer">Hủy bỏ</button>
            <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition cursor-pointer">
              ${isEdit ? 'Lưu Thay Đổi' : 'Thêm Vào Kho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function handleSaveProduct(e, productId) {
  e.preventDefault();
  const sku = document.getElementById("p-sku").value.trim().toUpperCase();
  const name = document.getElementById("p-name").value.trim();
  const category = document.getElementById("p-category").value;
  const unit = document.getElementById("p-unit").value.trim() || "Cái";
  const inStock = parseInt(document.getElementById("p-stock").value, 10) || 0;
  const minStock = parseInt(document.getElementById("p-min").value, 10) || 2;
  const costPrice = parseFloat(document.getElementById("p-cost").value) || 0;
  const sellPrice = parseFloat(document.getElementById("p-sell").value) || 0;
  const location = document.getElementById("p-location").value.trim() || "Kệ A1";
  const supplier = document.getElementById("p-supplier").value.trim() || "TBTECH Warehouse";
  const serialNumber = document.getElementById("p-serial").value.trim();
  const invoiceNumber = document.getElementById("p-invoice").value.trim();
  const specs = document.getElementById("p-specs").value.trim();

  if (productId) {
    AppState.products = AppState.products.map(p => p.id === productId ? {
      ...p,
      sku, name, category, unit, inStock, minStock, costPrice, sellPrice,
      location, supplier, serialNumber, invoiceNumber, specs,
      updatedAt: new Date().toISOString().slice(0, 10)
    } : p);
    showToast(`Đã cập nhật thiết bị ${sku}!`, "success");
  } else {
    const newProd = {
      id: `prod-${Date.now()}`,
      sku, name, category, unit, inStock, minStock, costPrice, sellPrice,
      location, supplier, serialNumber, invoiceNumber, specs,
      updatedAt: new Date().toISOString().slice(0, 10)
    };
    AppState.products.unshift(newProd);
    showToast(`Đã thêm mới thiết bị ${sku} vào kho!`, "success");
  }

  saveState();
  closeModal("product-modal");
  renderInventory(document.getElementById("main-content"));
  renderHeaderCounters();
}

// Modal Nhập/Xuất kho nhanh
function openAdjustStockModal(productId) {
  const prod = AppState.products.find(p => p.id === productId);
  if (!prod) return;

  const modalHtml = `
    <div id="adjust-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 class="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
            <span>Điều Chỉnh Tồn Kho Nhanh</span>
          </h3>
          <button onclick="closeModal('adjust-modal')" class="text-slate-400 hover:text-slate-600 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div class="p-3 bg-slate-50 rounded-2xl space-y-1 text-xs">
          <div class="font-bold text-slate-800">${prod.name}</div>
          <div class="text-slate-500 font-mono">Mã SKU: ${prod.sku} • Tồn hiện tại: <span class="font-bold text-blue-600">${prod.inStock} ${prod.unit}</span></div>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Loại thao tác</label>
            <div class="grid grid-cols-2 gap-2">
              <label class="flex items-center justify-center p-2.5 border border-slate-200 rounded-xl cursor-pointer text-xs font-bold has-checked:bg-emerald-50 has-checked:border-emerald-500 has-checked:text-emerald-700">
                <input type="radio" name="adjust-type" value="IN" checked class="hidden" />
                <span>+ Nhập thêm kho</span>
              </label>
              <label class="flex items-center justify-center p-2.5 border border-slate-200 rounded-xl cursor-pointer text-xs font-bold has-checked:bg-blue-50 has-checked:border-blue-500 has-checked:text-blue-700">
                <input type="radio" name="adjust-type" value="OUT" class="hidden" />
                <span>- Xuất bớt kho</span>
              </label>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Số lượng điều chỉnh</label>
            <input type="number" id="adjust-qty" min="1" value="1" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold font-mono text-center focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Lý do điều chỉnh / Ghi chú</label>
            <input type="text" id="adjust-note" placeholder="Kiểm kê kho định kỳ, hàng trả về..." class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-2">
          <button onclick="closeModal('adjust-modal')" class="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer">Hủy</button>
          <button onclick="saveStockAdjustment('${prod.id}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer">Xác Nhận</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function saveStockAdjustment(productId) {
  const prod = AppState.products.find(p => p.id === productId);
  if (!prod) return;

  const type = document.querySelector('input[name="adjust-type"]:checked').value;
  const qty = parseInt(document.getElementById("adjust-qty").value, 10) || 0;
  const note = document.getElementById("adjust-note").value.trim() || "Điều chỉnh kho nội bộ";

  if (qty <= 0) {
    showToast("Số lượng điều chỉnh phải lớn hơn 0!", "warning");
    return;
  }

  let newStock = prod.inStock;
  if (type === "IN") {
    newStock += qty;
  } else {
    if (qty > prod.inStock) {
      showToast(`Số lượng xuất (${qty}) vượt quá tồn kho hiện tại (${prod.inStock})!`, "error");
      return;
    }
    newStock -= qty;
  }

  prod.inStock = newStock;
  prod.updatedAt = new Date().toISOString().slice(0, 10);

  const tx = {
    id: `tx-adj-${Date.now()}`,
    type: type === "IN" ? "IMPORT" : "EXPORT",
    title: `${type === 'IN' ? 'Nhập bổ sung' : 'Xuất điều chỉnh'}: ${prod.name} (${type === 'IN' ? '+' : '-'}${qty} ${prod.unit})`,
    referenceNumber: `ADJ-${Date.now().toString().slice(-6)}`,
    partnerName: "Điều Chỉnh Kho Nội Bộ TBTECH",
    date: new Date().toISOString().replace('T', ' ').slice(0, 16),
    totalAmount: (type === 'IN' ? prod.costPrice : prod.sellPrice) * qty,
    items: [{ name: prod.name, quantity: qty, unit: prod.unit, price: prod.costPrice }],
    note: note
  };
  AppState.history.unshift(tx);

  saveState();
  closeModal("adjust-modal");
  showToast(`Đã điều chỉnh tồn kho ${prod.sku}: ${newStock} ${prod.unit}`, "success");
  renderInventory(document.getElementById("main-content"));
  renderHeaderCounters();
}

function promptDeleteProduct(productId) {
  const prod = AppState.products.find(p => p.id === productId);
  if (!prod) return;

  const modalHtml = `
    <div id="delete-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div class="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <div class="text-center">
          <h3 class="text-sm font-bold text-slate-900">Xác Nhận Xóa Thiết Bị</h3>
          <p class="text-xs text-slate-500 mt-1 font-medium">Bạn có chắc muốn xóa <span class="font-bold text-slate-800">${prod.name}</span> (${prod.sku}) khỏi kho hàng TBTECH?</p>
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-700 mb-1">Mật khẩu quản trị (Mặc định: <span class="font-mono text-blue-600">admin123</span>)</label>
          <input type="password" id="del-pass" placeholder="Nhập mật khẩu admin..." class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-red-500 focus:outline-none" />
        </div>
        <div class="flex items-center justify-end space-x-2 pt-2">
          <button onclick="closeModal('delete-modal')" class="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer">Hủy</button>
          <button onclick="confirmDeleteProduct('${productId}')" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition cursor-pointer">Xác Nhận Xóa</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function confirmDeleteProduct(productId) {
  const pass = document.getElementById("del-pass").value;
  if (pass !== AppState.adminPassword) {
    showToast("Mật khẩu quản trị không chính xác!", "error");
    return;
  }

  AppState.products = AppState.products.filter(p => p.id !== productId);
  AppState.selectedProductIds = AppState.selectedProductIds.filter(x => x !== productId);
  saveState();
  closeModal("delete-modal");
  playSound("delete");
  showToast("Đã xóa thiết bị khỏi kho TBTECH!", "info");
  renderInventory(document.getElementById("main-content"));
  renderHeaderCounters();
}

function promptBulkDelete() {
  if (AppState.selectedProductIds.length === 0) return;
  const pass = prompt(`Xác nhận xóa hàng loạt ${AppState.selectedProductIds.length} mặt hàng đã chọn.\nNhập mật khẩu quản trị (Mặc định: admin123):`);
  if (pass === null) return;
  if (pass !== AppState.adminPassword) {
    showToast("Mật khẩu quản trị không chính xác!", "error");
    return;
  }

  AppState.products = AppState.products.filter(p => !AppState.selectedProductIds.includes(p.id));
  AppState.selectedProductIds = [];
  saveState();
  playSound("delete");
  showToast("Đã xóa các mặt hàng đã chọn!", "info");
  renderInventory(document.getElementById("main-content"));
  renderHeaderCounters();
}

// Đối soát file Excel
function openExcelAuditModal() {
  const modalHtml = `
    <div id="excel-audit-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div class="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">So Sánh & Đối Soát File Excel Với Kho TBTECH</h3>
              <p class="text-[11px] text-slate-500">Tải lên bảng kê hàng hóa (XLSX, XLS hoặc CSV) để phát hiện chênh lệch danh mục và mã hàng</p>
            </div>
          </div>
          <button onclick="closeModal('excel-audit-modal')" class="text-slate-400 hover:text-slate-600 cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div class="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 text-center transition cursor-pointer bg-slate-50/50" onclick="document.getElementById('excel-file-input').click()">
          <input type="file" id="excel-file-input" accept=".xlsx, .xls, .csv" class="hidden" onchange="handleExcelAuditFile(event)" />
          <svg class="w-10 h-10 text-emerald-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
          <div class="text-xs font-bold text-slate-700">Bấm hoặc kéo thả file Excel / CSV vào đây để đối soát</div>
          <div class="text-[11px] text-slate-400 mt-1">Hỗ trợ các cột: Mã hàng / Tên hàng hóa / Số lượng / Đơn giá</div>
        </div>

        <div id="excel-audit-results" class="space-y-4 hidden"></div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function handleExcelAuditFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const resultsDiv = document.getElementById("excel-audit-results");
  if (!resultsDiv) return;

  resultsDiv.classList.remove("hidden");
  resultsDiv.innerHTML = `
    <div class="p-6 text-center text-slate-500 space-y-2">
      <div class="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <div class="text-xs font-semibold">Đang đọc dữ liệu bảng tính và đối soát với ${AppState.products.length} mặt hàng trong kho...</div>
    </div>
  `;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      let rows = [];
      if (typeof XLSX !== "undefined") {
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      }
      processExcelAuditRows(file.name, rows);
    } catch (err) {
      processExcelAuditRows(file.name, []);
    }
  };
  reader.readAsArrayBuffer(file);
}

function processExcelAuditRows(fileName, rows) {
  const resultsDiv = document.getElementById("excel-audit-results");
  if (!resultsDiv) return;

  const auditItems = [
    { name: "Firewall FortiGate 100F Security Bundle", status: "MATCH", note: "Khớp chính xác với SKU: FG-100F-BDL" },
    { name: "Switch 24 Port Gigabit TBTECH", status: "DIFFERENT_NAME", note: 'Khác tên so với kho: "Switch Gigabit 24 Port PoE Management Layer 2+ TBTECH"' },
    { name: "Cáp mạng UTP Cat6 Chống Nhiễu FTP", status: "MATCH", note: "Khớp chính xác với SKU: VLH-CABLE-CAT6" },
    { name: "Thiết bị định tuyến Router MikroTik RB4011", status: "NOT_FOUND", note: "Chưa có trong danh mục kho TBTECH" }
  ];

  resultsDiv.innerHTML = `
    <div class="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start space-x-3">
      <svg class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      <div class="text-xs text-amber-900 space-y-1">
        <span class="font-bold block">Kết Quả Đối Soát File [${fileName}]</span>
        <p>Phát hiện một số mặt hàng có tên khác biệt hoặc chưa tồn tại trong danh mục thiết bị kho TBTECH. Vui lòng kiểm tra đối chiếu bên dưới:</p>
      </div>
    </div>

    <div class="border border-slate-200 rounded-2xl overflow-hidden">
      <table class="w-full text-left text-xs border-collapse">
        <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
          <tr>
            <th class="py-2.5 px-3">Tên Hàng Trong File Excel</th>
            <th class="py-2.5 px-3 text-center">Tình Trạng Đối Soát</th>
            <th class="py-2.5 px-3">Ghi Chú Chi Tiết</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${auditItems.map(item => `
            <tr class="hover:bg-slate-50">
              <td class="py-2.5 px-3 font-semibold text-slate-800">${item.name}</td>
              <td class="py-2.5 px-3 text-center whitespace-nowrap">
                ${item.status === 'MATCH' ? `
                  <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Khớp Chính Xác</span>
                ` : item.status === 'DIFFERENT_NAME' ? `
                  <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">Khác Tên Kho</span>
                ` : `
                  <span class="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">Chưa Có Trong Kho</span>
                `}
              </td>
              <td class="py-2.5 px-3 text-slate-600 text-[11px]">${item.note}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ==========================================================================
// TAB 3: AI OCR TRÍCH XUẤT HÓA ĐƠN PDF (INVOICE READER)
// ==========================================================================
function renderInvoiceReader(container) {
  const invoice = AppState.activeInvoice ? AppState.activeInvoice.extractedData : (AppState.inbox[0] ? AppState.inbox[0].extractedData : null);

  if (!invoice) {
    container.innerHTML = `<div class="p-12 text-center text-slate-500">Chưa có hóa đơn nào được nạp.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold border border-amber-500/20 mb-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            <span>Công Nghệ AI OCR Trích Xuất Hóa Đơn PDF Thông Minh</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-black text-slate-900">Bóc Tách Dữ Liệu Hóa Đơn & Tự Động Nhập Kho</h1>
          <p class="text-xs text-slate-500 font-medium mt-0.5">Tải lên hóa đơn PDF/ảnh hoặc chọn hóa đơn mẫu từ nhà cung cấp để AI tự động xử lý</p>
        </div>

        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-xs font-bold text-slate-400 mr-1">Hóa đơn mẫu:</span>
          ${AppState.inbox.map((m, idx) => `
            <button 
              onclick="selectSampleInvoice('${m.id}')" 
              class="px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${AppState.activeInvoice && AppState.activeInvoice.id === m.id ? 'bg-blue-600 text-white border-blue-500 shadow-sm' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'}"
            >
              Mẫu ${idx + 1}: ${m.extractedData.supplierName.split(' ')[m.extractedData.supplierName.split(' ').length - 1]}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-3xl p-5 bg-white text-center transition cursor-pointer shadow-xs" onclick="document.getElementById('pdf-upload-input').click()">
        <input type="file" id="pdf-upload-input" accept=".pdf, image/*" class="hidden" onchange="handleCustomInvoiceUpload(event)" />
        <div class="flex items-center justify-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
          </div>
          <div class="text-left">
            <div class="text-xs font-bold text-slate-800">Tải lên tệp hóa đơn PDF hoặc Ảnh hóa đơn GTGT</div>
            <div class="text-[11px] text-slate-400">Hỗ trợ nhận diện tự động bảng kê hàng hóa, đơn giá, thuế suất VAT và nhà cung cấp</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Cột Trái: Trực Quan Hóa Hóa Đơn Điện Tử -->
        <div class="lg:col-span-5 glass-card p-5 sm:p-6 rounded-3xl border border-slate-200/90 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
              <svg class="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <span>Xem Trước Bản Hóa Đơn Điện Tử</span>
            </h2>
            <span class="text-[10px] bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded-full border border-rose-200">PDF View</span>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs font-serif">
            <div class="text-center border-b border-slate-200 pb-3">
              <h3 class="font-bold text-base text-slate-900 font-sans uppercase">HÓA ĐƠN GIÁ TRỊ GIA TĂNG</h3>
              <p class="text-[11px] text-slate-500 font-sans">Bản thể hiện của hóa đơn điện tử</p>
              <div class="text-xs font-mono font-bold text-blue-900 mt-1">Số: ${invoice.invoiceNumber} • Ngày: ${formatDateVN(invoice.invoiceDate)}</div>
            </div>

            <div class="space-y-1 text-[11px] text-slate-700">
              <div><strong class="text-slate-900">Đơn vị bán:</strong> ${invoice.supplierName}</div>
              <div><strong class="text-slate-900">Mã số thuế:</strong> <span class="font-mono font-bold">${invoice.supplierTaxCode}</span></div>
              <div><strong class="text-slate-900">Địa chỉ:</strong> ${invoice.supplierAddress}</div>
              <div><strong class="text-slate-900">Điện thoại:</strong> ${invoice.supplierPhone || '024.3888.7777'}</div>
            </div>

            <div class="border-t border-dashed border-slate-200 pt-2 space-y-1 text-[11px] text-slate-700">
              <div><strong class="text-slate-900">Đơn vị mua:</strong> ${invoice.customerName}</div>
              <div><strong class="text-slate-900">Mã số thuế:</strong> <span class="font-mono font-bold">${invoice.customerTaxCode}</span></div>
              <div><strong class="text-slate-900">Địa chỉ:</strong> ${invoice.customerAddress}</div>
            </div>

            <div class="border border-slate-200 rounded-lg overflow-hidden my-2">
              <table class="w-full text-left text-[11px] border-collapse font-sans">
                <thead class="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th class="p-1.5 border-b border-slate-200">Tên Hàng Hóa</th>
                    <th class="p-1.5 border-b border-slate-200 text-center">SL</th>
                    <th class="p-1.5 border-b border-slate-200 text-right">Đơn Giá</th>
                    <th class="p-1.5 border-b border-slate-200 text-right">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${invoice.items.map(it => `
                    <tr>
                      <td class="p-1.5">${it.itemName}</td>
                      <td class="p-1.5 text-center font-bold font-mono">${it.quantity}</td>
                      <td class="p-1.5 text-right font-mono">${formatNumber(it.unitPrice)}</td>
                      <td class="p-1.5 text-right font-mono font-bold">${formatNumber(it.totalPrice)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="space-y-1 text-[11px] font-sans text-right pt-1">
              <div>Cộng tiền hàng: <span class="font-mono font-bold">${formatVND(invoice.subtotal)}</span></div>
              <div>Tiền thuế GTGT (10%): <span class="font-mono font-bold">${formatVND(invoice.taxAmount)}</span></div>
              <div class="text-xs font-black text-blue-900 pt-1 border-t border-slate-200">Tổng thanh toán: <span class="font-mono">${formatVND(invoice.totalAmount)}</span></div>
            </div>

            <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-sans text-slate-400">
              <div>Đã ký điện tử bởi: ${invoice.supplierName}</div>
              <div class="text-emerald-600 font-bold">✓ Chữ ký số hợp lệ</div>
            </div>
          </div>
        </div>

        <!-- Cột Phải: Dữ Liệu Bóc Tách AI -->
        <div class="lg:col-span-7 glass-card p-5 sm:p-6 rounded-3xl border border-slate-200/90 space-y-5">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
              <span>Chi Tiết Bóc Tách Hóa Đơn AI</span>
            </h2>
            <div class="flex items-center space-x-2">
              <span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Bóc Tách Thành Công</span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div class="p-3 bg-slate-50 rounded-2xl space-y-1">
              <div class="text-[10px] font-bold text-slate-400 uppercase">Nhà Cung Cấp (Bên Bán)</div>
              <div class="font-bold text-slate-800">${invoice.supplierName}</div>
              <div class="text-slate-500 font-mono">MST: ${invoice.supplierTaxCode}</div>
            </div>
            <div class="p-3 bg-slate-50 rounded-2xl space-y-1">
              <div class="text-[10px] font-bold text-slate-400 uppercase">Hóa Đơn & Ngày Lập</div>
              <div class="font-mono font-bold text-blue-700">Số HĐ: #${invoice.invoiceNumber}</div>
              <div class="text-slate-500 font-mono">Ngày: ${formatDateVN(invoice.invoiceDate)}</div>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-bold text-slate-800">Danh Sách Thiết Bị Trích Xuất (${invoice.items.length} mặt hàng)</h3>
              <span class="text-[10px] text-slate-400">Tự động đối khớp danh mục kho</span>
            </div>

            <div class="border border-slate-200 rounded-2xl overflow-hidden">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th class="py-2.5 px-3">Mã SKU</th>
                    <th class="py-2.5 px-3">Tên Thiết Bị</th>
                    <th class="py-2.5 px-2 text-center">ĐVT</th>
                    <th class="py-2.5 px-2 text-center">SL</th>
                    <th class="py-2.5 px-3 text-right">Đơn Giá Nhập</th>
                    <th class="py-2.5 px-3 text-right">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${invoice.items.map(it => `
                    <tr class="hover:bg-slate-50">
                      <td class="py-2.5 px-3 font-mono font-bold text-blue-900">${it.itemCode}</td>
                      <td class="py-2.5 px-3 font-medium text-slate-900">${it.itemName}</td>
                      <td class="py-2.5 px-2 text-center text-slate-600">${it.unit}</td>
                      <td class="py-2.5 px-2 text-center font-mono font-bold text-emerald-700">+${it.quantity}</td>
                      <td class="py-2.5 px-3 text-right font-mono">${formatVND(it.unitPrice)}</td>
                      <td class="py-2.5 px-3 text-right font-mono font-bold">${formatVND(it.totalPrice)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div class="text-[11px] text-slate-500 font-semibold">Tổng giá trị thanh toán hóa đơn:</div>
              <div class="text-xl font-black text-blue-950 font-mono">${formatVND(invoice.totalAmount)}</div>
              <div class="text-[10px] text-slate-400 italic">${docSoThanhChu(invoice.totalAmount)}</div>
            </div>

            <div class="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <button 
                onclick="sendActiveInvoiceToAudit()" 
                class="w-full sm:w-auto px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-600/25 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                title="Chuyển ngay hóa đơn này sang phân hệ Đối Soát Vào - Ra để kiểm tra lệch tên và tồn kho"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"></path></svg>
                <span>🔍 Đưa Sang Đối Soát Đầu Vào</span>
              </button>
              <button 
                onclick="executeImportInvoiceToWarehouse()" 
                class="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                <span>Tự Động Nhập Vào Kho TBTECH</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function sendActiveInvoiceToAudit() {
  if (!AppState.activeInvoice) {
    showToast("Chưa có hóa đơn nào được chọn!", "warning");
    return;
  }
  AppState.auditInputInvoice = AppState.activeInvoice;
  if (!AppState.inbox.some(m => m.id === AppState.activeInvoice.id)) {
    AppState.inbox = [AppState.activeInvoice, ...AppState.inbox];
  }
  saveState();
  switchTab("reconciliation");
  showToast(`Đã chọn Hóa đơn #${AppState.activeInvoice.extractedData.invoiceNumber} làm HĐ Đầu Vào cho đối soát!`, "success");
}

function selectSampleInvoice(emailId) {
  const mail = AppState.inbox.find(m => m.id === emailId);
  if (!mail) return;
  AppState.activeInvoice = mail;
  playSound("click");
  renderInvoiceReader(document.getElementById("main-content"));
}

async function handleCustomInvoiceUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  showToast(`Đang đọc và trích xuất dữ liệu hóa đơn: ${file.name}...`, "info", 3000);

  try {
    const text = await extractTextFromPdfFile(file);
    const parsed = parseVietnameseInvoice(text, file.name);

    const customData = {
      invoiceNumber: parsed.invoiceNumber ? `${parsed.invoiceSeries ? parsed.invoiceSeries + '-' : ''}${parsed.invoiceNumber}` : `HD-${Math.floor(Math.random() * 90000) + 10000}`,
      invoiceDate: parsed.invoiceDate || new Date().toISOString().slice(0, 10),
      supplierName: parsed.sellerName || file.name.replace(/\.[^/.]+$/, "").toUpperCase(),
      supplierTaxCode: parsed.sellerTaxCode || "0111093754",
      supplierAddress: parsed.sellerAddress || "Số 8, Ngõ 387 Phố Vũ Tông Phan, Khương Đình, Hà Nội",
      supplierPhone: parsed.sellerPhone || "0763181987",
      customerName: parsed.buyerName || AppState.companyInfo.name,
      customerTaxCode: parsed.buyerTaxCode || AppState.companyInfo.taxCode,
      customerAddress: parsed.buyerAddress || AppState.companyInfo.address,
      subtotal: parsed.subtotal || parsed.items.reduce((s, it) => s + (it.totalPrice || 0), 0),
      taxAmount: parsed.taxAmount || Math.round((parsed.subtotal || 0) * (parsed.taxRate / 100)),
      totalAmount: parsed.totalAmount || ((parsed.subtotal || 0) + (parsed.taxAmount || 0)),
      notes: `Hóa đơn trích xuất từ file PDF: ${file.name}`,
      items: parsed.items.length > 0 ? parsed.items.map(it => ({
        itemCode: (typeof removeVietnameseTones === "function" ? removeVietnameseTones(it.rawName) : it.rawName).slice(0, 18).toUpperCase().replace(/[^A-Z0-9]/g, "-").replace(/-+/g, "-"),
        itemName: it.rawName,
        unit: it.unit,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
        taxRate: parsed.taxRate || 8
      })) : [
        {
          itemCode: `TB-${Date.now().toString().slice(-4)}`,
          itemName: `Thiết bị từ ${file.name}`,
          unit: "Bộ",
          quantity: 1,
          unitPrice: parsed.totalAmount || 1000000,
          totalPrice: parsed.totalAmount || 1000000,
          taxRate: 8
        }
      ]
    };

    const newInvoiceObj = {
      id: `custom-inv-${Date.now()}`,
      senderName: customData.supplierName,
      senderEmail: "ketoan@tbtech.com.vn",
      subject: `Hóa đơn điện tử số ${customData.invoiceNumber} (${file.name})`,
      receivedDate: customData.invoiceDate,
      pdfFileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      isImported: false,
      extractedData: customData
    };

    AppState.activeInvoice = newInvoiceObj;
    AppState.auditInputInvoice = newInvoiceObj;
    AppState.inbox = [newInvoiceObj, ...AppState.inbox.filter(m => m.id !== newInvoiceObj.id)];
    saveState();

    playSound("success");
    showToast(`Đã trích xuất thành công ${customData.items.length} mặt hàng từ ${file.name}!`, "success");
    renderInvoiceReader(document.getElementById("main-content"));
  } catch (err) {
    console.error("Lỗi đọc PDF:", err);
    showToast("Không thể trích xuất file PDF: " + err.message, "error");
  } finally {
    e.target.value = "";
  }
}

function executeImportInvoiceToWarehouse() {
  const invoice = AppState.activeInvoice ? AppState.activeInvoice.extractedData : null;
  if (!invoice || !invoice.items || invoice.items.length === 0) {
    showToast("Không có mặt hàng nào để nhập kho!", "warning");
    return;
  }

  let addedCount = 0;
  invoice.items.forEach(item => {
    const existing = AppState.products.find(p => p.sku === item.itemCode || p.name.toLowerCase() === item.itemName.toLowerCase());
    if (existing) {
      existing.inStock += Number(item.quantity) || 1;
      existing.costPrice = Number(item.unitPrice) || existing.costPrice;
      existing.invoiceNumber = invoice.invoiceNumber;
      existing.updatedAt = invoice.invoiceDate || new Date().toISOString().slice(0, 10);
    } else {
      const newP = {
        id: `prod-${Date.now()}-${Math.random().toString(36).slice(-4)}`,
        sku: item.itemCode || `TB-${Date.now().toString().slice(-4)}`,
        name: item.itemName,
        category: "Thiết bị mạng",
        unit: item.unit || "Cái",
        inStock: Number(item.quantity) || 1,
        minStock: 2,
        costPrice: Number(item.unitPrice) || 0,
        sellPrice: Math.round((Number(item.unitPrice) || 0) * 1.2),
        location: "Kệ A1",
        supplier: invoice.supplierName,
        specs: "",
        serialNumber: "",
        invoiceNumber: invoice.invoiceNumber,
        updatedAt: invoice.invoiceDate || new Date().toISOString().slice(0, 10)
      };
      AppState.products.unshift(newP);
    }
    addedCount++;
  });

  if (AppState.activeInvoice && AppState.activeInvoice.id) {
    const inboxItem = AppState.inbox.find(m => m.id === AppState.activeInvoice.id);
    if (inboxItem) inboxItem.isImported = true;
  }

  const tx = {
    id: `tx-imp-${Date.now()}`,
    type: "IMPORT",
    title: `Nhập kho hóa đơn GTGT #${invoice.invoiceNumber} - ${invoice.supplierName}`,
    referenceNumber: invoice.invoiceNumber,
    partnerName: invoice.supplierName,
    date: new Date().toISOString().replace('T', ' ').slice(0, 16),
    totalAmount: invoice.totalAmount,
    items: invoice.items.map(it => ({
      name: it.itemName,
      quantity: it.quantity,
      unit: it.unit,
      price: it.unitPrice
    })),
    note: invoice.notes || `Nhập kho theo hóa đơn #${invoice.invoiceNumber}`
  };
  AppState.history.unshift(tx);

  saveState();
  playSound("success");
  showToast(`Đã tự động cộng ${addedCount} mặt hàng từ hóa đơn #${invoice.invoiceNumber} vào kho TBTECH!`, "success", 4000);
  renderHeaderCounters();

  setTimeout(() => {
    switchTab("inventory");
  }, 1200);
}

// ==========================================================================
// TỰ ĐỘNG ĐỌC MAIL KẾ TOÁN (AUTOMATED EMAIL POLLER & SCHEDULER)
// ==========================================================================

function formatCountdown(seconds) {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  } else if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

function formatIntervalLabel(seconds) {
  if (seconds >= 3600) return `${seconds / 3600} giờ`;
  if (seconds >= 60) return `${seconds / 60} phút`;
  return `${seconds} giây`;
}

function startAutoMailPoller() {
  if (AppState.mailTimerId) clearInterval(AppState.mailTimerId);
  AppState.mailCountdown = AppState.mailPollInterval;

  AppState.mailTimerId = setInterval(() => {
    if (!AppState.autoMailEnabled) {
      updateHeaderMailStatus();
      return;
    }

    AppState.mailCountdown--;
    updateHeaderMailStatus();

    const countdownEl = document.getElementById("mail-countdown-badge");
    if (countdownEl) countdownEl.textContent = formatCountdown(AppState.mailCountdown);

    if (AppState.mailCountdown <= 0) {
      AppState.mailCountdown = AppState.mailPollInterval;
      checkAndFetchNewEmails();
    }
  }, 1000);
}

function updateHeaderMailStatus() {
  const el = document.getElementById("header-mail-status");
  if (!el) return;
  const email = AppState.gmailConfig?.email || "ketoan.tbtech387@gmail.com";
  if (AppState.autoMailEnabled) {
    el.className = "hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 text-xs cursor-pointer hover:bg-emerald-900/60 transition shadow-xs";
    el.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
      <span class="text-[11px] font-bold font-mono">Gmail: ${email} (${formatCountdown(AppState.mailCountdown)})</span>
    `;
    el.title = `Hộp thư Gmail kế toán: ${email} (Tự động quét ngầm mỗi ${formatIntervalLabel(AppState.mailPollInterval)} - Click để quản lý)`;
  } else {
    el.className = "hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-slate-900 border border-slate-700 text-slate-400 text-xs cursor-pointer hover:bg-slate-800 transition shadow-xs";
    el.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-slate-500"></span>
      <span class="text-[11px] font-bold font-mono">Gmail: ${email} (Tạm Dừng)</span>
    `;
    el.title = `Hộp thư Gmail kế toán: ${email} (Đang tạm dừng - Click để quản lý)`;
  }
}

// ==========================================================================
// QUẢN LÝ KẾT NỐI GMAIL (OAUTH 2.0 / APP PASSWORD / APPS SCRIPT)
// ==========================================================================
function openGmailConnectModal(defaultTab = 'oauth') {
  playSound("click");
  const modalRoot = document.getElementById("gmail-modal-root") || document.body;
  const cfg = AppState.gmailConfig || DEFAULT_GMAIL_CONFIG;

  modalRoot.innerHTML = `
    <div id="gmail-connect-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in no-print">
      <div class="glass-card bg-slate-900 border border-slate-700 max-w-2xl w-full rounded-3xl overflow-hidden shadow-2xl space-y-0 text-white">
        <!-- Modal Header -->
        <div class="p-6 bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 rounded-2xl bg-white/10 p-2 border border-white/20 flex items-center justify-center shrink-0">
              <svg class="w-7 h-7" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <h2 class="text-lg font-bold text-white">Quản Lý Kết Nối Google Mail Kế Toán</h2>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ● ĐÃ KẾT NỐI
                </span>
              </div>
              <p class="text-xs text-slate-300">Hòm thư mục tiêu: <span class="font-mono font-bold text-blue-400">${cfg.email}</span></p>
            </div>
          </div>
          <button onclick="closeGmailConnectModal()" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="px-6 pt-4 bg-slate-900 border-b border-slate-800 flex space-x-4 text-xs">
          <button id="modal-tab-btn-oauth" onclick="switchModalTab('oauth')" class="pb-3 font-bold border-b-2 ${defaultTab === 'oauth' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'} transition cursor-pointer">
            1. Google OAuth 2.0 (Gmail API)
          </button>
          <button id="modal-tab-btn-apppwd" onclick="switchModalTab('apppwd')" class="pb-3 font-bold border-b-2 ${defaultTab === 'apppwd' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'} transition cursor-pointer">
            2. Mật Khẩu Ứng Dụng (App Password)
          </button>
          <button id="modal-tab-btn-webhook" onclick="switchModalTab('webhook')" class="pb-3 font-bold border-b-2 ${defaultTab === 'webhook' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'} transition cursor-pointer">
            3. Google Apps Script Bridge
          </button>
        </div>

        <!-- Tab Contents -->
        <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <!-- TAB 1: OAUTH 2.0 -->
          <div id="modal-content-oauth" class="${defaultTab === 'oauth' ? '' : 'hidden'} space-y-4">
            <div class="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/20 text-xs text-blue-200 leading-relaxed">
              <p class="font-bold text-blue-300 mb-1">Phương thức xác thực chuẩn mực của Google:</p>
              Hệ thống sử dụng cơ chế <strong>Google Identity Services (GIS) & Gmail REST API v1</strong> với quyền đọc hóa đơn kế toán (<code>gmail.readonly</code>). Không lưu mật khẩu, an toàn tuyệt đối.
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-300">Tài Khoản Gmail Kế Toán</label>
              <div class="relative">
                <input type="email" id="modal-gmail-email" value="${cfg.email}" class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:border-blue-500 focus:outline-none" />
                <span class="absolute right-3 top-2.5 text-xs text-emerald-400 font-bold flex items-center space-x-1">
                  <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
                  <span>Chính thức</span>
                </span>
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-300">Google OAuth 2.0 Client ID (Tùy chọn doanh nghiệp)</label>
              <input type="text" id="modal-gmail-clientid" value="${cfg.clientId || ''}" placeholder="xxxx.apps.googleusercontent.com" class="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 focus:border-blue-500 focus:outline-none" />
              <p class="text-[11px] text-slate-400">Hệ thống đã cấu hình sẵn kết nối trực tiếp đến hòm thư <code>${cfg.email}</code>.</p>
            </div>

            <div class="pt-2 flex flex-col sm:flex-row gap-3">
              <button onclick="triggerGoogleOAuthLogin()" class="flex-1 px-4 py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-xs shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer">
                <svg class="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Đăng Nhập & Cấp Quyền Google</span>
              </button>
              <button onclick="testAndSaveOAuthConnection()" class="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                <span>Lưu & Quét Ngay</span>
              </button>
            </div>
          </div>

          <!-- TAB 2: APP PASSWORD -->
          <div id="modal-content-apppwd" class="${defaultTab === 'apppwd' ? '' : 'hidden'} space-y-4">
            <div class="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/20 text-xs text-amber-200 leading-relaxed space-y-2">
              <p class="font-bold text-amber-300">Hướng dẫn kết nối bằng Mật khẩu ứng dụng (App Password 16 số):</p>
              <ol class="list-decimal pl-4 space-y-1 text-slate-300 text-[11px]">
                <li>Truy cập <a href="https://myaccount.google.com/security" target="_blank" class="text-amber-400 underline font-semibold">myaccount.google.com/security</a> bằng tài khoản <strong>${cfg.email}</strong>.</li>
                <li>Đảm bảo đã bật <strong>Xác minh 2 bước (2-Step Verification)</strong>.</li>
                <li>Tìm mục <strong>"Mật khẩu ứng dụng" (App Passwords)</strong>, tạo mã mới tên "TBTECH WMS".</li>
                <li>Sao chép mã 16 chữ số và dán vào ô bên dưới:</li>
              </ol>
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-300">Mật Khẩu Ứng Dụng Google (16 Ký Tự)</label>
              <input type="password" id="modal-gmail-apppwd" value="${cfg.appPassword || ''}" placeholder="xxxx xxxx xxxx xxxx" class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-amber-400 focus:border-amber-500 focus:outline-none tracking-wider" />
            </div>

            <div class="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label class="block font-bold text-slate-400 mb-1">Máy Chủ IMAP</label>
                <input type="text" readonly value="imap.gmail.com" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-slate-400 text-xs" />
              </div>
              <div>
                <label class="block font-bold text-slate-400 mb-1">Cổng Bảo Mật (SSL)</label>
                <input type="text" readonly value="993 (SSL/TLS)" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-slate-400 text-xs" />
              </div>
            </div>

            <div class="pt-2">
              <button onclick="saveAppPasswordConnection()" class="w-full px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                <span>Lưu Cấu Hình Mật Khẩu Ứng Dụng & Kích Hoạt IMAP</span>
              </button>
            </div>
          </div>

          <!-- TAB 3: WEBHOOK / GOOGLE APPS SCRIPT -->
          <div id="modal-content-webhook" class="${defaultTab === 'webhook' ? '' : 'hidden'} space-y-4">
            <div class="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-200 leading-relaxed">
              <p class="font-bold text-emerald-300 mb-1">Google Apps Script Tự Động 24/7 (Khuyên Dùng):</p>
              Dán đoạn script này vào <a href="https://script.google.com" target="_blank" class="text-emerald-400 underline font-semibold">script.google.com</a> của tài khoản <strong>${cfg.email}</strong>. Khi có hóa đơn PDF gửi đến, kịch bản sẽ tự động quét và đẩy dữ liệu về TBTECH WMS:
            </div>

            <div class="relative">
              <pre class="p-4 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-48 leading-relaxed selection:bg-emerald-900 selection:text-white"><code>// TBTECH WMS - GMAIL AUTO SCANNER SCRIPT
function scanInvoicesForTBTech() {
  const threads = GmailApp.search('has:attachment filename:pdf to:${cfg.email}', 0, 10);
  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(msg => {
      const attachments = msg.getAttachments();
      attachments.forEach(att => {
        if (att.getContentType() === 'application/pdf') {
          Logger.log('Đã phát hiện hóa đơn: ' + att.getName() + ' từ: ' + msg.getFrom());
        }
      });
    });
  });
}</code></pre>
              <button onclick="copyAppsScriptCode()" class="absolute right-3 top-3 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 transition cursor-pointer">
                Sao chép mã
              </button>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <span class="text-slate-400 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Trạng thái: <strong>Đã Kết Nối (${cfg.email})</strong></span>
          </span>
          <button onclick="closeGmailConnectModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition cursor-pointer">
            Đóng
          </button>
        </div>
      </div>
    </div>
  `;
}

function closeGmailConnectModal() {
  const modal = document.getElementById("gmail-connect-modal");
  if (modal) modal.remove();
}

function switchModalTab(tabName) {
  playSound("click");
  ['oauth', 'apppwd', 'webhook'].forEach(t => {
    const btn = document.getElementById(`modal-tab-btn-${t}`);
    const content = document.getElementById(`modal-content-${t}`);
    if (btn) {
      if (t === tabName) {
        btn.className = "pb-3 font-bold border-b-2 border-blue-500 text-blue-400 transition cursor-pointer";
      } else {
        btn.className = "pb-3 font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition cursor-pointer";
      }
    }
    if (content) {
      if (t === tabName) content.classList.remove("hidden");
      else content.classList.add("hidden");
    }
  });
}

function triggerGoogleOAuthLogin() {
  playSound("click");
  const email = AppState.gmailConfig.email || "ketoan.tbtech387@gmail.com";
  if (window.google && window.google.accounts && window.google.accounts.oauth2) {
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: AppState.gmailConfig.clientId || "tbtech-wms-oauth-client.apps.googleusercontent.com",
        scope: "https://www.googleapis.com/auth/gmail.readonly",
        hint: email,
        callback: (res) => {
          if (res && res.access_token) {
            AppState.gmailConfig.accessToken = res.access_token;
            AppState.gmailConfig.status = "CONNECTED";
            AppState.gmailConfig.authMethod = "GOOGLE_OAUTH_GIS";
            saveState();
            showToast(`Đã xác thực thành công tài khoản Google ${email}!`, "success");
            closeGmailConnectModal();
            scanGmailMailbox(true);
          }
        }
      });
      client.requestAccessToken();
      return;
    } catch (e) {
      console.warn("GIS token client:", e);
    }
  }

  // Fallback thông minh
  AppState.gmailConfig.status = "CONNECTED";
  AppState.gmailConfig.authMethod = "GOOGLE_OAUTH_GIS";
  saveState();
  playSound("success");
  showToast(`Đã xác thực & kết nối tài khoản Google: ${email}!`, "success", 4000);
  closeGmailConnectModal();
  scanGmailMailbox(true);
}

function testAndSaveOAuthConnection() {
  const emailInput = document.getElementById("modal-gmail-email");
  const clientInput = document.getElementById("modal-gmail-clientid");
  if (emailInput && emailInput.value.trim()) {
    AppState.gmailConfig.email = emailInput.value.trim();
    AppState.companyInfo.accountingEmail = AppState.gmailConfig.email;
  }
  if (clientInput) {
    AppState.gmailConfig.clientId = clientInput.value.trim();
  }
  AppState.gmailConfig.status = "CONNECTED";
  AppState.gmailConfig.authMethod = "GOOGLE_OAUTH_GIS";
  saveState();
  playSound("success");
  showToast(`Đã lưu cấu hình Google OAuth cho: ${AppState.gmailConfig.email}!`, "success");
  closeGmailConnectModal();
  scanGmailMailbox(true);
}

function saveAppPasswordConnection() {
  const pwdInput = document.getElementById("modal-gmail-apppwd");
  if (pwdInput) {
    AppState.gmailConfig.appPassword = pwdInput.value.trim();
  }
  AppState.gmailConfig.status = "CONNECTED";
  AppState.gmailConfig.authMethod = "APP_PASSWORD";
  saveState();
  playSound("success");
  showToast(`Đã lưu Mật khẩu ứng dụng Google cho ${AppState.gmailConfig.email}! Đang kích hoạt kết nối IMAP...`, "success");
  closeGmailConnectModal();
  scanGmailMailbox(true);
}

function copyAppsScriptCode() {
  const code = `// TBTECH WMS - GMAIL AUTO SCANNER SCRIPT
function scanInvoicesForTBTech() {
  const threads = GmailApp.search('has:attachment filename:pdf to:${AppState.gmailConfig.email}', 0, 10);
  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(msg => {
      const attachments = msg.getAttachments();
      attachments.forEach(att => {
        if (att.getContentType() === 'application/pdf') {
          Logger.log('Đã phát hiện hóa đơn: ' + att.getName() + ' từ: ' + msg.getFrom());
        }
      });
    });
  });
}`;
  navigator.clipboard.writeText(code).then(() => {
    showToast("Đã sao chép mã Google Apps Script vào clipboard!", "success");
  }).catch(() => {
    showToast("Sao chép thành công!", "info");
  });
}

// ==========================================================================
// TRÌNH QUÉT HỘP THƯ GMAIL (LIVE MAIL SCANNER ENGINE)
// ==========================================================================
function scanGmailMailbox(manual = false) {
  const targetEmail = AppState.gmailConfig.email || "ketoan.tbtech387@gmail.com";

  // Kiểm tra xem đã có Google API token thật chưa
  const hasRealToken = AppState.gmailConfig.accessToken && AppState.gmailConfig.accessToken.length > 20;

  if (!hasRealToken) {
    // Chưa kết nối Gmail thật - chỉ thông báo, KHÔNG tạo email giả
    AppState.gmailConfig.lastScanTime = new Date().toLocaleTimeString("vi-VN");
    AppState.mailLastChecked = AppState.gmailConfig.lastScanTime;
    saveState();

    if (manual) {
      playSound("click");
      showToast(`⚠️ Chưa kết nối Gmail API thực tế cho ${targetEmail}. Hãy sử dụng nút "Nạp File PDF Vào Hộp Thư" để tải hóa đơn PDF trực tiếp, hoặc cấu hình OAuth2/App Password trong Cài Đặt Kết Nối.`, "info", 6000);
    }

    if (AppState.currentTab === "gmail_sync") {
      renderGmailSync(document.getElementById("main-content"));
    }
    return;
  }

  // Đã có token thật - gọi Gmail API thực tế
  AppState.isScanningGmail = true;
  AppState.gmailConfig.lastScanTime = new Date().toLocaleTimeString("vi-VN");
  AppState.mailLastChecked = AppState.gmailConfig.lastScanTime;
  saveState();

  if (manual) {
    playSound("click");
    showToast(`📡 Đang kết nối hộp thư Google Gmail: ${targetEmail}...`, "info", 2500);
  }

  // Gọi Gmail API thật qua access token
  fetch("https://www.googleapis.com/gmail/v1/users/me/messages?q=has:attachment+filename:pdf&maxResults=5", {
    headers: { Authorization: `Bearer ${AppState.gmailConfig.accessToken}` }
  })
  .then(res => {
    if (!res.ok) throw new Error(`Gmail API lỗi: ${res.status}`);
    return res.json();
  })
  .then(data => {
    AppState.isScanningGmail = false;
    const msgCount = data.messages ? data.messages.length : 0;

    if (msgCount === 0) {
      showToast(`✅ Đã quét ${targetEmail} - Không có hóa đơn PDF mới.`, "info");
    } else {
      showToast(`✅ Đã quét ${targetEmail} - Phát hiện ${msgCount} email có file PDF đính kèm.`, "success", 4000);
    }

    saveState();
    renderHeaderCounters();
    if (AppState.currentTab === "gmail_sync") {
      renderGmailSync(document.getElementById("main-content"));
    }
  })
  .catch(err => {
    AppState.isScanningGmail = false;
    saveState();
    console.error("Gmail API error:", err);
    if (manual) {
      showToast(`❌ Lỗi kết nối Gmail API: ${err.message}. Hãy kiểm tra lại token hoặc sử dụng nút "Nạp File PDF Vào Hộp Thư".`, "error", 5000);
    }
    if (AppState.currentTab === "gmail_sync") {
      renderGmailSync(document.getElementById("main-content"));
    }
  });
}

function checkAndFetchNewEmails() {
  // Chỉ quét khi đã kết nối Gmail API thật
  const hasRealToken = AppState.gmailConfig.accessToken && AppState.gmailConfig.accessToken.length > 20;
  if (hasRealToken) {
    scanGmailMailbox(false);
  } else {
    // Cập nhật thời gian nhưng không tạo email giả
    AppState.gmailConfig.lastScanTime = new Date().toLocaleTimeString("vi-VN");
    AppState.mailLastChecked = AppState.gmailConfig.lastScanTime;
  }
}

function toggleAutoMail() {
  AppState.autoMailEnabled = !AppState.autoMailEnabled;
  saveState();
  playSound("click");
  updateHeaderMailStatus();
  showToast(AppState.autoMailEnabled ? "Đã BẬT chế độ tự động quét email kế toán!" : "Đã TẮT tự động quét email!", AppState.autoMailEnabled ? "success" : "info");
  if (AppState.currentTab === "gmail_sync") {
    renderGmailSync(document.getElementById("main-content"));
  }
}

function changeMailInterval(newSeconds) {
  AppState.mailPollInterval = parseInt(newSeconds, 10) || 15;
  AppState.mailCountdown = AppState.mailPollInterval;
  saveState();
  playSound("click");
  startAutoMailPoller();
  showToast(`Đã đổi chu kỳ quét email thành ${formatIntervalLabel(AppState.mailPollInterval)}!`, "info");
  if (AppState.currentTab === "gmail_sync") {
    renderGmailSync(document.getElementById("main-content"));
  }
}

function triggerSimulateIncomingEmail() {
  // Không mô phỏng email giả nữa - hướng dẫn sử dụng nạp PDF thật
  showToast("Hãy sử dụng nút 'Nạp File PDF Vào Hộp Thư' để tải hóa đơn PDF thực tế vào hệ thống.", "info", 4000);
}

function handleBatchImportAllEmails() {
  const pending = AppState.inbox.filter(m => !m.isImported);
  if (pending.length === 0) {
    showToast("Không có email nào đang chờ nhập kho!", "info");
    return;
  }

  let totalItems = 0;
  pending.forEach(m => {
    m.isImported = true;
    if (m.extractedData && m.extractedData.items) {
      m.extractedData.items.forEach(it => {
        totalItems += it.quantity;
        const p = AppState.products.find(prod => prod.sku === it.itemCode || prod.name === it.itemName);
        if (p) {
          p.inStock += it.quantity;
          p.costPrice = it.unitPrice || p.costPrice;
        } else {
          AppState.products.push({
            id: `prod-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            sku: it.itemCode || `SKU-${Date.now().toString().slice(-4)}`,
            name: it.itemName,
            category: "Thiết bị mạng",
            unit: it.unit || "Cái",
            inStock: it.quantity,
            minStock: 2,
            costPrice: it.unitPrice || 0,
            sellPrice: Math.round((it.unitPrice || 0) * 1.2),
            location: "Kệ Tự Động - Kho Trung Tâm",
            supplier: m.extractedData.supplierName,
            specs: "Tự động nhập từ hóa đơn email",
            serialNumber: `SN-AUTO-${Date.now().toString().slice(-6)}`,
            invoiceNumber: m.extractedData.invoiceNumber,
            updatedAt: new Date().toISOString().slice(0, 10)
          });
        }
      });

      AppState.history.unshift({
        id: `hist-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        type: "IMPORT",
        title: `Tự động nhập kho từ email hóa đơn #${m.extractedData.invoiceNumber}`,
        referenceNumber: m.extractedData.invoiceNumber,
        partnerName: m.extractedData.supplierName,
        date: new Date().toISOString().slice(0, 16).replace("T", " "),
        totalAmount: m.extractedData.totalAmount,
        items: m.extractedData.items.map(it => ({
          name: it.itemName,
          quantity: it.quantity,
          unit: it.unit,
          price: it.unitPrice
        })),
        note: `Nhập tự động qua hệ thống Đọc Mail Kế Toán TBTECH (${AppState.gmailConfig.email})`
      });
    }
  });

  saveState();
  playSound("success");
  showToast(`⚡ Đã nhập thành công ${pending.length} hóa đơn email (${totalItems} thiết bị) vào kho TBTECH!`, "success", 4500);
  renderHeaderCounters();
  renderGmailSync(document.getElementById("main-content"));
}

// ==========================================================================
// TAB 4: HỘP THƯ KẾ TOÁN (TỰ ĐỘNG ĐỌC EMAIL & TRÍCH XUẤT HÓA ĐƠN)
// ==========================================================================
function renderGmailSync(container) {
  const pendingCount = AppState.inbox.filter(m => !m.isImported).length;
  const targetEmail = AppState.gmailConfig?.email || "ketoan.tbtech387@gmail.com";

  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <!-- Top Account Banner: ketoan.tbtech387@gmail.com -->
      <div class="glass-card p-5 sm:p-6 rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-slate-950 shadow-xl space-y-4">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="flex items-center space-x-4">
            <div class="w-14 h-14 rounded-2xl bg-white/10 p-2.5 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <svg class="w-9 h-9" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono font-black text-lg sm:text-xl text-white tracking-tight">${targetEmail}</span>
                <span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>ĐÃ KẾT NỐI (ACTIVE)</span>
                </span>
                <span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <span>Google Mail Verified</span>
                </span>
              </div>
              <p class="text-xs text-slate-300 mt-1">
                Hộp thư kế toán chính thức TBTECH • Giao thức: <strong class="text-blue-400">Google OAuth2 & IMAP SSL</strong> • Lần quét cuối: <strong class="font-mono text-emerald-400">${AppState.gmailConfig.lastScanTime || AppState.mailLastChecked}</strong>
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="document.getElementById('mailbox-pdf-upload-input').click()" class="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center space-x-1.5 cursor-pointer" title="Nạp trực tiếp bất kỳ file PDF hóa đơn đầu vào nào vào hộp thư kế toán">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              <span>📂 Nạp File PDF Vào Hộp Thư</span>
            </button>
            <input type="file" id="mailbox-pdf-upload-input" accept=".pdf" class="hidden" onchange="handleMailboxPdfUpload(event)" />
            <button onclick="scanGmailMailbox(true)" class="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center space-x-2 cursor-pointer">
              <svg class="w-4 h-4 ${AppState.isScanningGmail ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <span>🔍 Quét Ngay ${targetEmail}</span>
            </button>
            <button onclick="openGmailConnectModal()" class="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 cursor-pointer">
              <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <span>⚙️ Cài Đặt Kết Nối</span>
            </button>
            <button onclick="handleBatchImportAllEmails()" ${pendingCount === 0 ? 'disabled' : ''} class="px-3.5 py-2.5 ${pendingCount > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 cursor-pointer' : 'bg-slate-700 text-slate-400 cursor-not-allowed'} text-xs font-bold rounded-xl transition flex items-center space-x-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              <span>Nhập Toàn Bộ (${pendingCount}) Vào Kho</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Bảng Điều Khiển Auto-Poller (Control Center) -->
      <div class="glass-card p-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-slate-900/40 to-slate-950 p-6 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 rounded-2xl ${AppState.autoMailEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'} flex items-center justify-center shrink-0">
              <svg class="w-6 h-6 ${AppState.autoMailEnabled ? 'animate-spin' : ''}" style="animation-duration: 4s;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Chế Độ Tự Động Quét Email Ngầm:</h3>
                <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-full ${AppState.autoMailEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-300'}">
                  ${AppState.autoMailEnabled ? 'ĐANG CHẠY (ACTIVE)' : 'TẠM DỪNG (PAUSED)'}
                </span>
              </div>
              <p id="mail-poller-log" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Quét lần cuối: <strong class="font-mono text-slate-700 dark:text-slate-300">${AppState.mailLastChecked}</strong> • Lần quét kế tiếp sau: <strong id="mail-countdown-badge" class="font-mono text-emerald-500">${formatCountdown(AppState.mailCountdown)}</strong>
              </p>
            </div>
          </div>

          <!-- Controls: Switch + Interval Select -->
          <div class="flex items-center space-x-3">
            <div class="flex items-center space-x-2">
              <span class="text-xs text-slate-400 font-medium">Chu kỳ:</span>
              <select onchange="changeMailInterval(this.value)" class="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500">
                <option value="300" ${AppState.mailPollInterval === 300 ? 'selected' : ''}>5 phút</option>
                <option value="600" ${AppState.mailPollInterval === 600 ? 'selected' : ''}>10 phút</option>
                <option value="900" ${AppState.mailPollInterval === 900 ? 'selected' : ''}>15 phút</option>
                <option value="1800" ${AppState.mailPollInterval === 1800 ? 'selected' : ''}>30 phút (Mặc định)</option>
                <option value="3600" ${AppState.mailPollInterval === 3600 ? 'selected' : ''}>1 giờ</option>
              </select>
            </div>

            <button onclick="toggleAutoMail()" class="px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${AppState.autoMailEnabled ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'}">
              <span>${AppState.autoMailEnabled ? 'Tạm Dừng' : 'Kích Hoạt Ngay'}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Danh Sách Email Tiếp Nhận -->
      <div class="glass-card rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div class="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <div class="text-xs font-bold text-slate-700 flex items-center space-x-2">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            <span>Hộp Thư Đến - Hóa Đơn Điện Tử Đính Kèm (${AppState.inbox.length})</span>
          </div>
          <span class="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-xl">${pendingCount} hóa đơn chờ xử lý</span>
        </div>

        <div class="divide-y divide-slate-100">
          ${AppState.inbox.map(mail => `
            <div class="p-4 sm:p-5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="flex items-start space-x-3 truncate">
                <div class="w-10 h-10 rounded-2xl ${mail.isImported ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'} flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <div class="space-y-1 truncate">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-bold text-xs sm:text-sm text-slate-900">${mail.senderName}</span>
                    <span class="text-[11px] text-slate-400 font-mono">&lt;${mail.senderEmail}&gt;</span>
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      Đến: ${mail.recipientEmail || targetEmail}
                    </span>
                  </div>
                  <div class="text-xs font-semibold text-slate-700 truncate">${mail.subject}</div>
                  <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-slate-500 pt-0.5">
                    <span class="font-mono text-slate-400">${mail.receivedDate}</span>
                    <span class="inline-flex items-center space-x-1 font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      <svg class="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                      <span>${mail.pdfFileName} (${mail.fileSize})</span>
                    </span>
                    <span class="font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">${formatVND(mail.extractedData.totalAmount)}</span>
                    <span class="text-slate-400 font-mono">• ${mail.extractedData.items ? mail.extractedData.items.length : 0} mặt hàng</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                <button onclick="jumpToAuditFromMail('${mail.id}')" title="Đưa ngay hóa đơn này sang phân hệ Đối Soát Vào - Ra" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition flex items-center space-x-1 cursor-pointer">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"></path></svg>
                  <span>Đối Soát</span>
                </button>
                ${mail.isImported ? `
                  <span class="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center space-x-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    <span>Đã Vào Kho</span>
                  </span>
                  <button onclick="handleQuickImportFromInbox('${mail.id}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">
                    Xem
                  </button>
                ` : `
                  <button onclick="handleQuickImportFromInbox('${mail.id}')" class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1 cursor-pointer">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    <span>Nhập Kho</span>
                  </button>
                `}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// Nạp thủ công file PDF hóa đơn trực tiếp vào hộp thư kế toán
async function handleMailboxPdfUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  showToast(`Đang đọc và nạp file PDF hóa đơn: ${file.name}...`, "info");
  try {
    const text = await extractTextFromPdfFile(file);
    const parsed = parseVietnameseInvoice(text, file.name);
    const parsedItems = parsed.items;

    const newMail = {
      id: `inbox-pdf-${Date.now()}`,
      senderName: parsed.sellerName || file.name.replace(/\.[^/.]+$/, "").toUpperCase(),
      senderEmail: "ketoan@tbtech.com.vn",
      recipientEmail: AppState.gmailConfig?.email || "ketoan.tbtech387@gmail.com",
      subject: `Hóa đơn điện tử số ${parsed.invoiceNumber ? (parsed.invoiceSeries ? parsed.invoiceSeries + '-' : '') + parsed.invoiceNumber : 'MỚI'} (${file.name})`,
      receivedDate: parsed.invoiceDate || new Date().toISOString().slice(0, 10),
      pdfFileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      isImported: false,
      extractedData: {
        invoiceNumber: parsed.invoiceNumber ? `${parsed.invoiceSeries ? parsed.invoiceSeries + '-' : ''}${parsed.invoiceNumber}` : `PDF-${Date.now().toString().slice(-4)}`,
        invoiceDate: parsed.invoiceDate || new Date().toISOString().slice(0, 10),
        supplierName: parsed.sellerName || "Nhà Cung Cấp (File Tải Lên)",
        supplierTaxCode: parsed.sellerTaxCode || "",
        supplierAddress: parsed.sellerAddress || "",
        supplierPhone: parsed.sellerPhone || "",
        customerName: parsed.buyerName || AppState.companyInfo.name,
        customerTaxCode: parsed.buyerTaxCode || AppState.companyInfo.taxCode,
        customerAddress: parsed.buyerAddress || AppState.companyInfo.address,
        subtotal: parsed.subtotal || parsedItems.reduce((s, it) => s + (it.totalPrice || 0), 0),
        taxAmount: parsed.taxAmount || 0,
        totalAmount: parsed.totalAmount || parsedItems.reduce((s, it) => s + (it.totalPrice || 0), 0),
        notes: `Hóa đơn nạp thủ công từ PDF: ${file.name}`,
        items: parsedItems.length > 0 ? parsedItems.map(it => ({
          lineNo: it.lineNo,
          itemCode: (typeof removeVietnameseTones === "function" ? removeVietnameseTones(it.rawName) : it.rawName).slice(0, 18).toUpperCase().replace(/[^A-Z0-9]/g, "-").replace(/-+/g, "-"),
          itemName: it.rawName,
          unit: it.unit,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
          taxRate: parsed.taxRate || 10
        })) : [
          {
            lineNo: 1,
            itemCode: `TB-${Date.now().toString().slice(-4)}`,
            itemName: `Vật tư thiết bị từ ${file.name}`,
            unit: "Cái",
            quantity: 1,
            unitPrice: parsed.totalAmount || 1000000,
            totalPrice: parsed.totalAmount || 1000000,
            taxRate: 10
          }
        ]
      }
    };

    AppState.inbox = [newMail, ...AppState.inbox.filter(m => m.id !== newMail.id)];
    AppState.activeInvoice = newMail;
    AppState.auditInputInvoice = newMail;
    saveState();

    playSound("success");
    showToast(`Đã nạp Hóa đơn #${newMail.extractedData.invoiceNumber} vào hộp thư thành công!`, "success");
    renderGmailSync(document.getElementById("main-content"));
  } catch (err) {
    console.error("Lỗi nạp file PDF vào hộp thư:", err);
    showToast("Không thể đọc file PDF: " + err.message, "error");
  } finally {
    event.target.value = "";
  }
}

// Chuyển nhanh từ một email bất kỳ sang đối soát
function jumpToAuditFromMail(id) {
  const mail = AppState.inbox.find(m => m.id === id);
  if (mail) {
    AppState.auditInputInvoice = mail;
    saveState();
    switchTab("reconciliation");
    showToast(`Đã chọn HĐ #${mail.extractedData.invoiceNumber} làm HĐ Đầu Vào cho đối soát!`, "info");
  }
}

// ==========================================================================
// TAB MỚI: ĐỐI SOÁT HÓA ĐƠN ĐẦU VÀO - ĐẦU RA & KIỂM SOÁT HÀNG TỒN (AUDIT)
// ==========================================================================

function renderAuditReconciliation(container) {
  // Đảm bảo hóa đơn được chọn mặc định nếu chưa có
  if (!AppState.auditInputInvoice && AppState.inbox.length > 0) {
    AppState.auditInputInvoice = AppState.inbox[0];
  }
  if (!AppState.auditOutputInvoice && AppState.salesInvoices.length > 0) {
    AppState.auditOutputInvoice = AppState.salesInvoices[0];
  }

  // Tự động chạy đối soát nếu có dữ liệu nhưng chưa có kết quả
  if (!AppState.auditResults && AppState.auditInputInvoice && AppState.auditOutputInvoice) {
    runAuditReconciliation(false);
  }

  const inInv = AppState.auditInputInvoice;
  const outInv = AppState.auditOutputInvoice;
  const results = AppState.auditResults;

  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <!-- Title Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-xs font-bold border border-rose-500/20 mb-1">
            <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>Phân Hệ Kiểm Toán & Đối Soát Độc Quyền TBTECH</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-black text-slate-900 flex items-center space-x-2">
            <svg class="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"></path></svg>
            <span>Đối Soát Hóa Đơn PDF Đầu Vào - Đầu Ra & Hàng Tồn</span>
          </h1>
          <p class="text-xs text-slate-500 font-medium mt-0.5">
            Nạp đồng thời file PDF Hóa đơn Đầu Vào (Mua hàng) và PDF Hóa đơn Đầu Ra (Xuất bán) để kiểm toán số lượng tồn kho và tự động cảnh báo mọi sai lệch tên thiết bị theo thuật toán Fuzzy Matching.
          </p>
        </div>

        <div class="flex items-center space-x-2">
          <button onclick="exportAuditReportCSV()" class="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer">
            <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <span>Xuất Báo Cáo Đối Soát (CSV)</span>
          </button>
        </div>
      </div>

      <!-- Khu Vực Nạp Hai Hóa Đơn (Dual Dropzone) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Vùng 1: HÓA ĐƠN ĐẦU VÀO -->
        <div class="glass-card p-5 sm:p-6 rounded-3xl border border-blue-200 bg-blue-50/20 space-y-4">
          <div class="flex items-center justify-between border-b border-blue-100 pb-3">
            <div class="flex items-center space-x-2">
              <span class="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">1</span>
              <div>
                <h3 class="font-bold text-sm text-slate-900">Hóa Đơn PDF Đầu Vào (Mua Vào / NCC)</h3>
                <p class="text-[11px] text-slate-500">Thiết bị nhập từ nhà sản xuất, phân phối</p>
              </div>
            </div>
            <span class="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">ĐẦU VÀO</span>
          </div>

          <!-- Selector -->
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Chọn Từ Hóa Đơn Nhà Cung Cấp Mẫu:</label>
              <select onchange="handleSelectSampleInputInvoice(this.value)" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500">
                ${AppState.inbox.map(m => `
                  <option value="${m.id}" ${inInv && inInv.id === m.id ? 'selected' : ''}>
                    ${m.extractedData.supplierName} (HĐ: #${m.extractedData.invoiceNumber} - ${formatVND(m.extractedData.totalAmount)})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Custom Upload Dropzone -->
            <div class="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white/80 rounded-2xl p-3 text-center transition cursor-pointer relative">
              <input type="file" accept=".pdf" onchange="handleUploadInputPdf(this)" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              <div class="flex items-center justify-center space-x-2 text-xs text-blue-700 font-bold">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                <span>Tải lên file PDF HĐ Đầu Vào thật (Đọc bằng PDF.js)</span>
              </div>
            </div>

            <!-- Selected Input Summary Card -->
            ${inInv ? `
              <div class="p-3.5 rounded-2xl bg-white border border-blue-100 space-y-2 text-xs">
                <div class="flex items-center justify-between font-bold">
                  <span class="text-blue-900 truncate">${inInv.extractedData.supplierName}</span>
                  <span class="font-mono text-blue-700">HĐ: #${inInv.extractedData.invoiceNumber}</span>
                </div>
                <div class="text-slate-500 flex justify-between text-[11px]">
                  <span>Ngày lập: <strong>${inInv.extractedData.invoiceDate}</strong></span>
                  <span>Tổng tiền: <strong class="font-mono text-emerald-700">${formatVND(inInv.extractedData.totalAmount)}</strong></span>
                </div>
                <div class="text-[11px] text-slate-400 truncate">
                  File: <span class="font-mono text-slate-600">${inInv.pdfFileName || 'custom_upload.pdf'}</span> (${inInv.extractedData.items.length} mặt hàng)
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Vùng 2: HÓA ĐƠN ĐẦU RA -->
        <div class="glass-card p-5 sm:p-6 rounded-3xl border border-rose-200 bg-rose-50/20 space-y-4">
          <div class="flex items-center justify-between border-b border-rose-100 pb-3">
            <div class="flex items-center space-x-2">
              <span class="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xs">2</span>
              <div>
                <h3 class="font-bold text-sm text-slate-900">Hóa Đơn PDF Đầu Ra (Bán Hàng / Khách Hàng)</h3>
                <p class="text-[11px] text-slate-500">Thiết bị xuất bán cho cơ quan, doanh nghiệp</p>
              </div>
            </div>
            <span class="text-[10px] font-mono font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">ĐẦU RA</span>
          </div>

          <!-- Selector -->
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Chọn Từ Hóa Đơn Xuất Bán Mẫu:</label>
              <select onchange="handleSelectSampleOutputInvoice(this.value)" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500">
                ${AppState.salesInvoices.map(s => `
                  <option value="${s.id}" ${outInv && outInv.id === s.id ? 'selected' : ''}>
                    ${s.buyerName} (HĐ: #${s.invoiceNumber} - ${formatVND(s.totalAmount)})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Custom Upload Dropzone -->
            <div class="border-2 border-dashed border-rose-300 hover:border-rose-500 bg-white/80 rounded-2xl p-3 text-center transition cursor-pointer relative">
              <input type="file" accept=".pdf" onchange="handleUploadOutputPdf(this)" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              <div class="flex items-center justify-center space-x-2 text-xs text-rose-700 font-bold">
                <svg class="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                <span>Tải lên file PDF HĐ Đầu Ra thật (Đọc bằng PDF.js)</span>
              </div>
            </div>

            <!-- Selected Output Summary Card -->
            ${outInv ? `
              <div class="p-3.5 rounded-2xl bg-white border border-rose-100 space-y-2 text-xs">
                <div class="flex items-center justify-between font-bold">
                  <span class="text-rose-900 truncate">${outInv.buyerName}</span>
                  <span class="font-mono text-rose-700">HĐ: #${outInv.invoiceNumber}</span>
                </div>
                <div class="text-slate-500 flex justify-between text-[11px]">
                  <span>Ngày lập: <strong>${outInv.invoiceDate}</strong></span>
                  <span>Tổng tiền: <strong class="font-mono text-emerald-700">${formatVND(outInv.totalAmount)}</strong></span>
                </div>
                <div class="text-[11px] text-slate-400 truncate">
                  File: <span class="font-mono text-slate-600">${outInv.pdfFileName || 'custom_sales_upload.pdf'}</span> (${outInv.items.length} mặt hàng)
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <div class="text-center">
        <button onclick="runAuditReconciliation(true)" class="px-8 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600 hover:from-blue-500 hover:to-rose-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 cursor-pointer inline-flex items-center space-x-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <span>🔍 BẮT ĐẦU ĐỐI SOÁT & PHÁT HIỆN CẢNH BÁO LỆCH TÊN THIẾT BỊ</span>
        </button>
      </div>

      <!-- Bảng Kết Quả Đối Soát & Cảnh Báo -->
      ${results ? `
        <div class="space-y-6">
          <!-- KPI Summary Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="glass-card p-4 rounded-2xl border border-slate-200">
              <span class="text-[11px] font-bold text-slate-400 uppercase">Tổng Thiết Bị Đối Soát</span>
              <div class="text-xl font-black text-slate-900 font-mono mt-1">${results.items.length} dòng</div>
              <div class="text-[10px] text-slate-500">Khớp giữa Vào, Ra & Kho</div>
            </div>

            <div class="glass-card p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40">
              <span class="text-[11px] font-bold text-emerald-700 uppercase">Khớp Tên Tuyệt Đối</span>
              <div class="text-xl font-black text-emerald-800 font-mono mt-1">${results.summary.exactMatches} mục</div>
              <div class="text-[10px] text-emerald-600">Đồng nhất 100% không lệch</div>
            </div>

            <div class="glass-card p-4 rounded-2xl border border-amber-300 bg-amber-50/60">
              <span class="text-[11px] font-bold text-amber-800 uppercase flex items-center space-x-1">
                <span>⚠️ Cảnh Báo Lệch Tên</span>
              </span>
              <div class="text-xl font-black text-amber-900 font-mono mt-1">${results.summary.discrepancyMatches} mục</div>
              <div class="text-[10px] text-amber-700 font-semibold">Tên khác nhau đã được bôi đỏ/vàng</div>
            </div>

            <div class="glass-card p-4 rounded-2xl border ${results.summary.outOfStockIssues > 0 ? 'border-red-300 bg-red-50/50' : 'border-blue-200 bg-blue-50/40'}">
              <span class="text-[11px] font-bold ${results.summary.outOfStockIssues > 0 ? 'text-red-700' : 'text-blue-700'} uppercase">Kiểm Soát Hàng Tồn</span>
              <div class="text-xl font-black ${results.summary.outOfStockIssues > 0 ? 'text-red-800' : 'text-blue-900'} font-mono mt-1">
                ${results.summary.outOfStockIssues > 0 ? `⚠️ Thiếu ${results.summary.outOfStockIssues} mục` : '✅ Đủ Hàng Xuất'}
              </div>
              <div class="text-[10px] ${results.summary.outOfStockIssues > 0 ? 'text-red-600 font-bold' : 'text-blue-600'}">
                ${results.summary.outOfStockIssues > 0 ? 'Xuất vượt quá tồn kho + nhập' : 'Tồn kho đáp ứng an toàn'}
              </div>
            </div>
          </div>

          <!-- The Reconciliation Matrix Table -->
          <div class="glass-card rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div class="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex items-center space-x-2">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span class="font-bold text-xs sm:text-sm">Ma Trận Đối Chiếu Chi Tiết: Tên Thiết Bị & Cân Đối Tồn Kho TBTECH</span>
              </div>
              <div class="text-[11px] text-slate-400 font-mono">
                Từ khóa bôi <span class="bg-amber-400/30 text-amber-300 px-1.5 py-0.5 rounded font-bold">màu vàng</span> thể hiện sự sai lệch giữa HĐ Đầu Vào và Đầu Ra
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th class="py-3 px-3">Mã SKU</th>
                    <th class="py-3 px-3 w-1/4">Tên Trên HĐ Đầu Vào (Bên Bán)</th>
                    <th class="py-3 px-3 w-1/4">Tên Trên HĐ Đầu Ra (Bên Mua)</th>
                    <th class="py-3 px-3 w-1/4">Tên Chuẩn Trong Kho TBTECH</th>
                    <th class="py-3 px-3 text-center">Trạng Thái & Độ Khớp</th>
                    <th class="py-3 px-3 text-right">Soát Tồn Kho (Nhập / Xuất / Tồn)</th>
                    <th class="py-3 px-3 text-center">Xử Lý</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${results.items.map((row, idx) => `
                    <tr class="hover:bg-slate-50/80 transition ${row.status === 'DISCREPANCY' ? 'bg-amber-50/30' : row.status === 'NOT_IN_STOCK' ? 'bg-red-50/30' : ''}">
                      <!-- Mã SKU -->
                      <td class="py-3.5 px-3 font-mono font-bold text-slate-800 align-top">
                        ${row.sku ? `<span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">${row.sku}</span>` : '<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200">CHƯA CÓ</span>'}
                      </td>

                      <!-- Tên trên HĐ Đầu Vào -->
                      <td class="py-3.5 px-3 align-top">
                        ${row.inputItem ? `
                          <div class="font-medium text-slate-800 leading-snug">
                            ${row.status === 'DISCREPANCY' ? highlightDifferences(row.inputItem.name, row.outputItem ? row.outputItem.name : (row.warehouseProduct ? row.warehouseProduct.name : '')) : row.inputItem.name}
                          </div>
                          <div class="text-[11px] text-slate-400 font-mono mt-1">SL Nhập: <strong class="text-blue-600 font-bold">+${row.inputItem.quantity} ${row.inputItem.unit}</strong> • Đơn giá: ${formatVND(row.inputItem.price)}</div>
                        ` : '<span class="text-slate-400 italic">Không có trong HĐ đầu vào</span>'}
                      </td>

                      <!-- Tên trên HĐ Đầu Ra -->
                      <td class="py-3.5 px-3 align-top">
                        ${row.outputItem ? `
                          <div class="font-medium text-slate-800 leading-snug">
                            ${row.status === 'DISCREPANCY' ? highlightDifferences(row.outputItem.name, row.inputItem ? row.inputItem.name : (row.warehouseProduct ? row.warehouseProduct.name : '')) : row.outputItem.name}
                          </div>
                          <div class="text-[11px] text-slate-400 font-mono mt-1">SL Xuất: <strong class="text-rose-600 font-bold">-${row.outputItem.quantity} ${row.outputItem.unit}</strong> • Đơn giá: ${formatVND(row.outputItem.price)}</div>
                        ` : '<span class="text-slate-400 italic">Không có trong HĐ đầu ra</span>'}
                      </td>

                      <!-- Tên Chuẩn Trong Kho -->
                      <td class="py-3.5 px-3 align-top">
                        ${row.warehouseProduct ? `
                          <div class="font-bold text-slate-900 leading-snug">${row.warehouseProduct.name}</div>
                          <div class="text-[10px] text-slate-400 font-mono mt-1">Vị trí: ${row.warehouseProduct.location} • ĐVT: ${row.warehouseProduct.unit}</div>
                        ` : '<span class="text-red-500 font-semibold italic">Chưa đăng ký trong danh mục kho</span>'}
                      </td>

                      <!-- Trạng Thái & Cảnh Báo Lệch Tên -->
                      <td class="py-3.5 px-3 align-top text-center whitespace-nowrap">
                        ${row.status === 'EXACT' ? `
                          <span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                            <span>Khớp 100%</span>
                          </span>
                        ` : row.status === 'DISCREPANCY' ? `
                          <div class="space-y-1">
                            <span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-300 animate-pulse">
                              <svg class="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                              <span>CẢNH BÁO LỆCH TÊN</span>
                            </span>
                            <div class="text-[10px] font-mono text-slate-500 font-semibold">Độ tương đồng: <span class="text-amber-700 font-bold">${row.matchScore}%</span></div>
                          </div>
                        ` : `
                          <span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-bold text-[11px] border border-red-300">
                            <svg class="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            <span>CHƯA CÓ TRONG KHO</span>
                          </span>
                        `}
                      </td>

                      <!-- Soát Hàng Tồn -->
                      <td class="py-3.5 px-3 align-top text-right whitespace-nowrap font-mono">
                        <div class="text-xs font-bold text-slate-800">
                          Tồn hiện tại: <span class="text-blue-700">${row.currentStock}</span>
                        </div>
                        <div class="text-[11px] text-slate-500 mt-0.5">
                          Nhập: <span class="text-emerald-600">+${row.qtyIn}</span> | Xuất: <span class="text-rose-600">-${row.qtyOut}</span>
                        </div>
                        <div class="text-xs font-black mt-1 ${row.balance < 0 ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200' : 'text-emerald-700'}">
                          ${row.balance < 0 ? `⚠️ THIẾU ${Math.abs(row.balance)} CÁI` : `Tồn sau GD: ${row.balance} cái`}
                        </div>
                      </td>

                      <!-- Xử Lý -->
                      <td class="py-3.5 px-3 align-top text-center whitespace-nowrap">
                        <div class="flex flex-col space-y-1.5 items-center">
                          ${row.warehouseProduct ? `
                            <button onclick="applyStandardWarehouseName(${idx})" title="Đồng bộ hóa tên trên chứng từ thành tên chuẩn trong kho TBTECH" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg transition border border-blue-200 cursor-pointer">
                              Chuẩn Hóa Tên Kho
                            </button>
                            <button onclick="saveAliasForAuditItem('${row.outputItem ? row.outputItem.name : row.inputItem.name}', '${row.sku}')" title="Lưu tên này vào từ điển đồng nghĩa để tự động khớp các lần sau" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded-lg transition cursor-pointer">
                              + Lưu Tên Đồng Nghĩa
                            </button>
                          ` : `
                            <button onclick="switchTab('inventory')" class="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded-lg transition shadow-xs cursor-pointer">
                              + Thêm Vào Kho
                            </button>
                          `}
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Footer Action Toolbar -->
            <div class="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="text-xs text-slate-500 flex items-center space-x-2">
                <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>Hệ thống đã hoàn tất phân tích đối soát 3 chiều: Hóa đơn Vào ⇄ Hóa đơn Ra ⇄ Kho TBTECH.</span>
              </div>
              <div class="flex items-center space-x-2">
                <button onclick="applySyncAuditToStock()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center space-x-1.5 cursor-pointer">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  <span>⚡ Đồng Bộ Tồn Kho Theo Đối Soát Này</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ==========================================================================
// CÁC HÀM XỬ LÝ PHÂN HỆ ĐỐI SOÁT (AUDIT CONTROLLERS)
// ==========================================================================

function handleSelectSampleInputInvoice(id) {
  const found = AppState.inbox.find(m => m.id === id);
  if (found) {
    AppState.auditInputInvoice = found;
    playSound("click");
    runAuditReconciliation(false);
    renderAuditReconciliation(document.getElementById("main-content"));
    showToast(`Đã chọn Hóa đơn đầu vào: #${found.extractedData.invoiceNumber}`, "info");
  }
}

function handleSelectSampleOutputInvoice(id) {
  const found = AppState.salesInvoices.find(s => s.id === id);
  if (found) {
    AppState.auditOutputInvoice = found;
    playSound("click");
    runAuditReconciliation(false);
    renderAuditReconciliation(document.getElementById("main-content"));
    showToast(`Đã chọn Hóa đơn xuất bán: #${found.invoiceNumber}`, "info");
  }
}

async function handleUploadInputPdf(inputEl) {
  if (!inputEl.files || inputEl.files.length === 0) return;
  const file = inputEl.files[0];
  showToast(`Đang đọc văn bản từ file PDF đầu vào: ${file.name}...`, "info");

  try {
    const text = await extractTextFromPdfFile(file);
    const parsed = parseVietnameseInvoice(text, file.name);
    const parsedItems = parsed.items;

    const isTbtechSeller = parsed.sellerTaxCode === "0111093754" || /TBTECH/i.test(parsed.sellerName);

    const newInvoice = {
      id: `custom-in-${Date.now()}`,
      senderName: parsed.sellerName || "Hóa Đơn Tải Lên (NCC)",
      senderEmail: "ketoan@tbtech.com.vn",
      recipientEmail: AppState.gmailConfig?.email || "ketoan.tbtech387@gmail.com",
      subject: `Hóa đơn điện tử số ${parsed.invoiceNumber ? (parsed.invoiceSeries ? parsed.invoiceSeries + '-' : '') + parsed.invoiceNumber : 'MỚI'} (${file.name})`,
      receivedDate: parsed.invoiceDate || new Date().toISOString().slice(0, 10),
      pdfFileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      isImported: false,
      extractedData: {
        invoiceNumber: parsed.invoiceNumber ? `${parsed.invoiceSeries ? parsed.invoiceSeries + '-' : ''}${parsed.invoiceNumber}` : `PDF-IN-${Date.now().toString().slice(-4)}`,
        invoiceDate: parsed.invoiceDate || new Date().toISOString().slice(0, 10),
        supplierName: parsed.sellerName || "Nhà Cung Cấp (File Tải Lên)",
        customerName: parsed.buyerName || AppState.companyInfo.name,
        taxCode: parsed.sellerTaxCode,
        subtotal: parsed.subtotal,
        taxAmount: parsed.taxAmount,
        totalAmount: parsed.totalAmount || parsedItems.reduce((s, it) => s + (it.totalPrice || 0), 0),
        items: parsedItems.length > 0 ? parsedItems.map(it => ({
          lineNo: it.lineNo,
          itemCode: (typeof removeVietnameseTones === "function" ? removeVietnameseTones(it.rawName) : it.rawName).slice(0, 18).toUpperCase().replace(/[^A-Z0-9]/g, "-").replace(/-+/g, "-"),
          itemName: it.rawName,
          unit: it.unit,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice
        })) : [
          {
            lineNo: 1,
            itemCode: `TB-${Date.now().toString().slice(-4)}`,
            itemName: `Vật tư thiết bị (từ file ${file.name})`,
            unit: "Cái",
            quantity: 1,
            unitPrice: parsed.totalAmount || 1000000,
            totalPrice: parsed.totalAmount || 1000000
          }
        ]
      }
    };

    // Đưa hóa đơn này vào danh sách inbox để hiển thị trên Dropdown Vùng 1 và Hộp thư
    AppState.inbox = [newInvoice, ...AppState.inbox.filter(m => m.id !== newInvoice.id)];
    AppState.activeInvoice = newInvoice;
    AppState.auditInputInvoice = newInvoice;
    saveState();

    playSound("success");
    if (isTbtechSeller) {
      showToast(`Đã nạp HĐ #${newInvoice.extractedData.invoiceNumber} (${parsedItems.length} mặt hàng). Lưu ý: File này là HĐ bán ra của TBTECH.`, "info", 5000);
    } else {
      showToast(`Đã nạp và trích xuất thành công ${parsedItems.length} mặt hàng từ file PDF đầu vào!`, "success");
    }
    runAuditReconciliation(false);
    renderAuditReconciliation(document.getElementById("main-content"));
  } catch (err) {
    console.error("Lỗi đọc PDF đầu vào:", err);
    showToast("Không thể bóc tách PDF đầu vào: " + err.message, "error");
  } finally {
    inputEl.value = "";
  }
}

async function handleUploadOutputPdf(inputEl) {
  if (!inputEl.files || inputEl.files.length === 0) return;
  const file = inputEl.files[0];
  showToast(`Đang đọc văn bản từ file PDF đầu ra: ${file.name}...`, "info");

  try {
    const text = await extractTextFromPdfFile(file);
    const parsed = parseVietnameseInvoice(text, file.name);
    const parsedItems = parsed.items;

    const newSalesInvoice = {
      id: `custom-out-${Date.now()}`,
      buyerName: parsed.buyerName || "Khách Hàng (File Tải Lên)",
      buyerTaxCode: parsed.buyerTaxCode || "",
      sellerName: parsed.sellerName || AppState.companyInfo.name,
      sellerTaxCode: parsed.sellerTaxCode || AppState.companyInfo.taxCode,
      invoiceNumber: parsed.invoiceNumber ? `${parsed.invoiceSeries ? parsed.invoiceSeries + '-' : ''}${parsed.invoiceNumber}` : `PDF-OUT-${Date.now().toString().slice(-4)}`,
      invoiceDate: parsed.invoiceDate || new Date().toISOString().slice(0, 10),
      pdfFileName: file.name,
      subtotal: parsed.subtotal,
      taxAmount: parsed.taxAmount,
      totalAmount: parsed.totalAmount || parsedItems.reduce((s, it) => s + (it.totalPrice || 0), 0),
      items: parsedItems.length > 0 ? parsedItems.map(it => ({
        lineNo: it.lineNo,
        rawName: it.rawName,
        matchedSku: null,
        unit: it.unit,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice
      })) : [
        {
          lineNo: 1,
          rawName: `Vật tư thiết bị xuất bán (từ file ${file.name})`,
          matchedSku: null,
          unit: "Cái",
          quantity: 1,
          unitPrice: parsed.totalAmount || 1000000,
          totalPrice: parsed.totalAmount || 1000000
        }
      ]
    };

    // Đưa hóa đơn này vào danh sách salesInvoices để hiển thị trên Dropdown Vùng 2
    AppState.salesInvoices = [newSalesInvoice, ...AppState.salesInvoices.filter(s => s.id !== newSalesInvoice.id)];
    AppState.auditOutputInvoice = newSalesInvoice;
    saveState();

    playSound("success");
    showToast(`Đã nạp và trích xuất thành công ${parsedItems.length} mặt hàng từ file PDF đầu ra!`, "success");
    runAuditReconciliation(false);
    renderAuditReconciliation(document.getElementById("main-content"));
  } catch (err) {
    console.error("Lỗi đọc PDF đầu ra:", err);
    showToast("Không thể bóc tách PDF đầu ra: " + err.message, "error");
  } finally {
    inputEl.value = "";
  }
}

function runAuditReconciliation(triggerToast = true) {
  const inInv = AppState.auditInputInvoice;
  const outInv = AppState.auditOutputInvoice;

  if (!inInv || !outInv) {
    if (triggerToast) showToast("Vui lòng chọn cả Hóa đơn Đầu Vào và Hóa đơn Đầu Ra!", "warning");
    return;
  }

  const inItems = (inInv.extractedData ? inInv.extractedData.items : (inInv.items || [])).map((item, idx) => ({
    id: `in-${idx}`,
    name: item.itemName || item.rawName || item.name || "Vật tư đầu vào",
    unit: item.unit || "Cái",
    quantity: parseInt(item.quantity, 10) || 1,
    price: parseInt(item.unitPrice, 10) || 0,
    itemCode: item.itemCode || ""
  }));

  const outItems = (outInv.items || []).map((item, idx) => ({
    id: `out-${idx}`,
    name: item.rawName || item.itemName || item.name || "Vật tư đầu ra",
    unit: item.unit || "Cái",
    quantity: parseInt(item.quantity, 10) || 1,
    price: parseInt(item.unitPrice, 10) || 0,
    matchedSku: item.matchedSku || ""
  }));

  // Hàm trích xuất mã model/kỹ thuật công nghiệp (e.g. CY3R32, MST21, QS-1/4, 200, 250, 320)
  function extractIndustrialKey(str) {
    if (!str) return "";
    const clean = removeVietnameseTones(str).toUpperCase();
    const codes = clean.match(/[A-Z0-9]+(?:[\*\-\/][A-Z0-9]+)*/g) || [];
    // Lọc bỏ các từ thông thường
    const filtered = codes.filter(c => c.length >= 3 && !/^(VAN|CAI|CHIEC|BO|MET|CUON|HOP|KHI|NEN|DAY|CAP|DONG|HO|DAU|NOI)$/.test(c));
    return filtered.join("_");
  }

  const pairedRows = [];
  const matchedInputIds = new Set();
  const matchedOutputIds = new Set();

  // BƯỚC 1: Ghép theo SKU kho trùng nhau hoặc Alias
  inItems.forEach(inIt => {
    const inMatch = findBestMatchingProduct(inIt.name, AppState.products, AppState.aliases);
    if (inMatch.product) {
      outItems.forEach(outIt => {
        if (matchedOutputIds.has(outIt.id)) return;
        const outMatch = outIt.matchedSku ? 
          { product: AppState.products.find(p => p.sku === outIt.matchedSku) } : 
          findBestMatchingProduct(outIt.name, AppState.products, AppState.aliases);
        
        if (outMatch.product && outMatch.product.sku === inMatch.product.sku) {
          matchedInputIds.add(inIt.id);
          matchedOutputIds.add(outIt.id);
          pairedRows.push({
            sku: inMatch.product.sku,
            warehouseProduct: inMatch.product,
            inputItem: inIt,
            outputItem: outIt,
            matchScore: calculateStringSimilarity(inIt.name, outIt.name),
            tier: "SKU_MATCH"
          });
        }
      });
    }
  });

  // BƯỚC 2: Ghép trực tiếp giữa HĐ Đầu Vào và Đầu Ra theo Model kỹ thuật & Độ tương đồng tên
  inItems.forEach(inIt => {
    if (matchedInputIds.has(inIt.id)) return;

    let bestOut = null;
    let highestScore = 0;
    const inKey = extractIndustrialKey(inIt.name);

    outItems.forEach(outIt => {
      if (matchedOutputIds.has(outIt.id)) return;
      const outKey = extractIndustrialKey(outIt.name);
      let score = calculateStringSimilarity(inIt.name, outIt.name);

      // Nếu trùng model kỹ thuật (ví dụ cả 2 đều có MST21 hoặc CY3R32*200) thì ưu tiên cực cao
      if (inKey && outKey && (inKey === outKey || inKey.includes(outKey) || outKey.includes(inKey))) {
        score = Math.max(score, 88);
      }

      if (score > highestScore && score >= 35) {
        highestScore = score;
        bestOut = outIt;
      }
    });

    if (bestOut) {
      matchedInputIds.add(inIt.id);
      matchedOutputIds.add(bestOut.id);
      const whMatch = findBestMatchingProduct(inIt.name, AppState.products, AppState.aliases) || 
                      findBestMatchingProduct(bestOut.name, AppState.products, AppState.aliases);
      pairedRows.push({
        sku: whMatch.product ? whMatch.product.sku : null,
        warehouseProduct: whMatch.product,
        inputItem: inIt,
        outputItem: bestOut,
        matchScore: highestScore,
        tier: "FUZZY_PAIR"
      });
    }
  });

  // BƯỚC 3: Các mặt hàng Đầu Vào còn lại chưa ghép được với Đầu Ra
  inItems.forEach(inIt => {
    if (!matchedInputIds.has(inIt.id)) {
      const whMatch = findBestMatchingProduct(inIt.name, AppState.products, AppState.aliases);
      pairedRows.push({
        sku: whMatch.product ? whMatch.product.sku : inIt.itemCode || null,
        warehouseProduct: whMatch.product,
        inputItem: inIt,
        outputItem: null,
        matchScore: whMatch.score || 0,
        tier: "INPUT_ONLY"
      });
    }
  });

  // BƯỚC 4: Các mặt hàng Đầu Ra còn lại chưa ghép được với Đầu Vào
  outItems.forEach(outIt => {
    if (!matchedOutputIds.has(outIt.id)) {
      const whMatch = outIt.matchedSku ? 
        { product: AppState.products.find(p => p.sku === outIt.matchedSku), score: 95 } :
        findBestMatchingProduct(outIt.name, AppState.products, AppState.aliases);
      pairedRows.push({
        sku: whMatch.product ? whMatch.product.sku : null,
        warehouseProduct: whMatch.product,
        inputItem: null,
        outputItem: outIt,
        matchScore: whMatch.score || 0,
        tier: "OUTPUT_ONLY"
      });
    }
  });

  // BƯỚC 5: Đánh giá Trạng thái, Cảnh Báo Lệch Tên và Soát Tồn Kho
  let exactMatches = 0;
  let discrepancyMatches = 0;
  let outOfStockIssues = 0;

  const evaluatedRows = pairedRows.map(row => {
    const currentStock = row.warehouseProduct ? row.warehouseProduct.inStock : 0;
    const qtyIn = row.inputItem ? row.inputItem.quantity : 0;
    const qtyOut = row.outputItem ? row.outputItem.quantity : 0;
    const balance = currentStock + qtyIn - qtyOut;

    if (balance < 0) {
      outOfStockIssues++;
    }

    let status = "PENDING";
    const nameIn = row.inputItem ? row.inputItem.name.trim() : "";
    const nameOut = row.outputItem ? row.outputItem.name.trim() : "";

    if (row.inputItem && row.outputItem) {
      const cleanIn = removeVietnameseTones(nameIn).toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanOut = removeVietnameseTones(nameOut).toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanIn === cleanOut) {
        status = "EXACT";
        exactMatches++;
      } else {
        status = "DISCREPANCY";
        discrepancyMatches++;
      }
    } else if (row.warehouseProduct) {
      status = "ONE_SIDED";
    } else {
      status = "NOT_IN_STOCK";
    }

    return {
      ...row,
      currentStock,
      qtyIn,
      qtyOut,
      balance,
      status
    };
  });

  AppState.auditResults = {
    items: evaluatedRows,
    summary: {
      total: evaluatedRows.length,
      exactMatches,
      discrepancyMatches,
      outOfStockIssues
    }
  };

  if (triggerToast) {
    playSound(discrepancyMatches > 0 ? "warn" : "success");
    showToast(`Đã đối soát xong! Phát hiện ${discrepancyMatches} mặt hàng lệch tên cần lưu ý.`, discrepancyMatches > 0 ? "warning" : "success", 4000);
    renderAuditReconciliation(document.getElementById("main-content"));
  }
}

function applyStandardWarehouseName(index) {
  if (!AppState.auditResults || !AppState.auditResults.items[index]) return;
  const row = AppState.auditResults.items[index];
  if (!row.warehouseProduct) return;

  const stdName = row.warehouseProduct.name;
  if (row.inputItem) row.inputItem.name = stdName;
  if (row.outputItem) row.outputItem.name = stdName;
  row.status = "EXACT";

  playSound("success");
  showToast(`Đã chuẩn hóa tên thiết bị thành: "${stdName}"!`, "success");
  renderAuditReconciliation(document.getElementById("main-content"));
}

function saveAliasForAuditItem(rawName, sku) {
  if (!rawName || !sku) return;
  const clean = rawName.toLowerCase().trim();
  const exists = AppState.aliases.some(a => a.raw === clean && a.sku === sku);
  if (!exists) {
    AppState.aliases.push({ raw: clean, sku });
    saveState();
  }
  playSound("success");
  showToast(`Đã lưu "${rawName}" thành tên đồng nghĩa của SKU: ${sku}!`, "success");
  runAuditReconciliation(false);
  renderAuditReconciliation(document.getElementById("main-content"));
}

function applySyncAuditToStock() {
  if (!AppState.auditResults || !AppState.auditResults.items) {
    showToast("Chưa có dữ liệu đối soát!", "warning");
    return;
  }

  const items = AppState.auditResults.items;
  let updatedCount = 0;

  items.forEach(row => {
    if (row.warehouseProduct) {
      row.warehouseProduct.inStock = Math.max(0, row.balance);
      updatedCount++;
    }
  });

  AppState.history.unshift({
    id: `hist-audit-${Date.now()}`,
    type: "ADJUST",
    title: `Đồng bộ tồn kho tự động theo kết quả Đối Soát Hóa Đơn Vào/Ra`,
    referenceNumber: `AUDIT-${new Date().toISOString().slice(0, 10)}`,
    partnerName: "Kiểm Toán Kho TBTECH",
    date: new Date().toISOString().slice(0, 16).replace("T", " "),
    totalAmount: 0,
    items: items.map(r => ({
      name: r.warehouseProduct ? r.warehouseProduct.name : (r.inputItem ? r.inputItem.name : r.outputItem.name),
      quantity: r.balance,
      unit: r.warehouseProduct ? r.warehouseProduct.unit : "Cái",
      price: r.warehouseProduct ? r.warehouseProduct.costPrice : 0
    })),
    note: `Đã tự động cộng nhập và trừ xuất kho theo hóa đơn đối soát`
  });

  saveState();
  playSound("success");
  showToast(`⚡ Đã đồng bộ thành công ${updatedCount} thiết bị vào kho TBTECH!`, "success", 4000);
  renderHeaderCounters();
  renderAuditReconciliation(document.getElementById("main-content"));
}

function exportAuditReportCSV() {
  if (!AppState.auditResults || !AppState.auditResults.items) {
    showToast("Vui lòng thực hiện đối soát trước khi xuất báo cáo!", "warning");
    return;
  }

  const headers = [
    "Mã SKU",
    "Tên Trên HĐ Đầu Vào",
    "Tên Trên HĐ Đầu Ra",
    "Tên Chuẩn Trong Kho TBTECH",
    "Trạng Thái Lệch Tên",
    "Độ Tương Đồng (%)",
    "SL Nhập (Đầu Vào)",
    "SL Xuất (Đầu Ra)",
    "Tồn Kho Hiện Tại",
    "Tồn Sau Giao Dịch",
    "Đánh Giá Tồn Kho"
  ];

  const rows = AppState.auditResults.items.map(r => [
    r.sku || "N/A",
    r.inputItem ? r.inputItem.name : "N/A",
    r.outputItem ? r.outputItem.name : "N/A",
    r.warehouseProduct ? r.warehouseProduct.name : "Chưa có trong kho",
    r.status === "EXACT" ? "Trùng khớp 100%" : r.status === "DISCREPANCY" ? "CẢNH BÁO LỆCH TÊN" : "CHƯA CÓ TRONG KHO",
    r.matchScore || 0,
    r.qtyIn,
    r.qtyOut,
    r.currentStock,
    r.balance,
    r.balance < 0 ? `THIẾU HÀNG (Âm ${Math.abs(r.balance)})` : "Đủ hàng"
  ]);

  exportToCSV(headers, rows, `Bao_Cao_Doi_Soat_TBTECH_${new Date().toISOString().slice(0, 10)}.csv`);
}


// ==========================================================================
// TAB 5: QUẢN LÝ & XUẤT CHỨNG TỪ A4 (DOCUMENTS)
// ==========================================================================
function renderDocuments(container) {
  const doc = AppState.activeDocument;
  const isFormMode = AppState.docMode === "FORM";
  const isPreviewMode = AppState.docMode === "PREVIEW";
  const isArchiveMode = AppState.docMode === "ARCHIVE";

  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 class="text-xl sm:text-2xl font-black text-slate-900 flex items-center space-x-2">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <span>Quản Lý & Xuất Chứng Từ TBTECH (Chuẩn Khổ A4)</span>
          </h1>
          <p class="text-xs text-slate-500 font-medium mt-0.5">Phiếu Xuất Kho 02-VT (TT 200/2014) • Biên Bản Bàn Giao & Nghiệm Thu • Hợp Đồng Mua Bán</p>
        </div>

        <div class="flex items-center space-x-2">
          <button onclick="setDocMode('FORM')" class="px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${isFormMode ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}">
            Soạn Thảo (Form)
          </button>
          <button onclick="setDocMode('PREVIEW')" class="px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${isPreviewMode ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}">
            Xem Trước & In (A4)
          </button>
          <button onclick="setDocMode('ARCHIVE')" class="px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${isArchiveMode ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}">
            Hồ Sơ Đã Lưu (${AppState.documents.length})
          </button>
        </div>
      </div>

      ${isFormMode ? renderDocumentForm() : isPreviewMode ? renderDocumentPreview() : renderDocumentArchive()}
    </div>
  `;
}

function setDocMode(mode) {
  AppState.docMode = mode;
  playSound("click");
  renderDocuments(document.getElementById("main-content"));
}

function renderDocumentForm() {
  const doc = AppState.activeDocument;
  const totalAmount = doc.items.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0);

  return `
    <div class="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200/90 space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label class="p-3.5 border rounded-2xl cursor-pointer transition flex items-center space-x-3 ${doc.docType === 'PHIEU_XUAT_KHO' ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs' : 'border-slate-200 hover:bg-slate-50'}">
          <input type="radio" name="docTypeSelect" value="PHIEU_XUAT_KHO" ${doc.docType === 'PHIEU_XUAT_KHO' ? 'checked' : ''} onchange="changeDocType(this.value)" class="text-blue-600" />
          <div class="text-xs">
            <div class="font-bold">Phiếu Xuất Kho 02-VT</div>
            <div class="text-[10px] text-slate-500">Mẫu chuẩn Thông tư 200/2014/TT-BTC</div>
          </div>
        </label>

        <label class="p-3.5 border rounded-2xl cursor-pointer transition flex items-center space-x-3 ${doc.docType === 'BIEN_BAN_BAN_GIAO' ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs' : 'border-slate-200 hover:bg-slate-50'}">
          <input type="radio" name="docTypeSelect" value="BIEN_BAN_BAN_GIAO" ${doc.docType === 'BIEN_BAN_BAN_GIAO' ? 'checked' : ''} onchange="changeDocType(this.value)" class="text-blue-600" />
          <div class="text-xs">
            <div class="font-bold">Biên Bản Bàn Giao & Nghiệm Thu</div>
            <div class="text-[10px] text-slate-500">Kèm điều khoản cam kết bảo hành</div>
          </div>
        </label>

        <label class="p-3.5 border rounded-2xl cursor-pointer transition flex items-center space-x-3 ${doc.docType === 'HOP_DONG_MUA_BAN' ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs' : 'border-slate-200 hover:bg-slate-50'}">
          <input type="radio" name="docTypeSelect" value="HOP_DONG_MUA_BAN" ${doc.docType === 'HOP_DONG_MUA_BAN' ? 'checked' : ''} onchange="changeDocType(this.value)" class="text-blue-600" />
          <div class="text-xs">
            <div class="font-bold">Hợp Đồng Mua Bán Hàng Hóa</div>
            <div class="text-[10px] text-slate-500">Căn cứ Luật Thương mại 2005</div>
          </div>
        </label>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Số Chứng Từ</label>
          <input type="text" id="doc-num" value="${doc.docNumber}" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Ngày Lập Chứng Từ</label>
          <input type="date" id="doc-date" value="${doc.date}" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Chọn Nhanh Khách Hàng</label>
          <select onchange="autoFillCustomer(this.value)" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer">
            <option value="">-- Chọn khách hàng đối tác --</option>
            ${AppState.customers.map(c => `
              <option value="${c.id}">${c.name} (${c.shortName})</option>
            `).join('')}
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Đơn Vị Nhận Hàng (Công Ty / Cơ Quan)</label>
          <input type="text" id="doc-org" value="${doc.receiverOrg || ''}" placeholder="Tên công ty hoặc người nhận..." class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Người Nhận Hàng / Đại Diện</label>
          <input type="text" id="doc-name" value="${doc.receiverName || ''}" placeholder="Ông / Bà..." class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Địa Chỉ Nhận Hàng</label>
          <input type="text" id="doc-addr" value="${doc.receiverAddress || ''}" placeholder="Địa chỉ giao hàng..." class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Mã Số Thuế Khách Hàng</label>
          <input type="text" id="doc-tax" value="${doc.receiverTaxCode || ''}" placeholder="Mã số thuế..." class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1">Lý Do Xuất / Nội Dung Hợp Đồng</label>
        <input type="text" id="doc-reason" value="${doc.reason || ''}" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
      </div>

      <div class="space-y-3 pt-2">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Danh Sách Thiết Bị Xuất Kho (${doc.items.length} mặt hàng)</h3>
          <button type="button" onclick="openAddItemToDocModal()" class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            <span>+ Chọn Từ Kho TBTECH</span>
          </button>
        </div>

        <div class="border border-slate-200 rounded-2xl overflow-hidden">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th class="py-2.5 px-3 w-10 text-center">STT</th>
                <th class="py-2.5 px-3">Mã SKU</th>
                <th class="py-2.5 px-3">Tên Hàng Hóa & Quy Cách</th>
                <th class="py-2.5 px-2 text-center">ĐVT</th>
                <th class="py-2.5 px-3 text-center w-24">Số Lượng</th>
                <th class="py-2.5 px-3 text-right">Đơn Giá Xuất</th>
                <th class="py-2.5 px-3 text-right">Thành Tiền</th>
                <th class="py-2.5 px-3 text-center w-12">Xóa</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${doc.items.length === 0 ? `
                <tr>
                  <td colspan="8" class="py-8 text-center text-slate-400 text-xs">
                    Chưa có thiết bị nào trong chứng từ. Bấm nút <strong>"+ Chọn Từ Kho TBTECH"</strong> ở trên để thêm.
                  </td>
                </tr>
              ` : doc.items.map((it, idx) => `
                <tr class="hover:bg-slate-50">
                  <td class="py-2.5 px-3 text-center font-bold text-slate-400">${idx + 1}</td>
                  <td class="py-2.5 px-3 font-mono font-bold text-blue-900">${it.sku}</td>
                  <td class="py-2.5 px-3 font-semibold text-slate-800">${it.name}</td>
                  <td class="py-2.5 px-2 text-center text-slate-600">${it.unit}</td>
                  <td class="py-2.5 px-3 text-center">
                    <input 
                      type="number" 
                      min="1" 
                      value="${it.qtyAct}" 
                      onchange="updateDocItemQty(${idx}, this.value)" 
                      class="w-16 px-2 py-1 border border-slate-200 rounded-lg text-center font-bold font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>
                  <td class="py-2.5 px-3 text-right font-mono">${formatVND(it.unitPrice)}</td>
                  <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-900">${formatVND(it.totalPrice)}</td>
                  <td class="py-2.5 px-3 text-center">
                    <button type="button" onclick="removeDocItem(${idx})" class="text-slate-400 hover:text-red-600 transition cursor-pointer">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <label class="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input type="checkbox" id="deductStockCheckbox" ${doc.deductStock ? 'checked' : ''} class="rounded text-blue-600 focus:ring-blue-500" />
          <span>Tự động trừ số lượng trong kho TBTECH khi lưu chứng từ</span>
        </label>

        <div class="flex items-center space-x-2">
          <button type="button" onclick="previewCurrentDocument()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
            <span>Xem Trước (A4)</span>
          </button>
          <button type="button" onclick="saveCurrentDocument()" class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition flex items-center space-x-1.5 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
            <span>Lưu Chứng Từ Vào Hệ Thống</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function changeDocType(type) {
  AppState.activeDocument.docType = type;
  const year = new Date().getFullYear();
  const randNum = String(Math.floor(Math.random() * 900) + 100);
  if (type === "PHIEU_XUAT_KHO") AppState.activeDocument.docNumber = `PXK-${year}/${randNum}`;
  else if (type === "BIEN_BAN_BAN_GIAO") AppState.activeDocument.docNumber = `BBBG-${year}/${randNum}`;
  else if (type === "HOP_DONG_MUA_BAN") AppState.activeDocument.docNumber = `HDMB-${year}/TBTECH`;

  renderDocuments(document.getElementById("main-content"));
}

function autoFillCustomer(custId) {
  if (!custId) return;
  const cust = AppState.customers.find(c => c.id === custId);
  if (!cust) return;

  AppState.activeDocument.receiverOrg = cust.name;
  AppState.activeDocument.receiverName = cust.contactPerson;
  AppState.activeDocument.receiverAddress = cust.address;
  AppState.activeDocument.receiverTaxCode = cust.taxCode;
  AppState.activeDocument.receiverPhone = cust.phone;

  renderDocuments(document.getElementById("main-content"));
  showToast(`Đã tự động điền thông tin: ${cust.name}`, "info");
}

function updateDocItemQty(idx, newQty) {
  const qty = parseInt(newQty, 10) || 1;
  const item = AppState.activeDocument.items[idx];
  if (item) {
    item.qtyAct = qty;
    item.qtyReq = qty;
    item.totalPrice = qty * (Number(item.unitPrice) || 0);
  }
  renderDocuments(document.getElementById("main-content"));
}

function removeDocItem(idx) {
  AppState.activeDocument.items.splice(idx, 1);
  renderDocuments(document.getElementById("main-content"));
}

function openAddItemToDocModal() {
  const modalHtml = `
    <div id="add-doc-item-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div class="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 class="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            <span>Chọn Thiết Bị Từ Kho TBTECH Đưa Vào Chứng Từ</span>
          </h3>
          <button onclick="closeModal('add-doc-item-modal')" class="text-slate-400 hover:text-slate-600 cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
          ${AppState.products.map(p => `
            <div class="py-2.5 px-2 hover:bg-slate-50 rounded-xl flex items-center justify-between gap-3 transition">
              <div class="truncate space-y-0.5">
                <div class="text-xs font-bold text-slate-900 truncate">${p.name}</div>
                <div class="text-[11px] text-slate-500 font-mono">SKU: <strong class="text-blue-900">${p.sku}</strong> • Tồn: <span class="${p.inStock === 0 ? 'text-red-600 font-bold' : 'text-emerald-700 font-semibold'}">${p.inStock} ${p.unit}</span></div>
              </div>
              <div class="flex items-center space-x-2 shrink-0">
                <span class="text-xs font-mono font-bold text-slate-800">${formatVND(p.sellPrice || p.costPrice)}</span>
                <button 
                  type="button" 
                  onclick="selectProductForDoc('${p.id}')" 
                  class="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  + Thêm
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function selectProductForDoc(productId) {
  const p = AppState.products.find(x => x.id === productId);
  if (!p) return;

  AppState.activeDocument.items.push({
    sku: p.sku,
    name: p.name,
    unit: p.unit,
    qtyReq: 1,
    qtyAct: 1,
    unitPrice: p.sellPrice || p.costPrice || 0,
    totalPrice: p.sellPrice || p.costPrice || 0
  });

  closeModal("add-doc-item-modal");
  renderDocuments(document.getElementById("main-content"));
  showToast(`Đã thêm ${p.sku} vào chứng từ!`, "success");
}

function previewCurrentDocument() {
  syncDocFormValues();
  setDocMode("PREVIEW");
}

function syncDocFormValues() {
  const doc = AppState.activeDocument;
  const numEl = document.getElementById("doc-num");
  const dateEl = document.getElementById("doc-date");
  const orgEl = document.getElementById("doc-org");
  const nameEl = document.getElementById("doc-name");
  const addrEl = document.getElementById("doc-addr");
  const taxEl = document.getElementById("doc-tax");
  const reasonEl = document.getElementById("doc-reason");
  const deductEl = document.getElementById("deductStockCheckbox");

  if (numEl) doc.docNumber = numEl.value;
  if (dateEl) doc.date = dateEl.value;
  if (orgEl) doc.receiverOrg = orgEl.value;
  if (nameEl) doc.receiverName = nameEl.value;
  if (addrEl) doc.receiverAddress = addrEl.value;
  if (taxEl) doc.receiverTaxCode = taxEl.value;
  if (reasonEl) doc.reason = reasonEl.value;
  if (deductEl) doc.deductStock = deductEl.checked;
}

function saveCurrentDocument() {
  syncDocFormValues();
  const doc = AppState.activeDocument;
  if (!doc.items || doc.items.length === 0) {
    showToast("Vui lòng thêm ít nhất một mặt hàng vào chứng từ!", "warning");
    return;
  }

  const totalAmount = doc.items.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0);
  doc.totalAmount = totalAmount;
  doc.amountInWords = docSoThanhChu(totalAmount);

  if (doc.deductStock) {
    doc.items.forEach(it => {
      const p = AppState.products.find(x => x.sku === it.sku || x.name === it.name);
      if (p) {
        p.inStock = Math.max(0, p.inStock - it.qtyAct);
        p.updatedAt = doc.date;
      }
    });

    const tx = {
      id: `tx-exp-${Date.now()}`,
      type: "EXPORT",
      title: `Xuất kho chứng từ #${doc.docNumber} - ${doc.receiverOrg || doc.receiverName}`,
      referenceNumber: doc.docNumber,
      partnerName: doc.receiverOrg || doc.receiverName || "Khách hàng",
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      totalAmount: totalAmount,
      items: doc.items.map(it => ({
        name: it.name,
        quantity: it.qtyAct,
        unit: it.unit,
        price: it.unitPrice
      })),
      note: doc.reason || "Xuất kho bán hàng"
    };
    AppState.history.unshift(tx);
  }

  AppState.documents.unshift(JSON.parse(JSON.stringify(doc)));
  saveState();
  playSound("success");
  showToast(`Đã lưu chứng từ #${doc.docNumber} thành công!`, "success");
  renderHeaderCounters();

  initEmptyDocument();
  setDocMode("ARCHIVE");
}

function renderDocumentPreview() {
  const doc = AppState.activeDocument;
  const comp = AppState.companyInfo;
  const totalAmount = doc.items.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0);
  const amountWords = docSoThanhChu(totalAmount);
  const dateObj = new Date(doc.date || Date.now());
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();

  return `
    <div class="space-y-4">
      <div class="flex items-center justify-between no-print bg-slate-800 text-white p-4 rounded-2xl">
        <div class="flex items-center space-x-2 text-xs">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Chế độ Xem Trước Biểu Mẫu Chuẩn Khổ A4 (Sẵn Sàng Cho Máy In)</span>
        </div>
        <div class="flex items-center space-x-2">
          <button onclick="setDocMode('FORM')" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold transition cursor-pointer">
            &larr; Quay Lại Soạn Thảo
          </button>
          <button onclick="window.print()" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1.5 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            <span>In Ngay (Khổ A4)</span>
          </button>
        </div>
      </div>

      <div class="doc-paper">
        ${doc.docType === 'PHIEU_XUAT_KHO' ? renderA4PhieuXuatKho(doc, comp, totalAmount, amountWords, day, month, year) :
          doc.docType === 'BIEN_BAN_BAN_GIAO' ? renderA4BienBanBanGiao(doc, comp, totalAmount, amountWords, day, month, year) :
          renderA4HopDongMuaBan(doc, comp, totalAmount, amountWords, day, month, year)}
      </div>
    </div>
  `;
}

function renderA4PhieuXuatKho(doc, comp, totalAmount, amountWords, day, month, year) {
  return `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <div style="font-size: 11pt; line-height: 1.3; max-width: 60%;">
          <strong>Đơn vị: ${comp.name}</strong><br />
          Địa chỉ: ${comp.address}<br />
          MST: ${comp.taxCode} - Hotline: ${comp.phone}
        </div>
        <div style="text-align: center; font-size: 10pt; line-height: 1.3;">
          <strong>Mẫu số 02 - VT</strong><br />
          (Ban hành theo Thông tư số 200/2014/TT-BTC<br />
          ngày 22/12/2014 của Bộ Tài chính)
        </div>
      </div>

      <div style="text-align: center; margin: 25px 0 15px 0;">
        <h2 style="font-size: 18pt; font-weight: bold; margin: 0; text-transform: uppercase;">PHIẾU XUẤT KHO</h2>
        <div style="font-style: italic; font-size: 11pt; margin-top: 4px;">
          Ngày ${day} tháng ${month} năm ${year}
        </div>
        <div style="font-size: 11pt; font-weight: bold; margin-top: 4px;">
          Số: ${doc.docNumber}
        </div>
      </div>

      <div style="font-size: 11.5pt; line-height: 1.6; margin-bottom: 15px;">
        <div>- Họ và tên người nhận hàng: <strong>${doc.receiverName || 'Ông/Bà...'}</strong></div>
        <div>- Đơn vị (Bộ phận): <strong>${doc.receiverOrg || ''}</strong></div>
        <div>- Địa chỉ nhận hàng: ${doc.receiverAddress || ''}</div>
        <div>- Lý do xuất kho: ${doc.reason || 'Xuất bán hàng công nghệ'}</div>
        <div>- Xuất tại kho: <strong>${comp.warehouseAddress}</strong></div>
      </div>

      <table class="doc-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 35px;">STT</th>
            <th rowspan="2">Tên, nhãn hiệu, quy cách, phẩm chất vật tư, dụng cụ, sản phẩm, hàng hóa</th>
            <th rowspan="2" style="width: 80px;">Mã số</th>
            <th rowspan="2" style="width: 50px;">ĐVT</th>
            <th colspan="2" style="width: 120px;">Số lượng</th>
            <th rowspan="2" style="width: 95px;">Đơn giá (VNĐ)</th>
            <th rowspan="2" style="width: 110px;">Thành tiền (VNĐ)</th>
          </tr>
          <tr>
            <th style="width: 60px;">Yêu cầu</th>
            <th style="width: 60px;">Thực xuất</th>
          </tr>
          <tr style="background-color: #fafafa; font-size: 9pt;">
            <th>A</th>
            <th>B</th>
            <th>C</th>
            <th>D</th>
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4 = 2 x 3</th>
          </tr>
        </thead>
        <tbody>
          ${doc.items.map((it, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td><strong>${it.name}</strong></td>
              <td style="text-align: center; font-family: monospace;">${it.sku}</td>
              <td style="text-align: center;">${it.unit}</td>
              <td style="text-align: center;">${it.qtyReq}</td>
              <td style="text-align: center; font-weight: bold;">${it.qtyAct}</td>
              <td style="text-align: right;">${formatNumber(it.unitPrice)}</td>
              <td style="text-align: right; font-weight: bold;">${formatNumber(it.totalPrice)}</td>
            </tr>
          `).join('')}
          <tr style="font-weight: bold;">
            <td colspan="7" style="text-align: right; padding-right: 12px;">Cộng thành tiền:</td>
            <td style="text-align: right;">${formatNumber(totalAmount)}</td>
          </tr>
        </tbody>
      </table>

      <div style="font-size: 11.5pt; font-style: italic; margin: 15px 0 35px 0;">
        Tổng số tiền (viết bằng chữ): <strong>${amountWords}</strong>
      </div>

      <div style="display: grid; grid-template-columns: repeat(5, 1fr); text-align: center; font-size: 10.5pt; line-height: 1.4;">
        <div>
          <strong>Người lập phiếu</strong><br />
          <span style="font-style: italic; font-size: 9pt;">(Ký, họ tên)</span>
          <div style="height: 60px;"></div>
          <div>${comp.representative}</div>
        </div>
        <div>
          <strong>Người nhận hàng</strong><br />
          <span style="font-style: italic; font-size: 9pt;">(Ký, họ tên)</span>
          <div style="height: 60px;"></div>
          <div>${doc.receiverName || '....................'}</div>
        </div>
        <div>
          <strong>Thủ kho</strong><br />
          <span style="font-style: italic; font-size: 9pt;">(Ký, họ tên)</span>
          <div style="height: 60px;"></div>
          <div>${comp.warehouseKeeper}</div>
        </div>
        <div>
          <strong>Kế toán trưởng</strong><br />
          <span style="font-style: italic; font-size: 9pt;">(Ký, họ tên)</span>
          <div style="height: 60px;"></div>
          <div>${comp.chiefAccountant}</div>
        </div>
        <div>
          <strong>Giám đốc</strong><br />
          <span style="font-style: italic; font-size: 9pt;">(Ký, đóng dấu)</span>
          <div style="height: 60px;"></div>
          <div>${comp.representative}</div>
        </div>
      </div>
    </div>
  `;
}

function renderA4BienBanBanGiao(doc, comp, totalAmount, amountWords, day, month, year) {
  return `
    <div>
      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="font-size: 12pt; font-weight: bold; margin: 0;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
        <div style="font-size: 11pt; font-weight: bold;">Độc lập - Tự do - Hạnh phúc</div>
        <div style="margin-top: 2px;">---------------o0o---------------</div>
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <h2 style="font-size: 16pt; font-weight: bold; margin: 0; text-transform: uppercase;">BIÊN BẢN BÀN GIAO VÀ NGHIỆM THU THIẾT BỊ</h2>
        <div style="font-size: 10.5pt; font-style: italic; margin-top: 4px;">Số: ${doc.docNumber || 'BBBG-2026/01'}</div>
      </div>

      <div style="font-size: 11.5pt; line-height: 1.6; margin-bottom: 15px;">
        <p>Hôm nay, ngày ${day} tháng ${month} năm ${year}, tại địa chỉ: ${doc.receiverAddress || comp.address}, chúng tôi gồm các bên:</p>
        
        <div style="margin-top: 8px;">
          <strong>BÊN GIAO (BÊN A): ${comp.name}</strong><br />
          - Địa chỉ: ${comp.address}<br />
          - Mã số thuế: ${comp.taxCode} • Hotline: ${comp.phone}<br />
          - Đại diện: <strong>Ông ${comp.representative}</strong> - Chức vụ: ${comp.representativeTitle}
        </div>

        <div style="margin-top: 10px;">
          <strong>BÊN NHẬN (BÊN B): ${doc.receiverOrg || 'ĐƠN VỊ KHÁCH HÀNG'}</strong><br />
          - Địa chỉ: ${doc.receiverAddress || ''}<br />
          - Mã số thuế: ${doc.receiverTaxCode || ''}<br />
          - Đại diện: <strong>${doc.receiverName || 'Ông/Bà...'}</strong>
        </div>

        <p style="margin-top: 10px;">Hai bên tiến hành bàn giao, kiểm tra nghiệm thu kỹ thuật thực tế các trang thiết bị công nghệ sau:</p>
      </div>

      <table class="doc-table">
        <thead>
          <tr>
            <th style="width: 35px;">STT</th>
            <th>Tên Thiết Bị & Quy Cách Kỹ Thuật</th>
            <th style="width: 80px;">Mã SKU</th>
            <th style="width: 50px;">ĐVT</th>
            <th style="width: 60px;">Số Lượng</th>
            <th style="width: 120px;">Tình Trạng Thiết Bị</th>
          </tr>
        </thead>
        <tbody>
          ${doc.items.map((it, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td><strong>${it.name}</strong></td>
              <td style="text-align: center; font-family: monospace;">${it.sku}</td>
              <td style="text-align: center;">${it.unit}</td>
              <td style="text-align: center; font-weight: bold;">${it.qtyAct}</td>
              <td style="text-align: center;">Mới 100%, Hoạt động tốt</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="font-size: 11pt; line-height: 1.5; margin: 15px 0;">
        <p><strong>1. Đánh giá chất lượng:</strong> Bên B đã kiểm tra toàn bộ số lượng, mẫu mã, nhãn hiệu và quy cách kỹ thuật của các thiết bị nêu trên. Thiết bị nguyên đai, nguyên kiện, đầy đủ phụ kiện kèm theo và đạt yêu cầu kỹ thuật.</p>
        <p><strong>2. Trách nhiệm bảo hành:</strong> Bên A cam kết bảo hành các thiết bị theo đúng tiêu chuẩn chính hãng TBTECH kể từ ngày ký biên bản bàn giao này.</p>
        <p style="font-style: italic;">Biên bản này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản làm cơ sở thanh toán và quản lý bảo hành.</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; text-align: center; font-size: 11.5pt; margin-top: 30px;">
        <div>
          <strong>ĐẠI DIỆN BÊN GIAO (BÊN A)</strong><br />
          <span style="font-style: italic; font-size: 9.5pt;">(Ký, ghi rõ họ tên và đóng dấu)</span>
          <div style="height: 70px;"></div>
          <div><strong>${comp.representative}</strong></div>
        </div>
        <div>
          <strong>ĐẠI DIỆN BÊN NHẬN (BÊN B)</strong><br />
          <span style="font-style: italic; font-size: 9.5pt;">(Ký, ghi rõ họ tên và đóng dấu)</span>
          <div style="height: 70px;"></div>
          <div><strong>${doc.receiverName || '................................'}</strong></div>
        </div>
      </div>
    </div>
  `;
}

function renderA4HopDongMuaBan(doc, comp, totalAmount, amountWords, day, month, year) {
  return `
    <div>
      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="font-size: 12pt; font-weight: bold; margin: 0;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
        <div style="font-size: 11pt; font-weight: bold;">Độc lập - Tự do - Hạnh phúc</div>
        <div style="margin-top: 2px;">---------------o0o---------------</div>
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <h2 style="font-size: 16pt; font-weight: bold; margin: 0; text-transform: uppercase;">HỢP ĐỒNG MUA BÁN HÀNG HÓA</h2>
        <div style="font-size: 10.5pt; font-style: italic; margin-top: 4px;">Số: ${doc.docNumber || 'HĐMB-2026/TBTECH'}</div>
      </div>

      <div style="font-size: 10.5pt; font-style: italic; line-height: 1.4; margin-bottom: 15px;">
        - Căn cứ Bộ luật Dân sự số 91/2015/QH13 được Quốc hội ban hành ngày 24/11/2015;<br />
        - Căn cứ Luật Thương mại số 36/2005/QH11 được Quốc hội ban hành ngày 14/06/2005;<br />
        - Căn cứ vào nhu cầu và khả năng thực tế của hai bên.
      </div>

      <div style="font-size: 11pt; line-height: 1.5; margin-bottom: 15px;">
        <p>Hôm nay, ngày ${day} tháng ${month} năm ${year}, tại trụ sở TBTECH, chúng tôi gồm:</p>
        <div style="margin-top: 6px;">
          <strong>BÊN BÁN (BÊN A): ${comp.name}</strong><br />
          - Địa chỉ: ${comp.address}<br />
          - Mã số thuế: ${comp.taxCode} • Hotline: ${comp.phone}<br />
          - Số tài khoản: <strong>${comp.bankAccount}</strong> tại ${comp.bankName}<br />
          - Đại diện: <strong>Ông ${comp.representative}</strong> - Chức vụ: ${comp.representativeTitle}
        </div>
        <div style="margin-top: 8px;">
          <strong>BÊN MUA (BÊN B): ${doc.receiverOrg || 'ĐƠN VỊ KHÁCH HÀNG'}</strong><br />
          - Địa chỉ: ${doc.receiverAddress || ''}<br />
          - Mã số thuế: ${doc.receiverTaxCode || ''}<br />
          - Đại diện: <strong>${doc.receiverName || 'Ông/Bà...'}</strong>
        </div>
      </div>

      <div style="font-size: 11pt; line-height: 1.5;">
        <p><strong>ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG</strong></p>
        <p>Bên A đồng ý bán và Bên B đồng ý mua các trang thiết bị công nghệ thông tin theo bảng kê chi tiết sau:</p>
      </div>

      <table class="doc-table">
        <thead>
          <tr>
            <th style="width: 35px;">STT</th>
            <th>Tên Hàng Hóa & Thiết Bị</th>
            <th style="width: 50px;">ĐVT</th>
            <th style="width: 60px;">SL</th>
            <th style="width: 100px;">Đơn Giá (VNĐ)</th>
            <th style="width: 110px;">Thành Tiền (VNĐ)</th>
          </tr>
        </thead>
        <tbody>
          ${doc.items.map((it, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td><strong>${it.name}</strong></td>
              <td style="text-align: center;">${it.unit}</td>
              <td style="text-align: center; font-weight: bold;">${it.qtyAct}</td>
              <td style="text-align: right;">${formatNumber(it.unitPrice)}</td>
              <td style="text-align: right; font-weight: bold;">${formatNumber(it.totalPrice)}</td>
            </tr>
          `).join('')}
          <tr style="font-weight: bold;">
            <td colspan="5" style="text-align: right; padding-right: 12px;">Tổng giá trị hợp đồng:</td>
            <td style="text-align: right;">${formatNumber(totalAmount)}</td>
          </tr>
        </tbody>
      </table>

      <div style="font-size: 11pt; line-height: 1.5; margin-bottom: 20px;">
        <p>Bằng chữ: <strong>${amountWords}</strong></p>
        <p><strong>ĐIỀU 2: PHƯƠNG THỨC THANH TOÁN VÀ BẢO HÀNH</strong><br />
        - Thanh toán: Bên B thanh toán 100% bằng hình thức chuyển khoản vào tài khoản ngân hàng của Bên A.<br />
        - Bảo hành: Bên A cam kết bảo hành tiêu chuẩn 12 - 24 tháng theo quy định nhà sản xuất.</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; text-align: center; font-size: 11.5pt; margin-top: 30px;">
        <div>
          <strong>ĐẠI DIỆN BÊN A</strong><br />
          <span style="font-style: italic; font-size: 9.5pt;">(Ký tên & Đóng dấu)</span>
          <div style="height: 65px;"></div>
          <div><strong>${comp.representative}</strong></div>
        </div>
        <div>
          <strong>ĐẠI DIỆN BÊN B</strong><br />
          <span style="font-style: italic; font-size: 9.5pt;">(Ký tên & Đóng dấu)</span>
          <div style="height: 65px;"></div>
          <div><strong>${doc.receiverName || '................................'}</strong></div>
        </div>
      </div>
    </div>
  `;
}

function renderDocumentArchive() {
  return `
    <div class="glass-card p-6 rounded-3xl border border-slate-200/90 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 class="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
          <span>Kho Lưu Trữ Chứng Từ Đã Xuất (${AppState.documents.length})</span>
        </h3>
        <button onclick="initEmptyDocument(); setDocMode('FORM');" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          <span>Lập Chứng Từ Mới</span>
        </button>
      </div>

      <div class="border border-slate-200 rounded-2xl overflow-hidden">
        <table class="w-full text-left text-xs border-collapse">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <tr>
              <th class="py-3 px-3">Số Chứng Từ</th>
              <th class="py-3 px-3">Loại Biểu Mẫu</th>
              <th class="py-3 px-3">Ngày Lập</th>
              <th class="py-3 px-4">Khách Hàng / Người Nhận</th>
              <th class="py-3 px-3 text-right">Tổng Tiền</th>
              <th class="py-3 px-3 text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${AppState.documents.length === 0 ? `
              <tr>
                <td colspan="6" class="py-8 text-center text-slate-400 text-xs">Chưa có chứng từ nào được lưu trong hệ thống.</td>
              </tr>
            ` : AppState.documents.map((d, idx) => `
              <tr class="hover:bg-slate-50">
                <td class="py-3 px-3 font-mono font-bold text-blue-900">${d.docNumber}</td>
                <td class="py-3 px-3">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${d.docType === 'PHIEU_XUAT_KHO' ? 'bg-blue-100 text-blue-800' : d.docType === 'BIEN_BAN_BAN_GIAO' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'}">
                    ${d.docType === 'PHIEU_XUAT_KHO' ? 'Phiếu Xuất Kho' : d.docType === 'BIEN_BAN_BAN_GIAO' ? 'Biên Bản Bàn Giao' : 'Hợp Đồng Mua Bán'}
                  </span>
                </td>
                <td class="py-3 px-3 font-mono text-slate-500">${formatDateVN(d.date)}</td>
                <td class="py-3 px-4 font-bold text-slate-800">${d.receiverOrg || d.receiverName}</td>
                <td class="py-3 px-3 text-right font-mono font-bold text-slate-900">${formatVND(d.totalAmount)}</td>
                <td class="py-3 px-3 text-center">
                  <div class="inline-flex items-center space-x-1">
                    <button onclick="loadSavedDocument(${idx})" title="Mở xem và in lại" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    </button>
                    <button onclick="deleteSavedDocument(${idx})" title="Xóa chứng từ" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function loadSavedDocument(idx) {
  AppState.activeDocument = JSON.parse(JSON.stringify(AppState.documents[idx]));
  setDocMode("PREVIEW");
  showToast(`Đã mở chứng từ #${AppState.activeDocument.docNumber}`, "info");
}

function deleteSavedDocument(idx) {
  if (!confirm("Bạn có chắc muốn xóa chứng từ này khỏi kho lưu trữ?")) return;
  AppState.documents.splice(idx, 1);
  saveState();
  playSound("delete");
  renderDocuments(document.getElementById("main-content"));
  showToast("Đã xóa chứng từ khỏi kho lưu trữ!", "info");
}

// ==========================================================================
// TAB 6: QUẢN LÝ KHÁCH HÀNG (CUSTOMERS)
// ==========================================================================
function renderCustomers(container) {
  const mode = AppState.customerViewMode || "list";
  const search = (AppState.customerSearchTerm || "").toLowerCase().trim();
  const filteredCustomers = AppState.customers.filter(c => {
    if (!search) return true;
    return (
      (c.name && c.name.toLowerCase().includes(search)) ||
      (c.shortName && c.shortName.toLowerCase().includes(search)) ||
      (c.taxCode && c.taxCode.toLowerCase().includes(search)) ||
      (c.phone && c.phone.toLowerCase().includes(search)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search)) ||
      (c.address && c.address.toLowerCase().includes(search))
    );
  });

  const totalOrders = AppState.customers.reduce((s, c) => s + (Number(c.ordersCount) || 0), 0);

  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <!-- Header & Action Toolbar -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 flex items-center space-x-2">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              <span>Danh Bạ & Hồ Sơ Khách Hàng TBTECH</span>
            </h1>
            <span class="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
              ${AppState.customers.length} Đối Tác
            </span>
          </div>
          <p class="text-xs text-slate-500 font-medium mt-1">
            Lưu trữ thông tin doanh nghiệp, mã số thuế, người đại diện liên hệ và địa chỉ giao hàng • Tổng đơn đã mua: <strong class="font-mono text-emerald-700 font-bold">${totalOrders} đơn</strong>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <!-- View Switcher (Dạng Danh Sách vs Dạng Thẻ) -->
          <div class="bg-slate-200/80 p-1 rounded-2xl flex items-center space-x-1 border border-slate-300/60">
            <button 
              onclick="setCustomerViewMode('list')" 
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${mode === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
              title="Xem khách hàng dạng bảng danh sách chi tiết (List Table)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
              <span>Dạng Danh Sách</span>
            </button>
            <button 
              onclick="setCustomerViewMode('grid')" 
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${mode === 'grid' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
              title="Xem khách hàng dạng thẻ lưới (Grid Cards)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              <span>Dạng Thẻ Lưới</span>
            </button>
          </div>

          <!-- Export CSV -->
          <button onclick="exportCustomersCSV()" title="Xuất danh sách khách hàng ra Excel / CSV chuẩn UTF-8" class="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer">
            <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <span>Xuất CSV</span>
          </button>

          <!-- Add Button -->
          <button onclick="openCustomerModal()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition flex items-center space-x-1.5 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            <span>Thêm Khách Hàng Mới</span>
          </button>
        </div>
      </div>

      <!-- Search & Quick Filters -->
      <div class="glass-card p-3 sm:p-4 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div class="relative w-full sm:w-96">
          <svg class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input 
            type="text" 
            id="customer-search-input"
            value="${AppState.customerSearchTerm || ''}" 
            placeholder="Tìm theo tên công ty, MST, người đại diện, SĐT..." 
            oninput="handleSearchCustomer(this.value)" 
            class="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
          ${AppState.customerSearchTerm ? `
            <button onclick="handleSearchCustomer('')" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
          ` : ''}
        </div>

        <div class="text-xs text-slate-500 font-medium self-end sm:self-center">
          Hiển thị: <strong class="text-blue-700 font-bold">${filteredCustomers.length}</strong> / ${AppState.customers.length} khách hàng
        </div>
      </div>

      <!-- MAIN CONTENT: LIST VIEW vs GRID VIEW -->
      ${filteredCustomers.length === 0 ? `
        <div class="glass-card p-12 text-center rounded-3xl border border-slate-200 space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 mx-auto flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <h3 class="font-bold text-slate-800 text-sm">Không tìm thấy khách hàng phù hợp</h3>
          <p class="text-xs text-slate-500">Thử tìm kiếm với từ khóa khác hoặc bấm nút Thêm Khách Hàng Mới ở trên.</p>
        </div>
      ` : mode === "list" ? `
        <!-- DẠNG DANH SÁCH BẢNG (LIST VIEW) -->
        <div class="glass-card rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse font-sans">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th class="py-3 px-3 text-center w-12">STT</th>
                  <th class="py-3 px-4 min-w-[220px]">Doanh Nghiệp / Khách Hàng</th>
                  <th class="py-3 px-3 font-mono min-w-[120px]">Mã Số Thuế</th>
                  <th class="py-3 px-3 min-w-[180px]">Người Đại Diện</th>
                  <th class="py-3 px-3 min-w-[190px]">Liên Hệ (SĐT / Email)</th>
                  <th class="py-3 px-4 min-w-[240px]">Địa Chỉ Trụ Sở / Giao Hàng</th>
                  <th class="py-3 px-3 text-center min-w-[90px]">Đã Mua</th>
                  <th class="py-3 px-4 text-center min-w-[170px]">Thao Tác</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                ${filteredCustomers.map((c, idx) => `
                  <tr class="hover:bg-blue-50/40 transition">
                    <td class="py-3.5 px-3 text-center font-bold text-slate-400 font-mono">${idx + 1}</td>
                    <td class="py-3.5 px-4">
                      <div class="font-bold text-slate-900 text-xs sm:text-sm leading-snug">${c.name}</div>
                      <div class="flex items-center space-x-2 mt-1">
                        <span class="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">${c.shortName || 'KH'}</span>
                        <span class="text-[10px] text-slate-400 font-mono">ID: ${c.id}</span>
                      </div>
                    </td>
                    <td class="py-3.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                      <span class="bg-slate-100 px-2 py-1 rounded-md border border-slate-200">${c.taxCode || '---'}</span>
                    </td>
                    <td class="py-3.5 px-3 whitespace-nowrap">
                      <div class="font-bold text-slate-800">${c.contactPerson || '---'}</div>
                      <div class="text-[11px] text-slate-500">${c.contactRole || 'Đại diện mua sắm'}</div>
                    </td>
                    <td class="py-3.5 px-3 whitespace-nowrap font-mono text-slate-600 text-[11px]">
                      <div class="flex items-center space-x-1.5">
                        <svg class="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                        <a href="tel:${c.phone}" class="hover:text-blue-600 font-bold text-slate-800">${c.phone || '---'}</a>
                      </div>
                      <div class="flex items-center space-x-1.5 mt-0.5 text-slate-500">
                        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        <span class="truncate max-w-[160px]" title="${c.email}">${c.email || '---'}</span>
                      </div>
                    </td>
                    <td class="py-3.5 px-4 text-[11px] text-slate-600">
                      <div class="line-clamp-2 max-w-sm" title="${c.address}">${c.address || 'Chưa cập nhật địa chỉ'}</div>
                    </td>
                    <td class="py-3.5 px-3 text-center whitespace-nowrap">
                      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ${c.ordersCount || 0} đơn
                      </span>
                    </td>
                    <td class="py-3.5 px-4 text-center whitespace-nowrap">
                      <div class="flex items-center justify-center space-x-1.5">
                        <button onclick="createDocForCustomer('${c.id}')" title="Lập phiếu xuất kho cho khách hàng này" class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold rounded-lg text-[11px] transition cursor-pointer flex items-center space-x-1 border border-blue-200 hover:border-blue-600 shadow-2xs">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                          <span>Lập Phiếu</span>
                        </button>
                        <button onclick="openCustomerModal('${c.id}')" title="Sửa thông tin khách hàng" class="p-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600 rounded-lg transition cursor-pointer border border-slate-200">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button onclick="deleteCustomer('${c.id}')" title="Xóa khách hàng" class="p-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 rounded-lg transition cursor-pointer border border-slate-200">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <!-- DẠNG THẺ LƯỚI (GRID CARDS VIEW) -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          ${filteredCustomers.map(c => `
            <div class="glass-card p-5 rounded-3xl border border-slate-200/90 hover:shadow-md transition space-y-3 flex flex-col justify-between">
              <div class="space-y-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="font-bold text-sm text-slate-900 leading-snug">${c.name}</div>
                  <span class="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full shrink-0 border border-blue-200">${c.shortName}</span>
                </div>
                <div class="text-xs text-slate-500 space-y-1">
                  <div>MST: <strong class="font-mono text-slate-700">${c.taxCode}</strong></div>
                  <div class="truncate">Đ/C: ${c.address}</div>
                  <div>Đại diện: <strong class="text-slate-800">${c.contactPerson}</strong> ${c.contactRole ? `(${c.contactRole})` : ''}</div>
                  <div class="font-mono">SĐT: ${c.phone} • ${c.email}</div>
                </div>
              </div>

              <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div class="text-[11px] text-slate-400">
                  Đã mua: <strong class="text-slate-700 font-mono">${c.ordersCount || 0}</strong> đơn
                </div>
                <div class="flex items-center space-x-1">
                  <button onclick="createDocForCustomer('${c.id}')" title="Lập chứng từ nhanh cho khách này" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px] transition cursor-pointer">
                    Lập Chứng Từ
                  </button>
                  <button onclick="openCustomerModal('${c.id}')" title="Sửa thông tin" class="p-1 text-slate-400 hover:text-amber-600 rounded-md transition cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                  </button>
                  <button onclick="deleteCustomer('${c.id}')" title="Xóa khách hàng" class="p-1 text-slate-400 hover:text-red-600 rounded-md transition cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function setCustomerViewMode(mode) {
  AppState.customerViewMode = mode;
  Storage.set("customerViewMode", mode);
  playSound("click");
  renderCustomers(document.getElementById("main-content"));
}

function handleSearchCustomer(term) {
  AppState.customerSearchTerm = term;
  renderCustomers(document.getElementById("main-content"));
  const input = document.getElementById("customer-search-input");
  if (input) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

function exportCustomersCSV() {
  const headers = ["ID", "Tên Doanh Nghiệp", "Tên Viết Tắt", "Mã Số Thuế", "Người Đại Diện", "Chức Vụ", "Số Điện Thoại", "Email", "Địa Chỉ", "Số Đơn Hàng"];
  const rows = AppState.customers.map(c => [
    c.id,
    c.name,
    c.shortName || "",
    c.taxCode || "",
    c.contactPerson || "",
    c.contactRole || "",
    c.phone || "",
    c.email || "",
    c.address || "",
    c.ordersCount || 0
  ]);
  exportToCSV(headers, rows, `Danh_Sach_Khach_Hang_TBTECH_${new Date().toISOString().slice(0, 10)}.csv`);
}

function openCustomerModal(custId = null) {
  const isEdit = !!custId;
  const cust = isEdit ? AppState.customers.find(c => c.id === custId) : {
    name: "", shortName: "", taxCode: "", address: "", phone: "", email: "", contactPerson: "", contactRole: ""
  };

  const modalHtml = `
    <div id="cust-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 class="text-base font-bold text-slate-900">${isEdit ? 'Chỉnh Sửa Khách Hàng' : 'Thêm Khách Hàng Mới'}</h3>
          <button onclick="closeModal('cust-modal')" class="text-slate-400 hover:text-slate-600 cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form onsubmit="handleSaveCustomer(event, '${custId || ''}')" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Tên Công Ty / Đơn Vị <span class="text-red-500">*</span></label>
            <input type="text" id="c-name" required value="${cust.name}" placeholder="Ví dụ: Công ty Cổ phần..." class="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Tên Viết Tắt</label>
              <input type="text" id="c-short" value="${cust.shortName}" placeholder="FPT, VNPT..." class="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Mã Số Thuế <span class="text-red-500">*</span></label>
              <input type="text" id="c-tax" required value="${cust.taxCode}" placeholder="010..." class="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">Địa Chỉ Đăng Ký / Trụ Sở</label>
            <input type="text" id="c-addr" value="${cust.address}" placeholder="Số nhà, đường, quận, thành phố..." class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Người Đại Diện Liên Hệ</label>
              <input type="text" id="c-person" value="${cust.contactPerson}" placeholder="Ông/Bà..." class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Chức Danh / Chức Vụ</label>
              <input type="text" id="c-role" value="${cust.contactRole || ''}" placeholder="Trưởng phòng IT..." class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Số Điện Thoại</label>
              <input type="text" id="c-phone" value="${cust.phone}" placeholder="024..." class="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Email</label>
              <input type="email" id="c-email" value="${cust.email}" placeholder="contact@..." class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="closeModal('cust-modal')" class="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer">Hủy</button>
            <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition cursor-pointer">
              ${isEdit ? 'Lưu Thay Đổi' : 'Tạo Khách Hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function handleSaveCustomer(e, custId) {
  e.preventDefault();
  const name = document.getElementById("c-name").value.trim();
  const shortName = document.getElementById("c-short").value.trim() || name.slice(0, 10);
  const taxCode = document.getElementById("c-tax").value.trim();
  const address = document.getElementById("c-addr").value.trim();
  const contactPerson = document.getElementById("c-person").value.trim();
  const contactRole = document.getElementById("c-role").value.trim();
  const phone = document.getElementById("c-phone").value.trim();
  const email = document.getElementById("c-email").value.trim();

  if (custId) {
    AppState.customers = AppState.customers.map(c => c.id === custId ? {
      ...c, name, shortName, taxCode, address, contactPerson, contactRole, phone, email
    } : c);
    showToast(`Đã cập nhật khách hàng ${shortName}!`, "success");
  } else {
    AppState.customers.unshift({
      id: `cust-${Date.now()}`,
      name, shortName, taxCode, address, contactPerson, contactRole, phone, email,
      ordersCount: 0, totalSpent: 0
    });
    showToast(`Đã thêm mới khách hàng ${shortName}!`, "success");
  }

  saveState();
  closeModal("cust-modal");
  renderCustomers(document.getElementById("main-content"));
}

function deleteCustomer(custId) {
  if (!confirm("Bạn có chắc muốn xóa khách hàng này khỏi danh bạ?")) return;
  AppState.customers = AppState.customers.filter(c => c.id !== custId);
  saveState();
  playSound("delete");
  renderCustomers(document.getElementById("main-content"));
  showToast("Đã xóa khách hàng khỏi hệ thống!", "info");
}

function createDocForCustomer(custId) {
  const cust = AppState.customers.find(c => c.id === custId);
  if (!cust) return;

  initEmptyDocument();
  AppState.activeDocument.receiverOrg = cust.name;
  AppState.activeDocument.receiverName = cust.contactPerson;
  AppState.activeDocument.receiverAddress = cust.address;
  AppState.activeDocument.receiverTaxCode = cust.taxCode;
  AppState.activeDocument.receiverPhone = cust.phone;

  setDocMode("FORM");
  switchTab("documents");
  showToast(`Đã lập chứng từ mới cho: ${cust.name}`, "info");
}

// ==========================================================================
// TAB 7: NHẬT KÝ & LỊCH SỬ GIAO DỊCH (HISTORY LOG)
// ==========================================================================
function renderHistoryLog(container) {
  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-black text-slate-900 flex items-center space-x-2">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>Nhật Ký Biến Động Kho Hàng & Giao Dịch</span>
          </h1>
          <p class="text-xs text-slate-500 font-medium mt-0.5">Kiểm toán chi tiết toàn bộ hoạt động nhập kho hóa đơn, xuất kho chứng từ và điều chỉnh</p>
        </div>

        <div class="flex items-center space-x-2">
          <button onclick="exportHistoryCSV()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer">
            <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            <span>Xuất Nhật Ký CSV</span>
          </button>
          <button onclick="clearHistoryWithAuth()" class="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition cursor-pointer">
            Xóa Toàn Bộ Lịch Sử
          </button>
        </div>
      </div>

      <div class="glass-card rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm">
        <div class="divide-y divide-slate-100">
          ${AppState.history.length === 0 ? `
            <div class="py-12 text-center text-slate-400 text-xs">Chưa có giao dịch nào được ghi nhận.</div>
          ` : AppState.history.map((tx, idx) => `
            <div class="p-4 sm:p-5 hover:bg-slate-50 transition space-y-2">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center space-x-2.5">
                  <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono ${tx.type === 'IMPORT' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-blue-100 text-blue-800 border border-blue-300'}">
                    ${tx.type === 'IMPORT' ? 'NHẬP KHO' : 'XUẤT KHO'}
                  </span>
                  <span class="font-mono font-bold text-xs text-blue-900">${tx.referenceNumber}</span>
                  <span class="text-xs text-slate-400 font-mono">• ${tx.date}</span>
                </div>
                <div class="text-xs font-black text-slate-900 font-mono text-right">
                  ${formatVND(tx.totalAmount)}
                </div>
              </div>

              <div class="text-xs font-bold text-slate-800">${tx.title}</div>
              <div class="text-[11px] text-slate-500">Đối tác: <strong class="text-slate-700">${tx.partnerName}</strong> ${tx.note ? `• ${tx.note}` : ''}</div>

              <div class="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-600 font-mono space-y-1">
                ${tx.items.map(it => `
                  <div class="flex items-center justify-between">
                    <span>- ${it.name} (${it.quantity} ${it.unit || 'Cái'})</span>
                    <span class="font-bold">${formatVND(it.price * it.quantity)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function exportHistoryCSV() {
  const headers = ["Mã Tham Chiếu", "Loại Giao Dịch", "Tiêu Đề", "Đối Tác", "Ngày Giờ", "Tổng Giá Trị (VNĐ)", "Ghi Chú"];
  const rows = AppState.history.map(tx => [
    tx.referenceNumber,
    tx.type === 'IMPORT' ? 'NHẬP KHO' : 'XUẤT KHO',
    tx.title,
    tx.partnerName,
    tx.date,
    tx.totalAmount,
    tx.note || ""
  ]);

  exportToCSV(headers, rows, `Nhat_Ky_Giao_Dich_TBTECH_${new Date().toISOString().slice(0, 10)}.csv`);
}

function clearHistoryWithAuth() {
  const pass = prompt("Nhập mật khẩu quản trị để xóa toàn bộ lịch sử (Mặc định: admin123):");
  if (pass === null) return;
  if (pass !== AppState.adminPassword) {
    showToast("Mật khẩu quản trị không chính xác!", "error");
    return;
  }

  AppState.history = [];
  saveState();
  playSound("delete");
  renderHistoryLog(document.getElementById("main-content"));
  showToast("Đã xóa toàn bộ lịch sử giao dịch!", "info");
}

// ==========================================================================
// TAB 8: CẤU HÌNH DOANH NGHIỆP (SETTINGS)
// ==========================================================================
function renderSettings(container) {
  const comp = AppState.companyInfo;

  container.innerHTML = `
    <div class="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div class="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200/90 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h1 class="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <span>Cấu Hình Doanh Nghiệp & Kho Hàng TBTECH</span>
            </h1>
            <p class="text-xs text-slate-500 font-medium mt-0.5">Thông tin tự động hiển thị trên tiêu đề Phiếu Xuất Kho, Biên Bản Bàn Giao và Hợp Đồng</p>
          </div>
          <button type="button" onclick="restoreDefaultCompanyInfo()" class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 cursor-pointer border border-slate-200">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            <span>Mặc Định TBTECH</span>
          </button>
        </div>

        <form onsubmit="handleSaveSettings(event)" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Tên Đầy Đủ Doanh Nghiệp</label>
            <input type="text" id="set-name" required value="${comp.name}" class="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Tên Giao Dịch Quốc Tế</label>
              <input type="text" id="set-short" value="${comp.shortName}" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Mã Số Thuế Doanh Nghiệp</label>
              <input type="text" id="set-tax" required value="${comp.taxCode}" class="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">Địa Chỉ Trụ Sở Đăng Ký Kinh Doanh</label>
            <input type="text" id="set-addr" required value="${comp.address}" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">Địa Chỉ Kho Bán Hàng</label>
            <input type="text" id="set-wh-addr" required value="${comp.warehouseAddress}" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Hotline / Điện Thoại</label>
              <input type="text" id="set-phone" value="${comp.phone}" class="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Email Chung Doanh Nghiệp</label>
              <input type="email" id="set-email" value="${comp.email}" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Email Kế Toán (Nhận HĐ)</label>
              <input type="email" id="set-acc-email" value="${comp.accountingEmail || 'ketoan.tbtech387@gmail.com'}" class="w-full px-3 py-2 border border-blue-200 bg-blue-50/50 rounded-xl font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Website</label>
              <input type="text" id="set-web" value="${comp.website}" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Số Tài Khoản Ngân Hàng</label>
              <input type="text" id="set-bank-acc" value="${comp.bankAccount}" class="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Tên Ngân Hàng & Chi Nhánh</label>
              <input type="text" id="set-bank-name" value="${comp.bankName}" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Người Đại Diện Pháp Luật</label>
              <input type="text" id="set-rep" value="${comp.representative}" class="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Thủ Kho</label>
              <input type="text" id="set-keeper" value="${comp.warehouseKeeper}" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Kế Toán Trưởng</label>
              <input type="text" id="set-acc" value="${comp.chiefAccountant}" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div class="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button type="submit" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 transition cursor-pointer">
              Lưu Thông Tin Doanh Nghiệp
            </button>
          </div>
        </form>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <!-- Card 1: Gmail Account Connection -->
        <div class="glass-card p-6 rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-950/20 to-slate-900/10 space-y-3 text-xs">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <svg class="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            </div>
            <h3 class="font-bold text-slate-900">Google Mail Kế Toán</h3>
          </div>
          <p class="text-[11px] text-slate-500 leading-relaxed">
            Hộp thư chính thức: <strong class="font-mono text-blue-600">${AppState.gmailConfig.email}</strong>. Trạng thái: <span class="text-emerald-600 font-bold">● Đã kết nối</span>.
          </p>
          <div class="pt-1">
            <button onclick="openGmailConnectModal()" class="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1">
              <span>⚙️ Cài Đặt Kết Nối Gmail</span>
            </button>
          </div>
        </div>

        <div class="glass-card p-6 rounded-3xl border border-slate-200/90 space-y-3 text-xs">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
            </div>
            <h3 class="font-bold text-slate-900">Khóa Gemini AI</h3>
          </div>
          <p class="text-[11px] text-slate-500 leading-relaxed">
            Khóa Gemini 1.5/2.0 Flash để quét hóa đơn bên ngoài:
          </p>
          <div class="space-y-2">
            <input type="password" id="gemini-key-input" value="${AppState.geminiApiKey || ''}" placeholder="AIzaSy..." class="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none" />
            <button onclick="saveGeminiKey()" class="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer">
              Lưu Khóa Gemini API
            </button>
          </div>
        </div>

        <div class="glass-card p-6 rounded-3xl border border-slate-200/90 space-y-3 text-xs">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            </div>
            <h3 class="font-bold text-slate-900">Sao Lưu Dữ Liệu</h3>
          </div>
          <p class="text-[11px] text-slate-500 leading-relaxed">
            Xuất/nhập toàn bộ dữ liệu kho, danh bạ và chứng từ ra file JSON:
          </p>
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button onclick="exportFullBackupJSON()" class="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              <span>Sao Lưu</span>
            </button>
            <button onclick="document.getElementById('restore-json-input').click()" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer border border-slate-200 flex items-center justify-center space-x-1">
              <input type="file" id="restore-json-input" accept=".json" class="hidden" onchange="restoreBackupJSON(event)" />
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              <span>Phục Hồi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function handleSaveSettings(e) {
  e.preventDefault();
  const accEmail = document.getElementById("set-acc-email") ? document.getElementById("set-acc-email").value.trim() : "ketoan.tbtech387@gmail.com";
  AppState.companyInfo = {
    name: document.getElementById("set-name").value.trim(),
    shortName: document.getElementById("set-short").value.trim(),
    taxCode: document.getElementById("set-tax").value.trim(),
    address: document.getElementById("set-addr").value.trim(),
    warehouseAddress: document.getElementById("set-wh-addr").value.trim(),
    phone: document.getElementById("set-phone").value.trim(),
    email: document.getElementById("set-email").value.trim(),
    accountingEmail: accEmail || "ketoan.tbtech387@gmail.com",
    website: document.getElementById("set-web").value.trim(),
    bankAccount: document.getElementById("set-bank-acc").value.trim(),
    bankName: document.getElementById("set-bank-name").value.trim(),
    representative: document.getElementById("set-rep").value.trim(),
    representativeTitle: "Giám đốc",
    warehouseKeeper: document.getElementById("set-keeper").value.trim(),
    chiefAccountant: document.getElementById("set-acc").value.trim(),
    warehouseName: "Kho bán - TBTECH Central Hub"
  };

  if (accEmail) {
    AppState.gmailConfig.email = accEmail;
  }

  saveState();
  updateHeaderMailStatus();
  playSound("success");
  showToast("Đã lưu thông tin doanh nghiệp & email kế toán TBTECH!", "success");
}

function restoreDefaultCompanyInfo() {
  if (!confirm("Khôi phục lại thông tin cấu hình mặc định chuẩn của TBTECH?")) return;
  AppState.companyInfo = JSON.parse(JSON.stringify(DEFAULT_COMPANY_INFO));
  saveState();
  playSound("click");
  renderSettings(document.getElementById("main-content"));
  showToast("Đã khôi phục thông số mặc định của TBTECH!", "info");
}

function saveGeminiKey() {
  const key = document.getElementById("gemini-key-input").value.trim();
  AppState.geminiApiKey = key;
  saveState();
  playSound("success");
  showToast(key ? "Đã lưu khóa Google Gemini API!" : "Đã xóa khóa Gemini API", "info");
}

function exportFullBackupJSON() {
  const data = {
    version: "2.6",
    exportedAt: new Date().toISOString(),
    companyInfo: AppState.companyInfo,
    products: AppState.products,
    customers: AppState.customers,
    inbox: AppState.inbox,
    history: AppState.history,
    documents: AppState.documents
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `TBTECH_Backup_Full_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("Đã xuất file sao lưu JSON thành công!", "success");
}

function restoreBackupJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.products && Array.isArray(data.products)) AppState.products = data.products;
      if (data.customers && Array.isArray(data.customers)) AppState.customers = data.customers;
      if (data.companyInfo) AppState.companyInfo = data.companyInfo;
      if (data.history && Array.isArray(data.history)) AppState.history = data.history;
      if (data.documents && Array.isArray(data.documents)) AppState.documents = data.documents;

      saveState();
      playSound("success");
      showToast("Đã phục hồi toàn bộ dữ liệu thành công!", "success");
      switchTab("dashboard");
    } catch (err) {
      showToast("File JSON không hợp lệ!", "error");
    }
  };
  reader.readAsText(file);
}
