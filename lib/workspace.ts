const KEY = 'riderlink_workspace_id'

export function getWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(KEY)
}

export function setWorkspaceId(id: string): void {
  localStorage.setItem(KEY, id)
}

export function clearWorkspace(): void {
  localStorage.removeItem(KEY)
}
