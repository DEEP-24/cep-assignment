/* eslint-disable @typescript-eslint/no-unused-vars */
import { PlusIcon } from "@heroicons/react/24/solid"
import { Button, NumberInput, Select, TextInput } from "@mantine/core"
import type { ActionFunction, LoaderArgs } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { useFetcher, useLoaderData } from "@remix-run/react"
import { badRequest } from "remix-utils"
import { z } from "zod"
import { TailwindContainer } from "~/components/tailwind-container"
import { prisma } from "~/lib/db.server"
import type { inferErrors } from "~/utils/validation"
import { validateAction } from "~/utils/validation"
import * as React from "react"
import PageHeading from "~/components/page-heading"

const EditCourseSchema = z.object({
  courseId: z.string().optional(),
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(3, "Description must be at least 3 characters"),
  code: z.string().min(3, "Code must be at least 3 characters"),
  credit_hours: z.string().min(1, "Credit hours must be at least 3"),
  departmentId: z.string().min(3, "Department must be at least 3 characters"),
  semesterId: z.string().min(3, "Semester must be at least 3 characters"),
})

export async function loader({ params }: LoaderArgs) {
  const courseToEdit = await prisma.course.findFirst({
    where: {
      id: params.id,
    },
  })

  if (!courseToEdit) {
    return redirect("/admin/courses")
  }

  const semesters = await prisma.semester.findMany()
  const departments = await prisma.department.findMany()
  return json({ semesters, departments, courseToEdit })
}

interface ActionData {
  success: boolean
  fieldErrors?: inferErrors<typeof EditCourseSchema>
}

export const action: ActionFunction = async ({ request }) => {
  const { fields, fieldErrors } = await validateAction(
    request,
    EditCourseSchema,
  )

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors })
  }

  const {
    name,
    description,
    code,
    credit_hours,
    departmentId,
    semesterId,
    courseId,
  } = fields

  await prisma.course.update({
    where: {
      id: courseId,
    },
    data: {
      name: name,
      description: description,
      code: code,
      credit_hours: parseInt(credit_hours),
      departmentId: departmentId,
      semesterId: semesterId,
    },
  })

  return redirect("/admin/courses")
}

export default function EditCourse() {
  const { courseToEdit, semesters, departments } =
    useLoaderData<typeof loader>()

  const fetcher = useFetcher<ActionData>()
  const isSubmitting = fetcher.state !== "idle"

  const [departmentId, setDepartmentId] = React.useState<string>("")
  const [semesterId, setSemesterId] = React.useState<string>("")

  return (
    <>
      <PageHeading
        title="Edit Course"
        subtitle="Edit the course details."
        showBackButton
        to="/admin/courses"
        rightSection={
          <button
            type="submit"
            form="form"
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <span>Update</span>
          </button>
        }
      />

      <div className="p-8 grid grid-cols-2 gap-12">
        <fetcher.Form
          id="form"
          method="post"
          replace
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            fetcher.submit(formData, {
              method: "post",
              replace: true,
            })
          }}
        >
          <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
            <input hidden name="courseId" defaultValue={courseToEdit?.id} />
            <TextInput
              readOnly
              name="name"
              label="Name"
              placeholder="Enter the name"
              defaultValue={courseToEdit?.name}
              error={fetcher.data?.fieldErrors?.name}
              required
            />
            <TextInput
              name="description"
              label="Description"
              placeholder="Enter the description"
              defaultValue={courseToEdit?.description}
              error={fetcher.data?.fieldErrors?.description}
              required
            />
            <TextInput
              readOnly
              name="code"
              label="Code"
              defaultValue={courseToEdit?.code}
              placeholder="Enter the code"
              error={fetcher.data?.fieldErrors?.code}
              required
            />
            <NumberInput
              name="credit_hours"
              label="Credit_hours"
              type="text"
              placeholder="Enter the credit_hours"
              defaultValue={courseToEdit?.credit_hours}
              error={fetcher.data?.fieldErrors?.credit_hours}
              required
            />
            <Select
              name="departmentId"
              label="Department"
              defaultValue={courseToEdit?.departmentId}
              onChange={(e) => {
                setDepartmentId(e as string)
              }}
              data={departments.map((department) => ({
                value: department.id,
                label: department.name,
              }))}
              error={fetcher.data?.fieldErrors?.departmentId}
              required
            />
            <Select
              name="semesterId"
              label="Semester"
              defaultValue={courseToEdit?.semesterId}
              onChange={(e) => {
                setSemesterId(e as string)
              }}
              error={fetcher.data?.fieldErrors?.semesterId}
              data={semesters.map((semester) => ({
                value: semester.id,
                label: semester.name,
              }))}
              required
            />
          </fieldset>
        </fetcher.Form>
      </div>
    </>
  )
}
