# Architecture Overview

## Project Goal

KeyNest is a full-stack encrypted credential management platform.

The primary design goal is that the backend must not have access to plaintext vault data.

## High-Level Architecture

```txt
Browser / Next.js Client
        |
        | HTTPS
        v
NestJS API
        |
        |---- Auth Module
        |---- Vault Module
        |---- Credential Module
        |---- Session Module
        |---- Audit Log Module
        |
        v
PostgreSQL
        |
        v
Redis