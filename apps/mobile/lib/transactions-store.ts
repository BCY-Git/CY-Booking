import { sampleTransactions, type Transaction } from '@cy-booking/core';

const STORAGE_KEY = 'cy-booking.transactions.v1';

function sortTransactions(transactions: Transaction[]) {
  return [...transactions].sort((a, b) => {
    const byOccurredAt = b.occurredAt.localeCompare(a.occurredAt);
    if (byOccurredAt !== 0) {
      return byOccurredAt;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

function readStoredTransactions(): Transaction[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as Transaction[];
  } catch {
    return [];
  }
}

function writeStoredTransactions(transactions: Transaction[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sortTransactions(transactions)));
}

export async function initializeTransactionsStore() {
  return Promise.resolve();
}

export async function loadTransactions(): Promise<Transaction[]> {
  return sortTransactions(readStoredTransactions());
}

export async function saveTransactions(transactions: Transaction[]) {
  if (transactions.length === 0) {
    return;
  }

  const existing = readStoredTransactions();
  const byHash = new Map(existing.map((transaction) => [transaction.sourceHash, transaction]));

  for (const transaction of transactions) {
    byHash.set(transaction.sourceHash, transaction);
  }

  writeStoredTransactions([...byHash.values()]);
}

export async function loadOrSeedTransactions(): Promise<Transaction[]> {
  const existing = await loadTransactions();

  if (existing.length > 0) {
    return existing;
  }

  writeStoredTransactions(sampleTransactions);
  return sampleTransactions;
}
