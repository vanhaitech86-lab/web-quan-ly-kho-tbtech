/**
 * TBTECH VWM - DATA ENGINE & SEED DATABASE
 * Thông tin cấu hình doanh nghiệp, danh mục kho hàng, khách hàng, hóa đơn mẫu & lịch sử
 */

const DEFAULT_COMPANY_INFO = {
  name: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
  shortName: "TBTECH INDUSTRIAL CO., LTD",
  warehouseName: "Kho bán - TBTECH Central Hub",
  taxCode: "0111093754",
  address: "Số 8, Ngõ 387 Phố Vũ Tông Phan, Phường Khương Đình, Thành phố Hà Nội",
  warehouseAddress: "Kho bán - Số 8, Ngõ 387 Phố Vũ Tông Phan, Hà Nội",
  phone: "0763181987",
  email: "kinhdoanh@tbtech.com.vn",
  accountingEmail: "ketoan.tbtech387@gmail.com",
  website: "https://tbtech.com.vn",
  bankName: "Ngân hàng TMCP Công Thương Việt Nam (VietinBank)",
  bankAccount: "116000288899",
  bankBranch: "Chi nhánh Đống Đa - Hà Nội",
  representative: "Bửu Trần",
  representativeTitle: "Giám đốc",
  warehouseKeeper: "Nguyễn Văn Khoa",
  chiefAccountant: "Trần Thị Mai Phương"
};

// Cấu hình tài khoản Google / Gmail kết nối quét hóa đơn
const DEFAULT_GMAIL_CONFIG = {
  email: "ketoan.tbtech387@gmail.com",
  status: "CONNECTED", // "CONNECTED" | "SCANNING" | "DISCONNECTED"
  connectedAt: "2026-09-14 21:40",
  authMethod: "GOOGLE_OAUTH_GIS", // "GOOGLE_OAUTH_GIS" | "APP_PASSWORD" | "WEBHOOK"
  clientId: "tbtech-wms-oauth-client.apps.googleusercontent.com",
  accessToken: "",
  appPassword: "",
  imapServer: "imap.gmail.com",
  imapPort: 993,
  lastScanTime: "Vừa khởi chạy",
  autoSync: true,
  queryFilter: "has:attachment (filename:pdf OR subject:hóa đơn)"
};

