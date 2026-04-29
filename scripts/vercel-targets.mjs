export const VERCEL_TARGETS = {
  public: {
    projectId: 'prj_XPlqY7E0utEAYUHyiLp7SliAT3na',
    projectName: 'esnad',
    localConfig: 'vercel-public.json',
  },
  editor: {
    projectId: 'prj_oUbhx3NJJTS9ltbBExkBNVIHgSST',
    projectName: 'esnad-editor',
    localConfig: 'vercel-editor.json',
  },
}

export function getVercelTarget(targetName) {
  const normalizedName = targetName?.trim().toLowerCase()
  const target = VERCEL_TARGETS[normalizedName]

  if (!target) {
    throw new Error(`Unknown Vercel target: ${targetName ?? '<missing>'}`)
  }

  return { key: normalizedName, ...target }
}
