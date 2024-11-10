import { redirect, type ActionArgs } from "@remix-run/node"
import { prisma } from "~/lib/db.server"

export async function action({ request }: ActionArgs) {
  const formData = await request.formData()

  const roomIdToDelete = formData.get("roomId")?.toString()

  if (!roomIdToDelete) {
    return redirect("/admin/departments")
  }

  await prisma.room.delete({
    where: {
      id: roomIdToDelete,
    },
  })

  return redirect("/admin/rooms")
}

export async function loader() {
  return redirect("/admin/rooms")
}