const INITIAL_PRODUCTS = [
  {
    id: "prod-001",
    sku: "FG-100F-BDL",
    name: "Firewall FortiGate 100F Security Bundle (Hardware + 1Yr UTP)",
    category: "Thiết bị mạng",
    unit: "Cái",
    inStock: 5,
    minStock: 2,
    costPrice: 75000000,
    sellPrice: 88500000,
    location: "Kệ A1 - Tầng 2",
    supplier: "Công ty Cổ phần Công nghệ Fortinet Việt Nam",
    specs: "22 x GE RJ45 ports, 4 x SFP, 2 x 10GE SFP+ slots, NGFW 1Gbps, Threat Protection 700Mbps",
    serialNumber: "FG100FT920800115",
    invoiceNumber: "HD-FTN-2026-08",
    updatedAt: "2026-09-08"
  },
  {
    id: "prod-002",
    sku: "BT-SWITCH-24",
    name: "Switch Gigabit 24 Port PoE Management Layer 2+ TBTECH",
    category: "Thiết bị mạng",
    unit: "Cái",
    inStock: 14,
    minStock: 3,
    costPrice: 3200000,
    sellPrice: 4500000,
    location: "Kệ A2 - Tầng 1",
    supplier: "Công ty TNHH Thiết bị & Công nghệ Bửu Trần",
    specs: "24-Port 10/100/1000Mbps RJ45 PoE+ (370W), 4 SFP Gigabit Uplink, Console Port",
    serialNumber: "SW24POE-2026-0901",
    invoiceNumber: "2C26-001",
    updatedAt: "2026-09-07"
  },
  {
    id: "prod-003",
    sku: "DELL-LAT-5540",
    name: "Laptop Dell Latitude 5540 i7-1365U / 16GB / 512GB NVMe / 15.6 Inch FHD",
    category: "Máy tính & Laptop",
    unit: "Chiếc",
    inStock: 6,
    minStock: 2,
    costPrice: 21000000,
    sellPrice: 24900000,
    location: "Tủ B1 - Phòng Kỹ thuật",
    supplier: "Công ty Cổ phần Công nghệ Dell Vietnam",
    specs: "Core i7-1365U, 16GB DDR5 4800, SSD 512GB PCIe Gen4, Iris Xe, Win 11 Pro",
    serialNumber: "DL5540-SN891244",
    invoiceNumber: "HD-DELL-9921",
    updatedAt: "2026-09-06"
  },
  {
    id: "prod-004",
    sku: "VLH-CABLE-CAT6",
    name: "Cáp mạng UTP Cat6 Chống Nhiễu FTP (Thùng 305m đồng nguyên chất)",
    category: "Vật tư điện & Cáp",
    unit: "Thùng",
    inStock: 32,
    minStock: 5,
    costPrice: 2400000,
    sellPrice: 3100000,
    location: "Khu B - Sàn Kho",
    supplier: "CÔNG TY TNHH THƯƠNG MẠI VÀ XÂY LẮP ĐIỆN VINH LONG HẢI",
    specs: "Đường kính lõi 0.57mm đồng nguyên chất 23AWG, chuẩn chống nhiễu cuộn 305m",
    serialNumber: "VLH-C6-305M-882",
    invoiceNumber: "2542",
    updatedAt: "2026-09-07"
  },
  {
    id: "prod-005",
    sku: "TECO-OSCILLOSCOPE",
    name: "Máy hiện sóng kỹ thuật số DSO Digital Oscilloscope 100MHz 2 Kênh",
    category: "Thiết bị đo lường",
    unit: "Bộ",
    inStock: 3,
    minStock: 1,
    costPrice: 18500000,
    sellPrice: 22800000,
    location: "Kệ C1 - Thiết bị chính xác",
    supplier: "CÔNG TY CỔ PHẦN THƯƠNG MẠI ĐIỆN TỬ TECOTEC",
    specs: "Băng thông 100MHz, Real-time sampling 1GSa/s, màn hình màu TFT 7 inch LCD",
    serialNumber: "TEC-DSO100-559",
    invoiceNumber: "607",
    updatedAt: "2026-09-07"
  },
  {
    id: "prod-006",
    sku: "RAM-DDR5-32GB",
    name: "RAM Kingston 32GB DDR5 ECC Registered Server 4800MHz",
    category: "Server & Linh kiện",
    unit: "Thanh",
    inStock: 18,
    minStock: 4,
    costPrice: 2000000,
    sellPrice: 2650000,
    location: "Tủ B2 - Linh kiện máy chủ",
    supplier: "Công ty TNHH HP Vietnam Enterprise",
    specs: "DDR5 ECC Registered 32GB, Bus 4800 CL40, chuẩn máy chủ ProLiant Gen11",
    serialNumber: "KVR48R40BD8-32",
    invoiceNumber: "HD-HP-4891",
    updatedAt: "2026-09-05"
  },
  {
    id: "prod-007",
    sku: "HP-DL380-GEN11",
    name: "Máy chủ Server HP ProLiant DL380 Gen11 2x Xeon Silver 4410Y / 64GB / 2x960GB SAS",
    category: "Server & Linh kiện",
    unit: "Bộ",
    inStock: 2,
    minStock: 1,
    costPrice: 112000000,
    sellPrice: 135000000,
    location: "Khu Server - Kệ S1",
    supplier: "Công ty TNHH HP Vietnam Enterprise",
    specs: "2x Intel Xeon Silver 4410Y (12C/24T), 64GB DDR5 SmartMemory, P408i-a, 2x 800W PSU",
    serialNumber: "SGH31908LK",
    invoiceNumber: "HD-HP-4891",
    updatedAt: "2026-09-05"
  },
  {
    id: "prod-008",
    sku: "CISCO-CBS350-48P",
    name: "Switch Cisco Business CBS350-48P-4G 48 Port Gigabit PoE+ 370W",
    category: "Thiết bị mạng",
    unit: "Cái",
    inStock: 4,
    minStock: 1,
    costPrice: 28500000,
    sellPrice: 34200000,
    location: "Kệ A1 - Tầng 3",
    supplier: "Công ty TNHH Thiết bị & Công nghệ Bửu Trần",
    specs: "48 cổng 10/100/1000 PoE+, tổng công suất 370W, 4 cổng SFP quang Gigabit",
    serialNumber: "FOC2432V981",
    invoiceNumber: "2C26-001",
    updatedAt: "2026-09-04"
  },
  {
    id: "prod-009",
    sku: "UPS-APC-3KVA",
    name: "Bộ lưu điện UPS APC Smart-UPS Online 3000VA / 2700W 230V SRT3000XLI",
    category: "Server & Linh kiện",
    unit: "Bộ",
    inStock: 1,
    minStock: 2,
    costPrice: 42000000,
    sellPrice: 49500000,
    location: "Khu Nguồn Tầng 1",
    supplier: "CÔNG TY CỔ PHẦN THƯƠNG MẠI ĐIỆN TỬ TECOTEC",
    specs: "Công suất 3kVA/2.7kW, On-line Double Conversion, LCD display, SmartSlot",
    serialNumber: "AS2311899120",
    invoiceNumber: "607",
    updatedAt: "2026-09-03"
  },
  {
    id: "prod-010",
    sku: "FLUKE-179-ESFP",
    name: "Đồng hồ vạn năng số điện tử Fluke 179 True-RMS",
    category: "Thiết bị đo lường",
    unit: "Cái",
    inStock: 0,
    minStock: 2,
    costPrice: 8900000,
    sellPrice: 11200000,
    location: "Kệ C2 - Tủ đo kiểm",
    supplier: "CÔNG TY CỔ PHẦN THƯƠNG MẠI ĐIỆN TỬ TECOTEC",
    specs: "True-RMS đo điện áp dòng AC/DC, điện dung, tần số, nhiệt độ tích hợp",
    serialNumber: "FLK179-88312",
    invoiceNumber: "607",
    updatedAt: "2026-08-30"
  },
  {
    id: "prod-011",
    sku: "OPTICAL-FIBER-4FO",
    name: "Cáp quang treo kim loại dã chiến 4FO Single Mode G652D (Cuộn 1000m)",
    category: "Vật tư điện & Cáp",
    unit: "Cuộn",
    inStock: 8,
    minStock: 2,
    costPrice: 3800000,
    sellPrice: 4900000,
    location: "Khu B - Sàn Kho",
    supplier: "CÔNG TY TNHH THƯƠNG MẠI VÀ XÂY LẮP ĐIỆN VINH LONG HẢI",
    specs: "Cáp quang 4 sợi Singlemode chịu lực bọc thép, ống đệm lỏng đi ngoài trời",
    serialNumber: "FO4-SM-1000M-91",
    invoiceNumber: "2542",
    updatedAt: "2026-09-02"
  },
  {
    id: "prod-012",
    sku: "PATCH-PANEL-24P",
    name: "Thanh đấu nối Patch Panel Cat6 24 Cổng UTP 1U Unloaded AMP/CommScope",
    category: "Vật tư điện & Cáp",
    unit: "Chiếc",
    inStock: 25,
    minStock: 5,
    costPrice: 850000,
    sellPrice: 1250000,
    location: "Kệ A3 - Phụ kiện",
    supplier: "CÔNG TY TNHH THƯƠNG MẠI VÀ XÂY LẮP ĐIỆN VINH LONG HẢI",
    specs: "Chuẩn rack 19 inch 1U, kèm thanh quản lý cáp phía sau và 24 nhân mạng Cat6",
    serialNumber: "PP24-AMP-092",
    invoiceNumber: "2542",
    updatedAt: "2026-09-01"
  }
];

