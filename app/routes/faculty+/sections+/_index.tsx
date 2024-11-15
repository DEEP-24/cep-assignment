import type { LoaderArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import { Link, useLoaderData } from "@remix-run/react"
import { Building2Icon, ClockIcon, UserCircleIcon } from "lucide-react"
import * as React from "react"
import PageHeading from "~/components/page-heading"
import { TailwindContainer } from "~/components/tailwind-container"
import { prisma } from "~/lib/db.server"
import { requireUserId } from "~/session.server"
import { formatTime } from "~/utils"


export async function loader({ request }: LoaderArgs) {
  const facultyId = await requireUserId(request)
  const sections = await prisma.section.findMany({
    where: {
      facultyId: facultyId,
    },
    include: {
      course: true,
      room: true,
      faculty: true,
      timeSlots: true,
    },
  })

  return json({ sections })
}

export default function FacultyCourses() {
  const { sections } = useLoaderData<typeof loader>()

  return (
    <>
      <PageHeading
        title="View Sections"
        subtitle="A List of all the sections."
      />

      <TailwindContainer className="rounded-md bg-white">
        <div className=" px-4 py-10 sm:px-6 lg:px-8">
          <div className="mt-8 flex flex-col">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                <div className="text-gray-800 sm:grid sm:grid-cols-3 sm:gap-4">
                  {sections.length > 0 ? (
                    sections.map((section) => (
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
                          <Link
                            to={`/faculty/sections/${section.id}`}
                            className="text-sm font-semibold leading-6 text-gray-900"
                          >
                            View <span aria-hidden="true">&rarr;</span>
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      <p>No sections to Display.</p>
                      <p>Add Sections</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </TailwindContainer>
    </>
  )
}
