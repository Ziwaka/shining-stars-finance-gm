// ─────────────────────────────────────────────
//  VoucherRaw — Google Apps Script / API မှ တိုက်ရိုက်လာသော raw data
//  Field names: case-insensitive ဖြစ်အောင် alternative ပါရှိသည်
// ─────────────────────────────────────────────
export interface VoucherRaw {
  // Date
  date?: string;
  Date?: string;

  // Voucher number
  voucher_no?: string | number;
  voucherno?: string | number;

  // Type (Cash In / Cash Out)
  type?: string;
  Type?: string;

  // Account
  account?: string;
  Account?: string;

  // Category
  category?: string;
  Category?: string;

  // Sub-categories
  sub_1?: string;  sub1?: string;
  sub_2?: string;  sub2?: string;
  sub_3?: string;  sub3?: string;
  sub_4?: string;  sub4?: string;
  sub_5?: string;  sub5?: string;

  // Item description
  item_description?: string;
  item?: string;

  // Vendor / Supplier
  vendor?: string;
  Vendor?: string;

  // Note / Remark
  note?: string;
  Note?: string;

  // Cost — GAS column header variants
  'cost_(total)'?: number | string;
  cost_total?: number | string;
  Cost_Total?: number | string;

  // Image (Cloudinary URL or base64)
  image_data?: string;
  Image_Data?: string;

  // Entered by
  entered_by?: string;
  Entered_By?: string;
}

// ─────────────────────────────────────────────
//  Voucher — normalizedData ပြောင်းပြီးနောက် သုံးသော normalized type
// ─────────────────────────────────────────────
export interface Voucher {
  date: string;
  month: string;
  voucherno: string;
  type: string;           // 'Cash In' | 'Cash Out'
  account: string;
  category: string;
  sub1: string;
  sub2: string;
  sub3: string;
  sub4: string;
  sub5: string;
  item: string;
  vendor: string;
  note: string;
  cost_total: number;
  image_data: string;
  entered_by: string;
}

// ─────────────────────────────────────────────
//  DashboardAnalytics — useMemo analytics shape
// ─────────────────────────────────────────────
export interface DashboardAnalytics {
  totalIn: number;
  totalOut: number;
  balance: number;
  categories: { name: string; value: number }[];
  dailyTrends: { date: string; income: number; expense: number }[];
  monthlyTrends: { month: string; income: number; expense: number }[];
}
