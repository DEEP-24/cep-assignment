import { Button, Text } from "@mantine/core"
import type { ActionArgs, SerializeFrom } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { useFetcher, useLoaderData } from "@remix-run/react"
import { appConfig } from "app.config"
import { Building2Icon, ClockIcon, UserCircleIcon } from "lucide-react"
import * as React from "react"
import { badRequest } from "remix-utils"
import { toast } from "sonner"
import PageHeading from "~/components/page-heading"
import { TailwindContainer } from "~/components/tailwind-container"
import { prisma } from "~/lib/db.server"
import { requireUserId } from "~/session.server"
import { formatTime } from "~/utils"
import { useStudent } from "~/utils/hooks"

export async function loader() {
  const courses = await prisma.course.findMany({
    include: {
      sections: {
        include: {
          faculty: true,
          room: true,
          timeSlots: true,
          students: true,
        },
      },
    },
  })
  return json({ courses })
}
export async function action({ request }: ActionArgs) {
  const formData = await request.formData()
  const studentId = await requireUserId(request)

  const sectionId = formData.get("sectionId")?.toString()
  const courseId = formData.get("courseId")?.toString()

  if (!sectionId || !courseId) {
    return badRequest({
      success: false,
      message: "Invalid request",
    })
  }

  const isAlreadyEnrolledInSomeSection = await prisma.enrollment.findFirst({
    where: {
      studentId,
      section: {
        courseId,
      },
    },
  })

  if (isAlreadyEnrolledInSomeSection) {
    return badRequest({
      success: false,
      message: "You are already enrolled in one section of this course",
    })
  }

  await prisma.enrollment.create({
    data: {
      sectionId,
      studentId,
    },
  })

  return redirect("/student/my-sections")
}

export default function ManageSections() {
  const { courses } = useLoaderData<typeof loader>()

  return (
    <>
      <TailwindContainer className="rounded-md bg-white">
        <div className=" px-4 py-10 sm:px-6 lg:px-8">
          <PageHeading
            title="View sections"
            subtitle="A list of all the sections."
          />
          <div className="mt-8">
            {courses.length > 0 ? (
              <div className="flex flex-col gap-12">
                {courses.map((course) => (
                  <CourseRow key={course.id} course={course} />
                ))}
              </div>
            ) : (
              <>
                <p>No courses to display.</p>
              </>
            )}
          </div>
        </div>
      </TailwindContainer>
    </>
  )
}

function CourseRow({
  course,
}: {
  course: SerializeFrom<typeof loader>["courses"][0]
}) {
  const student = useStudent()
  const fetcher = useFetcher<typeof action>()

  const isSubmitting = fetcher.state !== "idle"
  const isEnrolledInSomeSection = course.sections.some((section) =>
    section.students.some((enrollment) => enrollment.studentId === student.id),
  )

  React.useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) {
      return
    }

    if (fetcher.data.success) {
      toast.success("Enrolled successfully")
    } else {
      toast.error(fetcher.data.message)
    }
  }, [fetcher.data, fetcher.state])

  return (
    <div className="flex flex-col gap-8">
      <Text weight={500} className="border-b pb-4">
        Course: {course.name} ({course.code})
      </Text>

      <div className="overflow-x-auto max-w-full">
        <div className="grid grid-flow-col gap-8 overflow-x-auto w-max">
          {course.sections.length > 0 ? (
            course.sections.map((section) => {
              const isEnrolledInThisSection = section.students.some(
                (enrollment) => enrollment.studentId === student.id,
              )
              const isEnrolling =
                fetcher.submission?.formData?.get("sectionId") === section.id

              if (
                appConfig.showOtherSectionIfAlreadyEnrolledInCourse == false
              ) {
                if (isEnrolledInSomeSection && !isEnrolledInThisSection)
                  return null
              }

              return (
                <>
                  <div
                    className="rounded-lg bg-gray-50 shadow-sm ring-1 ring-gray-900/5"
                    key={section.id}
                  >
                    <dl className="flex flex-wrap">
                      <div className="flex-auto pl-6 pt-6">
                        <dt className="text-sm font-semibold leading-6 text-gray-900">
                          {section.name}
                        </dt>
                      </div>
                      <div className="mt-6 flex w-full flex-none gap-x-4 border-t border-gray-900/5 px-6 pt-6">
                        <dt className="flex-none">
                          <UserCircleIcon
                            className="h-6 w-5 text-gray-400"
                            aria-hidden="true"
                          />
                        </dt>
                        <dd className="text-sm font-medium leading-6 text-gray-900">
                          {section.faculty.name}
                        </dd>
                      </div>
                      <div className="mt-4 flex w-full flex-none gap-x-4 px-6">
                        <dt className="flex-none">
                          <Building2Icon
                            className="h-6 w-5 text-gray-400"
                            aria-hidden="true"
                          />
                        </dt>
                        <dd className="text-sm leading-6 text-gray-500">
                          <time dateTime="2023-01-31">
                            Room {section.room.number}
                          </time>
                        </dd>
                      </div>
                      <div className="mt-4 flex w-full flex-none gap-x-4 px-6">
                        <dt className="flex-none">
                          <ClockIcon
                            className="h-6 w-5 text-gray-400"
                            aria-hidden="true"
                          />
                        </dt>
                        <dd className="text-sm leading-6 text-gray-500">
                          Time Slots:
                          {section.timeSlots.length > 0 ? (
                            section.timeSlots.map((timeSlot) => (
                              <React.Fragment key={timeSlot.id}>
                                <p className="font-bold">{timeSlot.day}</p>
                                <p>
                                  {formatTime(timeSlot.startTime!)}
                                  {" - "}
                                  {formatTime(timeSlot.endTime!)}
                                </p>
                              </React.Fragment>
                            ))
                          ) : (
                            <p>No time slots</p>
                          )}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-6 border-t border-gray-900/5 px-6 py-6 flex items-center justify-between">
                      <Button
                        variant="subtle"
                        color="teal"
                        loading={isSubmitting && isEnrolling}
                        disabled={
                          isEnrolledInSomeSection ||
                          (isSubmitting && !isEnrolling)
                        }
                        onClick={() =>
                          fetcher.submit(
                            {
                              sectionId: section.id,
                              courseId: course.id,
                            },
                            {
                              method: "post",
                              replace: true,
                            },
                          )
                        }
                      >
                        {isEnrolledInSomeSection
                          ? isEnrolledInThisSection
                            ? "Enrolled"
                            : "Already enrolled in another section"
                          : "Enroll"}
                      </Button>
                    </div>
                  </div>
                </>
              )
            })
          ) : (
            <p>No sections to display </p>
          )}
        </div>
      </div>
    </div>
  )
}
