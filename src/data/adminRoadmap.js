export const adminRoadmap = {
  currentFocus: [
    {
      id: "mobile-cleanup",
      title: "mobile cleanup still ongoing",
      detail:
        "still tightening anything that feels too chunky, too zoomed, or just weird on phones. goal is app feel first, desktop second.",
      status: "in progress",
    },
    {
      id: "search-artwork",
      title: "live search image reliability",
      detail:
        "cleaning up card art so weird source issues dont leave blank cards or random fallback blocks everywhere.",
      status: "active fix",
    },
  ],
  recentPushes: [
    {
      id: "f8e04cf",
      date: "Mar 30",
      status: "just pushed",
      title: "fixed one piece search art + chat image preview",
      summary:
        "some one piece cards were loading if u opened them in a new tab but not on site, so that got patched. also chat pics now open on-site instead of forcing a new tab.",
    },
    {
      id: "2db0137",
      date: "Mar 25",
      status: "live fix",
      title: "official one piece fallback art",
      summary:
        "swapped off the dead image source so promo / event pack cards have a better shot at showing their actual art.",
    },
    {
      id: "5e07678",
      date: "Mar 25",
      status: "ui cleanup",
      title: "desktop messages made less crowded",
      summary:
        "chat was taking way too much space for the top context stuff so the thread got compacted and the actual convo got more room.",
    },
    {
      id: "db98497",
      date: "Mar 25",
      status: "storefront polish",
      title: "manual arrows on the hero banner",
      summary:
        "added left / right controls so u can actually scroll the banner instead of just waiting for autoplay or hitting the dots.",
    },
    {
      id: "2c821ea",
      date: "Mar 25",
      status: "stability",
      title: "home page invisible-but-clickable fix",
      summary:
        "home had one of those annoying bugs where it could still be there but look blank because the animation state got stuck. that path got cleaned up.",
    },
    {
      id: "266731b",
      date: "Mar 24",
      status: "stability",
      title: "home boot + scroll reset fix",
      summary:
        "fixed a bad route scroll behavior and stopped home from being fully blocked behind loading if the browser acted up.",
    },
  ],
  nextUp: [
    "keep shrinking clunky desktop/mobile ui spots til everything feels cleaner",
    "tighten more source image edge cases so autofill search feels less random",
    "keep pushing the marketplace/chat pages closer to actual app feel",
  ],
  notes: [
    "this is basically the admin dev feed so u can see what got changed without digging through commits",
    "can keep adding bigger milestones here too like mobile pass done / search redone / messages redone / etc",
  ],
};