const INITIAL_CUSTOMERS = [
  {
    id: "cust-001",
    name: "Tập Đoàn Bưu Chính Viễn Thông Việt Nam (VNPT)",
    shortName: "VNPT Group",
    taxCode: "0100684378",
    address: "Tòa nhà VNPT, số 57 Huỳnh Thúc Kháng, Đống Đa, Hà Nội",
    phone: "02437741091",
    email: "contact@vnpt.vn",
    contactPerson: "Nguyễn Văn Hùng",
    contactRole: "Trưởng phòng Mua sắm & Thiết bị",
    ordersCount: 8,
    totalSpent: 485000000
  },
  {
    id: "cust-002",
    name: "Công ty Cổ phần Viễn thông FPT",
    shortName: "FPT Telecom",
    taxCode: "0101778163",
    address: "Tòa nhà FPT Tower, số 10 Phạm Văn Bạch, Cầu Giấy, Hà Nội",
    phone: "02473002222",
    email: "fpttelecom@fpt.com.vn",
    contactPerson: "Lê Minh Tuấn",
    contactRole: "Giám đốc Kỹ thuật Hạ tầng",
    ordersCount: 12,
    totalSpent: 620000000
  },
  {
    id: "cust-003",
    name: "Ngân hàng Thương mại Cổ phần Ngoại thương Việt Nam (Vietcombank)",
    shortName: "Vietcombank",
    taxCode: "0100112437",
    address: "Số 198 Trần Quang Khải, Hoàn Kiếm, Hà Nội",
    phone: "02439343137",
    email: "it-procurement@vietcombank.com.vn",
    contactPerson: "Phạm Thu Hằng",
    contactRole: "Phó phòng CNTT Khối Hội Sở",
    ordersCount: 5,
    totalSpent: 350000000
  },
  {
    id: "cust-004",
    name: "Tập Đoàn Công Nghệ CMC (CMC Corporation)",
    shortName: "CMC Corp",
    taxCode: "0100244115",
    address: "Tòa nhà CMC, Duy Tân, Cầu Giấy, Hà Nội",
    phone: "02437958668",
    email: "info@cmc.com.vn",
    contactPerson: "Vũ Hải Nam",
    contactRole: "Trưởng ban Quản lý Dự án Mạng",
    ordersCount: 4,
    totalSpent: 195000000
  },
  {
    id: "cust-005",
    name: "Công ty Cổ phần Công nghệ An ninh Mạng Quốc Gia Việt Nam",
    shortName: "VNSC Security",
    taxCode: "0109988221",
    address: "Số 168 Khuất Duy Tiến, Thanh Xuân, Hà Nội",
    phone: "02466889922",
    email: "procurement@vnsc.vn",
    contactPerson: "Hoàng Đức Anh",
    contactRole: "Quản lý Đấu thầu Thiết bị",
    ordersCount: 3,
    totalSpent: 168000000
  }
];

