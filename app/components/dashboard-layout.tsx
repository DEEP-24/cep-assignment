import { Form, NavLink } from "@remix-run/react"
import { cn } from "~/utils/misc"

type NavItem = {
  title: string
  description: string
  href: string
}

type DashboardLayoutProps = {
  userName: string
  userEmail: string
  children: React.ReactNode
  navItems: NavItem[]
}

export function DashboardLayout(props: DashboardLayoutProps) {
  const { children, navItems, userName, userEmail } = props

  return (
    <div className="flex h-full">
      <div className="flex  w-60 flex-col justify-between bg-slate-200">
        <div className="flex h-24 items-center justify-center gap-2 p-5 ">
          <div className="flex h-6 w-14 items-center justify-center">
            <img src="/img/user-icon.png" alt="user-icon" />
          </div>
          <div className="flex flex-col items-center justify-center rounded-md border-gray-200">
            <p>{userName}</p>
            <p>{userEmail}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {navItems.map((action, idx) => (
            <div
              className="flex flex-col items-center justify-center gap-6"
              key={idx}
            >
              <NavLink
                to={action.href}
                className={({ isActive }) =>
                  cn(
                    "flex w-52 flex-col items-center justify-center rounded-xl border-2 bg-slate-300 p-2 hover:bg-slate-100",
                    isActive && "bg-gray-400",
                  )
                }
              >
                <div>
                  <p className="text-lg text-black">{action.title}</p>
                  <p className="text-sm text-slate-500">{action.description}</p>
                </div>
              </NavLink>
            </div>
          ))}
        </div>
        <div className="mb-5 flex items-center justify-center p-5">
          <Form action="/logout" method="post">
            <button
              type="submit"
              className="rounded bg-slate-400 px-4 py-2 text-gray-800  hover:bg-slate-700 hover:text-slate-400"
            >
              Logout
            </button>
          </Form>
        </div>
      </div>
      <div className="flex-1 p-3 h-screen overflow-y-auto">{children}</div>
    </div>
  )
}
