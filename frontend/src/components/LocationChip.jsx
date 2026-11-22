import { ChevronDown, MapPin } from 'lucide-react'
import { useState } from 'react'
import { useAccount } from '../account/AccountContext'
import LocationDialog, { currentCityOf } from './LocationDialog'

// Current-city pill that opens the change-location dialog. Shared by Home's
// right rail and the Explore header.
export default function LocationChip() {
  const { profile } = useAccount()
  const [isOpen, setIsOpen] = useState(false)
  const currentCity = currentCityOf(profile)

  return (
    <>
      <button
        className="location-chip"
        aria-haspopup="dialog"
        aria-label={`Current location: ${currentCity}. Change location`}
        onClick={() => setIsOpen(true)}
      >
        <MapPin size={14} aria-hidden="true" />
        {currentCity}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {isOpen && <LocationDialog onClose={() => setIsOpen(false)} />}
    </>
  )
}
