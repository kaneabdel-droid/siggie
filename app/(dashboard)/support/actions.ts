'use server'

export async function sendMessage(formData: FormData) {
  const sujet = formData.get('sujet')
  const message = formData.get('message')

  if (!sujet || !message) {
    return { error: 'Veuillez remplir tous les champs.' }
  }

  // Simulation d'envoi d'email/message (délai de 1 seconde)
  await new Promise(resolve => setTimeout(resolve, 1000))

  return { success: true }
}
