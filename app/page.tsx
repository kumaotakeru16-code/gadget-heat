import GadgetHeatApp from "@/components/GadgetHeatApp";
import { fetchTopMoversLite } from "@/lib/fetchTopMoversLite";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await fetchTopMoversLite();
  return (
    <GadgetHeatApp
      initialRakutenProducts={result?.products ?? null}
      initialStats={result?.stats ?? null}
    />
  );
}
