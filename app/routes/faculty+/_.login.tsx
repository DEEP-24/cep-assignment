import { PasswordInput, TextInput } from "@mantine/core"
import {
  redirect,
  type ActionArgs,
  type LoaderArgs,
  type V2_MetaFunction,
} from "@remix-run/node"
import { Form, useActionData, useSearchParams } from "@remix-run/react"
import { useEffect, useRef } from "react"
import { badRequest } from "remix-utils"
import { verifyFacultyLogin } from "~/models/faculty.server"
import { UserRole } from "~/roles"
import {
  createUserSession,
  getUserId,
  getUserRole,
  isAdmin,
  isStudent,
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
  if (await isStudent(request)) {
    return redirect("/student")
  }

  return null
}

export const action = async ({ request }: ActionArgs) => {
  const formData = await request.formData()
  const email = formData.get("email")
  const password = formData.get("password")
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/")
  const remember = formData.get("remember")

  if (!validateEmail(email)) {
    return badRequest({
      errors: {
        email: "Email is invalid",
        password: null,
      },
    })
  }

  if (typeof password !== "string" || password.length === 0) {
    return badRequest({
      errors: {
        email: null,
        password: "Password is required",
      },
    })
  }

  if (password.length < 8) {
    return badRequest({
      errors: {
        email: null,
        password: "Password is too short",
      },
    })
  }

  const faculty = await verifyFacultyLogin({
    email,
    password,
  })

  if (!faculty) {
    return badRequest({
      errors: {
        email: "Invalid email or password",
        password: null,
      },
    })
  }

  return createUserSession({
    redirectTo,
    remember: remember === "on" ? true : false,
    request,
    userId: faculty.id,
    role: UserRole.FACULTY,
  })
}

export const meta: V2_MetaFunction = () => [{ title: "Login" }]

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") || "/faculty"
  const actionData = useActionData<typeof action>()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (actionData?.errors?.email) {
      emailRef.current?.focus()
    } else if (actionData?.errors?.password) {
      passwordRef.current?.focus()
    }
  }, [actionData])

  return (
    <div className="flex min-h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-md px-8">
        <div className="flex items-center justify-center pb-4 text-3xl">
          <h3>Welcome Faculty!</h3>
        </div>
        <Form method="post" className="space-y-6">
          <TextInput
            ref={emailRef}
            id="email"
            label="Email Address"
            autoFocus={true}
            name="email"
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
            autoComplete="current-password"
            aria-invalid={actionData?.errors?.password ? true : undefined}
            aria-describedby="password-error"
          />
          {actionData?.errors?.password ? (
            <div className="pt-1 text-red-700" id="password-error">
              {actionData.errors.password}
            </div>
          ) : null}

          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button
            type="submit"
            className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:bg-blue-400"
          >
            Log in
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="remember"
                className="ml-2 block text-sm text-gray-900"
              >
                Remember me
              </label>
            </div>
          </div>
        </Form>
      </div>
    </div>
  )
}
