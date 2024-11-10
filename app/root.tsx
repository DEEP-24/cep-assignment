import { MantineProvider, createEmotionCache } from "@mantine/core"
import { ModalsProvider } from "@mantine/modals"
import { StylesPlaceholder } from "@mantine/remix"
import { cssBundleHref } from "@remix-run/css-bundle"
import type {
  LinksFunction,
  LoaderArgs,
  SerializeFrom,
  V2_MetaFunction,
} from "@remix-run/node"
import { json } from "@remix-run/node"
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "@remix-run/react"
import { Toaster } from "sonner"
import { getAdmin } from "~/models/admin.server"
import { getFaculty } from "~/models/faculty.server"
import { getStudent } from "~/models/student.server"
import { UserRole } from "~/roles"
import { getUserId, getUserRole } from "~/session.server"
import stylesheet from "~/tailwind.css"

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
]

export type RootLoaderData = SerializeFrom<typeof loader>
export const loader = async ({ request }: LoaderArgs) => {
  const userId = await getUserId(request)
  const userRole = await getUserRole(request)

  let response: {
    admin: Awaited<ReturnType<typeof getAdmin>>
    faculty: Awaited<ReturnType<typeof getFaculty>>
    student: Awaited<ReturnType<typeof getStudent>>
    ENV: {
      AWS_REGION?: string
      AWS_BUCKET?: string
    }
  } = {
    admin: null,
    faculty: null,
    student: null,
    ENV: {
      AWS_REGION: process.env.AWS_REGION,
      AWS_BUCKET: process.env.AWS_BUCKET,
    },
  }
  if (!userId || !userRole) {
    return json(response)
  }

  if (userRole === UserRole.ADMIN) {
    response.admin = await getAdmin(request)
  } else if (userRole === UserRole.FACULTY) {
    response.faculty = await getFaculty(request)
  } else if (userRole === UserRole.STUDENT) {
    response.student = await getStudent(request)
  }

  return json(response)
}

export const meta: V2_MetaFunction = () => [
  {
    charset: "utf-8",
    title: "Blackboard",
    viewport: "width=device-width,initial-scale=1",
  },
]

const stylesCache = createEmotionCache({ key: "mantine", prepend: false })

export default function App() {
  const data = useLoaderData<typeof loader>()
  return (
    <MantineProvider withNormalizeCSS emotionCache={stylesCache}>
      <html lang="en" className="h-full">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <StylesPlaceholder />
          <Meta />
          <Links />
        </head>
        <body className="h-full">
          <ModalsProvider>
            <Outlet />
          </ModalsProvider>
          <ScrollRestoration />
          <Scripts />
          <LiveReload />
          <Toaster />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.ENV = ${JSON.stringify(data.ENV)}`,
            }}
          />
        </body>
      </html>
    </MantineProvider>
  )
}

export function ErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
      </div>
    )
  } else if (error instanceof Error) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
      </div>
    )
  } else {
    return <h1>Unknown Error</h1>
  }
}
