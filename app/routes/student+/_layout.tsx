import type { LoaderArgs } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { Outlet } from "@remix-run/react"
import { LayoutGrid, LucideLayoutGrid } from "lucide-react"
import Sidebar from "~/components/sidebar"
import { isAdmin, isFaculty, requireUserId } from "~/session.server"
import { useStudent } from "~/utils/hooks"

const actions = [
  {
    title: "My Sections",
    href: "/student/my-sections",
    icon: LayoutGrid,
  },
  {
    title: "All Sections",
    href: "/student/all-sections",
    icon: LucideLayoutGrid,
  },
]

export const loader = async ({ request }: LoaderArgs) => {
  await requireUserId(request)

  if (await isAdmin(request)) {
    return redirect("/admin")
  } else if (await isFaculty(request)) {
    return redirect("/faculty")
  }
  return json({})
}

export default function StudentDashboard() {
  const user = useStudent()

  return (
    <Sidebar navItems={actions} userName={user.name} userEmail={user.email}>
      <Outlet />
    </Sidebar>
  )
}
