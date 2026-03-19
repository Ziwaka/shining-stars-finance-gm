// ─── Voucher type ────────────────────────────────────────────
export interface Voucher {
  date: string;
  month: string;
  voucherno: string;
  type: 'Cash In' | 'Cash Out';
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
  account: string;
}

export interface VoucherRaw {
  date?: string; Date?: string;
  voucher_no?: string; voucherno?: string;
  type?: string; Type?: string;
  category?: string; Category?: string;
  sub_1?: string; sub1?: string;
  sub_2?: string; sub2?: string;
  sub_3?: string; sub3?: string;
  sub_4?: string; sub4?: string;
  sub_5?: string; sub5?: string;
  item_description?: string; item?: string;
  vendor?: string; Vendor?: string;
  note?: string; Note?: string;
  'cost_(total)'?: string | number;
  cost_total?: string | number;
  Cost_Total?: string | number;
  income?: string | number;
  Income?: string | number;
  image_data?: string; Image_Data?: string;
  entered_by?: string; Entered_By?: string;
  account?: string; Account?: string;
}

export interface DashboardAnalytics {
  totalIn: number;
  totalOut: number;
  balance: number;
  categories: { name: string; value: number }[];
  dailyTrends: { date: string; income: number; expense: number }[];
  monthlyTrends: { month: string; income: number; expense: number }[];
}
