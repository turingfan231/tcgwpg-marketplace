export const storeProfiles = [
  {
    slug: "fusion-gaming",
    name: "Fusion Gaming",
    shortName: "Fusion",
    neighborhood: "Downtown",
    address: "1473 Pembina Hwy, Winnipeg, MB",
    siteUrl: "https://fusiongamingonline.com/",
    eventsUrl: "https://fusiongamingonline.com/pages/events",
    logoUrl:
      "https://fusiongamingonline.com/cdn/shop/files/Fusion_Gaming_Logo_Black_7377cfa4-195a-4d0f-b4b0-059f82d46afd_150x@2x.png?v=1728146962",
    bannerUrl:
      "https://fusiongamingonline.com/cdn/shop/files/Fusion_Gaming_Logo_Black_7377cfa4-195a-4d0f-b4b0-059f82d46afd_150x@2x.png?v=1728146962",
    approvedMeetup: true,
    tone: "navy",
  },
  {
    slug: "galaxy-comics",
    name: "Galaxy Comics",
    shortName: "Galaxy",
    neighborhood: "North Kildonan",
    address: "1143 Henderson Highway, Winnipeg, MB",
    siteUrl: "https://galaxy-comics.ca/",
    eventsUrl: "https://www.facebook.com/galaxycomicscollectibles/events",
    logoUrl: "https://galaxy-comics.ca/files/2416/6517/3334/Main_Banner_PNG.png",
    bannerUrl: "https://galaxy-comics.ca/files/2416/6517/3334/Main_Banner_PNG.png",
    approvedMeetup: true,
    tone: "slate",
  },
  {
    slug: "a-muse-n-games",
    name: "A Muse N Games",
    shortName: "A Muse",
    neighborhood: "St. Vital",
    address: "Unit 5, 1510 St. Mary's Rd, Winnipeg, MB",
    siteUrl: "https://amusengames.ca/",
    eventsUrl: "https://amusengames.ca/collections/events",
    logoUrl:
      "https://amusengames.ca/cdn/shop/files/a_muse_n_games_word_mark.png?v=1751577921&width=500",
    bannerUrl:
      "https://amusengames.ca/cdn/shop/files/a_muse_n_games_word_mark.png?v=1751577921&width=500",
    approvedMeetup: true,
    tone: "orange",
  },
  {
    slug: "arctic-rift-cards",
    name: "Arctic Rift Cards",
    shortName: "Arctic",
    neighborhood: "North End",
    address: "Winnipeg, MB",
    siteUrl: "https://www.arcticriftcards.ca/",
    eventsUrl: "https://www.arcticriftcards.ca/",
    logoUrl: "/brand/arctic-rift-logo.png",
    bannerUrl: "/brand/arctic-rift-logo.png",
    approvedMeetup: true,
    tone: "ice",
  },
];

export const approvedMeetupSpots = storeProfiles.map((store) => ({
  id: store.slug,
  label: store.name,
  neighborhood: store.neighborhood,
  address: store.address,
  logoUrl: store.logoUrl,
  siteUrl: store.siteUrl,
}));

export function getStoreBySlug(storeSlug) {
  return storeProfiles.find((store) => store.slug === storeSlug) || null;
}

export function getStoreSlugByName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  return (
    storeProfiles.find((store) => {
      const storeName = store.name.toLowerCase();
      const shortName = store.shortName.toLowerCase();
      return normalized === storeName || normalized === shortName;
    })?.slug || null
  );
}