const INITIAL_INBOX = [
  {
    id: "email-001",
    senderName: "Công ty Cổ phần Công nghệ Fortinet Việt Nam",
    senderEmail: "billing@fortinet.vn",
    subject: "Hóa đơn điện tử số 88910 kèm bản kê thiết bị Firewall FortiGate TBTECH",
    receivedDate: "2026-09-08 14:10",
    pdfFileName: "HDDT_Fortinet_FG100F_88910.pdf",
    fileSize: "1.2 MB",
    isImported: true,
    extractedData: {
      invoiceNumber: "88910",
      invoiceDate: "2026-09-08",
      supplierName: "Công ty Cổ phần Công nghệ Fortinet Việt Nam",
      supplierTaxCode: "0105849382",
      supplierAddress: "Tòa nhà Centec Tower, 72-74 Nguyễn Thị Minh Khai, Quận 3, TP.HCM",
      supplierPhone: "02839998888",
      customerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
      customerTaxCode: "0111093754",
      customerAddress: "Số 8, Ngõ 387 Phố Vũ Tông Phan, Phường Khương Đình, Thành phố Hà Nội",
      subtotal: 150000000,
      taxAmount: 15000000,
      totalAmount: 165000000,
      notes: "Hóa đơn thiết bị tường lửa FortiGate nhập kho ngày 08/09/2026",
      items: [
        {
          itemCode: "FG-100F-BDL",
          itemName: "Firewall FortiGate 100F Security Bundle (Hardware + 1Yr UTP)",
          unit: "Cái",
          quantity: 2,
          unitPrice: 75000000,
          totalPrice: 150000000,
          taxRate: 10
        }
      ]
    }
  },
  {
    id: "email-002",
    senderName: "Bửu Trần Tech",
    senderEmail: "buutran.tech@gmail.com",
    subject: "Hóa đơn điện tử số: 2C26-001 - Công ty TNHH Thiết bị & Công nghệ Bửu Trần",
    receivedDate: "2026-09-08 11:20",
    pdfFileName: "2026_97_2C26.pdf",
    fileSize: "1.4 MB",
    isImported: false,
    extractedData: {
      invoiceNumber: "2C26-001",
      invoiceDate: "2026-09-07",
      supplierName: "Công ty TNHH Thiết bị & Công nghệ Bửu Trần",
      supplierTaxCode: "0108889999",
      supplierAddress: "Số 45 Lê Duẩn, Ba Đình, Hà Nội",
      supplierPhone: "02438887777",
      customerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
      customerTaxCode: "0111093754",
      customerAddress: "Số 8, Ngõ 387 Phố Vũ Tông Phan, Phường Khương Đình, Thành phố Hà Nội",
      subtotal: 16000000,
      taxAmount: 1600000,
      totalAmount: 17600000,
      notes: "Hóa đơn thiết bị switch mạng gửi ngày 8/9, ngày hóa đơn 7/9",
      items: [
        {
          itemCode: "BT-SWITCH-24",
          itemName: "Switch Gigabit 24 Port PoE Management Layer 2+ TBTECH",
          unit: "Cái",
          quantity: 5,
          unitPrice: 3200000,
          totalPrice: 16000000,
          taxRate: 10
        }
      ]
    }
  },
  {
    id: "email-003",
    senderName: "Vinh Long Hải Electric",
    senderEmail: "ketoan@vinhlonghai.com.vn",
    subject: "Fwd: Hóa đơn điện tử số 2542 - CÔNG TY TNHH THƯƠNG MẠI VÀ XÂY LẮP ĐIỆN VINH LONG HẢI",
    receivedDate: "2026-09-08 09:45",
    pdfFileName: "HDDT_2542_VinhLongHai.pdf",
    fileSize: "1.5 MB",
    isImported: false,
    extractedData: {
      invoiceNumber: "2542",
      invoiceDate: "2026-09-07",
      supplierName: "CÔNG TY TNHH THƯƠNG MẠI VÀ XÂY LẮP ĐIỆN VINH LONG HẢI",
      supplierTaxCode: "0309998888",
      supplierAddress: "Số 88 Quốc lộ 1A, Vĩnh Long",
      supplierPhone: "02703888888",
      customerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
      customerTaxCode: "0111093754",
      customerAddress: "Số 8, Ngõ 387 Phố Vũ Tông Phan, Phường Khương Đình, Thành phố Hà Nội",
      subtotal: 24000000,
      taxAmount: 2400000,
      totalAmount: 26400000,
      notes: "Hóa đơn vật tư điện & cáp mạng Vinh Long Hải (gửi 8/9, hóa đơn ngày 7/9)",
      items: [
        {
          itemCode: "VLH-CABLE-CAT6",
          itemName: "Cáp mạng UTP Cat6 Chống Nhiễu FTP (Thùng 305m đồng nguyên chất)",
          unit: "Thùng",
          quantity: 10,
          unitPrice: 2400000,
          totalPrice: 24000000,
          taxRate: 10
        }
      ]
    }
  },
  {
    id: "email-004",
    senderName: "Tecotec E-Commerce JSC",
    senderEmail: "invoice@tecotec.com.vn",
    subject: "Fwd: Hóa đơn điện tử số 607 từ CÔNG TY CỔ PHẦN THƯƠNG MẠI ĐIỆN TỬ TECOTEC - MST: 0107012350",
    receivedDate: "2026-09-07 16:30",
    pdfFileName: "1_C26TYY_607.pdf",
    fileSize: "1.8 MB",
    isImported: false,
    extractedData: {
      invoiceNumber: "607",
      invoiceDate: "2026-09-07",
      supplierName: "CÔNG TY CỔ PHẦN THƯƠNG MẠI ĐIỆN TỬ TECOTEC",
      supplierTaxCode: "0107012350",
      supplierAddress: "Tòa nhà Tecotec, 15 Hồ Hảo Hớn, Quận 1, TP.HCM",
      supplierPhone: "02838383838",
      customerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
      customerTaxCode: "0111093754",
      customerAddress: "Số 8, Ngõ 387 Phố Vũ Tông Phan, Phường Khương Đình, Thành phố Hà Nội",
      subtotal: 37000000,
      taxAmount: 3700000,
      totalAmount: 40700000,
      notes: "Hóa đơn thiết bị đo lường Tecotec (gửi 8/9, hóa đơn ngày 7/9)",
      items: [
        {
          itemCode: "TECO-OSCILLOSCOPE",
          itemName: "Máy hiện sóng kỹ thuật số DSO Digital Oscilloscope 100MHz 2 Kênh",
          unit: "Bộ",
          quantity: 2,
          unitPrice: 18500000,
          totalPrice: 37000000,
          taxRate: 10
        }
      ]
    }
  },
  {
    id: "email-005",
    senderName: "Dell Vietnam Technology JSC",
    senderEmail: "sales-orders@dell.com.vn",
    subject: "Hóa đơn VAT máy tính xách tay doanh nghiệp Dell Latitude 5540 TBTECH",
    receivedDate: "2026-09-06 10:15",
    pdfFileName: "Dell_Latitude_HD9921.pdf",
    fileSize: "1.1 MB",
    isImported: false,
    extractedData: {
      invoiceNumber: "HD-DELL-9921",
      invoiceDate: "2026-09-06",
      supplierName: "Công ty Cổ phần Công nghệ Dell Vietnam",
      supplierTaxCode: "0103829102",
      supplierAddress: "Tòa nhà Keangnam Hanoi Landmark Tower, Nam Từ Liêm, Hà Nội",
      supplierPhone: "02438889999",
      customerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
      customerTaxCode: "0111093754",
      customerAddress: "Số 8, Ngõ 387 Phố Vũ Tông Phan, Phường Khương Đình, Thành phố Hà Nội",
      subtotal: 84000000,
      taxAmount: 8400000,
      totalAmount: 92400000,
      notes: "Hóa đơn mua laptop Dell Latitude cho bộ phận triển khai kỹ thuật TBTECH",
      items: [
        {
          itemCode: "DELL-LAT-5540",
          itemName: "Laptop Dell Latitude 5540 i7-1365U / 16GB / 512GB NVMe / 15.6 Inch FHD",
          unit: "Chiếc",
          quantity: 4,
          unitPrice: 21000000,
          totalPrice: 84000000,
          taxRate: 10
        }
      ]
    }
  }
];

