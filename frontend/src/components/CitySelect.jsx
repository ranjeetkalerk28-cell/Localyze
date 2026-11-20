import { useEffect, useState } from 'react'
import { API_URL } from '../lib/api'

export default function CitySelect({ name = 'city', value, onChange, required = true }) {
  const [cities, setCities] = useState([])

  useEffect(() => {
    fetch(`${API_URL}/meta/cities`)
      .then((response) => (response.ok ? response.json() : []))
      .then(setCities)
      .catch(() => setCities([]))
  }, [])

  return (
    <select
      aria-label={name === 'searchCity' ? 'Search city' : 'City'}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
    >
      <option value="" disabled>
        Select your city
      </option>
      {cities.map((city) => (
        <option key={city} value={city}>
          {city}
        </option>
      ))}
    </select>
  )
}
