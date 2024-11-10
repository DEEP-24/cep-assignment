import { redirect, type ActionArgs } from "@remix-run/node"
import { prisma } from "~/lib/db.server"

export async function action({ request }: ActionArgs) {
  const formData = await request.formData()

  const sectionIdToDelete = formData.get("sectionId")?.toString()

  if (!sectionIdToDelete) {
    return redirect("/admin/departments")
  }

  await prisma.section.delete({
    where: {
      id: sectionIdToDelete,
    },
  })

  return redirect("/admin/sections")
}

export async function loader() {
  return redirect("/admin/sections")
}
