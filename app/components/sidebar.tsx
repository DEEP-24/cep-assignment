import { Menu, Transition } from "@headlessui/react"
import { ChevronDownIcon } from "@heroicons/react/24/solid"
import { Avatar } from "@mantine/core"
import { Form, NavLink } from "@remix-run/react"
import * as React from "react"

type NavItem = {
  title: string
  href: string
  icon: React.ElementType
  current?: boolean
}

type DashboardLayoutProps = {
  userName: string
  userEmail: string
  children: React.ReactNode
  navItems: NavItem[]
}

function classNames(...classes: string[]): string {
  return classes.filter(Boolean).join(" ")
}

export default function Sidebar(props: DashboardLayoutProps) {
  const { children, navItems, userName, userEmail } = props

  return (
    <>
      <Form action="/logout" method="post" id="logout-form" />
      <div>
        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          {/* Sidebar component, swap this element with another sidebar if you like */}
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center gap-4">
              <img
                className="h-8 w-auto bg-white rounded-md"
                src="/img/blackboard-logo.png"
                alt="Blackboard-logo"
              />
              <div className="flex items-center">
                <span className="text-gray-300 tracking-wider text-lg uppercase">
                  Blackboard
                </span>
              </div>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul className="-mx-2 space-y-1">
                    {navItems.map((item) => (
                      <li key={item.title}>
                        <NavLink
                          to={item.href}
                          className={({ isActive }) =>
                            classNames(
                              isActive
                                ? "bg-gray-800 text-white"
                                : "text-gray-400 hover:text-white hover:bg-gray-800",
                              "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold",
                            )
                          }
                        >
                          <item.icon
                            className="h-6 w-6 shrink-0"
                            aria-hidden="true"
                          />
                          {item.title}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="lg:pl-72">
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <div
              className="h-6 w-px bg-gray-900/10 lg:hidden"
              aria-hidden="true"
            />

            <div className="flex flex-1 gap-x-4 self-stretch justify-end lg:gap-x-6">
              <div className="flex items-center gap-x-4 lg:gap-x-6">
                {/* Profile dropdown */}
                <Menu as="div" className="relative">
                  <Menu.Button className="-m-1.5 flex items-center p-1.5">
                    <span className="sr-only">Open user menu</span>
                    <Avatar src={null} alt="" radius="lg" color="gray">
                      {userName.charAt(0)}
                    </Avatar>
                    <span className="hidden lg:flex lg:items-center">
                      <span className="flex flex-col">
                        <span
                          className="ml-4 text-sm font-semibold text-gray-900"
                          aria-hidden="true"
                        >
                          {userName}
                        </span>
                        <span
                          className="ml-4 text-xs text-gray-900"
                          aria-hidden="true"
                        >
                          {userEmail}
                        </span>
                      </span>
                      <ChevronDownIcon
                        className="ml-2 h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </span>
                  </Menu.Button>
                  <Transition
                    as={React.Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                      <Menu.Item>
                        <button
                          type="submit"
                          className="text-sm pl-4"
                          form="logout-form"
                        >
                          Logout
                        </button>
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            </div>
          </div>

          <main className="py-10">
            <div className="px-4 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </>
  )
}
