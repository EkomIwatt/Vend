import V2Preview from '../_components/V2Preview'

export const dynamic = 'force-dynamic'

export default function MarketplacePage() {
  return (
    <V2Preview
      title="Marketplace"
      tagline="Discovery layer for trusted student sellers."
      shipsWhen="Ships month 3–6 of public Vend"
      paragraphs={[
        "The marketplace is how new buyers find Vend sellers they've never met — and how sellers earn business beyond their existing networks. It's deliberately a feature of Vend, not its purpose: the financial spine ships first, the directory follows once a real seller base exists.",
        "Buyers browse trust-scored sellers by category and campus. Every transaction passes through Vend's escrow, with OTP-verified delivery and category-appropriate release windows — food short, services longer, goods longest. Reviews are AI-checked for authenticity before they affect the seller's trust score.",
      ]}
      capabilities={[
        {
          label: 'Trust-first discovery',
          detail:
            'Sellers ranked by composite trust score, recency, and reviews. No pay-to-rank.',
        },
        {
          label: 'Built-in escrow',
          detail:
            'Funds held by Vend until delivery is OTP-confirmed or auto-released after a category-specific window.',
        },
        {
          label: 'Dispute assistance',
          detail:
            'AI-assisted dispute adjudication: evidence review, communication summarization, suggested resolutions.',
        },
        {
          label: 'Verified reviews',
          detail:
            'LLM authenticity check on every review before it counts toward trust.',
        },
      ]}
    />
  )
}
