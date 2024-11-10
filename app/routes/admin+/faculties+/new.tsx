/* eslint-disable @typescript-eslint/no-unused-vars */
import { PlusIcon } from "@heroicons/react/24/solid"
import { Button, PasswordInput, Select, TextInput } from "@mantine/core"
import type { ActionFunction } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { useFetcher, useLoaderData } from "@remix-run/react"
import * as React from "react"
import { badRequest } from "remix-utils"
import { z } from "zod"
import PageHeading from "~/components/page-heading"
import { TailwindContainer } from "~/components/tailwind-container"
import { prisma } from "~/lib/db.server"
import { createPasswordHash } from "~/session.server"
import { validateAction, type inferErrors } from "~/utils/validation"

const CreateFacultySchema = z
  .object({
    facultyId: z.string().optional(),
    name: z.string().min(3, "Name must be at least 3 characters"),
    departmentId: z.string(),
    email: z.string().email("Please enter a valid email"),
    password: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.facultyId && !data.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password is required",
        path: ["password"],
      })

      return z.NEVER
    }

    if (data.password) {
      if (data.password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password must be at least 8 characters",
          path: ["password"],
        })

        return z.NEVER
      }
    }
  })

export async function loader() {
  const departments = await prisma.department.findMany({})
  return json({ departments })
}

interface ActionData {
  success: boolean
  fieldErrors?: inferErrors<typeof CreateFacultySchema>
}

export const action: ActionFunction = async ({ request }) => {
  const { fields, fieldErrors } = await validateAction(
    request,
    CreateFacultySchema,
  )

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors })
  }

  const { email, name, password, departmentId } = fields

  await prisma.faculty.create({
    data: {
      email,
      name,
      password: await createPasswordHash(password!),
      department: {
        connect: {
          id: departmentId,
        },
      },
    },
  })

  return redirect("/admin/faculties")
}

export default function CreateFaculty() {
  const { departments } = useLoaderData<typeof loader>()

  const fetcher = useFetcher<ActionData>()

  const [departmentId, setDepartmentId] = React.useState<string | null>(null)

  const isSubmitting = fetcher.state !== "idle"

  return (
    <>
      <PageHeading
        title="Create Faculty"
        subtitle="A form to create a new faculty"
        showBackButton
        to="/admin/faculties"
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
            <Select
              name="departmentId"
              label="Department"
              placeholder="Select the department"
              onChange={(e) => setDepartmentId(e as string)}
              error={fetcher.data?.fieldErrors?.departmentId}
              data={departments.map((department) => ({
                value: department.id,
                label: department.name,
              }))}
              required
            />
            <TextInput
              name="email"
              type="email"
              label="Email"
              placeholder="Enter the email"
              error={fetcher.data?.fieldErrors?.email}
              required
            />
            <PasswordInput
              name="password"
              label="Password"
              placeholder="Enter a password"
              error={fetcher.data?.fieldErrors?.password}
              required
            />
          </fieldset>
        </fetcher.Form>
      </div>
    </>
  )
}
