import { PlusIcon, XMarkIcon } from "@heroicons/react/24/solid"
import { Button, Select, TextInput } from "@mantine/core"
import { TimeInput } from "@mantine/dates"
import type { ActionFunction } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { useFetcher, useLoaderData } from "@remix-run/react"
import * as React from "react"
import { badRequest } from "remix-utils"
import { toast } from "sonner"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"
import PageHeading from "~/components/page-heading"
import { Day } from "~/days"
import { prisma } from "~/lib/db.server"
import { formatTime, toFixedDate } from "~/utils"
import { useValidateServerTimeslot } from "~/utils/hooks/validate-server-timeslot"
import type { MandatoryFields } from "~/utils/misc"
import { convertToDateTime } from "~/utils/misc"
import type { inferErrors } from "~/utils/validation"
import { validateAction } from "~/utils/validation"

const createSectionSchema = z.object({
  name: z.string().nonempty("Name is required"),
  code: z.string().nonempty("Code is required"),
  courseId: z.string().nonempty("Course ID is required"),
  roomId: z.string().nonempty("Room ID is required"),
  facultyId: z.string().nonempty("Faculty ID is required"),
  timeSlots: z
    .string()
    .transform((value) => JSON.parse(value))
    .pipe(
      z.array(
        z.object({
          day: z.string(),
          startTime: z.string(),
          endTime: z.string(),
        }),
      ),
    ),
})

export async function loader() {
  const sections = await prisma.section.findMany({
    include: {
      timeSlots: true,
    },
  })
  const courses = await prisma.course.findMany({})
  const faculties = await prisma.faculty.findMany({})
  const rooms = await prisma.room.findMany({})
  return json({ sections, courses, faculties, rooms })
}

interface ActionData {
  success: boolean
  fieldErrors?: inferErrors<typeof createSectionSchema>
}

type ITimeSlot = {
  id: string
  day: Day | null
  startTime?: string
  endTime?: string
}

export const action: ActionFunction = async ({ request }) => {
  const { fields, fieldErrors } = await validateAction(
    request,
    createSectionSchema,
  )

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors })
  }

  const { code, name, courseId, roomId, facultyId, timeSlots } = fields

  const existingSection = await prisma.section.findFirst({
    where: {
      code: code,
    },
  })

  if (existingSection) {
    return badRequest<ActionData>({
      success: false,
      fieldErrors: {
        code: "Section with this code already exists",
      },
    })
  }

  await prisma.section.create({
    data: {
      code: code,
      name: name,
      courseId: courseId,
      roomId: roomId,
      facultyId: facultyId,
      timeSlots: {
        create: timeSlots.map((timeSlot) => ({
          day: timeSlot.day,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
        })),
      },
    },
  })

  return redirect("/admin/sections")
}

