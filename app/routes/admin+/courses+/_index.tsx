import { json } from "@remix-run/node"
import { Form, NavLink, useLoaderData } from "@remix-run/react"
import { PencilIcon, Trash2Icon } from "lucide-react"
import { prisma } from "~/lib/db.server"

export async function loader() {
  const courses = await prisma.course.findMany({
    include: {
      department: true,
      semester: true,
    },
  })
  const semesters = await prisma.semester.findMany({})
  const departments = await prisma.department.findMany({})

  return json({ courses, semesters, departments })
}

export default function ManageCourses() {
  const { courses } = useLoaderData<typeof loader>()

  return (
    <>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold leading-6 text-gray-900">
            Courses
          </h1>
          <p className="mt-1 text-sm text-gray-700">
            A List of all the courses.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <NavLink
            to={`/admin/courses/new`}
            type="button"
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Add Course
          </NavLink>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <li
              key={course.id}
              className="col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow"
            >
              <div className="flex w-full items-center justify-between space-x-6 p-6">
                <div className="flex-1 truncate">
                  <div className="flex items-center space-x-3">
                    <h3 className="truncate text-lg font-medium text-gray-900">
                      {course.name}
                    </h3>
                  </div>
                  <p className="mt-1 truncate text-sm text-gray-500">
                    <span className="font-bold">Code:</span> {course.code}
                  </p>
                  <p className="mt-1 truncate text-sm text-gray-500">
                    <span className="font-bold">Credit-Hours:</span>{" "}
                    {course.credit_hours}
                  </p>
                  <p className="mt-1 truncate text-sm text-gray-500">
                    <span className="font-bold">Semester:</span>{" "}
                    {course.semester.name}
                  </p>
                </div>
              </div>
              <div>
                <div className="-mt-px flex divide-x divide-gray-200">
                  <div className="flex w-0 flex-1">
                    <NavLink
                      to={`/admin/courses/edit/${course.id}`}
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
                        action="/resources/delete-course"
                        className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-transparent py-4 text-sm font-semibold text-gray-900"
                      >
                        <Trash2Icon className="h-5 w-5 text-gray-400" />
                        <button type="submit" name="courseId" value={course.id}>
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
