-- AFTERSHOCK 4D Digital Twin PostGIS Database Schema
-- Guide Section 5.1 & Section 11

CREATE EXTENSION IF NOT EXISTS postgis;

-- Buildings table (3D Polygon with height Z)
CREATE TABLE IF NOT EXISTS buildings (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    geom geometry(PolygonZ, 4326),
    properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roads table (3D LineString with elevation Z)
CREATE TABLE IF NOT EXISTS roads (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    geom geometry(LineStringZ, 4326),
    lanes INTEGER DEFAULT 2,
    properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Critical infrastructure assets (power substations, water plants, hospitals, telecom towers)
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    asset_id VARCHAR(64) UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    geom geometry(Point, 4326),
    properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simulation flood results
CREATE TABLE IF NOT EXISTS flood_results (
    sim_id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    water_height DOUBLE PRECISION,
    flooded_geoms geometry(MultiPolygon, 4326),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Spatial Indexes for high-performance GIS bounding box queries
CREATE INDEX IF NOT EXISTS idx_buildings_geom ON buildings USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_roads_geom ON roads USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_assets_geom ON assets USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_flood_results_geom ON flood_results USING GIST(flooded_geoms);
