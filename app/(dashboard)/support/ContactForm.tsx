'use client'

import { useState, useTransition } from 'react'
import { sendMessage } from './actions'
import { Send, CheckCircle2 } from 'lucide-react'

export default function ContactForm({ dict }: { dict: any }) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await sendMessage(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        // Reset form
        const form = e.target as HTMLFormElement
        form.reset()
      }
    })
  }

  if (success) {
    return (
      <div className="rounded-md bg-success/10 p-6 text-center border border-success/20">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success mb-3" />
        <h3 className="text-lg font-medium text-success">{dict.support.form.sent_title}</h3>
        <p className="mt-2 text-sm text-success/80">
          {dict.support.form.sent_desc}
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-6 text-sm font-medium text-success hover:text-success/80 underline"
        >
          {dict.support.form.send_another}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-danger/10 p-4 border border-danger/20">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="sujet" className="block text-sm font-medium leading-6 text-foreground">
          {dict.support.form.subject}
        </label>
        <div className="mt-2">
          <input
            type="text"
            name="sujet"
            id="sujet"
            required
            disabled={isPending}
            className="block w-full rounded-md border-0 py-1.5 text-foreground bg-background shadow-sm ring-1 ring-inset ring-surface-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            placeholder={dict.support.form.subject_placeholder}
          />
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium leading-6 text-foreground">
          {dict.support.form.message}
        </label>
        <div className="mt-2">
          <textarea
            id="message"
            name="message"
            rows={5}
            required
            disabled={isPending}
            className="block w-full rounded-md border-0 py-1.5 text-foreground bg-background shadow-sm ring-1 ring-inset ring-surface-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            placeholder={dict.support.form.message_placeholder}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 transition-colors"
        >
          {isPending ? dict.support.form.sending : (
            <>
              <Send className="-ml-0.5 mr-2 h-4 w-4" />
              {dict.support.form.send}
            </>
          )}
        </button>
      </div>
    </form>
  )
}
