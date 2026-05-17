import GadgetHeatApp from "@/components/GadgetHeatApp";
import { fetchTopMovers } from "@/lib/fetchTopMovers";

export default async function HomePage() {
  const result = await fetchTopMovers();
  return (
    <GadgetHeatApp
      initialRakutenProducts={result?.products ?? null}
      initialStats={result?.stats ?? null}
    />
  );
}
