-- V4 Migration: Add visa_number column to member_documents
-- Safe to re-run.
--
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New query → paste → Run

alter table member_documents
  add column if not exists visa_number text;