const INITIAL_HISTORY = [
  {
    id: "tx-init-001",
    type: "IMPORT",
    title: "Nhập kho hóa đơn GTGT #88910 - Công ty Cổ phần Công nghệ Fortinet Việt Nam",
    referenceNumber: "88910",
    partnerName: "Công ty Cổ phần Công nghệ Fortinet Việt Nam",
    date: "2026-09-08 14:15",
    totalAmount: 165000000,
    items: [
      {
        name: "Firewall FortiGate 100F Security Bundle (Hardware + 1Yr UTP)",
        quantity: 2,
        unit: "Cái",
        price: 75000000
      }
    ],
    note: "Nhập kho chính ngạch thiết bị Firewall cho dự án an ninh mạng trung tâm"
  },
  {
    id: "tx-init-002",
    type: "EXPORT",
    title: "Xuất kho phiếu PXK-2026/089 - Tập Đoàn Bưu Chính Viễn Thông Việt Nam (VNPT)",
    referenceNumber: "PXK-2026/089",
    partnerName: "Tập Đoàn Bưu Chính Viễn Thông Việt Nam (VNPT)",
    date: "2026-09-05 09:30",
    totalAmount: 112500000,
    items: [
      {
        name: "Switch Gigabit 24 Port PoE Management Layer 2+ TBTECH",
        quantity: 5,
        unit: "Cái",
        price: 4500000
      },
      {
        name: "Firewall FortiGate 100F Security Bundle (Hardware + 1Yr UTP)",
        quantity: 1,
        unit: "Cái",
        price: 90000000
      }
    ],
    note: "Xuất kho triển khai gói hạ tầng bảo mật chi nhánh VNPT Hà Nội"
  },
  {
    id: "tx-init-003",
    type: "IMPORT",
    title: "Nhập kho linh kiện máy chủ RAM Kingston ECC - HP Vietnam Enterprise",
    referenceNumber: "HD-HP-4891",
    partnerName: "Công ty TNHH HP Vietnam Enterprise",
    date: "2026-09-04 15:00",
    totalAmount: 39600000,
    items: [
      {
        name: "RAM Kingston 32GB DDR5 ECC Registered Server 4800MHz",
        quantity: 18,
        unit: "Thanh",
        price: 2000000
      }
    ],
    note: "Linh kiện nâng cấp server kho Tbtech"
  }
];

