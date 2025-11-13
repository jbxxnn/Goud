import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ProfileDropdown from "@/components/kokonutui/profile-dropdown"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Get the current user (server-side authenticated)
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  // If not authenticated, redirect to login
  if (authError || !authUser) {
    redirect('/auth/login');
  }

  // Get user data directly from the database using server client
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();
  
  // If user not found in database, redirect to login
  if (userError || !user) {
    redirect('/auth/login');
  }

  // Prepare profile data for the dropdown
  // Default avatar as SVG data URI (simple user icon)
  const defaultAvatar = 'data:image/svg+xml;base64,' + Buffer.from(
    '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#e5e7eb"/><circle cx="50" cy="35" r="15" fill="#9ca3af"/><path d="M20 85 Q20 70 50 70 Q80 70 80 85 L80 100 L20 100 Z" fill="#9ca3af"/></svg>'
  ).toString('base64');
  
  const profileData = {
    name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'User',
    email: user.email || '',
    avatar: user.avatar || defaultAvatar, // Default avatar until profile picture upload is implemented
  };

  return (
    <SidebarProvider>
      <AppSidebar userRole={user.role as 'admin' | 'staff' | 'midwife' | 'client'} />
      <SidebarInset>
        <header className="flex h-14 items-center justify-between gap-2 border-b bg-background px-4 relative z-50">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-2 h-6" />
          </div>
          <div className="flex items-center relative z-[100]">
            <ProfileDropdown data={profileData} />
          </div>
        </header>
        <div className="flex-1 p-4 relative z-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
