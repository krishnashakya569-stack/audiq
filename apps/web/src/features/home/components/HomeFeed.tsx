import AIPicks from "./AIPicks";
import ContinueListening from "./ContinueListening";
import ForYouPreview from "./ForYouPreview";
import Greeting from "./Greeting";
import Trending from "./Trending";

type HomeFeedProps = {
  query: string;
  onExplore: () => void;
  onCreateMix: () => void;
};

export default function HomeFeed({ query, onExplore, onCreateMix }: HomeFeedProps) {
  if (query.trim().toLowerCase() !== "starboy") {
    return <ContinueListening query={query} />;
  }

  return (
    <>
      <Greeting onExplore={onExplore} onCreateMix={onCreateMix} />
      <ForYouPreview onExplore={onExplore} />
      <AIPicks onOpenAi={onCreateMix} />
      <Trending onExplore={onExplore} />
      <ContinueListening query={query} />
    </>
  );
}
