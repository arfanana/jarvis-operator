import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/providers";
import { AppShell } from "@/components/layout";
import CommandPalette from "@/components/command-palette";
import { AuthProvider } from "@/components/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import { DataModeBanner } from "@/components/data-mode-banner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = { title: "Jarvis — Sales OS", description: "Dense enterprise sales execution dashboard." };

const themeInit = `(function(){try{var t=localStorage.getItem('jarvis-theme');if(t==='light'){document.documentElement.classList.add('light');document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <DataModeBanner />
            <AuthGuard>{children}</AuthGuard>
          </AuthProvider>
          <CommandPalette />
        </QueryProvider>
      </body>
    </html>
  );
}