export default function CreateNewSection() {
  const { courses, faculties, rooms } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<ActionData>()

  const { validateTimeSlot, validateLocalTimeSlotConflict } =
    useValidateServerTimeslot()

  const [day, setDay] = React.useState<Day | null>(null)
  const [startTime, setStartTime] = React.useState<string>("")
  const [endTime, setEndTime] = React.useState<string>("")
  const [facultyId, setFacultyId] = React.useState<string | null>("")
  const [roomId, setRoomId] = React.useState<string | null>("")

  const [timeSlots, setTimeSlots] = React.useState<
    MandatoryFields<ITimeSlot>[]
  >([])

  const isSubmitting = fetcher.state !== "idle"

  const handleAddTimeSlot = () => {
    if (!day || !startTime || !endTime || !facultyId || !roomId) return

    const localTimeslotCheck = validateLocalTimeSlotConflict(
      {
        day,
        startTime,
        endTime,
      },
      timeSlots,
    )

    if (!localTimeslotCheck.success)
      return toast.error(localTimeslotCheck.error)

    const data = validateTimeSlot({
      day,
      startTime,
      endTime,
      facultyId,
      roomId,
    })

    if (!data.success) {
      return toast.error(data.error)
    }

    setTimeSlots((prev) => [
      ...prev,
      {
        id: uuidv4(),
        day,
        endTime: toFixedDate(convertToDateTime(endTime)).toISOString(),
        startTime: toFixedDate(convertToDateTime(startTime)).toISOString(),
      },
    ])

    setDay(null)
    setStartTime("")
    setEndTime("")
  }

  const handleRemoveTimeSlot = (id: string) => {
    setTimeSlots((prev) => prev.filter((timeSlot) => timeSlot.id !== id))
  }

  return (
    <>
      <PageHeading
        title="Create Section"
        subtitle="A form to create a new section"
        showBackButton
        to="/admin/sections"
        rightSection={
          <button
            type="submit"
            form="form"
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <div className="flex gap-0 items-center">
              <PlusIcon className="h-4 w-4" />
              <span className="ml-2">Create</span>
            </div>
          </button>
        }
      />
      <div className="p-8 grid grid-cols-2 gap-12">
        <fetcher.Form replace id="form" method="post">
          <fieldset
            disabled={isSubmitting}
            className="mt-2 flex flex-col gap-4"
          >
            <input
              hidden
              name="timeSlots"
              value={JSON.stringify(timeSlots)}
              onChange={() => {}}
            />
            <TextInput
              name="code"
              label="Section Code"
              placeholder="Enter the code"
              error={fetcher.data?.fieldErrors?.code}
              required
            />

            <TextInput
              name="name"
              label="Section Name"
              placeholder="Enter the name"
              error={fetcher.data?.fieldErrors?.name}
              required
            />

            <Select
              name="courseId"
              label="Course"
              placeholder="Select the course"
              error={fetcher.data?.fieldErrors?.courseId}
              data={courses.map((course) => ({
                value: course.id,
                label: course.name,
              }))}
              required
            />

            <Select
              name="facultyId"
              label="Faculty"
              placeholder="Select the faculty"
              error={fetcher.data?.fieldErrors?.facultyId}
              onChange={(value) => setFacultyId(value as string)}
              data={faculties.map((faculty) => ({
                value: faculty.id,
                label: faculty.name,
              }))}
              required
            />

            <Select
              name="roomId"
              label="Room"
              placeholder="Select the room"
              error={fetcher.data?.fieldErrors?.roomId}
              onChange={(value) => setRoomId(value as string)}
              data={rooms.map((room) => ({
                value: room.id,
                label: room.number,
              }))}
              required
            />
          </fieldset>
        </fetcher.Form>

        <div className="flex flex-col gap-4">
          {timeSlots.length > 0 ? (
            <ol className="flex flex-col gap-2 pb-4 border-b">
              {timeSlots.map((timeSlot) => (
                <li
                  key={timeSlot.id}
                  className="text-sm space-x-2 flex items-center justify-between border-b rounded-md p-2 bg-slate-300 "
                >
                  <span>{timeSlot.day}</span>
                  <span>
                    ({formatTime(timeSlot.startTime)} -{" "}
                    {formatTime(timeSlot.endTime)})
                  </span>
                  <Button
                    variant="filled"
                    color="red"
                    onClick={() => handleRemoveTimeSlot(timeSlot.id)}
                    className="h-4 w-4"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ol>
          ) : null}
          <Select
            name="day"
            label="Day"
            placeholder="Select the day"
            onChange={(value) => setDay(value as Day)}
            value={day}
            data={Object.values(Day).map((day) => ({
              value: day,
              label: day,
            }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <TimeInput
              name="startTime"
              label="Start Time"
              value={startTime}
              onChange={(e) => setStartTime(e.currentTarget.value)}
            />

            <TimeInput
              name="endTime"
              label="End Time"
              onChange={(e) => setEndTime(e.currentTarget.value)}
              value={endTime}
            />
          </div>

          <button
            onClick={handleAddTimeSlot}
            disabled={!day || !startTime || !endTime || !facultyId || !roomId}
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            Add Time Slot
          </button>
        </div>
      </div>
    </>
  )
}
