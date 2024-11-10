import { json } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import { prisma } from "~/lib/db.server"

export async function loader() {
  const students = await prisma.student.findMany({})

  return json({ students })
}

export default function AdminFacultyPage() {
  const { students } = useLoaderData<typeof loader>()

  return (
    <>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            Manage Students
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all the Students.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <li
              key={student.id}
              className="col-span-1 rounded-lg bg-white shadow"
            >
              <div className="flex w-full items-center justify-between space-x-6 p-6">
                <div className="flex-1 truncate">
                  <p className="mt-1 truncate text-sm text-gray-500">
                    <span className="font-bold">Name:</span> {student.name}
                  </p>
                  <p className="mt-1 truncate text-sm text-gray-500">
                    <span className="font-bold">Email:</span> {student.email}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
