import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { SchoolSettingsProvider } from "@/lib/schoolSettings";
import { CurrentSchoolProvider } from "@/lib/currentSchool";
import { AuthProvider } from "@/lib/auth";
import { buildTimestamp } from "@/lib/buildInfo";

export const metadata: Metadata = {
  title: "Caerleon Skills Tracker",
  description: "Curriculum mapping visibility system for Curriculum for Wales"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SchoolSettingsProvider>
          <AuthProvider>
            <CurrentSchoolProvider>
              <AppShell buildTimestamp={buildTimestamp}>{children}</AppShell>
            </CurrentSchoolProvider>
          </AuthProvider>
        </SchoolSettingsProvider>
      </body>
    </html>
  );
}