const INITIAL_DOCUMENTS = [
  {
    id: "doc-001",
    docType: "PHIEU_XUAT_KHO",
    docNumber: "PXK-2026/089",
    date: "2026-09-05",
    receiverName: "Nguyễn Văn Hùng",
    receiverOrg: "Tập Đoàn Bưu Chính Viễn Thông Việt Nam (VNPT)",
    receiverAddress: "Tòa nhà VNPT, số 57 Huỳnh Thúc Kháng, Đống Đa, Hà Nội",
    reason: "Xuất thiết bị triển khai hạ tầng bảo mật chi nhánh VNPT",
    warehouseSource: "Kho bán - Số 8, Ngõ 387 Phố Vũ Tông Phan, Hà Nội",
    items: [
      {
        sku: "FG-100F-BDL",
        name: "Firewall FortiGate 100F Security Bundle (Hardware + 1Yr UTP)",
        unit: "Cái",
        qtyReq: 1,
        qtyAct: 1,
        unitPrice: 88500000,
        totalPrice: 88500000
      },
      {
        sku: "BT-SWITCH-24",
        name: "Switch Gigabit 24 Port PoE Management Layer 2+ TBTECH",
        unit: "Cái",
        qtyReq: 5,
        qtyAct: 5,
        unitPrice: 4500000,
        totalPrice: 22500000
      }
    ],
    totalAmount: 111000000,
    amountInWords: "Một trăm mười một triệu đồng chẵn"
  }
];

// ==========================================================================
// HÓA ĐƠN ĐẦU RA MẪU (SALES INVOICES / BÁN RA CHO KHÁCH HÀNG)
// Dùng cho phân hệ Đối Soát HĐ Đầu Vào - Đầu Ra & Kiểm Tra Tồn Kho
// ==========================================================================
const SAMPLE_SALES_INVOICES = [
  {
    id: "sale-inv-001",
    invoiceNumber: "HD-TBTECH-0892",
    invoiceDate: "2026-09-09",
    buyerName: "Tập Đoàn Bưu Chính Viễn Thông Việt Nam (VNPT)",
    buyerTaxCode: "0100684378",
    buyerAddress: "Tòa nhà VNPT, số 57 Huỳnh Thúc Kháng, Đống Đa, Hà Nội",
    sellerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
    sellerTaxCode: "0111093754",
    pdfFileName: "HDDT_BANRA_0892_VNPT.pdf",
    items: [
      {
        lineNo: 1,
        rawName: "Thiết bị tường lửa Fortinet FG-100F Security Bundle",
        matchedSku: "FG-100F-BDL",
        unit: "Cái",
        quantity: 2,
        unitPrice: 88500000,
        totalPrice: 177000000
      },
      {
        lineNo: 2,
        rawName: "Switch Gigabit 24 Port PoE Management Layer 2+ TBTECH",
        matchedSku: "BT-SWITCH-24",
        unit: "Cái",
        quantity: 6,
        unitPrice: 4500000,
        totalPrice: 27000000
      },
      {
        lineNo: 3,
        rawName: "Dây cáp mạng Cat6 UTP 305m màu xanh",
        matchedSku: "VLH-CABLE-CAT6",
        unit: "Thùng",
        quantity: 12,
        unitPrice: 3100000,
        totalPrice: 37200000
      }
    ],
    subtotal: 241200000,
    taxAmount: 24120000,
    totalAmount: 265320000
  },
  {
    id: "sale-inv-002",
    invoiceNumber: "HD-TBTECH-0895",
    invoiceDate: "2026-09-08",
    buyerName: "Công ty Cổ phần Viễn thông FPT",
    buyerTaxCode: "0101778163",
    buyerAddress: "Tòa nhà FPT Tower, số 10 Phạm Văn Bạch, Cầu Giấy, Hà Nội",
    sellerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
    sellerTaxCode: "0111093754",
    pdfFileName: "HDDT_BANRA_0895_FPT.pdf",
    items: [
      {
        lineNo: 1,
        rawName: "Máy hiện sóng số DSO-100MHz Tecotec 2 kênh",
        matchedSku: "TECO-OSCILLOSCOPE",
        unit: "Bộ",
        quantity: 2,
        unitPrice: 22800000,
        totalPrice: 45600000
      },
      {
        lineNo: 2,
        rawName: "Laptop Dell Latitude 5540 i7 16GB/512GB",
        matchedSku: "DELL-LAT-5540",
        unit: "Chiếc",
        quantity: 4,
        unitPrice: 24900000,
        totalPrice: 99600000
      },
      {
        lineNo: 3,
        rawName: "Bộ phát sóng WiFi 6 Ruijie Reyee RG-AP820-L",
        matchedSku: null,
        unit: "Chiếc",
        quantity: 5,
        unitPrice: 3800000,
        totalPrice: 19000000
      }
    ],
    subtotal: 164200000,
    taxAmount: 16420000,
    totalAmount: 180620000
  },
  {
    id: "sale-inv-003",
    invoiceNumber: "HD-TBTECH-0901",
    invoiceDate: "2026-09-07",
    buyerName: "Ngân hàng Thương mại Cổ phần Ngoại thương Việt Nam (Vietcombank)",
    buyerTaxCode: "0100112437",
    buyerAddress: "Số 198 Trần Quang Khải, Hoàn Kiếm, Hà Nội",
    sellerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
    sellerTaxCode: "0111093754",
    pdfFileName: "HDDT_BANRA_0901_VCB.pdf",
    items: [
      {
        lineNo: 1,
        rawName: "Máy chủ HP ProLiant DL380 Gen11 2x Xeon Silver",
        matchedSku: "HP-DL380-GEN11",
        unit: "Bộ",
        quantity: 1,
        unitPrice: 135000000,
        totalPrice: 135000000
      },
      {
        lineNo: 2,
        rawName: "Bộ nhớ RAM Server Kingston 32GB DDR5 4800 ECC",
        matchedSku: "RAM-DDR5-32GB",
        unit: "Thanh",
        quantity: 8,
        unitPrice: 2650000,
        totalPrice: 21200000
      }
    ],
    subtotal: 156200000,
    taxAmount: 15620000,
    totalAmount: 171820000
  }
];

