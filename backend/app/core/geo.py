"""ParkSMART - Geographic and Spatial Utilities (File 51)."""

from __future__ import annotations

import math
from typing import Any

from geoalchemy2 import Geography, Geometry
from sqlalchemy import cast, func
from sqlalchemy.sql.elements import ColumnElement

from app.schemas.common import LatLon

EARTH_RADIUS_M: float = 6371008.8


def point_expr(ll: LatLon) -> ColumnElement[Any]:
    """Builds a PostGIS geography POINT expression in (lon, lat) order."""
    return cast(
        func.ST_SetSRID(func.ST_MakePoint(ll.lon, ll.lat), 4326),
        Geography(geometry_type="POINT", srid=4326),
    )


def point_expr_xy(lat: float, lon: float) -> ColumnElement[Any]:
    """Builds a PostGIS geography POINT expression from raw floats in (lon, lat) order."""
    return cast(
        func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326),
        Geography(geometry_type="POINT", srid=4326),
    )


def lat_col(col: Any) -> ColumnElement[Any]:
    """Extracts latitude (Y) from a PostGIS geometry/geography column."""
    return func.ST_Y(cast(col, Geometry))


def lon_col(col: Any) -> ColumnElement[Any]:
    """Extracts longitude (X) from a PostGIS geometry/geography column."""
    return func.ST_X(cast(col, Geometry))


def polygon_expr(ring: list[LatLon]) -> ColumnElement[Any]:
    """Builds a PostGIS geography POLYGON expression from a ring of LatLon vertices."""
    wkt = ring_to_wkt(ring)
    return cast(
        func.ST_SetSRID(func.ST_GeomFromText(wkt), 4326),
        Geography(geometry_type="POLYGON", srid=4326),
    )


def latlon_from_row(lat: float | None, lon: float | None) -> LatLon | None:
    """Safely converts nullable row coordinates into a LatLon schema instance."""
    if lat is None and lon is None:
        return None
    if lat is None or lon is None:
        raise ValueError("Latitude and Longitude must both be present or both NULL")
    return LatLon(lat=lat, lon=lon)


def ring_is_closed(ring: list[LatLon]) -> bool:
    """Checks whether the first and last vertices of the ring are identical."""
    if len(ring) < 4:
        return False
    return ring[0].lat == ring[-1].lat and ring[0].lon == ring[-1].lon


def ring_to_wkt(ring: list[LatLon]) -> str:
    """Serializes a closed polygon ring into WKT in (lon lat) order."""
    if len(ring) < 4 or not ring_is_closed(ring):
        raise ValueError("Ring must have at least 4 points and be closed (first == last)")
    coords_str = ", ".join(f"{p.lon} {p.lat}" for p in ring)
    return f"POLYGON(({coords_str}))"


def haversine_m(a: LatLon, b: LatLon) -> float:
    """Computes great-circle distance in meters between two coordinates."""
    lat1, lon1 = math.radians(a.lat), math.radians(a.lon)
    lat2, lon2 = math.radians(b.lat), math.radians(b.lon)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    val = math.sin(dlat / 2.0) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(val), math.sqrt(max(0.0, 1.0 - val)))
    return EARTH_RADIUS_M * c


def _ccw(a: tuple[float, float], b: tuple[float, float], c: tuple[float, float]) -> bool:
    return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0])


def _segments_intersect(
    p1: tuple[float, float], p2: tuple[float, float], p3: tuple[float, float], p4: tuple[float, float]
) -> bool:
    return (_ccw(p1, p3, p4) != _ccw(p2, p3, p4)) and (_ccw(p1, p2, p3) != _ccw(p1, p2, p4))


def ring_self_intersects(ring: list[LatLon]) -> bool:
    """O(n^2) check whether polygon ring edges cross each other (excluding adjacent shared vertices)."""
    n = len(ring) - 1
    if n < 3:
        return False
    pts = [(p.lon, p.lat) for p in ring]
    for i in range(n):
        for j in range(i + 1, n):
            # Skip adjacent edges and closing edge
            if abs(i - j) <= 1 or (i == 0 and j == n - 1):
                continue
            if _segments_intersect(pts[i], pts[i + 1], pts[j], pts[j + 1]):
                return True
    return False


def point_in_ring(p: LatLon, ring: list[LatLon]) -> bool:
    """Standard ray-casting point-in-polygon algorithm on planar lon/lat."""
    inside = False
    n = len(ring)
    j = n - 1
    x, y = p.lon, p.lat
    for i in range(n):
        xi, yi = ring[i].lon, ring[i].lat
        xj, yj = ring[j].lon, ring[j].lat
        intersect = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi)
        if intersect:
            inside = not inside
        j = i
    return inside
