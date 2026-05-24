export const API_BASE_URL = "http://localhost:3001";

export async function fetchPaymentLinks() {
  const response = await fetch(`${API_BASE_URL}/payment-links`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить платежные ссылки");
  }

  return response.json();
}

export async function createPaymentLink(payload: {
  title: string;
  amount: number;
  payerType: string;
}) {
  const response = await fetch(`${API_BASE_URL}/payment-links`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Не удалось создать платежную ссылку");
  }

  return response.json();
}
export async function fetchTransactions() {
  const response = await fetch(`${API_BASE_URL}/transactions`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить операции");
  }

  return response.json();
}

export async function createTransaction(payload: {
  title: string;
  client: string;
  amount: number;
  tax: number;
  date: string;
}) {
  const response = await fetch(`${API_BASE_URL}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Не удалось создать операцию");
  }

  return response.json();
}
export async function fetchReceipts() {
  const response = await fetch(`${API_BASE_URL}/receipts`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить чеки");
  }

  return response.json();
}

export async function createReceipt(payload: {
  title: string;
  client: string;
  amount: number;
  status: "ISSUED" | "PENDING" | "FAILED";
  date: string;
}) {
  const response = await fetch(`${API_BASE_URL}/receipts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Не удалось создать чек");
  }

  return response.json();
}
export async function fetchPaymentLinkById(id: string) {
  const response = await fetch(`${API_BASE_URL}/payment-links/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить ссылку");
  }

  return response.json();
}
export async function fetchTransactionById(id: string) {
  const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить операцию");
  }

  return response.json();
}
export async function fetchReceiptById(id: string) {
  const response = await fetch(`${API_BASE_URL}/receipts/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить чек");
  }

  return response.json();
}
export async function simulatePayment(paymentLinkId: string) {
  const response = await fetch(
    `${API_BASE_URL}/payment-links/${paymentLinkId}/simulate-payment`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error("Не удалось сымитировать оплату");
  }

  return response.json();
}
export async function fetchDashboard() {
  const response = await fetch(`${API_BASE_URL}/dashboard`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить dashboard");
  }

  return response.json();
}