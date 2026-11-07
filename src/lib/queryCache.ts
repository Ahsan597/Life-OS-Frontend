import type { QueryClient, QueryKey } from '@tanstack/react-query'

/** Cached data under a key prefix, saved before an optimistic update */
export type QuerySnapshot = [QueryKey, unknown][]

export async function snapshotQueries(queryClient: QueryClient, queryKey: QueryKey): Promise<QuerySnapshot> {
  // A refetch landing mid-update would overwrite the optimistic data.
  await queryClient.cancelQueries({ queryKey })
  return queryClient.getQueriesData({ queryKey })
}

/** Puts the saved data back after the server refused the change */
export function restoreQueries(queryClient: QueryClient, snapshot: QuerySnapshot | undefined) {
  snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data))
}
