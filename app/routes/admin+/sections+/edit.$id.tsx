/* eslint-disable @typescript-eslint/no-unused-vars */
import { PencilIcon, XMarkIcon } from "@heroicons/react/24/solid"
import { Button, Modal, Select, TextInput } from "@mantine/core"
import { TimeInput } from "@mantine/dates"
import { useDisclosure } from "@mantine/hooks"
import type { ActionFunction, LoaderArgs, SerializeFrom } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { useFetcher, useLoaderData } from "@remix-run/react"
import * as React from "react"
import { toast } from "sonner"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"
import PageHeading from "~/components/page-heading"
import { Day } from "~/days"
import { prisma } from "~/lib/db.server"
import { formatTime, toFixedDate } from "~/utils"
import { useValidateServerTimeslot } from "~/utils/hooks/validate-server-timeslot"
import type { MandatoryFields } from "~/utils/misc"
import { convertToDateTime, convertToMantineTime } from "~/utils/misc"
import type { inferErrors } from "~/utils/validation"
import { validateAction } from "~/utils/validation"

const editSectionSchema = z.object({
  sectionId: z.string().optional(),
  name: z.string().nonempty("Name is required"),
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

interface ActionData {
  success: boolean
  fieldErrors?: inferErrors<typeof editSectionSchema>
}

type ITimeSlot = SerializeFrom<
  typeof loader
>["sectionToEdit"]["timeSlots"][number]

export const loader = async ({ params }: LoaderArgs) => {
  const sectionToEdit = await prisma.section.findUnique({
    where: { id: params.id },
    include: {
      timeSlots: {
        select: {
          id: true,
          day: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  })

  if (!sectionToEdit) {
    return redirect("/admin/sections")
  }

  const courses = await prisma.course.findMany()
  const faculties = await prisma.faculty.findMany()
  const rooms = await prisma.room.findMany()

  return json({ sectionToEdit, courses, faculties, rooms })
}

export const action: ActionFunction = async ({ request }) => {
  const { fields, fieldErrors } = await validateAction(
    request,
    editSectionSchema,
  )

  if (fieldErrors) {
    return json<ActionData>({ success: false, fieldErrors })
  }

  const { name, facultyId, roomId, timeSlots, sectionId } = fields

  await prisma.section.update({
    where: {
      id: sectionId,
    },
    data: {
      name,
      facultyId,
      roomId,
      timeSlots: {
        deleteMany: {},
        create: timeSlots,
      },
    },
  })

  return redirect(`/admin/sections`)
}

export default function EditSection() {
  const { sectionToEdit, courses, faculties, rooms } =
    useLoaderData<typeof loader>()

  const fetcher = useFetcher<ActionData>()

  const { validateTimeSlot, validateLocalTimeSlotConflict } =
    useValidateServerTimeslot()

  const isSubmitting = fetcher.state === "submitting"

  const [day, setDay] = React.useState<Day | null>(null)
  const [startTime, setStartTime] = React.useState<string>("")
  const [endTime, setEndTime] = React.useState<string>("")
  const [facultyId, setFacultyId] = React.useState<string>(
    sectionToEdit.facultyId,
  )
  const [roomId, setRoomId] = React.useState<string>(sectionToEdit.roomId)

  const [timeSlots, setTimeSlots] = React.useState<
    MandatoryFields<ITimeSlot>[]
  >(sectionToEdit?.timeSlots ?? [])

  //function to update the timeSlot
  const handleUpdateTimeSlot = (timeSlot: ITimeSlot) => {
    setTimeSlots((prev) => {
      return prev.map((ts) => {
        if (ts.id === timeSlot.id) {
          return {
            ...timeSlot,
            startTime: toFixedDate(
              convertToDateTime(timeSlot.startTime),
            ).toISOString(),
            endTime: toFixedDate(
              convertToDateTime(timeSlot.endTime),
            ).toISOString(),
          }
        }

        return ts
      })
    })
  }

  //function to add the timeSlot
  const handleAddTimeSlot = () => {
    if (!day || !startTime || !endTime) {
      toast.error("Please fill all the fields")
      return
    }

    const localTimeslotCheck = validateLocalTimeSlotConflict(
      {
        day,
        startTime,
        endTime,
      },
      timeSlots,
    )

    if (!localTimeslotCheck.success) {
      return toast.error(localTimeslotCheck.error)
    }

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
  }

  return (
    <>
      <PageHeading
        title="Edit Section"
        subtitle="Edit the section details."
        showBackButton
        to="/admin/sections"
        rightSection={
          <button
            type="submit"
            form="form"
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <span>Update</span>
          </button>
        }
      />
      <div className="p-8 grid grid-cols-2 gap-12">
        <fetcher.Form replace id="form" method="post">
          <fieldset
            disabled={isSubmitting}
            className="mt-2 flex flex-col gap-4"
          >
            <input hidden name="sectionId" defaultValue={sectionToEdit.id} />
            <input
              hidden
              name="timeSlots"
              value={JSON.stringify(timeSlots)}
              onChange={() => {}}
            />
            <TextInput
              readOnly
              name="code"
              label="Section Code"
              defaultValue={sectionToEdit.code}
              required
            />

            <TextInput
              name="name"
              label="Section Name"
              defaultValue={sectionToEdit.name}
              error={fetcher.data?.fieldErrors?.name}
              required
            />

            <Select
              readOnly
              name="courseId"
              label="Course"
              defaultValue={sectionToEdit.courseId}
              data={courses.map((course) => ({
                value: course.id,
                label: course.name,
              }))}
              required
            />

            <Select
              name="facultyId"
              label="Faculty"
              error={fetcher.data?.fieldErrors?.facultyId}
              value={facultyId}
              onChange={(value) => setFacultyId(value as string)}
              data={faculties.map((faculty) => ({
                value: faculty.id,
                label: faculty.name,
              }))}
            />

            <Select
              name="roomId"
              label="Room"
              error={fetcher.data?.fieldErrors?.roomId}
              value={roomId}
              onChange={(value) => setRoomId(value as string)}
              data={rooms.map((room) => ({
                value: room.id,
                label: room.number,
              }))}
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
                  <TimeSlotRow
                    // key={location.hash}
                    timeSlots={timeSlots}
                    setTimeSlots={setTimeSlots}
                    timeSlot={timeSlot}
                    onChange={(_ts) => {
                      handleUpdateTimeSlot(_ts)
                    }}
                  />
                </li>
              ))}
            </ol>
          ) : null}
          <Select
            name="day"
            label="Day"
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

          <Button onClick={handleAddTimeSlot}>Add Time Slot</Button>
        </div>
      </div>
    </>
  )
}

