import type { LoaderArgs } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { Outlet } from "@remix-run/react"
import {
  Building2,
  GraduationCap,
  Hotel,
  LayoutGrid,
  Rows,
  User2,
} from "lucide-react"
import Sidebar from "~/components/sidebar"
import { prisma } from "~/lib/db.server"
import { isFaculty, isStudent, requireUserId } from "~/session.server"
import { useAdmin } from "~/utils/hooks"

const actions = [
  {
    title: "Courses",
    href: "/admin/courses",
    icon: Rows,
  },
  {
    title: "Faculty",
    href: "/admin/faculties",
    icon: User2,
  },
  {
    title: "Students",
    href: "/admin/students",
    icon: GraduationCap,
    current: false,
  },
  {
    title: "Departments",
    href: "/admin/departments",
    icon: Hotel,
    current: false,
  },
  {
    title: "Sections",
    href: "/admin/sections",
    icon: LayoutGrid,
    current: false,
  },
  {
    title: "Rooms",
    href: "/admin/rooms",
    icon: Building2,
    current: false,
  },
]

export const loader = async ({ request }: LoaderArgs) => {
  await requireUserId(request)

  if (await isFaculty(request)) {
    return redirect("/faculty")
  } else if (await isStudent(request)) {
    return redirect("/student")
  }

  const [sections] = await Promise.all([
    prisma.section.findMany({
      include: {
        timeSlots: true,
      },
    }),
  ])

  return json({
    sections,
  })
}

export default function AdminDashboard() {
  const user = useAdmin()

  return (
    <Sidebar navItems={actions} userName={user.name} userEmail={user.email}>
      <Outlet />
    </Sidebar>
  )
}
