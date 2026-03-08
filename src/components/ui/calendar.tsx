"use client"

import * as React from "react"
import { ArrowLeft } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "../../lib/utils"
import { buttonVariants } from "./button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components: userComponents,
  ...props
}: CalendarProps) {
  const defaultClassNames = {
    months: "relative flex flex-col sm:flex-row gap-4",
    month: "w-full",
    month_caption: "relative mx-10 mb-1 flex h-9 items-center justify-center z-20",
    caption_label: "text-sm font-medium",
    nav: "absolute top-0 flex w-full justify-between z-10",
    button_previous: cn(
      buttonVariants({ variant: "ghost" }),
      "size-9 text-gray-400 hover:text-white p-0",
    ),
    button_next: cn(
      buttonVariants({ variant: "ghost" }),
      "size-9 text-gray-400 hover:text-white p-0",
    ),
    weekday: "size-9 p-0 text-xs font-medium text-gray-500",
    day_button:
      "relative flex size-9 items-center justify-center whitespace-nowrap rounded-lg p-0 text-sm text-gray-200 outline-offset-2 transition-[color,background-color,border-radius,box-shadow] duration-150 focus:outline-none data-[disabled]:pointer-events-none focus-visible:z-10 hover:bg-slate-700 data-[selected]:bg-slate-600 data-[selected]:text-white data-[selected]:hover:bg-slate-500 data-[disabled]:text-gray-500 data-[disabled]:line-through data-[outside]:text-gray-500 data-[outside]:data-[selected]:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500/70 group-[.range-start:not(.range-end)]:rounded-e-none group-[.range-end:not(.range-start)]:rounded-s-none group-[.range-middle]:rounded-none data-[selected]:group-[.range-middle]:bg-slate-600 data-[selected]:group-[.range-middle]:text-white",
    day: "group size-9 px-0 text-sm",
    range_start: "range-start",
    range_end: "range-end",
    range_middle: "range-middle",
    today:
      "*:after:pointer-events-none *:after:absolute *:after:bottom-1 *:after:start-1/2 *:after:z-10 *:after:size-[3px] *:after:-translate-x-1/2 *:after:rounded-full *:after:bg-[currentColor] *:after:transition-colors",
    outside: "text-gray-500 data-[selected]:bg-slate-700/50 data-[selected]:text-gray-400",
    hidden: "invisible",
    root: "rdp-root p-3",
    week_number: "size-9 p-0 text-xs font-medium text-gray-500",
  }

  const mergedClassNames: typeof defaultClassNames = Object.keys(defaultClassNames).reduce(
    (acc, key) => ({
      ...acc,
      [key]: classNames?.[key as keyof typeof classNames]
        ? cn(
            defaultClassNames[key as keyof typeof defaultClassNames],
            classNames[key as keyof typeof classNames],
          )
        : defaultClassNames[key as keyof typeof defaultClassNames],
    }),
    {} as typeof defaultClassNames,
  )

  const defaultComponents = {
    Chevron: (chevronProps: { orientation?: "left" | "right" | "up" | "down"; className?: string; size?: number }) => {
      const { orientation, className } = chevronProps
      const size = chevronProps.size ?? 24
      const lineArrowRightSvg = (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      )
      if (orientation === "left") {
        return <ArrowLeft size={size} className={className} strokeWidth={2} aria-hidden />
      }
      if (orientation === "up") {
        return <span className="inline-block rotate-[-90deg]" aria-hidden>{lineArrowRightSvg}</span>
      }
      if (orientation === "down") {
        return <span className="inline-block rotate-90" aria-hidden>{lineArrowRightSvg}</span>
      }
      return lineArrowRightSvg
    },
  }

  const mergedComponents = {
    ...defaultComponents,
    ...userComponents,
  }

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-fit", className)}
      classNames={mergedClassNames}
      components={mergedComponents}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
