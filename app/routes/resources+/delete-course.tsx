import { redirect, type ActionArgs } from "@remix-run/node"
import { prisma } from "~/lib/db.server"

export async function action({ request }: ActionArgs) {
  const formData = await request.formData()

  const courseIdToDelete = formData.get("courseId")?.toString()

  if (!courseIdToDelete) {
    return redirect("/admin/courses")
  }

  await prisma.course.delete({
    where: {
      id: courseIdToDelete,
    },
  })

  return redirect("/admin/courses")
}

export async function loader() {
  return redirect("/")
}
