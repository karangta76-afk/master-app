import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  if (!lat || !lon) {
    return NextResponse.json({ error: "Latitude and longitude are required." }, { status: 400 });
  }
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");
    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "MasterApp/1.0 (location lookup)",
      },
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Reverse geocoding failed." }, { status: response.status });
    }
    return NextResponse.json(await response.json(), { status: 200 });
  } catch (error) {
    console.error("Reverse geocoding API error:", error);
    return NextResponse.json({ error: "Unable to fetch location details." }, { status: 502 });
  }
}
