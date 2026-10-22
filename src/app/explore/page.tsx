import type { Metadata } from 'next';
import UnderwaterGame from '@/components/game/UnderwaterGame';

export const metadata: Metadata = {
  title: 'Exploration | Underwater Explorer',
  description: 'Descend into the ocean depths and explore submerged biomes with 2D physics.',
};

export default function ExplorePage() {
  return (
    <main style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <UnderwaterGame />
    </main>
  );
}
