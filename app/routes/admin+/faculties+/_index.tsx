import { PencilIcon } from "@heroicons/react/24/solid"
import { json } from "@remix-run/node"
import { Form, NavLink, useLoaderData } from "@remix-run/react"
import { Trash2Icon } from "lucide-react"
import { prisma } from "~/lib/db.server"

export async function loader() {
  const faculties = await prisma.faculty.findMany({
    include: {
      department: true,
    },
  })
  const departments = await prisma.department.findMany({})
  return json({ faculties, departments })
}

export default function ManageFaculties() {
  const { faculties } = useLoaderData<typeof loader>()

  return (
    <>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            Faculties
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            A List of all the faculties.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <NavLink
            to={`/admin/faculties/new`}
            type="button"
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Add Faculty
          </NavLink>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {faculties.map((faculty) => (
            <li
              key={faculty.email}
              className="col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow"
            >
              <div className="flex w-full items-center justify-between space-x-6 p-6">
                <div className="flex-1 truncate">
                  <div className="flex items-center space-x-3">
                    <h3 className="truncate text-sm font-medium text-gray-900">
                      {faculty.name}
                    </h3>
                    <span className="inline-flex flex-shrink-0 items-center rounded-full bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      faculty
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-gray-500">
                    {faculty.email}
                  </p>
                </div>
              </div>
              <div>
                <div className="-mt-px flex divide-x divide-gray-200">
                  <div className="flex w-0 flex-1">
                    <NavLink
                      to={`/admin/faculties/edit/${faculty.id}`}
                      className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 text-sm font-semibold text-gray-900"
                    >
                      <PencilIcon className="h-5 w-5 text-gray-400" />
                      Edit
                    </NavLink>
                  </div>
                  <div className="-ml-px flex w-0 flex-1">
                    <div className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 text-sm font-semibold text-gray-900">
                      <Form
                        method="post"
                        action="/resources/delete-faculty"
                        className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-transparent py-4 text-sm font-semibold text-gray-900"
                      >
                        <Trash2Icon className="h-5 w-5 text-gray-400" />
                        <button
                          type="submit"
                          name="facultyId"
                          value={faculty.id}
                        >
                          Delete
                        </button>
                      </Form>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
