import ChefPageSkeleton from '@/components/chef/ChefPageSkeleton'

// Le layout chef ne pose pas de `<main>` : le squelette apporte le sien.
export default function Loading() {
  return <ChefPageSkeleton />
}
