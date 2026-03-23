import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { NavWrapper } from "./nav-wrapper";
import { MobileNav } from "./mobile-nav";
import { PreviewBanner } from "./preview-banner";
import { Watermark } from "@/components/watermark";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    console.error("MainLayout getSessionUser error:", error);
    redirect("/login");
  }
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <NavWrapper user={user} />
      </div>
      <main className="flex-1 overflow-y-auto bg-background">
        {/* Mobile header */}
        <MobileNav user={user} />
        <PreviewBanner />
        <div className="mx-auto max-w-[1200px] px-4 py-4 md:px-8 md:py-6">{children}</div>
      </main>
      <Watermark name={user.name} department={user.department} />
    </div>
  );
}
