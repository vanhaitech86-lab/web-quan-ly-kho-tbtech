/**
 * TBTECH VWM - UTILITY FUNCTIONS
 * Định dạng tiền tệ, đọc số thành chữ tiếng Việt, âm thanh Web Audio, Toast & CSV
 */

// Format tiền tệ VNĐ
function formatVND(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND"
  }).format(amount);
}

// Format số lượng thông thường
function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) return "0";
  return new Intl.NumberFormat("vi-VN").format(num);
}

// Format ngày tháng Việt Nam
function formatDateVN(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
}

// Format ngày giờ Việt Nam
function formatDateTimeVN(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
}

// ==========================================================================
// CHUYỂN ĐỔI SỐ THÀNH CHỮ TIẾNG VIỆT CHUẨN XÁC THEO QUY ĐỊNH KẾ TOÁN
// ==========================================================================
function docSoThanhChu(so) {
  if (so === 0) return "Không đồng chẵn";
  if (!so || isNaN(so)) return "";

  so = Math.round(Math.abs(so));
  const chuSo = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const tien = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"];

  function docBlock(so3) {
    let tram = Math.floor(so3 / 100);
    let chuc = Math.floor((so3 % 100) / 10);
    let donvi = so3 % 10;
    let ketqua = "";

    if (tram > 0 || chuc > 0 || donvi > 0) {
      ketqua += chuSo[tram] + " trăm ";
    }
    if (chuc > 1) {
      ketqua += chuSo[chuc] + " mươi ";
      if (donvi === 1) ketqua += "mốt ";
      else if (donvi === 5) ketqua += "lăm ";
      else if (donvi > 0) ketqua += chuSo[donvi] + " ";
    } else if (chuc === 1) {
      ketqua += "mười ";
      if (donvi === 5) ketqua += "lăm ";
      else if (donvi > 0) ketqua += chuSo[donvi] + " ";
    } else if (tram > 0 && donvi > 0) {
      ketqua += "lẻ " + chuSo[donvi] + " ";
    } else if (donvi > 0) {
      ketqua += chuSo[donvi] + " ";
    }
    return ketqua;
  }

  let strSo = so.toString();
  let blocks = [];
  while (strSo.length > 0) {
    blocks.push(parseInt(strSo.slice(-3), 10));
    strSo = strSo.slice(0, -3);
  }

  let chu = "";
  for (let i = blocks.length - 1; i >= 0; i--) {
    let block = blocks[i];
    if (block > 0) {
      chu += docBlock(block) + tien[i] + " ";
    }
  }

  chu = chu.trim();
  chu = chu.charAt(0).toUpperCase() + chu.slice(1);
  return chu + " đồng chẵn";
}

// ==========================================================================
// TẠO ÂM THANH TINH TẾ (WEB AUDIO API)
// ==========================================================================
let audioEnabled = true;

function toggleAudio() {
  audioEnabled = !audioEnabled;
  showToast(audioEnabled ? "Đã bật hiệu ứng âm thanh" : "Đã tắt âm thanh", "info");
  return audioEnabled;
}

function playSound(type) {
  if (!audioEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      // Harmonic chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "click") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === "warn") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.setValueAtTime(280, now + 0.1);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === "delete") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  } catch (e) {
    // Silent fail if AudioContext is blocked by browser policy
  }
}

