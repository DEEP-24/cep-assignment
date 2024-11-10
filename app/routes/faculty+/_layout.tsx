import type { LoaderArgs } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { Outlet } from "@remix-run/react"
import { LayoutGrid } from "lucide-react"
import Sidebar from "~/components/sidebar"
import { isAdmin, isStudent, requireUserId } from "~/session.server"
import { useFaculty } from "~/utils/hooks"
const actions = [
  {
    title: "Sections",
    href: "/faculty/sections",
    icon: LayoutGrid,
    current: false,
  },
]

export const loader = async ({ request }: LoaderArgs) => {
  await requireUserId(request)

  if (await isAdmin(request)) {
    return redirect("/admin")
  } else if (await isStudent(request)) {
    return redirect("/student")
  }
  return json({})
}

export default function FacultyDashboard() {
  const user = useFaculty()
  return (
    <Sidebar navItems={actions} userName={user.name} userEmail={user.email}>
      <Outlet />
    </Sidebar>
  )
}
