import { redirect, type ActionArgs } from "@remix-run/node"
import { prisma } from "~/lib/db.server"

export async function action({ request }: ActionArgs) {
  const formData = await request.formData()

  const departmentIdToDelete = formData.get("departmentId")?.toString()

  if (!departmentIdToDelete) {
    return redirect("/admin/departments")
  }

  await prisma.department.delete({
    where: {
      id: departmentIdToDelete,
    },
  })

  return redirect("/admin/departments")
}

export async function loader() {
  return redirect("/admin/departments")
}
