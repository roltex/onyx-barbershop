/** Shared Onyx service showcase config (landing + booking). */
export const SERVICE_ICONS: Record<string, string> = {
  Haircut: "/icon-scissors.png",
  "Beard Trim": "/icon-beard.png",
  "Razor Shave": "/icon-razor.png",
  "Premium Package": "/icon-crown.png",
  Manicure: "/icon-manicure.png",
  Pedicure: "/icon-pedicure.png",
};

export const SHOWCASE_SERVICES = [
  {
    key: "haircut",
    name: "Haircut",
    icon: "/icon-scissors.png",
    titleKey: "landing.svcHaircut",
    descKey: "landing.svcHaircutDesc",
  },
  {
    key: "beard",
    name: "Beard Trim",
    icon: "/icon-beard.png",
    titleKey: "landing.svcBeard",
    descKey: "landing.svcBeardDesc",
  },
  {
    key: "razor",
    name: "Razor Shave",
    icon: "/icon-razor.png",
    titleKey: "landing.svcRazor",
    descKey: "landing.svcRazorDesc",
  },
  {
    key: "premium",
    name: "Premium Package",
    icon: "/icon-crown.png",
    titleKey: "landing.svcPremium",
    descKey: "landing.svcPremiumDesc",
  },
  {
    key: "manicure",
    name: "Manicure",
    icon: "/icon-manicure.png",
    titleKey: "landing.svcManicure",
    descKey: "landing.svcManicureDesc",
  },
  {
    key: "pedicure",
    name: "Pedicure",
    icon: "/icon-pedicure.png",
    titleKey: "landing.svcPedicure",
    descKey: "landing.svcPedicureDesc",
  },
] as const;

export const SHOWCASE_TEAM = [
  {
    nameKey: "landing.barberTamo",
    roleKey: "landing.barberTamoRole",
    photo: "/barber-tamo.png",
  },
  {
    nameKey: "landing.barberMisho",
    roleKey: "landing.barberMishoRole",
    photo: "/barber-misho.png",
  },
  {
    nameKey: "landing.barberAni",
    roleKey: "landing.barberAniRole",
    photo: "/barber-ani.png",
  },
  {
    nameKey: "landing.barberMako",
    roleKey: "landing.barberMakoRole",
    photo: "/barber-mako.png",
  },
] as const;

export function serviceIcon(name: string) {
  return SERVICE_ICONS[name] || "/icon-scissors.png";
}

export const STAFF_PHOTOS: Record<string, string> = {
  Tamo: "/barber-tamo.png",
  Misho: "/barber-misho.png",
  Ani: "/barber-ani.png",
  Mako: "/barber-mako.png",
};

export function staffPhoto(name: string) {
  return STAFF_PHOTOS[name] || "";
}
