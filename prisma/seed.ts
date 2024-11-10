import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function seed() {
  await prisma.admin.deleteMany()
  await prisma.faculty.deleteMany()
  await prisma.student.deleteMany()
  await prisma.department.deleteMany()
  await prisma.semester.deleteMany()
  await prisma.room.deleteMany()
  await prisma.course.deleteMany()
  await prisma.enrollment.deleteMany()

  const hashedPassword = await bcrypt.hash("password", 10)

  const department = await prisma.department.create({
    data: {
      name: "CSE",
    },
  })

  const semester = await prisma.semester.create({
    data: {
      name: "Summer 2023",
      start_date: new Date(),
      end_date: new Date(),
    },
  })

  await prisma.admin.create({
    data: {
      email: "admin@app.com",
      name: "Admin",
      password: hashedPassword,
    },
  })

  await prisma.faculty.create({
    data: {
      email: "faculty@app.com",
      name: "Faculty",
      password: hashedPassword,
      departmentId: department.id,
    },
  })

  await prisma.student.create({
    data: {
      email: "student@app.com",
      name: "Student",
      password: hashedPassword,
      banner_no: "700737913",
      date_of_birth: new Date(),
    },
  })

  await prisma.course.create({
    data: {
      name: "Project Management ",
      description: "Management of the Project",
      code: "4001",
      credit_hours: 3,
      departmentId: department.id,
      semesterId: semester.id,
    },
  })

  await prisma.room.create({
    data: {
      number: "101",
      maxCapacity: 50,
    },
  })

  console.log(`Database has been seeded. 🌱`)
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
