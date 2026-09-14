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
    const pageStrings = content.items.map(item => item.str);
    fullText += pageStrings.join(" ") + "\n";
  }

  return fullText;
}

// Phân tích bảng kê hàng hóa từ text trích xuất của hóa đơn PDF
function parseInvoiceItemsFromText(pdfText) {
  if (!pdfText) return [];
  const lines = pdfText.split("\n").map(l => l.trim()).filter(Boolean);
  const items = [];

  const numberRegex = /(\d{1,3}(?:[.,]\d{3})*|\d+)/g;

  lines.forEach((line) => {
    const isTechLine = /firewall|switch|cable|cáp|laptop|máy|server|ram|dso|bộ|thanh|thùng|cái|chiếc/i.test(line);
    if (isTechLine) {
      const numbers = line.match(numberRegex);
      let qty = 1;
      let price = 0;
      if (numbers && numbers.length >= 2) {
        qty = parseInt(numbers[0].replace(/\D/g, ""), 10) || 1;
        price = parseInt(numbers[1].replace(/\D/g, ""), 10) || 0;
      }
      items.push({
        lineNo: items.length + 1,
        rawName: line.slice(0, 100).trim(),
        unit: /thùng/i.test(line) ? "Thùng" : /bộ/i.test(line) ? "Bộ" : /thanh/i.test(line) ? "Thanh" : /chiếc/i.test(line) ? "Chiếc" : "Cái",
        quantity: qty,
        unitPrice: price,
        totalPrice: qty * price
      });
    }
  });

  return items;
}

