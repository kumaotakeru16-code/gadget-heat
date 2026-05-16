import GadgetHeatApp from "@/components/GadgetHeatApp";
import { fetchTopMovers } from "@/lib/fetchTopMovers";

export default async function HomePage() {
  const rakutenProducts = await fetchTopMovers();
  return <GadgetHeatApp initialRakutenProducts={rakutenProducts} />;
}
