import { type Day } from "~/days"
import { toFixedDate } from "~/utils"
import { useAdminLoaderData } from "~/utils/hooks"
import { convertToDateTime } from "~/utils/misc"

type ValidationReturnType =
  | {
      success: false
      error: string
    }
  | {
      success: true
    }

type ITs = {
  day: Day | string
  startTime: string
  endTime: string
  facultyId: string
  roomId: string
}

export function useValidateServerTimeslot() {
  const { sections } = useAdminLoaderData()

  const validateLocalTimeSlotConflict = <
    T extends Pick<ITs, "day" | "startTime" | "endTime">,
  >(
    timeSlot: Pick<ITs, "day" | "startTime" | "endTime">,
    timeSlots: Array<T>,
  ): ValidationReturnType => {
    const isConflict = timeSlots.some((slot) => {
      if (slot.day !== timeSlot.day) return false

      const startTime = toFixedDate(convertToDateTime(timeSlot.startTime!))
      const endTime = toFixedDate(convertToDateTime(timeSlot.endTime!))

      const slotStartTime = new Date(slot.startTime)
      const slotEndTime = new Date(slot.endTime)

      if (
        startTime.getTime() >= slotStartTime.getTime() &&
        startTime.getTime() < slotEndTime.getTime()
      )
        return true

      if (
        endTime.getTime() > slotStartTime.getTime() &&
        endTime.getTime() <= slotEndTime.getTime()
      )
        return true

      return false
    })

    if (isConflict) {
      return {
        success: false,
        error: "Time slot conflicts with existing time slot",
      }
    }

    return {
      success: true,
    }
  }
  const handleFacultyConflict = (timeSlot: ITs): boolean => {
    const day = timeSlot.day
    const startTime = timeSlot.startTime
    const endTime = timeSlot.endTime

    const facultySections = sections.filter(
      (section) => section.facultyId === timeSlot.facultyId,
    )

    const _startTime = toFixedDate(convertToDateTime(startTime))
    const _endTime = toFixedDate(convertToDateTime(endTime))

    const facultyTimeSlotsWithSameDay = facultySections.flatMap((section) =>
      section.timeSlots.filter((timeSlot) => timeSlot.day === day),
    )

    const isFacultyAvailable = facultyTimeSlotsWithSameDay.every((slot) => {
      const slotStartTime = new Date(slot.startTime)
      const slotEndTime = new Date(slot.endTime)

      return !(
        (_startTime.getTime() >= slotStartTime.getTime() &&
          _startTime.getTime() < slotEndTime.getTime()) ||
        (_endTime.getTime() > slotStartTime.getTime() &&
          _endTime.getTime() <= slotEndTime.getTime())
      )
    })

    return isFacultyAvailable
  }

  const handleRoomConflict = (timeSlot: ITs): boolean => {
    const day = timeSlot.day
    const startTime = timeSlot.startTime
    const endTime = timeSlot.endTime

    const roomSections = sections.filter(
      (section) => section.roomId === timeSlot.roomId,
    )

    const _startTime = toFixedDate(convertToDateTime(startTime))
    const _endTime = toFixedDate(convertToDateTime(endTime))

    const roomTimeSlotsWithSameDay = roomSections.flatMap((section) =>
      section.timeSlots.filter((timeSlot) => timeSlot.day === day),
    )

    const isRoomAvailable = roomTimeSlotsWithSameDay.every((slot) => {
      const slotStartTime = new Date(slot.startTime)
      const slotEndTime = new Date(slot.endTime)

      return !(
        (_startTime.getTime() >= slotStartTime.getTime() &&
          _startTime.getTime() < slotEndTime.getTime()) ||
        (_endTime.getTime() > slotStartTime.getTime() &&
          _endTime.getTime() <= slotEndTime.getTime())
      )
    })

    return isRoomAvailable
  }

  const validateTimeSlot = (timeSlot: ITs): ValidationReturnType => {
    const { day, startTime, endTime, facultyId, roomId } = timeSlot
    if (!day || !startTime || !endTime || !facultyId || !roomId) {
      return {
        success: false,
        error: "All fields are required",
      }
    }

    const _startTime = toFixedDate(convertToDateTime(startTime))
    const _endTime = toFixedDate(convertToDateTime(endTime))

    // Not requires as it is handled before this function is called
    // However, it is kept here for future reference
    if (_startTime.getTime() >= _endTime.getTime()) {
      return {
        success: false,
        error: "Start time must be less than end time",
      }
    }

    const isFacultyAvailable = handleFacultyConflict(timeSlot)

    if (!isFacultyAvailable) {
      return {
        success: false,
        error: "Faculty is not available at this time",
      }
    }

    const isRoomAvailable = handleRoomConflict(timeSlot)

    if (!isRoomAvailable) {
      return {
        success: false,
        error: "Room is not available at this time",
      }
    }

    return {
      success: true,
    }
  }

  return {
    validateTimeSlot,
    validateLocalTimeSlotConflict,
  }
}
