import AIPicks from "./AIPicks";
import ContinueListening from "./ContinueListening";
import Greeting from "./Greeting";
import Trending from "./Trending";

type HomeFeedProps = {
  query: string;
};

export default function HomeFeed({ query }: HomeFeedProps) {
  if (query.trim().toLowerCase() !== "starboy") {
    return <ContinueListening query={query} />;
  }

  return (
    <>
      <Greeting />
      <ContinueListening query={query} />
      <AIPicks />
      <Trending />
    </>
  );
}
