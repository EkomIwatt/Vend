import V2Preview from '../_components/V2Preview'

export const dynamic = 'force-dynamic'

export default function CollectionsPage() {
  return (
    <V2Preview
      title="Collections"
      tagline="Group payments for class reps, society treasurers, and event organizers."
      shipsWhen="Ships month 3–6 of public Vend"
      paragraphs={[
        "Collections is Vend's viral growth loop. Any organizer — a class rep collecting for a hoodie order, a society treasurer running dues, an event lead selling tickets — creates a named purpose and shares one link. Dozens of payers land in the Vend ecosystem from a single share.",
        "Payers do not need to sign up to pay. They drop into a shadow profile that they can claim later, complete with a personal receipt archive of every Vend payment they've made. That's how a campus becomes a Vend campus without ever asking anyone to 'install an app first.'",
      ]}
      capabilities={[
        {
          label: 'One link, many payers',
          detail:
            'Each collection has a purpose, a goal amount, an optional deadline, and a public progress bar.',
        },
        {
          label: 'Invisible onboarding',
          detail:
            'Payers leave with a verified receipt and a personal Vend profile — no account creation required.',
        },
        {
          label: 'Organizations',
          detail:
            'Collections belong to organizations (departments, societies, hostels) with multi-user access that survives leadership turnover.',
        },
        {
          label: 'Real-time payer list',
          detail:
            'Organizer dashboard shows who paid, how much, when. Export to CSV for committee records.',
        },
      ]}
    />
  )
}