// ==========================================================================
// THÔNG BÁO TOAST HIỆN ĐẠI
// ==========================================================================
function showToast(message, type = "info", duration = 3500) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let iconSvg = "";
  if (type === "success") {
    iconSvg = `<svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
    playSound("success");
  } else if (type === "warning") {
    iconSvg = `<svg class="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
    playSound("warn");
  } else if (type === "error") {
    iconSvg = `<svg class="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
    playSound("warn");
  } else {
    iconSvg = `<svg class="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    playSound("click");
  }

  toast.innerHTML = `
    ${iconSvg}
    <div class="flex-1 font-medium text-slate-800 text-xs sm:text-sm leading-tight">${message}</div>
    <button type="button" class="text-slate-400 hover:text-slate-600 transition" onclick="this.parentElement.remove()">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ==========================================================================
// XUẤT CSV CHUẨN UTF-8 KÈM BOM ĐỂ EXCEL KHÔNG BỊ LỖI FONT TIẾNG VIỆT
// ==========================================================================
function exportToCSV(headers, rows, filename) {
  const csvRows = [headers.join(",")];

  for (const row of rows) {
    const escapedRow = row.map(val => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    });
    csvRows.push(escapedRow.join(","));
  }

  const csvContent = "\uFEFF" + csvRows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename || `Bao_Cao_TBTECH_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Đã xuất file báo cáo CSV thành công!", "success");
}

