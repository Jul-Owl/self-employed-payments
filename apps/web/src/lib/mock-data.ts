export type PaymentItem = {
  id: string;
  title: string;
  amount: number;
  type: string;
  status: string;
};

export type TransactionItem = {
  id: string;
  title: string;
  client: string;
  amount: number;
  tax: number;
  date: string;
};

export type ReceiptItem = {
  id: string;
  title: string;
  client: string;
  amount: number;
  status: "ISSUED" | "PENDING" | "FAILED";
  date: string;
};

export const payments: PaymentItem[] = [
  {
    id: "1",
    title: "Оплата консультации",
    amount: 1500,
    type: "Физлицо",
    status: "active",
  },
  {
    id: "2",
    title: "Оплата аренды",
    amount: 35000,
    type: "Физлицо",
    status: "active",
  },
];

export const transactions: TransactionItem[] = [
  {
    id: "t1",
    title: "Оплата занятия",
    client: "Иван",
    amount: 5000,
    tax: 200,
    date: "сегодня",
  },
  {
    id: "t2",
    title: "Оплата консультации",
    client: "Анна",
    amount: 3000,
    tax: 120,
    date: "вчера",
  },
];

export const receipts: ReceiptItem[] = [
  {
    id: "r1",
    title: "Оплата занятия",
    client: "Иван",
    amount: 5000,
    status: "ISSUED",
    date: "сегодня",
  },
  {
    id: "r2",
    title: "Оплата консультации",
    client: "Анна",
    amount: 3000,
    status: "PENDING",
    date: "вчера",
  },
  {
    id: "r3",
    title: "Оплата аренды",
    client: "Мария",
    amount: 35000,
    status: "FAILED",
    date: "14 апр",
  },
];