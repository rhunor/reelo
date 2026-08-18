"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Map, Marker, NavigationControl, Popup } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

export interface MapListing {
  id: string;
  title: string;
  priceNGN: number;
  listingType: "rent" | "sale";
  lng: number;
  lat: number;
}

const ABUJA_FALLBACK = { longitude: 7.4913, latitude: 9.0765 };

export function ListingsMap({ listings }: { listings: MapListing[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const center = useMemo(() => {
    if (listings.length === 0) return ABUJA_FALLBACK;
    const longitude = listings.reduce((sum, l) => sum + l.lng, 0) / listings.length;
    const latitude = listings.reduce((sum, l) => sum + l.lat, 0) / listings.length;
    return { longitude, latitude };
  }, [listings]);

  if (!token) {
    return (
      <div className="flex h-full min-h-80 items-center justify-center rounded-2xl border border-line bg-background p-6 text-center text-sm text-foreground/50">
        Map view isn&apos;t configured yet — set NEXT_PUBLIC_MAPBOX_TOKEN to enable it.
      </div>
    );
  }

  const active = listings.find((listing) => listing.id === activeId);

  return (
    <Map
      mapboxAccessToken={token}
      initialViewState={{ ...center, zoom: 10 }}
      style={{ width: "100%", height: "100%", borderRadius: "1rem" }}
      mapStyle="mapbox://styles/mapbox/light-v11"
    >
      <NavigationControl position="top-right" />
      {listings.map((listing) => (
        <Marker
          key={listing.id}
          longitude={listing.lng}
          latitude={listing.lat}
          anchor="bottom"
          onClick={(event) => {
            event.originalEvent.stopPropagation();
            setActiveId(listing.id);
          }}
        >
          <div className="cursor-pointer rounded-full border-2 border-white bg-clay px-2 py-1 text-xs font-medium text-white shadow-md">
            ₦{Math.round(listing.priceNGN / 1000)}k
          </div>
        </Marker>
      ))}

      {active && (
        <Popup
          longitude={active.lng}
          latitude={active.lat}
          anchor="top"
          onClose={() => setActiveId(null)}
          closeOnClick={false}
        >
          <Link href={`/listings/${active.id}`} className="text-sm font-medium text-clay">
            {active.title}
          </Link>
        </Popup>
      )}
    </Map>
  );
}
