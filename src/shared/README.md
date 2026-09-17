# Shared code

This directory contains code with no product-module ownership: environment
configuration, reusable presentation components, and similarly stable
cross-cutting primitives.

Shared UI must remain browser-safe. It cannot import database modules,
server-only environment configuration, provider integrations, or secrets.
