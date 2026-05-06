# GullyStream

Live site: https://gullystream-match-ap-rauc.bolt.host/

GullyStream is a mobile-first cricket scoring and match-management application built for informal games such as gully (street) or park cricket. The goal is to provide a frictionless, point-and-shoot way to set up matches, score play, and record key moments on one phone, while still supporting multi-device access through a lightweight match ID flow.

This repository also includes experimental video-analysis and local AI workflows that extend the core scoring experience into a broader sports-tech platform.

## Overview

This is a cricket scoring app I am building for real matches with friends, not just as a prototype. It brings match setup, scoring, recording, and a few AI experiments into one place.

Core product goals:

- make informal cricket easy to organize and score
- build something useful enough for my own games
- support both public and private match access
- capture a clean live scoring workflow on mobile screens
- support audio, video, and simple manual scoring flows
- build toward AI-assisted analysis for player improvement

## Current Scope

- Create, join, and browse matches with short shareable match IDs
- Support both public and private matches
- Score each ball using video + voice, voice only, or simple log-only entry
- Switch between live scoring, timeline, stats, and settings screens
- Customize rules such as overs, wickets, bowler limits, and extras
- Record gameplay clips tied to match events
- Run automated Playwright flows that create matches and capture key app screens
- Use built-in QA checks across core flows
- Experiment with local audio scoring and video analysis

## Tech Stack

### Frontend

- React 18 - builds the main user interface
- TypeScript - adds safer, more maintainable application code
- Vite - powers fast local development and production builds
- Tailwind CSS - handles the styling system and responsive layout
- Zustand - manages lightweight app state
- Lucide React - provides the interface icons

### Backend and Data

- Supabase - stores match data and powers app-side backend access
- Secure client-side storage wrappers and validation utilities - handle local session data and safer user input
- Hash-based app routing - keeps navigation simple for static deployment

### AI and Media Experiments

- MediaPipe Tasks Vision - runs browser-side pose and motion analysis
- FastAPI local AI service - exposes local endpoints for AI-assisted scoring
- faster-whisper - converts spoken audio into text locally
- Ollama - runs local language-model inference for scoring experiments

### Quality and Tooling

- Vitest - runs fast unit and component tests
- Testing Library - tests user-facing React behavior
- Playwright - automates end-to-end app flows in the browser
- Custom Playwright QA harness - generates matches and captures walkthrough screenshots automatically
- ESLint - enforces code quality rules
- Husky + lint-staged - runs checks before commits

## Next

- Make the AI features more useful and less rough around the edges
- Improve who can control what during a match
- Keep making the mobile flow simpler and easier to use
- Add better match summaries and insights
- Get it to a point where my friends and I can rely on it during games

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

## Closing Note

GullyStream is being built as a practical cricket product first. The core match flow, rules engine, test coverage, and deployment guardrails are already in place, while the AI and analysis layers are still being pushed forward in parallel.

## Screenshots

![Landing](images/landing.png)

![Create match modal](images/create-match-modal.png)

![Record / scoring](images/record-scoring.png)

![Timeline](images/timeline.png)

![Stats](images/stats.png)

![Match config](images/match-config.png)
