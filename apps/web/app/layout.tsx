import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CY-Booking',
  description: '账单导入驱动的本地优先智能记账工作台',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
