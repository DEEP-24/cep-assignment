import { redirect, type ActionArgs } from "@remix-run/node"
import { prisma } from "~/lib/db.server"

export async function action({ request }: ActionArgs) {
  const formData = await request.formData()

  const facultyIdToDelete = formData.get("facultyId")?.toString()

  if (!facultyIdToDelete) {
    return redirect("/admin/faculties")
  }

  await prisma.faculty.delete({
    where: {
      id: facultyIdToDelete,
    },
  })

  return redirect("/admin/faculties")
}

export async function loader() {
  return redirect("/admin/faculties")
}
