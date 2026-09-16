/**
 * TBTECH VWM - DATA ENGINE & SEED DATABASE
 * Thông tin cấu hình doanh nghiệp, danh mục kho hàng, khách hàng, hóa đơn mẫu & lịch sử
 * Phiên bản: Chuẩn TBTECH 2026 (Thiết bị Van, Khí nén SMC, Cáp điện & Vật tư công nghiệp)
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
  status: "CONNECTED",
  connectedAt: "2026-09-16 08:30",
  authMethod: "GOOGLE_OAUTH_GIS",
  clientId: "tbtech-wms-oauth-client.apps.googleusercontent.com",
  accessToken: "",
  appPassword: "",
  imapServer: "imap.gmail.com",
  imapPort: 993,
  lastScanTime: "Vừa khởi chạy",
  autoSync: true,
  queryFilter: "has:attachment (filename:pdf OR subject:hóa đơn)"
};

// DANH MỤC VẬT TƯ KHO HÀNG CHUẨN TBTECH
const INITIAL_PRODUCTS = [
  {
    id: "prod-001",
    sku: "VAN-MST21-12",
    name: "Van an toàn (Bẫy hơi) MST21 , 1/2\"",
    category: "Thiết bị van & Khí nén",
    unit: "Cái",
    inStock: 25,
    minStock: 5,
    costPrice: 7200000,
    sellPrice: 8750000,
    location: "Kệ V1 - Tầng 1",
    supplier: "Công ty TNHH Thiết Bị Van & Phụ Kiện Công Nghiệp Á Châu",
    specs: "Van an toàn kiêm bẫy hơi đồng tiền MST21 ren 1/2 inch, PN16/25 chịu nhiệt và áp lực cao",
    serialNumber: "MST21-2026-088",
    invoiceNumber: "VALVE-9912",
    updatedAt: "2026-08-25"
  },
  {
    id: "prod-002",
    sku: "XL-CY3R32-200",
    name: "Xi lanh khí nén CY3R32*200",
    category: "Thiết bị van & Khí nén",
    unit: "Cái",
    inStock: 30,
    minStock: 5,
    costPrice: 2850000,
    sellPrice: 3450000,
    location: "Kệ K2 - Tầng 2",
    supplier: "SMC Pneumatics (Vietnam) Co., Ltd",
    specs: "Xi lanh từ tính không trục (Magnetically Coupled Rodless Cylinder) phi 32 hành trình 200mm",
    serialNumber: "CY3R32-200-SN09",
    invoiceNumber: "SMC-002891",
    updatedAt: "2026-08-27"
  },
  {
    id: "prod-003",
    sku: "XL-CY3R32H-250",
    name: "Xi lanh khí nén CY3R32H*250",
    category: "Thiết bị van & Khí nén",
    unit: "Cái",
    inStock: 20,
    minStock: 3,
    costPrice: 3150000,
    sellPrice: 3760000,
    location: "Kệ K2 - Tầng 2",
    supplier: "SMC Pneumatics (Vietnam) Co., Ltd",
    specs: "Xi lanh từ tính không trục chịu tải cao phi 32 hành trình 250mm SMC Japan",
    serialNumber: "CY3R32H-250-SN02",
    invoiceNumber: "SMC-002891",
    updatedAt: "2026-08-27"
  },
  {
    id: "prod-004",
    sku: "XL-CY3R32H-320",
    name: "Xi lanh khí nén CY3R32H*320",
    category: "Thiết bị van & Khí nén",
    unit: "Cái",
    inStock: 15,
    minStock: 3,
    costPrice: 3400000,
    sellPrice: 4100000,
    location: "Kệ K2 - Tầng 3",
    supplier: "SMC Pneumatics (Vietnam) Co., Ltd",
    specs: "Xi lanh từ tính không trục chịu tải cao phi 32 hành trình 320mm",
    serialNumber: "CY3R32H-320-SN02",
    invoiceNumber: "SMC-002891",
    updatedAt: "2026-08-27"
  },
  {
    id: "prod-005",
    sku: "XL-CY3R32-150",
    name: "Xi lanh khí nén CY3R32*150",
    category: "Thiết bị van & Khí nén",
    unit: "Cái",
    inStock: 20,
    minStock: 4,
    costPrice: 2950000,
    sellPrice: 3650000,
    location: "Kệ K2 - Tầng 1",
    supplier: "SMC Pneumatics (Vietnam) Co., Ltd",
    specs: "Xi lanh từ tính không trục phi 32 hành trình 150mm SMC chính hãng",
    serialNumber: "CY3R32-150-SN01",
    invoiceNumber: "SMC-002891",
    updatedAt: "2026-08-27"
  },
  {
    id: "prod-006",
    sku: "PK-FESTO-QS",
    name: "Đầu nối nhanh khí nén Festo QS-1/4-8 ren ngoài",
    category: "Phụ kiện khí nén",
    unit: "Cái",
    inStock: 100,
    minStock: 20,
    costPrice: 45000,
    sellPrice: 65000,
    location: "Kệ Phụ Kiện P1",
    supplier: "Festo Automation Vietnam",
    specs: "Khớp nối nhanh ống 8mm ren G1/4 áp lực max 14 bar",
    serialNumber: "FESTO-QS148-99",
    invoiceNumber: "FESTO-8821",
    updatedAt: "2026-09-01"
  },
  {
    id: "prod-007",
    sku: "DH-AP-WISE",
    name: "Đồng hồ đo áp suất màng inox Wise 0-10 bar ren 1/2\"",
    category: "Thiết bị đo lường",
    unit: "Chiếc",
    inStock: 16,
    minStock: 3,
    costPrice: 1250000,
    sellPrice: 1650000,
    location: "Tủ Thiết Bị Đo C1",
    supplier: "Công ty Cổ phần Đo Lường Công Nghiệp Wise",
    specs: "Mặt 100mm vỏ inox 304 chân đứng ren 1/2 NPT dải đo 0-10 kgf/cm2",
    serialNumber: "WISE-P252-091",
    invoiceNumber: "WISE-7712",
    updatedAt: "2026-09-02"
  },
  {
    id: "prod-008",
    sku: "VLH-CABLE-CAT6",
    name: "Cáp mạng UTP Cat6 Chống Nhiễu FTP (Thùng 305m đồng nguyên chất)",
    category: "Vật tư điện & Cáp",
    unit: "Thùng",
    inStock: 35,
    minStock: 5,
    costPrice: 2400000,
    sellPrice: 3100000,
    location: "Khu B - Sàn Kho",
    supplier: "CÔNG TY TNHH THƯƠNG MẠI VÀ XÂY LẮP ĐIỆN VINH LONG HẢI",
    specs: "Đường kính lõi 0.57mm đồng nguyên chất 23AWG cuộn 305m",
    serialNumber: "VLH-C6-305M-882",
    invoiceNumber: "2542",
    updatedAt: "2026-09-07"
  }
];

// DANH MỤC KHÁCH HÀNG
const INITIAL_CUSTOMERS = [
  {
    id: "cust-001",
    name: "Công ty TNHH Một thành viên Thế Hệ Mới Phú Thọ",
    shortName: "Thế Hệ Mới Phú Thọ",
    taxCode: "2600663228",
    address: "Khu 4, Xã Phú Lộc, Huyện Phù Ninh, Tỉnh Phú Thọ, Việt Nam",
    phone: "02103889988",
    email: "thehemoi.phutho@gmail.com",
    contactPerson: "Trần Văn Toàn",
    contactRole: "Trưởng phòng Vật tư Nhà máy",
    ordersCount: 6,
    totalSpent: 185000000
  },
  {
    id: "cust-002",
    name: "CÔNG TY TNHH CÔNG NGHỆ HAKKEN",
    shortName: "Hakken Tech",
    taxCode: "0801029593",
    address: "Số 66 phố Ngô Quyền, Phường Máy Chai, Quận Ngô Quyền, Thành phố Hải Phòng, Việt Nam",
    phone: "02253882299",
    email: "procurement@hakkentech.vn",
    contactPerson: "Nguyễn Nhật Nam",
    contactRole: "Giám đốc Kỹ thuật & Mua sắm",
    ordersCount: 9,
    totalSpent: 260000000
  },
  {
    id: "cust-003",
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
    id: "cust-004",
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
  }
];

// HÓA ĐƠN ĐẦU VÀO MẪU (INBOX / HỘP THƯ KẾ TOÁN MUA VÀO TỪ NCC)
const INITIAL_INBOX = [
  {
    id: "email-001",
    senderName: "SMC Pneumatics (Vietnam) Co., Ltd",
    senderEmail: "orders@smc-vietnam.com.vn",
    subject: "Hóa đơn điện tử số SMC-002891 - Lô Xi lanh khí nén SMC CY3R32 các loại cho TBTECH",
    receivedDate: "2026-08-20 09:30",
    pdfFileName: "HDDT_SMC_CY3R32_002891.pdf",
    fileSize: "1.2 MB",
    isImported: true,
    extractedData: {
      invoiceNumber: "SMC-002891",
      invoiceDate: "2026-08-20",
      supplierName: "SMC Pneumatics (Vietnam) Co., Ltd",
      supplierTaxCode: "0305678901",
      supplierAddress: "Khu công nghiệp Long Đức, Long Thành, Đồng Nai",
      supplierPhone: "02513514800",
      customerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
      customerTaxCode: "0111093754",
      customerAddress: "Số 8, Ngõ 387 Phố Vũ Tông Phan, Phường Khương Đình, Thành phố Hà Nội",
      subtotal: 116200000,
      taxAmount: 9296000,
      totalAmount: 125496000,
      notes: "Hóa đơn nhập thiết bị xi lanh khí nén từ nhà sản xuất SMC Vietnam",
      items: [
        {
          itemCode: "XL-CY3R32-200",
          itemName: "Xi lanh khí nén CY3R32*200",
          unit: "Cái",
          quantity: 15,
          unitPrice: 2850000,
          totalPrice: 42750000,
          taxRate: 8
        },
        {
          itemCode: "XL-CY3R32H-250",
          itemName: "Xi lanh khí nén CY3R32H*250",
          unit: "Cái",
          quantity: 10,
          unitPrice: 3150000,
          totalPrice: 31500000,
          taxRate: 8
        },
        {
          itemCode: "XL-CY3R32H-320",
          itemName: "Xi lanh khí nén CY3R32H*320",
          unit: "Cái",
          quantity: 8,
          unitPrice: 3400000,
          totalPrice: 27200000,
          taxRate: 8
        },
        {
          itemCode: "XL-CY3R32-150",
          itemName: "Xi lanh khí nén CY3R32*150",
          unit: "Cái",
          quantity: 5,
          unitPrice: 2950000,
          totalPrice: 14750000,
          taxRate: 8
        }
      ]
    }
  },
  {
    id: "email-002",
    senderName: "Công ty TNHH Thiết Bị Van & Phụ Kiện Công Nghiệp Á Châu",
    senderEmail: "ketoan@achau-valves.com.vn",
    subject: "Hóa đơn GTGT số VALVE-9912 - Lô Van an toàn bẫy hơi MST21 giao TBTECH",
    receivedDate: "2026-08-22 14:15",
    pdfFileName: "HDDT_VanAnToan_MST21_9912.pdf",
    fileSize: "1.4 MB",
    isImported: true,
    extractedData: {
      invoiceNumber: "VALVE-9912",
      invoiceDate: "2026-08-22",
      supplierName: "Công ty TNHH Thiết Bị Van & Phụ Kiện Công Nghiệp Á Châu",
      supplierTaxCode: "0108765432",
      supplierAddress: "Số 92 Đường Giải Phóng, Phương Mai, Đống Đa, Hà Nội",
      supplierPhone: "02438699988",
      customerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
      customerTaxCode: "0111093754",
      customerAddress: "Số 8, Ngõ 387 Phố Vũ Tông Phan, Phường Khương Đình, Thành phố Hà Nội",
      subtotal: 144000000,
      taxAmount: 11520000,
      totalAmount: 155520000,
      notes: "Hóa đơn lô van an toàn bẫy hơi MST21 ren 1/2 inch",
      items: [
        {
          itemCode: "VAN-MST21-12",
          itemName: "Van an toàn (Bẫy hơi) MST21 , 1/2\"",
          unit: "Cái",
          quantity: 20,
          unitPrice: 7200000,
          totalPrice: 144000000,
          taxRate: 8
        }
      ]
    }
  },
  {
    id: "email-003",
    senderName: "CÔNG TY TNHH THƯƠNG MẠI VÀ XÂY LẮP ĐIỆN VINH LONG HẢI",
    senderEmail: "ketoan@vinhlonghai.com.vn",
    subject: "Fwd: Hóa đơn điện tử số 2542 - CÔNG TY TNHH THƯƠNG MẠI VÀ XÂY LẮP ĐIỆN VINH LONG HẢI",
    receivedDate: "2026-09-07 09:45",
    pdfFileName: "HDDT_2542_VinhLongHai.pdf",
    fileSize: "1.5 MB",
    isImported: true,
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
      subtotal: 28800000,
      taxAmount: 2880000,
      totalAmount: 31680000,
      notes: "Hóa đơn vật tư điện & cáp mạng Vinh Long Hải (gửi 8/9, hóa đơn ngày 7/9)",
      items: [
        {
          itemCode: "VLH-CABLE-CAT6",
          itemName: "Cáp mạng UTP Cat6 Chống Nhiễu FTP (Thùng 305m đồng nguyên chất)",
          unit: "Thùng",
          quantity: 12,
          unitPrice: 2400000,
          totalPrice: 28800000,
          taxRate: 10
        }
      ]
    }
  }
];

// HÓA ĐƠN ĐẦU RA MẪU (SALES INVOICES / BÁN RA CHO KHÁCH HÀNG TỪ TBTECH)
const SAMPLE_SALES_INVOICES = [
  {
    id: "sale-inv-171",
    invoiceNumber: "00000171",
    invoiceSeries: "1C26TBT",
    invoiceDate: "2026-08-27",
    buyerName: "CÔNG TY TNHH CÔNG NGHỆ HAKKEN",
    buyerTaxCode: "0801029593",
    buyerAddress: "Số 66 phố Ngô Quyền, Phường Máy Chai, Quận Ngô Quyền, Thành phố Hải Phòng, Việt Nam",
    sellerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
    sellerTaxCode: "0111093754",
    pdfFileName: "0111093754_1C26TBT_171_0801029593_27-08-2026.pdf",
    items: [
      {
        lineNo: 1,
        rawName: "Xi lanh khí nén CY3R32*200",
        matchedSku: "XL-CY3R32-200",
        unit: "Cái",
        quantity: 9,
        unitPrice: 3450000,
        totalPrice: 31050000
      },
      {
        lineNo: 2,
        rawName: "Xi lanh khí nén CY3R32H*250",
        matchedSku: "XL-CY3R32H-250",
        unit: "Cái",
        quantity: 2,
        unitPrice: 3760000,
        totalPrice: 7520000
      },
      {
        lineNo: 3,
        rawName: "Xi lanh khí nén CY3R32H*320",
        matchedSku: "XL-CY3R32H-320",
        unit: "Cái",
        quantity: 2,
        unitPrice: 4100000,
        totalPrice: 8200000
      },
      {
        lineNo: 4,
        rawName: "Xi lanh khí nén CY3R32*150",
        matchedSku: "XL-CY3R32-150",
        unit: "Cái",
        quantity: 1,
        unitPrice: 3650000,
        totalPrice: 3650000
      }
    ],
    subtotal: 50420000,
    taxRate: 8,
    taxAmount: 4033600,
    totalAmount: 54453600
  },
  {
    id: "sale-inv-170",
    invoiceNumber: "00000170",
    invoiceSeries: "1C26TBT",
    invoiceDate: "2026-08-25",
    buyerName: "Công ty TNHH Một thành viên Thế Hệ Mới Phú Thọ",
    buyerTaxCode: "2600663228",
    buyerAddress: "Khu 4, Xã Phú Lộc, Huyện Phù Ninh, Tỉnh Phú Thọ, Việt Nam",
    sellerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
    sellerTaxCode: "0111093754",
    pdfFileName: "0111093754_1C26TBT_170_2600663228_25-08-2026.pdf",
    items: [
      {
        lineNo: 1,
        rawName: "Van an toàn (Bẫy hơi) MST21 , 1/2\"",
        matchedSku: "VAN-MST21-12",
        unit: "Cái",
        quantity: 8,
        unitPrice: 8750000,
        totalPrice: 70000000
      }
    ],
    subtotal: 70000000,
    taxRate: 8,
    taxAmount: 5600000,
    totalAmount: 75600000
  },
  {
    id: "sale-inv-172",
    invoiceNumber: "00000172",
    invoiceSeries: "1C26TBT",
    invoiceDate: "2026-09-08",
    buyerName: "Tập Đoàn Bưu Chính Viễn Thông Việt Nam (VNPT)",
    buyerTaxCode: "0100684378",
    buyerAddress: "Tòa nhà VNPT, số 57 Huỳnh Thúc Kháng, Đống Đa, Hà Nội",
    sellerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
    sellerTaxCode: "0111093754",
    pdfFileName: "HDDT_BANRA_0172_VNPT.pdf",
    items: [
      {
        lineNo: 1,
        rawName: "Cáp mạng UTP Cat6 Chống Nhiễu FTP (Thùng 305m đồng nguyên chất)",
        matchedSku: "VLH-CABLE-CAT6",
        unit: "Thùng",
        quantity: 10,
        unitPrice: 3100000,
        totalPrice: 31000000
      }
    ],
    subtotal: 31000000,
    taxAmount: 3100000,
    totalAmount: 34100000
  }
];

// HÀNG ĐỢI EMAIL MÔ PHỎNG TỰ ĐỘNG ĐỌC MAIL KẾ TOÁN (SIMULATION QUEUE)
const SIMULATION_EMAILS = [
  {
    id: "sim-email-101",
    senderName: "Festo Automation Vietnam",
    senderEmail: "billing@festo.com.vn",
    recipientEmail: "ketoan.tbtech387@gmail.com",
    subject: "Hóa đơn điện tử số FESTO-8821 - Phụ kiện đầu nối khí nén gửi ketoan.tbtech387@gmail.com",
    pdfFileName: "HDDT_Festo_DauNoi_8821.pdf",
    fileSize: "1.1 MB",
    isImported: false,
    extractedData: {
      invoiceNumber: "FESTO-8821",
      invoiceDate: "2026-09-15",
      supplierName: "Festo Automation Vietnam",
      supplierTaxCode: "0303889911",
      supplierAddress: "Tòa nhà MapleTree, Quận 7, TP.HCM",
      supplierPhone: "02854161111",
      customerName: "CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH",
      customerTaxCode: "0111093754",
      customerAddress: "Số 8, Ngõ 387 Phố Vũ Tông Phan, Phường Khương Đình, Thành phố Hà Nội",
      recipientEmail: "ketoan.tbtech387@gmail.com",
      subtotal: 4500000,
      taxAmount: 360000,
      totalAmount: 4860000,
      notes: "Hóa đơn đầu nối nhanh khí nén Festo gửi kế toán TBTECH",
      items: [
        {
          itemCode: "PK-FESTO-QS",
          itemName: "Đầu nối nhanh khí nén Festo QS-1/4-8 ren ngoài",
          unit: "Cái",
          quantity: 100,
          unitPrice: 45000,
          totalPrice: 4500000,
          taxRate: 8
        }
      ]
    }
  }
];

// Bảng ánh xạ từ đồng nghĩa / tên viết tắt thường gặp (Alias Dictionary)
const INITIAL_ALIASES = [
  { raw: "van an toan (bay hoi) mst21 , 1/2\"", sku: "VAN-MST21-12" },
  { raw: "bay hoi mst21", sku: "VAN-MST21-12" },
  { raw: "van an toan mst21", sku: "VAN-MST21-12" },
  { raw: "van mst21 1/2", sku: "VAN-MST21-12" },
  { raw: "xi lanh khi nen cy3r32*200", sku: "XL-CY3R32-200" },
  { raw: "xi lanh cy3r32*200", sku: "XL-CY3R32-200" },
  { raw: "xi lanh khi nen cy3r32h*250", sku: "XL-CY3R32H-250" },
  { raw: "xi lanh cy3r32h*250", sku: "XL-CY3R32H-250" },
  { raw: "xi lanh khi nen cy3r32h*320", sku: "XL-CY3R32H-320" },
  { raw: "xi lanh cy3r32h*320", sku: "XL-CY3R32H-320" },
  { raw: "xi lanh khi nen cy3r32*150", sku: "XL-CY3R32-150" },
  { raw: "xi lanh cy3r32*150", sku: "XL-CY3R32-150" },
  { raw: "dau noi nhanh festo qs-1/4-8", sku: "PK-FESTO-QS" },
  { raw: "dau noi festo", sku: "PK-FESTO-QS" },
  { raw: "dong ho do ap suat mang wise", sku: "DH-AP-WISE" },
  { raw: "dong ho wise 0-10 bar", sku: "DH-AP-WISE" },
  { raw: "day cap mang cat6 utp", sku: "VLH-CABLE-CAT6" },
  { raw: "cap mang cat6 utp", sku: "VLH-CABLE-CAT6" }
];

// LỊCH SỬ GIAO DỊCH BAN ĐẦU
const INITIAL_HISTORY = [
  {
    id: "tx-001",
    type: "IMPORT",
    title: "Nhập kho lô Xi lanh khí nén SMC CY3R32 theo HĐ SMC-002891",
    referenceNumber: "SMC-002891",
    partnerName: "SMC Pneumatics (Vietnam) Co., Ltd",
    date: "2026-08-20 10:15",
    totalAmount: 125496000,
    items: [
      { name: "Xi lanh khí nén CY3R32*200", quantity: 15, unit: "Cái", price: 2850000 },
      { name: "Xi lanh khí nén CY3R32H*250", quantity: 10, unit: "Cái", price: 3150000 }
    ],
    performedBy: "Nguyễn Văn Khoa"
  },
  {
    id: "tx-002",
    type: "IMPORT",
    title: "Nhập kho lô Van an toàn Bẫy hơi MST21 theo HĐ VALVE-9912",
    referenceNumber: "VALVE-9912",
    partnerName: "Công ty TNHH Thiết Bị Van & Phụ Kiện Công Nghiệp Á Châu",
    date: "2026-08-22 15:30",
    totalAmount: 155520000,
    items: [
      { name: "Van an toàn (Bẫy hơi) MST21 , 1/2\"", quantity: 20, unit: "Cái", price: 7200000 }
    ],
    performedBy: "Nguyễn Văn Khoa"
  },
  {
    id: "tx-003",
    type: "EXPORT",
    title: "Xuất kho bán hàng cho Công ty TNHH Một thành viên Thế Hệ Mới Phú Thọ",
    referenceNumber: "00000170",
    partnerName: "Công ty TNHH Một thành viên Thế Hệ Mới Phú Thọ",
    date: "2026-08-25 11:00",
    totalAmount: 75600000,
    items: [
      { name: "Van an toàn (Bẫy hơi) MST21 , 1/2\"", quantity: 8, unit: "Cái", price: 8750000 }
    ],
    performedBy: "Bửu Trần"
  },
  {
    id: "tx-004",
    type: "EXPORT",
    title: "Xuất kho bán hàng cho CÔNG TY TNHH CÔNG NGHỆ HAKKEN",
    referenceNumber: "00000171",
    partnerName: "CÔNG TY TNHH CÔNG NGHỆ HAKKEN",
    date: "2026-08-27 16:20",
    totalAmount: 54453600,
    items: [
      { name: "Xi lanh khí nén CY3R32*200", quantity: 9, unit: "Cái", price: 3450000 },
      { name: "Xi lanh khí nén CY3R32H*250", quantity: 2, unit: "Cái", price: 3760000 },
      { name: "Xi lanh khí nén CY3R32H*320", quantity: 2, unit: "Cái", price: 4100000 },
      { name: "Xi lanh khí nén CY3R32*150", quantity: 1, unit: "Cái", price: 3650000 }
    ],
    performedBy: "Bửu Trần"
  }
];

// CHỨNG TỪ BAN ĐẦU
const INITIAL_DOCUMENTS = [
  {
    id: "doc-001",
    type: "PXK",
    code: "PXK-2026-0170",
    title: "Phiếu xuất kho kiêm vận chuyển nội bộ - Thế Hệ Mới Phú Thọ",
    createdAt: "2026-08-25 11:30",
    customerName: "Công ty TNHH Một thành viên Thế Hệ Mới Phú Thọ",
    customerTaxCode: "2600663228",
    customerAddress: "Khu 4, Xã Phú Lộc, Huyện Phù Ninh, Tỉnh Phú Thọ, Việt Nam",
    totalAmount: 75600000,
    items: [
      { sku: "VAN-MST21-12", name: "Van an toàn (Bẫy hơi) MST21 , 1/2\"", unit: "Cái", quantity: 8, unitPrice: 8750000, totalPrice: 70000000 }
    ]
  },
  {
    id: "doc-002",
    type: "PXK",
    code: "PXK-2026-0171",
    title: "Phiếu xuất kho kiêm vận chuyển nội bộ - CÔNG TY TNHH CÔNG NGHỆ HAKKEN",
    createdAt: "2026-08-27 16:45",
    customerName: "CÔNG TY TNHH CÔNG NGHỆ HAKKEN",
    customerTaxCode: "0801029593",
    customerAddress: "Số 66 phố Ngô Quyền, Phường Máy Chai, Quận Ngô Quyền, Thành phố Hải Phòng",
    totalAmount: 54453600,
    items: [
      { sku: "XL-CY3R32-200", name: "Xi lanh khí nén CY3R32*200", unit: "Cái", quantity: 9, unitPrice: 3450000, totalPrice: 31050000 },
      { sku: "XL-CY3R32H-250", name: "Xi lanh khí nén CY3R32H*250", unit: "Cái", quantity: 2, unitPrice: 3760000, totalPrice: 7520000 },
      { sku: "XL-CY3R32H-320", name: "Xi lanh khí nén CY3R32H*320", unit: "Cái", quantity: 2, unitPrice: 4100000, totalPrice: 8200000 },
      { sku: "XL-CY3R32-150", name: "Xi lanh khí nén CY3R32*150", unit: "Cái", quantity: 1, unitPrice: 3650000, totalPrice: 3650000 }
    ]
  }
];
