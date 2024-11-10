import type { Faculty } from "@prisma/client"
import * as bcrypt from "bcryptjs"
import { prisma } from "~/lib/db.server"
import { getUserId, logout } from "~/session.server"

export async function verifyFacultyLogin({
  email,
  password,
}: {
  email: Faculty["email"]
  password: string
}) {
  const facultyWithPassword = await prisma.faculty.findUnique({
    where: { email },
  })

  if (!facultyWithPassword || !facultyWithPassword.password) {
    return null
  }

  const isValid = await bcrypt.compare(password, facultyWithPassword.password)

  if (!isValid) {
    return null
  }

  const { password: _password, ...facultyWithoutPassword } = facultyWithPassword

  return facultyWithoutPassword
}

export async function getFacultyById(id: Faculty["id"]) {
  return prisma.faculty.findUnique({
    where: { id },
  })
}

export async function getFaculty(request: Request) {
  const facultyId = await getUserId(request)
  if (facultyId === undefined) return null

  const faculty = await getFacultyById(facultyId)
  if (faculty) return faculty

  throw await logout(request)
}
