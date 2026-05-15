import V2Preview from '../_components/V2Preview'

export const dynamic = 'force-dynamic'

export default function TrustPage() {
  return (
    <V2Preview
      title="Trust & Verification"
      tagline="Interpretable, earned, anti-gameable."
      shipsWhen="Ships in parallel with Marketplace launch"
      paragraphs={[
        "Vend's trust score is not a black box. Every seller can see exactly which signals raised or lowered their score and what to do about it. Buyers can hover any score to see the same breakdown — the same data, exactly as the seller sees it.",
        "Inputs are deliberately resistant to gaming. Payment regularity over time. Time on platform. Dispute outcomes (not raw counts). Review authenticity (LLM-checked). Repeat-customer ratio. Each signal weighted in a transparent rubric we publish.",
      ]}
      capabilities={[
        {
          label: 'Score breakdown',
          detail:
            'Every score broken into its component signals with current values and how each is calculated.',
        },
        {
          label: 'Improve-your-score guidance',
          detail:
            'Personalized: "5 more on-time deliveries unlocks Verified+ benefits." No vague advice.',
        },
        {
          label: 'Public verification page',
          detail:
            'Buyers can view any seller’s score history and reviews before paying — at vend.ng/seller/[id].',
        },
        {
          label: 'Anti-fraud layer',
          detail:
            'Graph-based collusion detection, behavioral anomaly flagging, LLM review-authenticity verification — running constantly in the background.',
        },
      ]}
    />
  )
}
