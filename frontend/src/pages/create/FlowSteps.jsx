import { Check } from 'lucide-react'

export default function FlowSteps({ step }) {
  const steps = ['type', 'details', 'review']
  return (
    <ol className="flow-steps" aria-label="Publishing progress">
      {steps.map((item, index) => (
        <li
          key={item}
          className={item === step ? 'current' : steps.indexOf(step) > index ? 'complete' : ''}
          aria-current={item === step ? 'step' : undefined}
        >
          <span>{steps.indexOf(step) > index ? <Check size={16} aria-label="Completed" /> : index + 1}</span>
          {item}
        </li>
      ))}
    </ol>
  )
}
