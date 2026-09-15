import type { Metadata } from 'next';
import { Inter, Merriweather } from 'next/font/google';
import '@/styles/globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const merriweather = Merriweather({
  weight: ['400', '700', '900'],
  subsets: ['latin'],
  variable: '--font-merriweather',
});

export const metadata: Metadata = {
  title: 'Gurukul Kurukshetra - Entrance Examination & Management Portal (2026-27)',
  description:
    'Official Online Entrance Examination and Admission Portal for Gurukul Kurukshetra. Apply online for Classes 5th, 6th, 7th, 8th, 9th, 11th & NDA Wing. Fee payment, admit card download, and live merit results.',
  icons: {
    icon: '/favicon.ico',
    apple: '/logo-gurukul.png',
  },
  keywords: [
    'Gurukul Kurukshetra',
    'Gurukul Entrance Exam 2026',
    'Gurukul Admission Portal',
    'Gurukul Kurukshetra Admit Card',
    'NDA Wing Gurukul Kurukshetra',
    'CBSE School Kurukshetra',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${merriweather.variable} scroll-smooth`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="font-sans min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
