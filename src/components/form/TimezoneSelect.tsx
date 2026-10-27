import { useMemo } from 'react'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { formatTimeZoneLabel, getAllTimeZones } from '@/lib/datetime'

interface TimezoneSelectProps {
  id: string
  value: string | null
  onChange: (value: string | null) => void
  onBlur?: () => void
  invalid?: boolean
  describedBy?: string
}

/** Searchable list of IANA timezones, shown as "Asia/Karachi (GMT+5)" */
export function TimezoneSelect({ id, value, onChange, onBlur, invalid, describedBy }: TimezoneSelectProps) {
  const zones = useMemo(() => getAllTimeZones(), [])
  const labels = useMemo(() => new Map(zones.map((zone) => [zone, formatTimeZoneLabel(zone)])), [zones])

  return (
    <Combobox
      items={zones}
      value={value}
      onValueChange={(next) => onChange(next)}
      itemToStringLabel={(zone: string) => labels.get(zone) ?? zone}
    >
      <ComboboxInput
        id={id}
        className="w-full"
        placeholder="Search timezones…"
        onBlur={onBlur}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      <ComboboxContent>
        <ComboboxEmpty>No timezone found.</ComboboxEmpty>
        <ComboboxList>
          {(zone: string) => (
            <ComboboxItem key={zone} value={zone}>
              {labels.get(zone)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
