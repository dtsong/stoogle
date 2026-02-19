'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'

type FormSubmitButtonProps = {
  label: string
  pendingLabel: string
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link'
  confirmMessage?: string
}

export function FormSubmitButton({
  label,
  pendingLabel,
  variant = 'default',
  confirmMessage,
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant={variant}
      className="min-h-11"
      disabled={pending}
      onClick={(event) => {
        if (!confirmMessage || pending) return
        if (!window.confirm(confirmMessage)) {
          event.preventDefault()
        }
      }}
    >
      {pending ? pendingLabel : label}
    </Button>
  )
}
