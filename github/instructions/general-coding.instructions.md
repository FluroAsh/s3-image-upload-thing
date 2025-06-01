---
applyTo: '**/*.ts,**/*.tsx'
---

# Project coding standards for TSX

## Style Guidelines

- Use Tailwind V4 syntax for all styling
- Use the "size" property over "w-\*" and "h-\*" when used in combination
- Maintain consisting theming in the codebase
- Primary colours include:
  - Slate (Primary Colour)
  - Sky (Accents)
  - Neutral (primarily for text)

## React Guidelines

- Use functional components with hooks
- Follow the React hooks rules (no conditional hooks)
- Keep components small and atomic
- Use Tailwind for styling, and style attributes where appropriate for more specific styling
- Don't include constants unless it's specifically requested
- For icons use the Lucide library
- Prefer using "stroke" over "text" as a className for icon styling

## TypeScript Guidelines

- Prefer implicit return types over explicit
