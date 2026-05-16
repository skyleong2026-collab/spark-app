// Head type lookup tables — keep in sync with
// supabase/functions/generate-synthesis/index.ts headDescriptions

export const HEAD_DESCRIPTIONS: Record<string, string> = {
  Blueprint:   'Independent, strategic, long-range thinker. Dominant function: introverted intuition. Sees systems and patterns. Values competence and vision.',
  Vision:      'Insightful, principled, quietly intense. Dominant function: introverted intuition with feeling. Sees meaning and potential in people.',
  Hypothesis:  'Energetic, idea-driven, debate-loving. Dominant function: extraverted intuition. Generates possibilities and challenges assumptions.',
  Possibility: 'Warm, imaginative, connection-seeking. Dominant function: extraverted intuition with feeling. Sees potential in people and ideas.',
  Framework:   'Precise, logical, internally complex. Dominant function: introverted thinking. Builds accurate mental models independently.',
  Ideal:       'Values-driven, empathetic, deeply authentic. Dominant function: introverted feeling. Leads from personal values and meaning.',
  Strategy:    'Decisive, efficient, systems-oriented leader. Dominant function: extraverted thinking. Organizes people and resources toward goals.',
  Narrative:   'People-focused, persuasive, harmony-seeking. Dominant function: extraverted feeling. Moves people through story and vision.',
  Protocol:    'Reliable, detailed, duty-bound. Dominant function: introverted sensing. Values tradition, process, and proven methods.',
  Memory:      'Warm, attentive, service-oriented. Dominant function: introverted sensing with feeling. Preserves relationships and cares for others.',
  Standard:    'Organized, decisive, community-minded. Dominant function: extraverted thinking with sensing. Gets things done through systems.',
  Consensus:   'Sociable, responsible, harmony-focused. Dominant function: extraverted feeling with sensing. Maintains group cohesion.',
  Mechanism:   'Observant, pragmatic, hands-on. Dominant function: introverted thinking with sensing. Understands how things actually work.',
  Impression:  'Gentle, aesthetic, present-focused. Dominant function: introverted feeling with sensing. Lives in sensory beauty and authentic experience.',
  Opportunity: 'Bold, action-oriented, resourceful. Dominant function: extraverted sensing with thinking. Acts decisively on immediate possibilities.',
  Moment:      'Enthusiastic, spontaneous, people-energizing. Dominant function: extraverted sensing with feeling. Brings joy and energy to the present.',
}

export const TYPE_TO_STACK: Record<string, string> = {
  Blueprint:   'Ni-Te',
  Vision:      'Ni-Fe',
  Hypothesis:  'Ne-Ti',
  Possibility: 'Ne-Fi',
  Framework:   'Ti-Ne',
  Ideal:       'Fi-Ne',
  Strategy:    'Te-Ni',
  Narrative:   'Fe-Ni',
  Protocol:    'Si-Te',
  Memory:      'Si-Fe',
  Standard:    'Te-Si',
  Consensus:   'Fe-Si',
  Mechanism:   'Ti-Se',
  Impression:  'Fi-Se',
  Opportunity: 'Se-Ti',
  Moment:      'Se-Fi',
}
