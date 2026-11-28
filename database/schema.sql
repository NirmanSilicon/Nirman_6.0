-- SATARK-SETU MySQL Database Schema
-- Compatible with MySQL 8.0+

CREATE DATABASE IF NOT EXISTS satark_setu
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE satark_setu;

CREATE TABLE IF NOT EXISTS fraud_checks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  request_id VARCHAR(64) NOT NULL UNIQUE,
  channel ENUM('SMS', 'UPI', 'LINK') NOT NULL,
  language ENUM('en', 'hi', 'or') NOT NULL DEFAULT 'en',
  input_hash CHAR(64) NOT NULL,
  verdict ENUM('SAFE', 'FRAUD') NOT NULL,
  risk_score TINYINT UNSIGNED NOT NULL,
  classification_source ENUM('LOCAL_ML', 'CACHE', 'GEMINI') NOT NULL DEFAULT 'LOCAL_ML',
  matched_category VARCHAR(32) NOT NULL DEFAULT 'AMBIGUOUS',
  signals_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fraud_checks_verdict_created (verdict, created_at),
  INDEX idx_fraud_checks_input_hash (input_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS threat_domains (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  domain VARCHAR(255) NOT NULL UNIQUE,
  list_type ENUM('ALLOWLIST', 'SHORTENER', 'BLOCKLIST') NOT NULL,
  source VARCHAR(64) NOT NULL DEFAULT 'tranco_top',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_threat_domains_type (list_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS voice_guidance_templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(32) NOT NULL,
  language ENUM('en', 'hi', 'or') NOT NULL,
  headline VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_guidance_category_lang (category, language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
