import type { Student } from "@prisma/client"
import * as bcrypt from "bcryptjs"
import { prisma } from "~/lib/db.server"
import { createPasswordHash, getUserId, logout } from "~/session.server"

export async function verifyStudentLogin({
  email,
  password,
}: {
  email: Student["email"]
  password: string
}) {
  const studentWithPassword = await prisma.student.findUnique({
    where: { email },
  })

  if (!studentWithPassword || !studentWithPassword.password) {
    return null
  }

  const isValid = await bcrypt.compare(password, studentWithPassword.password)

  if (!isValid) {
    return null
  }

  const { password: _password, ...studentWithoutPassword } = studentWithPassword

  return studentWithoutPassword
}

export async function createStudent({
  email,
  password,
  name,
  banner_no,
  dob,
}: {
  email: Student["email"]
  password: Student["password"]
  name: Student["name"]
  banner_no: Student["banner_no"]
  dob: Student["date_of_birth"]
}) {
  const hashedPassword = await createPasswordHash(password)
  const newStudent = await prisma.student.create({
    data: {
      email,
      name,
      banner_no,
      date_of_birth: dob,
      password: hashedPassword,
    },
  })

  return newStudent
}

export async function getStudentByid(id: Student["id"]) {
  return prisma.student.findUnique({
    where: { id },
  })
}

export async function getStudent(request: Request) {
  const studentId = await getUserId(request)
  if (studentId === undefined) return null

  const student = await getStudentByid(studentId)
  if (student) return student

  throw await logout(request)
}
