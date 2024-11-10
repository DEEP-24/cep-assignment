import { ArrowLeftIcon } from "@heroicons/react/24/solid"
import { ActionIcon } from "@mantine/core"
import { Link } from "@remix-run/react"

type Props = {
  title: string
  subtitle: string
  rightSection?: React.ReactNode
} & (
  | {
      showBackButton: true
      to: string
    }
  | {
      showBackButton?: false
      to?: never
    }
)

export default function PageHeading(props: Props) {
  const { title, subtitle, rightSection, showBackButton } = props

  return (
    <>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto sm:flex sm:items-center sm:gap-4">
          {showBackButton && (
            <ActionIcon component={Link} to={props.to}>
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </ActionIcon>
          )}
          <div>
            <h1 className="text-xl font-semibold leading-6 text-gray-900">
              {title}
            </h1>
            <p className="mt-1 text-sm text-gray-700">{subtitle}</p>
          </div>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">{rightSection}</div>
      </div>
    </>
  )
}
