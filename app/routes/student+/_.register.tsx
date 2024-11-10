import { PasswordInput, TextInput } from "@mantine/core"
import type { ActionArgs, LoaderArgs, V2_MetaFunction } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react"
import { useEffect, useRef } from "react"
import { createStudent } from "~/models/student.server"
import { UserRole } from "~/roles"
import {
  createUserSession,
  getUserId,
  getUserRole,
  isAdmin,
  isFaculty,
} from "~/session.server"
import { safeRedirect, validateEmail } from "~/utils"

export async function loader({ request }: LoaderArgs) {
  const userId = await getUserId(request)
  const userRole = await getUserRole(request)

  if (!userId || !userRole) {
    return null
  }

  if (await isAdmin(request)) {
    return redirect("/admin")
  }

  if (await isFaculty(request)) {
    return redirect("/faculty")
  }

  return null
}

export const action = async ({ request }: ActionArgs) => {
  const formData = await request.formData()
  const email = formData.get("email")
  const password = formData.get("password")
  const name = formData.get("name")
  const banner_no = formData.get("banner_no")
  const dob = formData.get("dob")
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/student")

  if (!validateEmail(email)) {
    return json(
      {
        errors: {
          email: "Email is invalid",
          password: null,
          banner_no: null,
          name: null,
          dob: null,
        },
      },
      { status: 400 },
    )
  }

  if (typeof password !== "string" || password.length === 0) {
    return json(
      {
        errors: {
          email: null,
          password: "Password is required",
          banner_no: null,
          name: null,
          dob: null,
        },
      },
      { status: 400 },
    )
  }

  if (password.length < 8) {
    return json(
      {
        errors: {
          email: null,
          password: "Password is too short",
          banner_no: null,
          name: null,
          dob: null,
        },
      },
      { status: 400 },
    )
  }

  if (typeof name !== "string" || name.length === 0) {
    return json(
      {
        errors: {
          name: "Name is required",
          email: null,
          password: null,
          banner_no: null,
          dob: null,
        },
      },
      { status: 400 },
    )
  }

  if (typeof banner_no !== "string" || banner_no.length === 0) {
    return json(
      {
        errors: {
          banner_no: "Banner Number is required",
          name: null,
          email: null,
          password: null,
          dob: null,
        },
      },
      { status: 400 },
    )
  }

  if (typeof banner_no !== "string" || banner_no.length !== 9) {
    return json(
      {
        errors: {
          banner_no: "Banner Number must be 9 digits",
          name: null,
          email: null,
          password: null,
          dob: null,
        },
      },
      { status: 400 },
    )
  }

  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(String(dob))) {
    return json(
      {
        errors: {
          dob: "Date of Birth is required and should be in format YYYY-MM-DD",
          name: null,
          email: null,
          password: null,
          banner_no: null,
        },
      },
      { status: 400 },
    )
  }

  const user = await createStudent({
    email,
    password,
    name,
    banner_no,
    dob: new Date(String(dob)),
  })

  return createUserSession({
    redirectTo,
    remember: false,
    request,
    userId: user.id,
    role: UserRole.STUDENT,
  })
}

export const meta: V2_MetaFunction = () => [{ title: "Sign Up" }]

export default function Register() {
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") ?? undefined
  const actionData = useActionData<typeof action>()
  const emailRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)
  const dobRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (actionData?.errors?.email) {
      emailRef.current?.focus()
    } else if (actionData?.errors?.name) {
      nameRef.current?.focus()
    } else if (actionData?.errors?.password) {
      passwordRef.current?.focus()
    } else if (actionData?.errors?.banner_no) {
      bannerRef.current?.focus()
    } else if (actionData?.errors?.dob) {
      dobRef.current?.focus()
    }
  }, [actionData?.errors])

  return (
    <div className="flex min-h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-md px-8">
        <Form method="post" className="space-y-6">
          <TextInput
            id="name"
            ref={nameRef}
            name="name"
            type="text"
            label="Name"
            autoComplete="new-name"
            aria-invalid={actionData?.errors?.name ? true : undefined}
            aria-describedby="name-error"
          />
          {actionData?.errors?.name ? (
            <div className="pt-1 text-red-700" id="name-error">
              {actionData.errors.name}
            </div>
          ) : null}

          <TextInput
            ref={emailRef}
            id="email"
            autoFocus={true}
            name="email"
            label="Email Address"
            type="email"
            autoComplete="email"
            aria-invalid={actionData?.errors?.email ? true : undefined}
            aria-describedby="email-error"
          />
          {actionData?.errors?.email ? (
            <div className="pt-1 text-red-700" id="email-error">
              {actionData.errors.email}
            </div>
          ) : null}

          <PasswordInput
            id="password"
            ref={passwordRef}
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            aria-invalid={actionData?.errors?.password ? true : undefined}
            aria-describedby="password-error"
          />
          {actionData?.errors?.password ? (
            <div className="pt-1 text-red-700" id="password-error">
              {actionData.errors.password}
            </div>
          ) : null}

          <TextInput
            id="banner_no"
            ref={bannerRef}
            name="banner_no"
            label="Banner Number"
            type="text"
            autoComplete="new-banner"
            aria-invalid={actionData?.errors?.banner_no ? true : undefined}
            aria-describedby="banner_no-error"
          />
          {actionData?.errors?.banner_no ? (
            <div className="pt-1 text-red-700" id="banner_no-error">
              {actionData.errors.banner_no}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="dob"
              className="block text-sm font-medium text-gray-700"
            >
              Date of Birth
            </label>
            <div className="mt-1">
              <input
                id="dob"
                ref={dobRef}
                name="dob"
                type="date"
                autoComplete="new-dob"
                aria-invalid={actionData?.errors?.dob ? true : undefined}
                aria-describedby="dob-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {actionData?.errors?.dob ? (
                <div className="pt-1 text-red-700" id="dob-error">
                  {actionData.errors.dob}
                </div>
              ) : null}
            </div>
          </div>

          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button
            type="submit"
            className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:bg-blue-400"
          >
            Create Account
          </button>
          <div className="flex items-center justify-center">
            <div className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                className="text-blue-500 underline"
                to={{
                  pathname: "/student/login",
                  search: searchParams.toString(),
                }}
              >
                Log in
              </Link>
            </div>
          </div>
        </Form>
      </div>
    </div>
  )
}
