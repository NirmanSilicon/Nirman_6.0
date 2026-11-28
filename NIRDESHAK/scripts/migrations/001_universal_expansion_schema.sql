-- ============================================================================
-- NIRDESHAK DATABASE MIGRATION 001: UNIVERSAL EXPANSION SCHEMA
-- Target Database: PostgreSQL 18 with pgvector v0.8.6
-- Description: Creates 17 Division Council taxonomy, Product Master Catalogue,
--              product aliases, product-to-standard mappings, and QCO registry
--              while strictly preserving existing standards & relationships.
-- ============================================================================

BEGIN;

-- 1. Extend standards table with division council and technical metadata
ALTER TABLE standards ADD COLUMN IF NOT EXISTS division_council VARCHAR(128);
ALTER TABLE standards ADD COLUMN IF NOT EXISTS standard_type VARCHAR(64) DEFAULT 'Product Specification';
ALTER TABLE standards ADD COLUMN IF NOT EXISTS technical_committee VARCHAR(64);
ALTER TABLE standards ADD COLUMN IF NOT EXISTS reaffirmation_year INTEGER;
ALTER TABLE standards ADD COLUMN IF NOT EXISTS verification_status VARCHAR(64) DEFAULT 'VERIFIED';

-- 2. Table: product_sectors (All 17 BIS Division Councils)
CREATE TABLE IF NOT EXISTS product_sectors (
    id SERIAL PRIMARY KEY,
    sector_code VARCHAR(32) UNIQUE NOT NULL,
    council_number INTEGER NOT NULL,
    name VARCHAR(128) UNIQUE NOT NULL,
    division_council_code VARCHAR(32) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table: product_categories
CREATE TABLE IF NOT EXISTS product_categories (
    id SERIAL PRIMARY KEY,
    sector_id INTEGER REFERENCES product_sectors(id) ON DELETE CASCADE,
    category_name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (sector_id, category_name)
);

-- 4. Table: product_families (The Product Master Catalogue)
CREATE TABLE IF NOT EXISTS product_families (
    id SERIAL PRIMARY KEY,
    family_code VARCHAR(64) UNIQUE NOT NULL,
    canonical_name VARCHAR(256) NOT NULL,
    category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
    sector_id INTEGER REFERENCES product_sectors(id) ON DELETE CASCADE,
    division_council VARCHAR(128) NOT NULL,
    subcategory VARCHAR(128),
    description TEXT,
    applications TEXT,
    technical_keywords JSONB DEFAULT '[]'::jsonb,
    common_synonyms JSONB DEFAULT '[]'::jsonb,
    industry_terminology JSONB DEFAULT '[]'::jsonb,
    alternate_names JSONB DEFAULT '[]'::jsonb,
    common_abbreviations JSONB DEFAULT '[]'::jsonb,
    coverage_status VARCHAR(64) DEFAULT 'VERIFIED_STANDARDS',
    source TEXT,
    embedding vector(3072),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table: product_aliases (Synonyms, abbreviations, regional terms)
CREATE TABLE IF NOT EXISTS product_aliases (
    id SERIAL PRIMARY KEY,
    product_family_id INTEGER REFERENCES product_families(id) ON DELETE CASCADE,
    alias_term VARCHAR(256) NOT NULL,
    alias_type VARCHAR(64) DEFAULT 'synonym',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (product_family_id, alias_term)
);

-- 6. Table: product_standard_mappings (Verified Product-to-Standard Links)
CREATE TABLE IF NOT EXISTS product_standard_mappings (
    id SERIAL PRIMARY KEY,
    product_family_id INTEGER REFERENCES product_families(id) ON DELETE CASCADE,
    standard_id INTEGER REFERENCES standards(id) ON DELETE CASCADE,
    relationship_type VARCHAR(64) NOT NULL,
    applicability_explanation TEXT,
    mandatory_status VARCHAR(64) DEFAULT 'MANDATORY_QCO',
    evidence_source TEXT,
    confidence_score NUMERIC(4,3) DEFAULT 1.000,
    verification_status VARCHAR(64) DEFAULT 'VERIFIED',
    last_verified_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (product_family_id, standard_id, relationship_type)
);

-- 7. Table: regulatory_orders (Structured Central QCO Registry)
CREATE TABLE IF NOT EXISTS regulatory_orders (
    id SERIAL PRIMARY KEY,
    qco_code VARCHAR(64) UNIQUE NOT NULL,
    qco_name TEXT NOT NULL,
    gazette_no VARCHAR(64) NOT NULL,
    gazette_date DATE NOT NULL,
    effective_date DATE,
    issuing_ministry TEXT NOT NULL,
    statutory_basis TEXT,
    status VARCHAR(64) DEFAULT 'ENACTED',
    official_evidence_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Table: standard_regulatory_links (Standard-to-QCO mapping with Schedule Items)
CREATE TABLE IF NOT EXISTS standard_regulatory_links (
    id SERIAL PRIMARY KEY,
    standard_id INTEGER REFERENCES standards(id) ON DELETE CASCADE,
    regulatory_order_id INTEGER REFERENCES regulatory_orders(id) ON DELETE CASCADE,
    schedule_item VARCHAR(256),
    schedule_serial INTEGER,
    commencement_date DATE,
    transition_provisions TEXT,
    scheme VARCHAR(64) DEFAULT 'Scheme-I (ISI Mark)',
    is_mandatory BOOLEAN DEFAULT TRUE,
    product_coverage_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (standard_id, regulatory_order_id)
);

-- 9. Table: ingestion_jobs (Resumable ingestion tracking)
CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(64) NOT NULL,
    source_file VARCHAR(256),
    status VARCHAR(32) DEFAULT 'PENDING',
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    error_log JSONB DEFAULT '[]'::jsonb,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 10. Table: data_verification_logs
CREATE TABLE IF NOT EXISTS data_verification_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(64) NOT NULL,
    entity_id INTEGER NOT NULL,
    entity_canonical_id VARCHAR(128) NOT NULL,
    verification_check VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL,
    details TEXT,
    audited_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_product_families_name ON product_families (canonical_name);
CREATE INDEX IF NOT EXISTS idx_product_families_council ON product_families (division_council);
CREATE INDEX IF NOT EXISTS idx_product_families_sector ON product_families (sector_id);
CREATE INDEX IF NOT EXISTS idx_product_families_category ON product_families (category_id);
CREATE INDEX IF NOT EXISTS idx_product_aliases_term ON product_aliases (LOWER(alias_term));
CREATE INDEX IF NOT EXISTS idx_product_aliases_pfamily ON product_aliases (product_family_id);
CREATE INDEX IF NOT EXISTS idx_psm_pfamily ON product_standard_mappings (product_family_id);
CREATE INDEX IF NOT EXISTS idx_psm_standard ON product_standard_mappings (standard_id);
CREATE INDEX IF NOT EXISTS idx_psm_rel_type ON product_standard_mappings (relationship_type);
CREATE INDEX IF NOT EXISTS idx_standards_division ON standards (division_council);
CREATE INDEX IF NOT EXISTS idx_standards_std_type ON standards (standard_type);
CREATE INDEX IF NOT EXISTS idx_reg_orders_gazette ON regulatory_orders (gazette_no);
CREATE INDEX IF NOT EXISTS idx_std_reg_std ON standard_regulatory_links (standard_id);
CREATE INDEX IF NOT EXISTS idx_std_reg_order ON standard_regulatory_links (regulatory_order_id);

COMMIT;
