import { TextInput } from "@mantine/core"
import type { ActionFunction, LoaderArgs } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { useFetcher, useLoaderData } from "@remix-run/react"
import { badRequest } from "remix-utils"
import { z } from "zod"
import PageHeading from "~/components/page-heading"
import { prisma } from "~/lib/db.server"
import { validateAction, type inferErrors } from "~/utils/validation"

const EditDepartmentSchema = z.object({
  departmentId: z.string().optional(),
  name: z.string().min(3, "Name must be at least 3 characters"),
})

export async function loader({ params }: LoaderArgs) {
  const departmentToEdit = await prisma.department.findUnique({
    where: {
      id: params.id,
    },
  })

  if (!departmentToEdit) {
    return redirect("/admin/departments")
  }

  const departments = await prisma.department.findMany({})
  return json({ departmentToEdit, departments })
}

interface ActionData {
  success: boolean
  fieldErrors?: inferErrors<typeof EditDepartmentSchema>
}

export const action: ActionFunction = async ({ request }) => {
  const { fields, fieldErrors } = await validateAction(
    request,
    EditDepartmentSchema,
  )

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors })
  }

  const { name, departmentId } = fields

  const departmentWithSameName = await prisma.department.findFirst({
    where: {
      name: {
        equals: name,
      },
      NOT: {
        id: departmentId,
      },
    },
  })

  if (departmentWithSameName) {
    return badRequest<ActionData>({
      success: false,
      fieldErrors: {
        name: "Department name already exists",
      },
    })
  }

  if (departmentId) {
    await prisma.department.update({
      where: {
        id: departmentId,
      },

      data: {
        name,
      },
    })
  }

  return redirect("/admin/departments")
}

export default function AdminDepartment() {
  const { departmentToEdit } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<ActionData>()

  const isSubmitting = fetcher.state !== "idle"

  return (
    <>
      <PageHeading
        title="Edit Department"
        subtitle="Edit the department details"
        showBackButton
        to="/admin/departments"
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
            <input
              type="hidden"
              name="departmentId"
              value={departmentToEdit?.id}
            />
            <TextInput
              name="name"
              label="Name"
              defaultValue={departmentToEdit?.name}
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
