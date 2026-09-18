import type { Metadata } from 'next';
import { Inter, Merriweather } from 'next/font/google';
import '@/styles/globals.css';
import AppShell from '@/components/AppShell';
import AdmitCardReleasePopup from '@/components/AdmitCardReleasePopup';

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
  title: 'GURUKUL - Entrance Examination & Admission Portal (2027-28)',
  description:
    'Official Online Entrance Examination and Admission Portal for GURUKUL (Nilokheri, Jyotisar, Aryakulam). Apply online for Classes 6th, 7th, 8th, 9th, and 11th with online ₹800 fee payment, immediate Admission form, and admit card download.',
  icons: {
    icon: '/favicon.ico',
    apple: '/logo-gurukul.png',
  },
  keywords: [
    'Gurukul Nilokheri',
    'Gurukul Jyotisar',
    'Aryakulam Nilokheri',
    'Gurukul Entrance Exam 2026',
    'Gurukul Admission Portal',
    'Gurukul Admit Card',
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Safeguard: Intercept third-party browser extension content-script errors from bubbling to Next.js dev overlay
              if (typeof window !== 'undefined') {
                window.addEventListener('error', function(event) {
                  var fn = event.filename || '';
                  var msg = event.message || '';
                  if (fn.indexOf('chrome-extension://') !== -1 || fn.indexOf('moz-extension://') !== -1 || msg.indexOf('M_ID') !== -1) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                    return true;
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(event) {
                  var r = event.reason;
                  if (r && ((r.stack && r.stack.indexOf('chrome-extension://') !== -1) || (r.message && r.message.indexOf('M_ID') !== -1))) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                    return true;
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body className="font-sans text-slate-900 bg-slate-50 antialiased">
        <AdmitCardReleasePopup />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
