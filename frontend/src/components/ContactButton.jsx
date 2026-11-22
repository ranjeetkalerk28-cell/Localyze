import { Mail, Phone } from 'lucide-react'
import { useState } from 'react'
import AppDialog from './AppDialog'

// Clickable email and phone, shared by the business Contact card and the
// event details card. Phone is optional, so it says so when none was added.
export function ContactList({ email, phone }) {
  return (
    <ul className="contact-list">
      <li>
        <Mail size={18} aria-hidden="true" />
        <div>
          <span>Email</span>
          {email ? <a href={`mailto:${email}`}>{email}</a> : <em>Not provided</em>}
        </div>
      </li>
      <li>
        <Phone size={18} aria-hidden="true" />
        <div>
          <span>Phone</span>
          {phone ? <a href={`tel:${phone}`}>{phone}</a> : <em>Not provided</em>}
        </div>
      </li>
    </ul>
  )
}

// "Contact" pill that opens a card with the business's registered email and phone.
export default function ContactButton({ name, email, phone, title = 'Contact' }) {
  const [isOpen, setIsOpen] = useState(false)
  if (!email && !phone) return null

  return (
    <>
      <button type="button" className="contact-button" aria-haspopup="dialog" onClick={() => setIsOpen(true)}>
        <Mail size={13} aria-hidden="true" />
        Contact
      </button>
      {isOpen && (
        <AppDialog title={title} eyebrow={name} onClose={() => setIsOpen(false)} className="contact-dialog">
          <ContactList email={email} phone={phone} />
        </AppDialog>
      )}
    </>
  )
}
