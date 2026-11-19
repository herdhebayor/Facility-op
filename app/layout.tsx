import type { Metadata } from "next";
import "./globals.css";
import Aside from '@/components/Aside';
import NavBar from '@/components/NavBar';
import ChatWidget from '@/components/ChatWidget';
import SessionExpiryGuard from '@/components/SessionExpiryGuard';
import ThemeProvider from '@/components/ThemeProvider';
import { getSessionUser } from '@/lib/auth';



export const metadata: Metadata = {
  title: "Facility Op",
  description: "Facility Management",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  


  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <body className="h-screen min-h-155 overflow-hidden flex flex-col text-md md:text-sm">
        <ThemeProvider>
        <div className="max-w-screen min-h-screen flex relative">
          <Aside />
          <div className="w-full min-h-screen overflow-auto relative">
            <NavBar user={user} />
            {children}
            <ChatWidget />
            {/* <SessionExpiryGuard /> */}
          </div>
        </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