// ==========================================================================
// QUẢN LÝ LOCALSTORAGE AN TOÀN
// ==========================================================================
const Storage = {
  get(key, defaultValue) {
    try {
      const data = localStorage.getItem(`tbtech_${key}`);
      if (!data) return defaultValue;
      const parsed = JSON.parse(data);
      if (Array.isArray(defaultValue) && (!Array.isArray(parsed) || parsed.length === 0)) {
        return defaultValue;
      }
      return parsed;
    } catch (e) {
      console.warn("Storage.get error:", e);
      return defaultValue;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`tbtech_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn("Storage.set error:", e);
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(`tbtech_${key}`);
    } catch (e) {}
  },
  clearAll() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("tbtech_")) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      console.log("Storage: Đã làm sạch toàn bộ dữ liệu tbtech_ trong bộ đệm trình duyệt!");
    } catch (e) {
      console.warn("Storage.clearAll error:", e);
    }
  }
};

// ==========================================================================
// THUẬT TOÁN ĐỐI SOÁT & PHÁT HIỆN LỆCH TÊN THIẾT BỊ (FUZZY STRING MATCHING)
// ==========================================================================

// Xóa dấu tiếng Việt & chuẩn hóa ký tự phục vụ so sánh
function removeVietnameseTones(str) {
  if (!str) return "";
  str = String(str).toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/[\u0300-\u036f]/g, "");
  str = str.replace(/[^a-z0-9\s]/g, " ");
  return str.replace(/\s+/g, " ").trim();
}

// Tính khoảng cách Levenshtein giữa 2 chuỗi
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const d = [];

  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[m][n];
}

// Tính độ tương đồng giữa 2 tên mặt hàng (Trả về 0% - 100%)
function calculateStringSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  if (name1.trim().toLowerCase() === name2.trim().toLowerCase()) return 100;

  const clean1 = removeVietnameseTones(name1);
  const clean2 = removeVietnameseTones(name2);
  if (clean1 === clean2) return 98;

  // 1. Levenshtein ratio
  const maxLen = Math.max(clean1.length, clean2.length);
  const levDist = levenshteinDistance(clean1, clean2);
  const levScore = maxLen > 0 ? (1 - levDist / maxLen) * 100 : 0;

  // 2. Token Jaccard Overlap
  const tokens1 = new Set(clean1.split(" ").filter(w => w.length > 1));
  const tokens2 = new Set(clean2.split(" ").filter(w => w.length > 1));
  if (tokens1.size === 0 || tokens2.size === 0) return Math.round(levScore);

  let intersection = 0;
  tokens1.forEach(t => {
    if (tokens2.has(t)) intersection++;
  });
  const union = new Set([...tokens1, ...tokens2]).size;
  const jaccardScore = (intersection / union) * 100;

  // Weighted combination: 65% Token matching + 35% Levenshtein
  const finalScore = Math.round(jaccardScore * 0.65 + levScore * 0.35);
  return Math.min(100, Math.max(0, finalScore));
}

// Highlight các từ khác biệt giữa 2 chuỗi để cảnh báo trực quan
function highlightDifferences(sourceName, targetName) {
  if (!sourceName) return "";
  if (!targetName) return `<span class="bg-rose-100 text-rose-800 px-1 py-0.5 rounded font-semibold">${sourceName}</span>`;

  const targetTokens = new Set(removeVietnameseTones(targetName).split(" ").filter(Boolean));
  const sourceWords = sourceName.split(/\s+/);

  return sourceWords.map(word => {
    const cleanWord = removeVietnameseTones(word);
    if (cleanWord.length <= 1) return word;
    if (targetTokens.has(cleanWord)) {
      return `<span class="text-slate-800 font-medium">${word}</span>`;
    } else {
      return `<span class="bg-amber-100 text-amber-950 font-bold px-1 py-0.5 rounded border border-amber-300" title="Từ này khác với tên đối chiếu">${word}</span>`;
    }
  }).join(" ");
}

// Tìm kiếm sản phẩm tương đồng nhất trong danh mục kho TBTECH
function findBestMatchingProduct(rawName, products, aliases = []) {
  if (!rawName || !products || products.length === 0) {
    return { product: null, score: 0, reason: "Không có dữ liệu kho" };
  }

  const cleanRaw = removeVietnameseTones(rawName);

  // 1. Check alias mapping first
  if (aliases && aliases.length > 0) {
    const aliasFound = aliases.find(a => cleanRaw.includes(removeVietnameseTones(a.raw)) || removeVietnameseTones(a.raw).includes(cleanRaw));
    if (aliasFound) {
      const p = products.find(prod => prod.sku === aliasFound.sku);
      if (p) return { product: p, score: 99, reason: `Khớp theo Alias: "${aliasFound.raw}"` };
    }
  }

  // 2. Check exact SKU presence inside rawName
  for (const p of products) {
    const cleanSku = removeVietnameseTones(p.sku);
    if (cleanRaw.includes(cleanSku)) {
      return { product: p, score: 95, reason: `Trùng mã SKU: ${p.sku}` };
    }
  }

  // 3. Fuzzy similarity matching across all products
  let bestProduct = null;
  let highestScore = 0;

  for (const p of products) {
    const score = calculateStringSimilarity(rawName, p.name);
    if (score > highestScore) {
      highestScore = score;
      bestProduct = p;
    }
  }

  return {
    product: highestScore >= 45 ? bestProduct : null,
    score: highestScore,
    reason: highestScore >= 95 ? "Trùng khớp gần như tuyệt đối" : highestScore >= 65 ? "Khớp theo độ tương đồng ngữ nghĩa" : "Độ tương đồng thấp"
  };
}

// ==========================================================================
// BỘ TRÍCH XUẤT VĂN BẢN PDF BẰNG PDF.JS (CLIENT-SIDE EXTRACTION)
// ==========================================================================
async function extractTextFromPdfFile(file) {
  if (!window.pdfjsLib) {
    throw new Error("Thư viện PDF.js chưa được nạp. Vui lòng kiểm tra kết nối mạng.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Nhóm các text item theo tọa độ Y (cùng dòng) để giữ đúng cấu trúc bảng hóa đơn
    // transform[5] = Y coordinate, transform[4] = X coordinate
    const lineMap = new Map(); // key = rounded Y, value = array of {x, str}
    const yTolerance = 3; // Các item cách nhau <= 3 đơn vị Y coi là cùng dòng

    content.items.forEach(item => {
      if (!item.str || item.str.trim() === "") return;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];

      // Tìm dòng Y gần nhất đã tồn tại
      let matchedY = null;
      for (const existingY of lineMap.keys()) {
        if (Math.abs(existingY - y) <= yTolerance) {
          matchedY = existingY;
          break;
        }
      }

      if (matchedY !== null) {
        lineMap.get(matchedY).push({ x, str: item.str });
      } else {
        lineMap.set(y, [{ x, str: item.str }]);
      }
    });

    // Sắp xếp các dòng theo Y giảm dần (từ trên xuống dưới trong PDF)
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);

    sortedYs.forEach(y => {
      const items = lineMap.get(y);
      // Sắp xếp các item trong dòng theo X tăng dần (từ trái sang phải)
      items.sort((a, b) => a.x - b.x);

      // Ghép text trong cùng dòng với khoảng cách hợp lý
      let lineText = "";
      for (let i = 0; i < items.length; i++) {
        if (i > 0) {
          const gap = items[i].x - items[i - 1].x;
          // Nếu khoảng cách X lớn (> 20 đơn vị), thêm tab/space để phân tách cột bảng
          lineText += gap > 20 ? "  " : " ";
        }
        lineText += items[i].str;
      }

      fullText += lineText.trim() + "\n";
    });

    fullText += "\n"; // Ngắt trang
  }

  return fullText;
}

// Phân tích toàn diện Hóa đơn điện tử Việt Nam (M-Invoice, VNPT, Viettel, BKAV, MISA, v.v.)
function parseVietnameseInvoice(fullText, fileName = "") {
  const result = {
    invoiceNumber: "",
    invoiceSeries: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    sellerName: "",
    sellerTaxCode: "",
    sellerAddress: "",
    sellerPhone: "",
    buyerName: "",
    buyerTaxCode: "",
    buyerAddress: "",
    subtotal: 0,
    taxRate: 10,
    taxAmount: 0,
    totalAmount: 0,
    items: []
  };

  if (!fullText || typeof fullText !== "string") return result;

  // Chuẩn hóa khoảng trắng & ngắt dòng
  const text = fullText.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");

  // 1. Số hóa đơn & Ký hiệu mẫu số
  const noMatch = text.match(/Số\s*(?:\(No\.?\))?\s*:\s*(\d+)/i) ||
                  text.match(/Số\s*hóa\s*đơn[^\:]*:\s*(\d+)/i) ||
                  text.match(/Invoice\s*No[^\:]*:\s*(\d+)/i) ||
                  text.match(/Số\s*\(No\.\)\s*(\d+)/i);
  if (noMatch) result.invoiceNumber = noMatch[1].trim();

  const serialMatch = text.match(/Ký\s*hiệu\s*(?:\(Serial(?:\s*No)?\.?\))?\s*:\s*([A-Z0-9]+)/i) ||
                      text.match(/Mẫu\s*số[^\:]*:\s*([A-Z0-9]+)/i) ||
                      text.match(/Ký\s*hiệu\s*\(Serial\)\s*([A-Z0-9]+)/i);
  if (serialMatch) result.invoiceSeries = serialMatch[1].trim();

  // Fallback từ filename nếu có dạng 0111093754_1C26TBT_171_...
  if ((!result.invoiceNumber || !result.invoiceSeries) && fileName) {
    const fnMatch = fileName.match(/(?:_|^)([0-9A-Z]{6,10})_(\d+)_/i);
    if (fnMatch) {
      if (!result.invoiceSeries) result.invoiceSeries = fnMatch[1];
      if (!result.invoiceNumber) result.invoiceNumber = fnMatch[2];
    }
  }

  // 2. Ngày hóa đơn
  const dateMatch = text.match(/Ngày\s*(?:\(date\))?\s*(\d{1,2})\s*tháng\s*(?:\(month\))?\s*(\d{1,2})\s*năm\s*(?:\(year\))?\s*(\d{4})/i) ||
                    text.match(/Ngày\s*lập[^\:]*:\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i) ||
                    text.match(/Ngày\s*ký[^\:]*:\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i) ||
                    text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dateMatch) {
    const dd = dateMatch[1].padStart(2, "0");
    const mm = dateMatch[2].padStart(2, "0");
    const yyyy = dateMatch[3];
    result.invoiceDate = `${yyyy}-${mm}-${dd}`;
  }

  // 3. Người bán (Seller)
  const sellerMatch = text.match(/Đơn\s*vị\s*bán\s*(?:hàng)?\s*(?:\(Seller\))?\s*:\s*([^\n\r]+?)(?=\s+Mã\s*số\s*thuế|\s+Địa\s*chỉ|\n|$)/i);
  if (sellerMatch) result.sellerName = sellerMatch[1].trim();

  const sellerTaxMatch = text.match(/(?:Đơn\s*vị\s*bán|Seller)[\s\S]{1,150}?Mã\s*số\s*thuế[^\:]*:\s*(\d{10}(?:-\d{3})?)/i) ||
                         text.match(/Mã\s*số\s*thuế[^\:]*:\s*(\d{10}(?:-\d{3})?)/i);
  if (sellerTaxMatch) result.sellerTaxCode = sellerTaxMatch[1].trim();

  const sellerAddrMatch = text.match(/(?:Đơn\s*vị\s*bán|Seller)[\s\S]{1,250}?Địa\s*chỉ[^\:]*:\s*([^\n\r]+?)(?=\s+Điện\s*thoại|\s+Số\s*tài\s*khoản|\n|$)/i);
  if (sellerAddrMatch) result.sellerAddress = sellerAddrMatch[1].trim();

  // 4. Người mua (Buyer)
  const buyerMatch = text.match(/Tên\s*đơn\s*vị\s*(?:\(Company's\s*name\))?\s*:\s*([^\n\r]+?)(?=\s+Địa\s*chỉ|\s+Mã\s*số\s*thuế|\n|$)/i) ||
                     text.match(/Họ\s*tên\s*người\s*mua\s*(?:hàng)?\s*(?:\(Buyer's\s*fullname\))?\s*:\s*([^\n\r]+?)(?=\s+Tên\s*đơn\s*vị|\s+Địa\s*chỉ|\n|$)/i) ||
                     text.match(/Người\s*mua\s*hàng[^\:]*:\s*([^\n\r]+?)(?=\s+Địa\s*chỉ|\s+Mã\s*số\s*thuế|\n|$)/i);
  if (buyerMatch && buyerMatch[1].trim()) {
    result.buyerName = buyerMatch[1].trim();
  }

  const buyerTaxMatch = text.match(/(?:Tên\s*đơn\s*vị|Người\s*mua|Buyer)[\s\S]{1,250}?Mã\s*số\s*thuế[^\:]*:\s*(\d{10}(?:-\d{3})?)/i);
  if (buyerTaxMatch) result.buyerTaxCode = buyerTaxMatch[1].trim();

  const buyerAddrMatch = text.match(/(?:Tên\s*đơn\s*vị|Người\s*mua|Buyer)[\s\S]{1,350}?Địa\s*chỉ[^\:]*:\s*([^\n\r]+?)(?=\s+Hình\s*thức|\s+Số\s*tài\s*khoản|\n|$)/i);
  if (buyerAddrMatch) result.buyerAddress = buyerAddrMatch[1].trim();

  // 5. Tài chính (Cộng tiền hàng, Thuế GTGT, Tổng cộng)
  const subtotalMatch = text.match(/Cộng\s*tiền\s*hàng[^\:]*:\s*([\d.,]+)/i) ||
                        text.match(/Tổng\s*tiền\s*hàng[^\:]*:\s*([\d.,]+)/i);
  if (subtotalMatch) result.subtotal = parseInt(subtotalMatch[1].replace(/\D/g, ""), 10) || 0;

  const vatRateMatch = text.match(/Thuế\s*suất\s*GTGT[^\:]*:\s*(\d+)%/i);
  if (vatRateMatch) result.taxRate = parseInt(vatRateMatch[1], 10) || 10;

  const vatAmountMatch = text.match(/Tiền\s*thuế\s*GTGT[^\:]*:\s*([\d.,]+)/i);
  if (vatAmountMatch) result.taxAmount = parseInt(vatAmountMatch[1].replace(/\D/g, ""), 10) || 0;

  const totalMatch = text.match(/Tổng\s*cộng\s*tiền\s*thanh\s*toán[^\:]*:\s*([\d.,]+)/i) ||
                     text.match(/Tổng\s*tiền\s*thanh\s*toán[^\:]*:\s*([\d.,]+)/i);
  if (totalMatch) result.totalAmount = parseInt(totalMatch[1].replace(/\D/g, ""), 10) || 0;

  // 6. Trích xuất Bảng kê hàng hóa chi tiết (Items)
  const units = [
    "Cái", "Bộ", "Chiếc", "Mét", "Cuộn", "Hộp", "Thùng", "Thanh", "Gói", "Quả", "Bình", "Lít", "Kg", "Tấm", "Cây", "Ống",
    "Pcs", "Pce", "Set", "Lô", "Kiện", "Can", "Chai", "Lọ", "Bao", "Túi", "Cặp", "Đôi", "Sợi", "Bản", "Cuốn", "Quyển", "Ram", "Tờ",
    "Đoạn", "Khúc", "Vali", "Hạt", "Gam", "Tấn", "M", "M2", "M3", "Pcs.", "Set."
  ];
  const unitPattern = units.join("|");

  // Tìm vùng bảng kê hàng hóa
  let body = text;
  const headerIdx = text.search(/\(1\)\s*\(2\)\s*\(3\)|STT\s*Tên\s*hàng|STT\s*Tên\s*hàng\s*hóa|Tên\s*hàng\s*hóa|Tên\s*sản\s*phẩm|Bảng\s*kê|Description/i);
  if (headerIdx !== -1) {
    body = text.slice(headerIdx);
  }
  const endIdx = body.search(/Số\s*tiền\s*viết\s*bằng\s*chữ|Cộng\s*tiền\s*hàng|Tổng\s*tiền\s*hàng|Tổng\s*cộng\s*tiền|Thuế\s*suất\s*GTGT/i);
  if (endIdx !== -1) {
    body = body.slice(0, endIdx);
  }

  // Regex 1: STT (số) + Tên hàng + ĐVT + Số lượng + Đơn giá + Thành tiền
  const rowPattern1 = new RegExp(`(?:^|\\s+)(\\d{1,3})\\s+(.+?)\\s+(${unitPattern})\\s+([\\d.,]+)\\s+([\\d.,]+)\\s+([\\d.,]+)(?=\\s+\\d{1,3}\\s+|\\s*$)`, "gi");

  let match;
  while ((match = rowPattern1.exec(body)) !== null) {
    const rawName = match[2].trim();
    if (!rawName || /Tên hàng hóa|Đơn vị|Số lượng|Description|Mã hàng/i.test(rawName)) continue;
    const qty = parseInt(match[4].replace(/\D/g, ""), 10) || 1;
    const unitPrice = parseInt(match[5].replace(/\D/g, ""), 10) || 0;
    const totalPrice = parseInt(match[6].replace(/\D/g, ""), 10) || (qty * unitPrice);

    result.items.push({
      lineNo: parseInt(match[1], 10),
      rawName: rawName,
      unit: match[3].trim(),
      quantity: qty,
      unitPrice: unitPrice,
      totalPrice: totalPrice
    });
  }

  // Regex 2: Nếu Regex 1 chưa tìm thấy, thử mẫu có Số lượng trước ĐVT
  if (result.items.length === 0) {
    const rowPattern2 = new RegExp(`(?:^|\\s+)(\\d{1,3})\\s+(.+?)\\s+([\\d.,]+)\\s+(${unitPattern})\\s+([\\d.,]+)\\s+([\\d.,]+)(?=\\s+\\d{1,3}\\s+|\\s*$)`, "gi");
    while ((match = rowPattern2.exec(body)) !== null) {
      const rawName = match[2].trim();
      if (!rawName || /Tên hàng hóa|Đơn vị|Số lượng|Description/i.test(rawName)) continue;
      const qty = parseInt(match[3].replace(/\D/g, ""), 10) || 1;
      const unitPrice = parseInt(match[5].replace(/\D/g, ""), 10) || 0;
      const totalPrice = parseInt(match[6].replace(/\D/g, ""), 10) || (qty * unitPrice);

      result.items.push({
        lineNo: parseInt(match[1], 10),
        rawName: rawName,
        unit: match[4].trim(),
        quantity: qty,
        unitPrice: unitPrice,
        totalPrice: totalPrice
      });
    }
  }

  // Regex 3: Vạn năng (Universal Line Fallback) - Quét từng dòng chứa số liệu
  if (result.items.length === 0) {
    const fallbackLines = text.split("\n").map(l => l.trim()).filter(Boolean);
    fallbackLines.forEach((line) => {
      const isHeaderFooter = /đơn vị bán|người mua|mã số thuế|tổng cộng|số tiền|cộng tiền|thuế suất|tài khoản|chữ ký|ký hiệu|mẫu số|ngày tháng/i.test(line);
      if (isHeaderFooter || line.length < 8) return;

      const numbers = line.match(/\b\d{1,3}(?:[.,]\d{3})*\b|\b\d+\b/g);
      if (numbers && numbers.length >= 2) {
        // Lấy tên hàng bằng cách bỏ các số ở cuối dòng
        const cleanName = line.replace(/\b\d{1,3}(?:[.,]\d{3})*\b/g, "").replace(/\s+/g, " ").trim();
        if (cleanName.length >= 3 && !/stt|đvt|đơn giá|thành tiền|số lượng/i.test(cleanName)) {
          const qty = parseInt(numbers[0].replace(/\D/g, ""), 10) || 1;
          const price = parseInt(numbers[1].replace(/\D/g, ""), 10) || 0;
          const total = numbers.length >= 3 ? (parseInt(numbers[2].replace(/\D/g, ""), 10) || qty * price) : qty * price;

          // Tìm đơn vị tính có trong dòng
          const unitMatch = line.match(new RegExp(`\\b(${unitPattern})\\b`, "i"));
          const unit = unitMatch ? unitMatch[1] : "Cái";

          result.items.push({
            lineNo: result.items.length + 1,
            rawName: cleanName.slice(0, 100),
            unit: unit,
            quantity: qty,
            unitPrice: price,
            totalPrice: total
          });
        }
      }
    });
  }

  // Fallback an toàn tuyệt đối nếu file PDF là ảnh scan không có lớp text layer
  if (result.items.length === 0) {
    const cleanFn = (fileName || "").replace(/\.[^/.]+$/, "").replace(/^[0-9_]+/, "");
    const itemName = cleanFn.length > 3 ? cleanFn : "Vật tư thiết bị công nghiệp TBTECH";
    result.items.push({
      lineNo: 1,
      rawName: itemName,
      unit: "Cái",
      quantity: 1,
      unitPrice: result.totalAmount > 0 ? result.totalAmount : 10000000,
      totalPrice: result.totalAmount > 0 ? result.totalAmount : 10000000
    });
  }

  // Tự động tính tổng tiền nếu thiếu
  if (result.totalAmount === 0 && result.items.length > 0) {
    result.subtotal = result.items.reduce((s, it) => s + (it.totalPrice || 0), 0);
    result.taxAmount = Math.round(result.subtotal * (result.taxRate / 100));
    result.totalAmount = result.subtotal + result.taxAmount;
  }

  return result;
}

// Bóc tách danh sách mặt hàng từ text hóa đơn (tương thích ngược)
function parseInvoiceItemsFromText(pdfText, fileName = "") {
  const invoice = parseVietnameseInvoice(pdfText, fileName);
  return invoice.items || [];
}