// ==========================================================================
// HÀNG ĐỢI EMAIL MÔ PHỎNG TỰ ĐỘNG ĐỌC MAIL KẾ TOÁN (SIMULATION QUEUE)
// ==========================================================================
const SIMULATION_EMAILS = [
  {
    id: "sim-email-101",
    senderName: "Cisco Systems Vietnam LLC",
    senderEmail: "einvoice@cisco.com.vn",
    subject: "Hóa đơn điện tử số 78912 - Thiết bị Switch mạng Cisco Catalyst cho TBTECH",
    pdfFileName: "HDDT_Cisco_Catalyst_78912.pdf",
    fileSize: "1.6 MB",
    isImported: false,
    extractedData: {
      invoiceNumber: "78912",
      invoiceDate: "2026-09-09",
      supplierName: "Công ty TNHH Cisco Systems Việt Nam",
      supplierTaxCode: "0303847291",
      supplierAddress: "Tòa nhà Saigon Centre, 65 Lê Lợi, Bến Nghé, Quận 1, TP.HCM",
      supplierPhone: "02838278888",
      customerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
      customerTaxCode: "0111093754",
      customerAddress: "Số 8, Ngõ 387 Phố Vũ Tông Phan, Phường Khương Đình, Thành phố Hà Nội",
      subtotal: 95700000,
      taxAmount: 9570000,
      totalAmount: 105270000,
      notes: "Hóa đơn nhập thiết bị chuyển mạch cốt lõi Cisco bảo hành 3 năm",
      items: [
        {
          itemCode: "CISCO-CBS350-48P",
          itemName: "Switch Cisco Business CBS350-48P-4G 48 Port Gigabit PoE+ 370W",
          unit: "Cái",
          quantity: 3,
          unitPrice: 28500000,
          totalPrice: 85500000,
          taxRate: 10
        },
        {
          itemCode: "PATCH-PANEL-24P",
          itemName: "Thanh đấu nối Patch Panel Cat6 24 Cổng UTP 1U Unloaded AMP/CommScope",
          unit: "Chiếc",
          quantity: 12,
          unitPrice: 850000,
          totalPrice: 10200000,
          taxRate: 10
        }
      ]
    }
  },
  {
    id: "sim-email-102",
    senderName: "Schneider Electric Việt Nam",
    senderEmail: "apc-invoicing@se.com.vn",
    subject: "Hóa đơn điện tử số 14509 - Bộ lưu điện UPS APC Smart-UPS cho TBTECH",
    pdfFileName: "HDDT_APC_UPS_3000VA_14509.pdf",
    fileSize: "1.3 MB",
    isImported: false,
    extractedData: {
      invoiceNumber: "14509",
      invoiceDate: "2026-09-09",
      supplierName: "Công ty Cổ phần Schneider Electric Việt Nam",
      supplierTaxCode: "0104899120",
      supplierAddress: "Tầng 12, Tòa nhà Gelex Tower, 52 Lê Đại Hành, Hai Bà Trưng, Hà Nội",
      supplierPhone: "02439748888",
      customerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
      customerTaxCode: "0111093754",
      customerAddress: "Số 8, Ngõ 387 Phố Vũ Tông Phan, Phường Khương Đình, Thành phố Hà Nội",
      recipientEmail: "ketoan.tbtech387@gmail.com",
      subtotal: 62000000,
      taxAmount: 6200000,
      totalAmount: 68200000,
      notes: "Bộ lưu điện phòng máy chủ dự phòng cho dự án trung tâm dữ liệu",
      items: [
        {
          itemCode: "UPS-APC-3KVA",
          itemName: "Bộ lưu điện UPS APC Smart-UPS SRT 3000VA 230V SRT3000XLI",
          unit: "Bộ",
          quantity: 2,
          unitPrice: 31000000,
          totalPrice: 62000000,
          taxRate: 10
        }
      ]
    }
  },
  {
    id: "sim-email-103",
    senderName: "Công ty TNHH Viettel IDC",
    senderEmail: "billing@viettelidc.com.vn",
    recipientEmail: "ketoan.tbtech387@gmail.com",
    subject: "Hóa đơn điện tử số VT-99210 - Dịch vụ hạ tầng Rack Server & Băng thông gửi ketoan.tbtech387@gmail.com",
    pdfFileName: "HDDT_ViettelIDC_ServerRack_99210.pdf",
    fileSize: "1.1 MB",
    isImported: false,
    extractedData: {
      invoiceNumber: "VT-99210",
      invoiceDate: "2026-09-14",
      supplierName: "Công ty TNHH Viettel IDC",
      supplierTaxCode: "0102721191",
      supplierAddress: "Tầng 16, Tòa nhà Hapulico, Số 1 Nguyễn Huy Tưởng, Thanh Xuân, Hà Nội",
      supplierPhone: "18008088",
      customerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
      customerTaxCode: "0111093754",
      customerAddress: "Số 8, Ngõ 387 Phố Vũ Tông Phan, Phường Khương Đình, Thành phố Hà Nội",
      recipientEmail: "ketoan.tbtech387@gmail.com",
      subtotal: 45000000,
      taxAmount: 4500000,
      totalAmount: 49500000,
      notes: "Hóa đơn dịch vụ thuê kênh truyền và máy chủ gửi hộp thư ketoan.tbtech387@gmail.com",
      items: [
        {
          itemCode: "HP-DL380-GEN11",
          itemName: "Máy chủ HP ProLiant DL380 Gen11 8SFF Server TBTECH",
          unit: "Máy",
          quantity: 1,
          unitPrice: 135000000,
          totalPrice: 135000000,
          taxRate: 10
        }
      ]
    }
  },
  {
    id: "sim-email-104",
    senderName: "Dell Technologies Vietnam",
    senderEmail: "invoicing.vn@dell.com",
    recipientEmail: "ketoan.tbtech387@gmail.com",
    subject: "Hóa đơn VAT số DL-88310 - Laptop Dell Latitude & Linh kiện Server cho TBTECH gửi ketoan.tbtech387@gmail.com",
    pdfFileName: "HDDT_Dell_Latitude_88310.pdf",
    fileSize: "1.5 MB",
    isImported: false,
    extractedData: {
      invoiceNumber: "DL-88310",
      invoiceDate: "2026-09-14",
      supplierName: "Công ty TNHH Dell Global B.V Việt Nam",
      supplierTaxCode: "0305012390",
      supplierAddress: "Tầng 26, Bitexco Financial Tower, Quận 1, TP.HCM",
      supplierPhone: "1800545455",
      customerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
      customerTaxCode: "0111093754",
      customerAddress: "Số 8, Ngõ 387 Phố Vũ Tông Phan, Phường Khương Đình, Thành phố Hà Nội",
      recipientEmail: "ketoan.tbtech387@gmail.com",
      subtotal: 92400000,
      taxAmount: 9240000,
      totalAmount: 101640000,
      notes: "Hóa đơn máy tính xách tay kỹ thuật cao gửi kế toán TBTECH",
      items: [
        {
          itemCode: "DELL-LAT-5540",
          itemName: "Máy tính xách tay Dell Latitude 5540 Core i7-1365U 16GB 512GB",
          unit: "Chiếc",
          quantity: 4,
          unitPrice: 23100000,
          totalPrice: 92400000,
          taxRate: 10
        }
      ]
    }
  }
];

// Bảng ánh xạ từ đồng nghĩa / tên viết tắt thường gặp (Alias Dictionary)
const INITIAL_ALIASES = [
  { raw: "fortigate 100f", sku: "FG-100F-BDL" },
  { raw: "thiet bi tuong lua fortinet fg-100f", sku: "FG-100F-BDL" },
  { raw: "switch buu tran 24 port", sku: "BT-SWITCH-24" },
  { raw: "switch gigabit 24 port", sku: "BT-SWITCH-24" },
  { raw: "laptop dell latitude 5540", sku: "DELL-LAT-5540" },
  { raw: "day cap mang cat6 utp", sku: "VLH-CABLE-CAT6" },
  { raw: "cap mang cat6 utp", sku: "VLH-CABLE-CAT6" },
  { raw: "may hien song tecotec", sku: "TECO-OSCILLOSCOPE" },
  { raw: "may hien song so dso-100mhz", sku: "TECO-OSCILLOSCOPE" },
  { raw: "ram server kingston 32gb", sku: "RAM-DDR5-32GB" },
  { raw: "may chu hp proliant dl380", sku: "HP-DL380-GEN11" }
];
