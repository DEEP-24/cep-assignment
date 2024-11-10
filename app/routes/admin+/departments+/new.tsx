import { PlusIcon } from "@heroicons/react/24/solid"
import { TextInput } from "@mantine/core"
import type { ActionFunction } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { useFetcher } from "@remix-run/react"
import { badRequest } from "remix-utils"
import { z } from "zod"
import PageHeading from "~/components/page-heading"
import { prisma } from "~/lib/db.server"
import { validateAction, type inferErrors } from "~/utils/validation"

const CreateDepartmentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
})

export async function loader() {
  const departments = await prisma.department.findMany({})
  return json({ departments })
}

interface ActionData {
  success: boolean
  fieldErrors?: inferErrors<typeof CreateDepartmentSchema>
}

export const action: ActionFunction = async ({ request }) => {
  const { fields, fieldErrors } = await validateAction(
    request,
    CreateDepartmentSchema,
  )

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors })
  }

  const { name } = fields

  const departmentWithSameName = await prisma.department.findFirst({
    where: {
      name: name,
    },
  })

  if (departmentWithSameName) {
    return badRequest<ActionData>({
      success: false,
      fieldErrors: {
        name: "A department with this name already exists",
      },
    })
  }

  await prisma.department.create({
    data: {
      name,
    },
  })

  return redirect("/admin/departments")
}

export default function AdminDepartment() {
  const fetcher = useFetcher<ActionData>()

  const isSubmitting = fetcher.state !== "idle"

  return (
    <>
      <PageHeading
        title="Create Department"
        subtitle="A form to create a new department"
        showBackButton
        to="/admin/departments"
        rightSection={
          <button
            type="submit"
            form="form"
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <div className="flex gap-0 items-center">
              <PlusIcon className="h-4 w-4" />
              <span className="ml-2">Create</span>
            </div>
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
            <TextInput
              name="name"
              label="Name"
              placeholder="Enter the name"
              error={fetcher.data?.fieldErrors?.name}
              required
            />
          </fieldset>
        </fetcher.Form>
      </div>
    </>
  )
}
