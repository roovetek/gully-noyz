# GullyStream

GullyStream is a mobile-first cricket scoring and match-management application built for informal games such as gully (street) or park cricket. The product is designed to provide frictionless, point-and-shoot match setup, multi-modal scoring & play recording.Supports multi-device access through a lightweight match ID flow.

This repository also includes experimental video-analysis and local AI workflows that extend the core scoring experience into a broader sports-tech platform.

## Overview

The project combines a production-style frontend with secure match flows, configurable rules, test automation, and deployment diagnostics. It is positioned as a practical sports product rather than a demo-only UI exercise.

Core product goals:

- make informal cricket easy to organize and score
- support both public and private match access
- capture a clean live scoring workflow on mobile screens
- audio-enabled scoring, recording & sharing game play
- foundation for AI-assisted analysis for player improvement

## High-Level Features

- Match creation and join flows with short shareable match IDs
- Public and private matches with secret-based access control
- Audio-enabled ball-by-ball scoring workflow optimized for mobile use
- Match views for Record, Timeline, Stats, and Config
- Match browsing for previously created games
- Rule customization for overs, wickets, bowler limits, and extras behavior
- Optional video capture tied to match events
- Hidden QA report route and deployment sync diagnostics for release verification
- Experimental cricket video analysis modes, including browser-based pose scanning and server-backed analysis hooks
- Local AI service for audio-to-structured scoring experiments

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- Lucide React

### Backend and Data

- Supabase
- Secure client-side storage wrappers and validation utilities
- Hash-based app routing for simple static deployment

### AI and Media Experiments

- MediaPipe Tasks Vision
- FastAPI local AI service
- faster-whisper
- Ollama

### Quality and Tooling

- Vitest
- Testing Library
- Playwright
- ESLint
- Husky + lint-staged

## What Is Done

- Built the core landing experience for creating, joining, and browsing matches
- Implemented public/private match access patterns with secret verification
- Delivered the primary in-match navigation and scoring surfaces
- Added configurable match rules instead of hard-coded gameplay defaults
- Introduced shared validation, security, and storage utilities to reduce duplication
- Added deployment sync diagnostics and a QA reporting surface for troubleshooting release drift
- Established a layered test setup covering unit, component, integration, engine, and end-to-end flows
- Added experimental video-analysis tooling for browser pose scans and server-assisted analysis workflows
- Added a local AI service for structured scoring experiments from short audio clips

## What Is Left

- Harden the AI analysis features from experimental tooling into a clearer production-ready workflow
- Expand role and permission handling beyond the current match secret and umpire passcode model
- Continue polishing mobile UX, empty states, and onboarding for first-time users
- Add stronger production observability and deployment automation around releases and schema changes
- Deepen analytics and match insights beyond current score, timeline, and summary views
- Finalize packaging and rollout strategy for a broader public launch

## Engineering Notes

This codebase was built with a product mindset rather than only a prototype mindset. The current implementation already includes:

- reusable domain utilities for validation, security, and match logic
- secure hashing for match secrets
- automated QA and schema checks
- visual and responsive regression coverage
- support for isolated test data

That combination makes the project useful as both a user-facing product and a portfolio example of frontend architecture, testing discipline, and iterative platform design.

## Local Development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run build
npm run lint
npm run typecheck
npm run test:run
npm run test:e2e
npm run qa:harness
```

To run the local AI service:

```bash
npm run ai:service
```

## Why This Project Works As A Portfolio Piece

GullyStream demonstrates end-to-end product thinking across UX, state management, validation, testing, deployment diagnostics, and emerging AI workflows. It is a strong portfolio project because it shows both shipping discipline on the core product and deliberate exploration of advanced features without hiding what is still in progress.