type UpdateProps = {
  timeSlot: SerializeFrom<typeof loader>["sectionToEdit"]["timeSlots"][number]
  timeSlots: SerializeFrom<typeof loader>["sectionToEdit"]["timeSlots"]
  setTimeSlots: React.Dispatch<
    React.SetStateAction<
      SerializeFrom<typeof loader>["sectionToEdit"]["timeSlots"]
    >
  >
  onChange: (timeSlot: ITimeSlot) => void
}

export function TimeSlotRow(props: UpdateProps) {
  const { timeSlot, timeSlots, onChange, setTimeSlots } = props

  const { sectionToEdit } = useLoaderData<typeof loader>()

  const [day, setDay] = React.useState<Day | null>(timeSlot.day as Day)
  const [startTime, setStartTime] = React.useState<string>(
    convertToMantineTime(timeSlot.startTime),
  )
  const [endTime, setEndTime] = React.useState<string>(
    convertToMantineTime(timeSlot.endTime),
  )

  const handleRemoveTimeSlot = (id: string) => {
    setTimeSlots((prev) => prev.filter((timeSlot) => timeSlot.id !== id))
  }

  const [facultyId] = React.useState<string | null>(
    sectionToEdit?.facultyId ?? null,
  )

  const [roomId] = React.useState<string | null>(sectionToEdit?.roomId ?? null)

  const [isModalOpen, handleModal] = useDisclosure(false)

  const { validateTimeSlot } = useValidateServerTimeslot()
  const resetForm = () => {
    setDay(timeSlot.day as Day)
    setStartTime(convertToMantineTime(timeSlot.startTime))
    setEndTime(convertToMantineTime(timeSlot.endTime))
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex">
          <span>{timeSlot.day}</span>
          <span>
            ({formatTime(timeSlot.startTime)} - {formatTime(timeSlot.endTime)})
          </span>
        </div>

        <div className="flex gap-3">
          <Button
            variant="filled"
            color="red"
            className="h-4 w-4"
            onClick={() => {
              handleModal.open()
            }}
          >
            <PencilIcon className="h-3 w-3" />
          </Button>
          <Button
            variant="filled"
            color="red"
            className="h-4 w-4"
            onClick={() => handleRemoveTimeSlot(timeSlot.id)}
          >
            <XMarkIcon className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <Modal
        size="xl"
        opened={isModalOpen}
        onClose={() => {
          resetForm()
          handleModal.close()
        }}
        title="Edit TimeSlot"
        centered
        overlayProps={{ blur: 1.2, opacity: 0.6 }}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-4">
            <Select
              name="day"
              label="Day"
              value={day}
              withinPortal
              onChange={(value) => setDay(value as Day)}
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
                value={endTime}
                onChange={(e) => setEndTime(e.currentTarget.value)}
              />
            </div>
            <Button
              type="button"
              onClick={() => {
                if (!day || !startTime || !endTime || !facultyId || !roomId) {
                  toast.error("Please fill all the fields")
                  return
                }

                const data = validateTimeSlot({
                  day,
                  startTime,
                  endTime,
                  facultyId,
                  roomId,
                })

                if (!data.success) {
                  toast.error(data.error)
                  return
                }
                onChange({
                  id: timeSlot.id,
                  day: day as Day,
                  startTime,
                  endTime,
                })
                handleModal.close()
              }}
            >
              Update Time Slot
            </Button>
          </div>
          <div className="flex flex-col gap-2 border rounded-md p-2 items-center justify-center">
            {timeSlots.length > 1 ? (
              timeSlots
                .filter((ts) => ts.id !== timeSlot.id)
                .map((ts) => (
                  <div key={ts.id} className="flex gap-2">
                    <span>{ts.day}</span>
                    <p>
                      ({formatTime(ts.startTime)}-{formatTime(ts.endTime)})
                    </p>
                  </div>
                ))
            ) : (
              <p>No time slots</p>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
