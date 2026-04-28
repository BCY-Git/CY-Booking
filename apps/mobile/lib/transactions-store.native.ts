import * as SQLite from 'expo-sqlite';
import { sampleTransactions, type Transaction } from '@cy-booking/core';

type TransactionRow = {
  id: string;
  payload: string;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  dbPromise ??= SQLite.openDatabaseAsync('cy-booking.db');
  return dbPromise;
}

function serializeTransaction(transaction: Transaction) {
  return JSON.stringify(transaction);
}

function parseTransaction(row: TransactionRow): Transaction | null {
  try {
    return JSON.parse(row.payload) as Transaction;
  } catch {
    return null;
  }
}

export async function initializeTransactionsStore() {
  const db = await getDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      source_hash TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      amount REAL NOT NULL,
      direction TEXT NOT NULL,
      category TEXT NOT NULL,
      account TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_source_hash
      ON transactions(source_hash);

    CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at
      ON transactions(occurred_at);
  `);
}

export async function loadTransactions(): Promise<Transaction[]> {
  await initializeTransactionsStore();
  const db = await getDb();
  const rows = await db.getAllAsync<TransactionRow>(
    'SELECT id, payload FROM transactions ORDER BY occurred_at DESC, created_at DESC',
  );

  return rows
    .map(parseTransaction)
    .filter((transaction): transaction is Transaction => transaction !== null);
}

export async function saveTransactions(transactions: Transaction[]) {
  if (transactions.length === 0) {
    return;
  }

  await initializeTransactionsStore();
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    for (const transaction of transactions) {
      await db.runAsync(
        `
          INSERT OR REPLACE INTO transactions (
            id,
            source_hash,
            occurred_at,
            amount,
            direction,
            category,
            account,
            payload,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          transaction.id,
          transaction.sourceHash,
          transaction.occurredAt,
          transaction.amount,
          transaction.direction,
          transaction.category,
          transaction.account,
          serializeTransaction(transaction),
          transaction.createdAt,
          transaction.updatedAt,
        ],
      );
    }
  });
}

export async function loadOrSeedTransactions(): Promise<Transaction[]> {
  const existing = await loadTransactions();

  if (existing.length > 0) {
    return existing;
  }

  await saveTransactions(sampleTransactions);
  return sampleTransactions;
}
